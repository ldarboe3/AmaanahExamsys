import type { Pool } from "pg";

export class SchoolDeletionError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Only the explicit admin-delete flow uses this helper. Registration cleanup
// has different rules and must not silently inherit a cascading admin delete.
export async function deleteSchoolSafely(pool: Pick<Pool, "connect">, id: number, actorId: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    // These two school_id columns have no FK. Block concurrent writes while
    // checking them; other dependencies are protected by the school row lock.
    await client.query("LOCK TABLE users, exam_centers IN SHARE ROW EXCLUSIVE MODE");
    const { rows } = await client.query(
      "SELECT id, name, admin_user_id, registration_invoice_id FROM schools WHERE id = $1 FOR UPDATE",
      [id],
    );
    const school = rows[0];
    if (!school) throw new SchoolDeletionError(404, "School not found.");

    const dependencies = [
      ["students", "students"],
      ["invoices", "invoices"],
      ["school_exam_registrations", "exam registrations"],
      ["center_assignments", "center assignments"],
      ["exam_cards", "exam cards"],
      ["exam_card_batches", "exam card batches"],
      ["bulk_uploads", "upload records"],
      ["school_invitations", "invitations"],
      ["users", "user accounts"],
      ["exam_centers", "exam centers"],
    ] as const;
    const linked: string[] = [];
    for (const [table, label] of dependencies) {
      // Table names come exclusively from the fixed allowlist above.
      const result = await client.query(
        `SELECT 1 FROM ${table} WHERE school_id = $1 LIMIT 1`,
        [id],
      );
      if (result.rows.length) linked.push(label);
    }
    if (school.admin_user_id && !linked.includes("user accounts")) linked.push("user accounts");
    if (school.registration_invoice_id && !linked.includes("invoices")) linked.push("invoices");
    if (linked.length) {
      throw new SchoolDeletionError(
        409,
        `Cannot delete this school because it has linked ${linked.join(", ")}. No records were deleted. Resolve or transfer these records before deleting the duplicate.`,
      );
    }
    await client.query("DELETE FROM schools WHERE id = $1", [id]);
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data)
       VALUES ($1, 'delete_school', 'school', $2, $3::jsonb)`,
      [actorId, String(id), JSON.stringify({ name: school.name })],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

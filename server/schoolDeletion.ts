import type { Pool } from "pg";

export class SchoolDeletionError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Explicit destructive admin action only; never use for registration cleanup.
export async function deleteSchoolSafely(
  pool: Pick<Pool, "connect">,
  id: number,
  actorId: string,
  confirmation: { schoolName: string; deleteLinkedRecords: boolean },
) {
  if (confirmation?.deleteLinkedRecords !== true || !confirmation.schoolName?.trim()) {
    throw new SchoolDeletionError(400, "Confirm permanent deletion and enter the school's name.");
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    // These two school_id columns have no FK. Block concurrent writes while
    // checking them; other dependencies are protected by the school row lock.
    await client.query("LOCK TABLE schools, users, exam_centers IN SHARE ROW EXCLUSIVE MODE");
    const { rows } = await client.query(
      "SELECT id, name, admin_user_id, registration_invoice_id FROM schools WHERE id = $1 FOR UPDATE",
      [id],
    );
    const school = rows[0];
    if (!school) throw new SchoolDeletionError(404, "School not found.");
    if (confirmation.schoolName.trim() !== school.name.trim()) {
      throw new SchoolDeletionError(400, "The school name does not match. Enter the exact school name to confirm deletion.");
    }

    // Lock parents before removing children so concurrent FK inserts cannot
    // leave a partially removed school. Any failure rolls back the whole action.
    await client.query("SELECT id FROM students WHERE school_id = $1 FOR UPDATE", [id]);
    await client.query("SELECT id FROM invoices WHERE school_id = $1 FOR UPDATE", [id]);
    const sharedInvoices = await client.query(
      `SELECT 1 FROM invoices i
       WHERE i.school_id = $1 AND (
         EXISTS (SELECT 1 FROM school_exam_registrations r WHERE r.invoice_id = i.id AND r.school_id <> $1)
         OR EXISTS (SELECT 1 FROM schools s WHERE s.registration_invoice_id = i.id AND s.id <> $1)
       ) LIMIT 1`, [id],
    );
    if (sharedInvoices.rows.length) {
      throw new SchoolDeletionError(409, "An invoice is shared with another school. Correct that link before deleting. No records were deleted.");
    }

    // Preserve identities for audit history, but remove obsolete school/student
    // access and revoke sessions for accounts that belong only to this school.
    const accounts = await client.query(
      `UPDATE users u SET
         school_id = CASE WHEN u.school_id = $1 THEN NULL ELSE u.school_id END,
         student_id = CASE WHEN u.student_id IN (SELECT id FROM students WHERE school_id = $1) THEN NULL ELSE u.student_id END,
         status = CASE WHEN u.role IN ('school_admin', 'candidate')
           AND (u.school_id IS NULL OR u.school_id = $1)
           AND (u.student_id IS NULL OR u.student_id IN (SELECT id FROM students WHERE school_id = $1))
           AND u.center_id IS NULL AND u.examiner_id IS NULL
           AND NOT EXISTS (SELECT 1 FROM schools s WHERE s.admin_user_id = u.id AND s.id <> $1)
           AND NOT EXISTS (SELECT 1 FROM students s WHERE s.user_id = u.id AND s.school_id <> $1)
           THEN 'inactive'::user_status ELSE u.status END,
         updated_at = NOW()
       WHERE u.school_id = $1 OR u.id = $2
         OR u.student_id IN (SELECT id FROM students WHERE school_id = $1)
         OR u.id IN (SELECT user_id FROM students WHERE school_id = $1)
       RETURNING id, status`, [id, school.admin_user_id],
    );
    const disabledIds = accounts.rows.filter(a => a.status === "inactive").map(a => a.id);
    if (disabledIds.length) {
      await client.query("DELETE FROM sessions WHERE sess->>'userId' = ANY($1::text[])", [disabledIds]);
    }

    const deleted: Record<string, number> = {};
    const remove = async (table: string, condition: string) => {
      // Identifiers/conditions are fixed by the calls below, never user input.
      const result = await client.query(`DELETE FROM ${table} WHERE ${condition}`, [id]);
      deleted[table] = result.rowCount ?? 0;
    };
    const studentScope = "student_id IN (SELECT id FROM students WHERE school_id = $1)";
    await remove("integrity_flag_events",
      `flag_id IN (SELECT id FROM integrity_flags WHERE ${studentScope})`);
    await remove("integrity_flags", studentScope);
    for (const table of ["attendance_records", "student_results", "certificates", "transcripts", "malpractice_reports"]) {
      await remove(table, studentScope);
    }
    await remove("exam_cards",
      `school_id = $1 OR ${studentScope} OR batch_id IN (SELECT id FROM exam_card_batches WHERE school_id = $1)`);
    await remove("students", "school_id = $1");
    for (const table of ["center_assignments", "school_exam_registrations", "school_invitations", "exam_card_batches", "bulk_uploads"]) {
      await remove(table, "school_id = $1");
    }
    await remove("invoice_items", "invoice_id IN (SELECT id FROM invoices WHERE school_id = $1)");
    await remove("invoices", "school_id = $1");
    // A center can host other schools and carries logistics history. Retain it,
    // removing only its association with the deleted school.
    const centers = await client.query("UPDATE exam_centers SET school_id = NULL WHERE school_id = $1", [id]);
    await client.query("DELETE FROM schools WHERE id = $1", [id]);
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data)
       VALUES ($1, 'delete_school', 'school', $2, $3::jsonb)`,
      [actorId, String(id), JSON.stringify({
        name: school.name, deleted, accountsDisabled: disabledIds.length,
        centersUnlinked: centers.rowCount ?? 0, permanentDeletionConfirmed: true,
      })],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

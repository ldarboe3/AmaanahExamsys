import assert from "node:assert/strict";
import { test } from "node:test";
import type { Pool } from "pg";
import { deleteSchoolSafely, SchoolDeletionError } from "./schoolDeletion";

const confirmation = { schoolName: "Disposable duplicate", deleteLinkedRecords: true };

function fixture(options: { missing?: boolean; sharedInvoice?: boolean; failAudit?: boolean; disabledAccount?: boolean } = {}) {
  const calls: string[] = [];
  let released = false;
  const client = {
    async query(sql: string, params?: unknown[]) {
      calls.push(sql);
      if (sql.startsWith("SELECT id, name")) {
        return { rows: options.missing ? [] : [{
          id: 7, name: "Disposable duplicate", admin_user_id: null,
        }] };
      }
      if (sql.includes("SELECT 1 FROM invoices i")) {
        assert.deepEqual(params, [7]);
        return { rows: options.sharedInvoice ? [{ exists: 1 }] : [] };
      }
      if (sql.includes("UPDATE users u SET")) {
        return { rows: options.disabledAccount ? [{ id: "dedicated-account", status: "inactive" }] : [] };
      }
      if (sql.includes("INSERT INTO audit_logs") && options.failAudit) throw new Error("audit unavailable");
      return { rows: [] };
    },
    release() { released = true; },
  };
  const pool = { connect: async () => client } as unknown as Pick<Pool, "connect">;
  return { pool, calls, released: () => released };
}

test("deletes school-owned records in dependency order, audits and commits atomically", async () => {
  const f = fixture();
  await deleteSchoolSafely(f.pool, 7, "test-actor", confirmation);
  assert(f.calls.includes("DELETE FROM schools WHERE id = $1"));
  for (const table of ["students", "invoices", "invoice_items", "school_invitations", "school_exam_registrations",
    "exam_cards", "exam_card_batches", "attendance_records", "student_results", "certificates",
    "transcripts", "malpractice_reports", "integrity_flags", "integrity_flag_events", "bulk_uploads", "center_assignments"]) {
    const deletion = f.calls.find(q => q.startsWith(`DELETE FROM ${table} WHERE`));
    assert(deletion, `${table} is deleted`);
    assert(deletion.includes("$1"), `${table} deletion is school-scoped`);
  }
  const position = (table: string) => f.calls.findIndex(q => q.startsWith(`DELETE FROM ${table} WHERE`));
  assert(position("integrity_flag_events") < position("integrity_flags"));
  assert(position("integrity_flags") < position("students"));
  assert(position("exam_cards") < position("students"));
  assert(position("invoice_items") < position("invoices"));
  assert(position("school_exam_registrations") < position("invoices"));
  assert(position("invoices") < position("schools"));
  assert(f.calls.some(q => q.startsWith("UPDATE exam_centers SET school_id = NULL")));
  assert(!f.calls.some(q => q.startsWith("DELETE FROM exam_centers")));
  assert(!f.calls.some(q => q.startsWith("DELETE FROM users")));
  assert(f.calls.some(q => q.includes("INSERT INTO audit_logs")));
  assert.equal(f.calls.at(-1), "COMMIT");
  assert(f.released());
});

test("missing school returns 404 and rolls back", async () => {
  const f = fixture({ missing: true });
  await assert.rejects(deleteSchoolSafely(f.pool, 7, "test-actor", confirmation),
    (e: unknown) => e instanceof SchoolDeletionError && e.status === 404);
  assert(!f.calls.some(q => q.startsWith("DELETE")));
  assert.equal(f.calls.at(-1), "ROLLBACK");
  assert(f.released());
});

for (const badConfirmation of [
  { schoolName: "", deleteLinkedRecords: true },
  { schoolName: "Disposable duplicate", deleteLinkedRecords: false },
  { schoolName: "Wrong school", deleteLinkedRecords: true },
]) {
  test(`refuses unconfirmed deletion: ${JSON.stringify(badConfirmation)}`, async () => {
    const f = fixture();
    await assert.rejects(deleteSchoolSafely(f.pool, 7, "test-actor", badConfirmation),
      (e: unknown) => e instanceof SchoolDeletionError && e.status === 400);
    assert(!f.calls.some(q => q.startsWith("DELETE")));
  });
}

test("refuses to remove invoices referenced by another school", async () => {
  const f = fixture({ sharedInvoice: true });
  await assert.rejects(deleteSchoolSafely(f.pool, 7, "test-actor", confirmation),
    (e: unknown) => e instanceof SchoolDeletionError && e.status === 409);
  assert(!f.calls.some(q => q.startsWith("DELETE")));
  assert.equal(f.calls.at(-1), "ROLLBACK");
});

test("revokes sessions for disabled dedicated accounts", async () => {
  const f = fixture({ disabledAccount: true });
  await deleteSchoolSafely(f.pool, 7, "test-actor", confirmation);
  assert(f.calls.some(q => q.startsWith("DELETE FROM sessions WHERE")));
  const update = f.calls.find(q => q.includes("UPDATE users u SET"))!;
  assert(update.includes("s.id <> $1"));
  assert(update.includes("s.school_id <> $1"));
  assert(update.includes("'school_admin', 'candidate'"));
});

test("rolls back deletion if recording its audit fails", async () => {
  const f = fixture({ failAudit: true });
  await assert.rejects(deleteSchoolSafely(f.pool, 7, "test-actor", confirmation), /audit unavailable/);
  assert.equal(f.calls.at(-1), "ROLLBACK");
  assert(!f.calls.includes("COMMIT"));
  assert(f.released());
});

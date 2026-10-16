import assert from "node:assert/strict";
import { test } from "node:test";
import type { Pool } from "pg";
import { deleteSchoolSafely, SchoolDeletionError } from "./schoolDeletion";

function fixture(options: { missing?: boolean; linked?: string; admin?: boolean; failAudit?: boolean } = {}) {
  const calls: string[] = [];
  let released = false;
  const client = {
    async query(sql: string, params?: unknown[]) {
      calls.push(sql);
      if (sql.startsWith("SELECT id, name")) {
        return { rows: options.missing ? [] : [{
          id: 7, name: "Disposable duplicate", admin_user_id: options.admin ? "account" : null,
        }] };
      }
      if (sql.startsWith("SELECT 1 FROM")) {
        assert.deepEqual(params, [7]);
        return { rows: sql.includes(`FROM ${options.linked} WHERE`) ? [{ exists: 1 }] : [] };
      }
      if (sql.includes("INSERT INTO audit_logs") && options.failAudit) throw new Error("audit unavailable");
      return { rows: [] };
    },
    release() { released = true; },
  };
  const pool = { connect: async () => client } as unknown as Pick<Pool, "connect">;
  return { pool, calls, released: () => released };
}

test("deletes only an empty school, audits and commits atomically", async () => {
  const f = fixture();
  await deleteSchoolSafely(f.pool, 7, "test-actor");
  assert(f.calls.includes("DELETE FROM schools WHERE id = $1"));
  assert.equal(f.calls.filter(q => q.startsWith("DELETE")).length, 1);
  assert(f.calls.some(q => q.includes("INSERT INTO audit_logs")));
  assert.equal(f.calls.at(-1), "COMMIT");
  assert(f.released());
});

test("missing school returns 404 and rolls back", async () => {
  const f = fixture({ missing: true });
  await assert.rejects(deleteSchoolSafely(f.pool, 7, "test-actor"),
    (e: unknown) => e instanceof SchoolDeletionError && e.status === 404);
  assert(!f.calls.some(q => q.startsWith("DELETE")));
  assert.equal(f.calls.at(-1), "ROLLBACK");
  assert(f.released());
});

for (const linked of [
  "students", "invoices", "school_exam_registrations", "center_assignments",
  "exam_cards", "exam_card_batches", "bulk_uploads", "school_invitations", "users", "exam_centers",
]) {
  test(`refuses linked ${linked} without deleting any records`, async () => {
    const f = fixture({ linked });
    await assert.rejects(deleteSchoolSafely(f.pool, 7, "test-actor"),
      (e: unknown) => e instanceof SchoolDeletionError && e.status === 409);
    assert(!f.calls.some(q => q.startsWith("DELETE")));
    assert.equal(f.calls.at(-1), "ROLLBACK");
    assert(f.released());
  });
}

test("protects accounts linked through the school's admin_user_id", async () => {
  const f = fixture({ admin: true });
  await assert.rejects(deleteSchoolSafely(f.pool, 7, "test-actor"), SchoolDeletionError);
  assert(!f.calls.some(q => q.startsWith("DELETE")));
});

test("rolls back deletion if recording its audit fails", async () => {
  const f = fixture({ failAudit: true });
  await assert.rejects(deleteSchoolSafely(f.pool, 7, "test-actor"), /audit unavailable/);
  assert.equal(f.calls.at(-1), "ROLLBACK");
  assert(!f.calls.includes("COMMIT"));
  assert(f.released());
});

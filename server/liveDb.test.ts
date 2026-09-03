import { describe, it, expect } from "vitest";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

/**
 * Validates that LEGACY_DATABASE_URL points at the original live database.
 * The live DB is expected to contain thousands of crm_leads rows.
 */
describe("live database connection (LEGACY_DATABASE_URL)", () => {
  it("connects and reads real crm_leads data", async () => {
    expect(process.env.LEGACY_DATABASE_URL, "LEGACY_DATABASE_URL must be set").toBeTruthy();

    const db = await getDb();
    expect(db, "getDb() should return a connected instance").not.toBeNull();

    const rows = (await db!.execute(
      sql`SELECT COUNT(*) AS c FROM crm_leads`
    )) as any;
    // mysql2 returns [rows, fields]
    const result = Array.isArray(rows) ? rows[0] : rows;
    const count = Number((Array.isArray(result) ? result[0] : result).c);
    console.log(`[liveDb.test] crm_leads count = ${count}`);
    expect(count).toBeGreaterThan(1000);
  }, 30000);
});

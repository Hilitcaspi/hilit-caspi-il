import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Plus checkout migration consistency", () => {
  it("keeps the active operational database precedence and the Plus intent migration aligned", () => {
    const dbSource = fs.readFileSync(path.join(process.cwd(), "server/db.ts"), "utf8");
    const schemaSource = fs.readFileSync(path.join(process.cwd(), "drizzle/schema.ts"), "utf8");
    const migrationSource = fs.readFileSync(
      path.join(process.cwd(), "drizzle/0022_chilly_black_tarantula.sql"),
      "utf8",
    );

    expect(dbSource).toContain("process.env.LEGACY_DATABASE_URL || process.env.DATABASE_URL");
    expect(schemaSource).toContain('mysqlTable("plus_checkout_intents"');
    expect(migrationSource).toContain("CREATE TABLE `plus_checkout_intents`");
    expect(migrationSource).toContain("`status` enum('pending','paid_pending_profile','active','failed','cancelled')");
    expect(migrationSource).toContain("CREATE INDEX `plus_checkout_status_updated_idx`");
  });
});

import { sql, type SQL } from "drizzle-orm";

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizedEmailEquals(column: unknown, value: string): SQL {
  return sql`LOWER(TRIM(${column})) = ${normalizeEmail(value)}`;
}

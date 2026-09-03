import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { createPool, type Pool } from "mysql2/promise";

let testimonialPool: Pool | null = null;
let testimonialDb: MySql2Database<Record<string, never>> | null = null;

export async function getTestimonialDb() {
  if (testimonialDb) return testimonialDb;
  // Match the operational source used by server/db.ts so automation-created
  // records, public forms and the CRM always read and write the same database.
  const url = process.env.LEGACY_DATABASE_URL || process.env.DATABASE_URL || "";
  if (!url) return null;
  testimonialPool = createPool({
    uri: url,
    connectionLimit: 5,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    waitForConnections: true,
    queueLimit: 0,
  });
  await testimonialPool.query("SELECT 1");
  testimonialDb = drizzle(testimonialPool as any) as unknown as MySql2Database<Record<string, never>>;
  return testimonialDb;
}

export async function resetTestimonialDb() {
  if (testimonialPool) await testimonialPool.end().catch(() => undefined);
  testimonialPool = null;
  testimonialDb = null;
}

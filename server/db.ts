import { eq } from "drizzle-orm";
import { drizzle, MySql2Database } from "drizzle-orm/mysql2";
import { createPool, Pool } from "mysql2/promise";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

type DrizzleDb = MySql2Database<Record<string, never>>;
let _db: DrizzleDb | null = null;
let _pool: Pool | null = null;

/**
 * Returns a Drizzle instance backed by a mysql2 connection pool.
 * The pool automatically handles reconnection on ECONNRESET/ECONNREFUSED.
 * Retries up to 3 times with exponential backoff on failure.
 */
/**
 * Connection string. Prefer the original live database (LEGACY_DATABASE_URL)
 * so this project operates on the real production data; fall back to the
 * Manus-managed DATABASE_URL when the legacy URL is not set.
 */
function getDbUrl(): string {
  return process.env.LEGACY_DATABASE_URL || process.env.DATABASE_URL || "";
}

export async function getDb(): Promise<DrizzleDb | null> {
  if (_db) return _db;
  const dbUrl = getDbUrl();
  if (!dbUrl) return null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      _pool = createPool({
        uri: dbUrl,
        connectionLimit: 10,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        waitForConnections: true,
        queueLimit: 0,
      });

      // Test the connection
      await _pool.query("SELECT 1");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _db = drizzle(_pool as any) as unknown as DrizzleDb;
      console.log(`[Database] Pool connected successfully (attempt ${attempt})`);
      return _db;
    } catch (error) {
      console.error(`[Database] Failed to connect pool (attempt ${attempt}/3):`, error);
      _pool = null;
      _db = null;
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 1000 * attempt)); // 1s, 2s backoff
      }
    }
  }
  console.error("[Database] All connection attempts failed");
  return null;
}

/**
 * Reset the DB connection (called on fatal errors so the next request reconnects).
 * With a pool, we just destroy and recreate it.
 */
export function resetDb() {
  if (_pool) {
    _pool.end().catch(() => {}); // gracefully close existing connections
  }
  _pool = null;
  _db = null;
  console.log("[Database] Pool reset, will reconnect on next request");
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    // List of emails that should always get admin role
    const ADMIN_EMAILS = [
      'hilitcaspi@gmail.com',
      'shaharnat08@gmail.com',
      'drorbaraksm@gmail.com',
      'guy@justdigital.co.il',
    ];

    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId || (user.email && ADMIN_EMAILS.includes(user.email))) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

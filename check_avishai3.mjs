import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

// DNA quiz doesn't have email - it has sessionId. Check crm_leads and leads for this email
try {
  const crm = await db.execute(sql`SELECT * FROM crm_leads WHERE email LIKE '%avishai%'`);
  console.log("=== CRM LEADS ===");
  console.log(JSON.stringify(crm[0], null, 2));
} catch(e) { console.log("CRM error:", e.message); }

// Check users table
try {
  const users = await db.execute(sql`SELECT * FROM users WHERE email LIKE '%avishai%'`);
  console.log("\n=== USERS ===");
  console.log(JSON.stringify(users[0], null, 2));
} catch(e) { console.log("Users error:", e.message); }

// Check singles table columns
try {
  const cols = await db.execute(sql`SHOW COLUMNS FROM singles`);
  console.log("\n=== SINGLES COLUMNS ===");
  const colNames = cols[0].map(c => c.Field);
  console.log(colNames.join(", "));
} catch(e) { console.log("Error:", e.message); }

await connection.end();

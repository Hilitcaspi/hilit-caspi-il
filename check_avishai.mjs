import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

// Search singles
try {
  const singles = await db.execute(sql`SELECT id, firstName, lastName, email, phone, gender, age, city, isActive FROM singles WHERE email LIKE '%avishai%' OR firstName LIKE '%אבישי%'`);
  console.log("=== SINGLES ===");
  console.log(JSON.stringify(singles[0], null, 2));
} catch(e) { console.log("Singles error:", e.message); }

// Search dna_quiz_results
try {
  const dna = await db.execute(sql`SELECT * FROM dna_quiz_results WHERE email LIKE '%avishai%' OR first_name LIKE '%אבישי%'`);
  console.log("\n=== DNA QUIZ ===");
  console.log(JSON.stringify(dna[0], null, 2));
} catch(e) { console.log("DNA error:", e.message); }

// Search payment_leads
try {
  const payments = await db.execute(sql`SELECT * FROM payment_leads WHERE email LIKE '%avishai%'`);
  console.log("\n=== PAYMENT LEADS ===");
  console.log(JSON.stringify(payments[0], null, 2));
} catch(e) { console.log("Payments error:", e.message); }

// Search leads
try {
  const leads = await db.execute(sql`SELECT * FROM leads WHERE email LIKE '%avishai%'`);
  console.log("\n=== LEADS ===");
  console.log(JSON.stringify(leads[0], null, 2));
} catch(e) { console.log("Leads error:", e.message); }

await connection.end();

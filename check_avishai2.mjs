import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

// Check dna columns
try {
  const cols = await db.execute(sql`SHOW COLUMNS FROM dna_quiz_results`);
  console.log("=== DNA COLUMNS ===");
  const colNames = cols[0].map(c => c.Field);
  console.log(colNames.join(", "));
} catch(e) { console.log("Error:", e.message); }

// Search dna with correct column
try {
  const dna = await db.execute(sql`SELECT * FROM dna_quiz_results WHERE email LIKE '%avishai%' OR firstName LIKE '%אבישי%'`);
  console.log("\n=== DNA QUIZ (firstName) ===");
  console.log(JSON.stringify(dna[0], null, 2));
} catch(e) {
  // Try with first_name
  try {
    const dna2 = await db.execute(sql`SELECT * FROM dna_quiz_results WHERE email LIKE '%avishai%'`);
    console.log("\n=== DNA QUIZ (email only) ===");
    console.log(JSON.stringify(dna2[0], null, 2));
  } catch(e2) { console.log("DNA error2:", e2.message); }
}

await connection.end();

import mysql from "mysql2/promise";

const url = process.env.LEGACY_DATABASE_URL || process.env.DATABASE_URL;
if (!url) throw new Error("Database URL is unavailable");

const connection = await mysql.createConnection(url);
const names = [
  "testimonial_records",
  "testimonial_media",
  "testimonial_usage",
  "testimonial_events",
];

const result = {};
for (const name of names) {
  const [rows] = await connection.query(
    "SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
    [name],
  );
  result[name] = Number(rows[0]?.table_count || 0);
}

console.log(JSON.stringify(result));
await connection.end();

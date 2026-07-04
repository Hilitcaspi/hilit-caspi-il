import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Search singles
const [singles] = await conn.execute(
  `SELECT id, firstName, lastName, email, phone FROM singles WHERE firstName LIKE '%שושי%' OR firstName LIKE '%Shoshi%' OR email LIKE '%shoshi%' OR email LIKE '%inbar%' OR lastName LIKE '%ענבר%' OR lastName LIKE '%inbar%'`
);
console.log("Singles:", JSON.stringify(singles, null, 2));

// Search payment_leads
const [pLeads] = await conn.execute(
  `SELECT id, name, email, phone, product FROM payment_leads WHERE email LIKE '%inbar%' OR email LIKE '%shoshi%' ORDER BY id DESC LIMIT 5`
);
console.log("Payment leads:", JSON.stringify(pLeads, null, 2));

// Search crm_leads (correct table name)
const [crmLeads] = await conn.execute(
  `SELECT id, name, email, phone, status, source FROM crm_leads WHERE email LIKE '%inbar%' OR email LIKE '%shoshi%' ORDER BY id DESC LIMIT 5`
);
console.log("CRM leads:", JSON.stringify(crmLeads, null, 2));

// Search leads table
const [leads] = await conn.execute(
  `SELECT id, name, email, phone, source FROM leads WHERE email LIKE '%inbar%' OR email LIKE '%shoshi%' ORDER BY id DESC LIMIT 5`
);
console.log("Leads:", JSON.stringify(leads, null, 2));

await conn.end();

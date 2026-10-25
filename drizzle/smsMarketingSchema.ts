import { bigint, int, mysqlTable, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/** Marketing-only SMS suppression. Does not revoke transactional service contact. */
export const smsMarketingOptouts = mysqlTable("sms_optouts", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  source: varchar("source", { length: 60 }).notNull().default("signed_sms_token"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, table => ({
  phoneUnique: uniqueIndex("sms_optouts_phone_unique").on(table.phone),
}));

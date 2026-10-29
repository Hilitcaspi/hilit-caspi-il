import { bigint, boolean, index, mediumtext, mysqlEnum, mysqlTable, varchar } from "drizzle-orm/mysql-core";

/** Server-only checkout coordination. Never expose resultJson/provider tokens to staff listings. */
export const checkoutReservations = mysqlTable("checkout_reservations", {
  reservationKey: varchar("reservation_key", { length: 64 }).primaryKey(),
  scopeKind: varchar("scope_kind", { length: 191 }).notNull(),
  attemptId: varchar("attempt_id", { length: 36 }).notNull(),
  bindingHmac: varchar("binding_hmac", { length: 64 }).notNull(),
  ownerToken: varchar("owner_token", { length: 64 }).notNull(),
  state: mysqlEnum("state", ["creating", "open", "uncertain", "completed", "failed"]).notNull(),
  resultJson: mediumtext("result_json"),
  diagnosticTest: boolean("diagnostic_test").default(false).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, table => [index("checkout_reservations_state_updated_idx").on(table.state, table.updatedAt)]);

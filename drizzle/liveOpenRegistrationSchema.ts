import { bigint, boolean, index, int, mysqlTable, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Public registrations for the October live event.
 * This table is intentionally separate from member/profile records: the
 * `isDatabaseMember` value is a self-declaration only, not an eligibility check.
 */
export const liveOpenRegistrations = mysqlTable("live_open_registrations", {
  id: int("id").autoincrement().primaryKey(),
  eventSlug: varchar("event_slug", { length: 64 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  // Self-declared for staff context only. It is never a member lookup or entitlement.
  isDatabaseMember: boolean("is_database_member").notNull(),
  marketingConsent: boolean("marketing_consent").notNull(),
  consentVersion: varchar("consent_version", { length: 40 }).notNull().default("live-open-v1"),
  consentedAt: bigint("consented_at", { mode: "number" }),
  registeredAt: bigint("registered_at", { mode: "number" }).notNull(),
  ticketId: int("ticket_id"),
  utmSource: varchar("utm_source", { length: 100 }),
  utmMedium: varchar("utm_medium", { length: 100 }),
  utmCampaign: varchar("utm_campaign", { length: 200 }),
  utmContent: varchar("utm_content", { length: 200 }),
}, (t) => ({
  eventEmailUnique: uniqueIndex("live_open_registration_event_email_unique").on(t.eventSlug, t.email),
  ticketIdx: index("live_open_registration_ticket_idx").on(t.ticketId),
}));

export type LiveOpenRegistration = typeof liveOpenRegistrations.$inferSelect;
export type InsertLiveOpenRegistration = typeof liveOpenRegistrations.$inferInsert;

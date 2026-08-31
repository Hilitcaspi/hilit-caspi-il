import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const singleOfWeekApplications = mysqlTable("single_of_week_applications", {
  id: int("id").autoincrement().primaryKey(),
  fullName: varchar("fullName", { length: 120 }).notNull(),
  age: int("age").notNull(),
  city: varchar("city", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  selfDescription: text("selfDescription").notNull(),
  desiredPartner: text("desiredPartner").notNull(),
  relationshipStatus: mysqlEnum("relationshipStatus", ["single", "divorced", "widowed", "separated", "other"]).notNull(),
  hasChildren: boolean("hasChildren").notNull(),
  dnaResult: varchar("dnaResult", { length: 100 }),
  instagramUsername: varchar("instagramUsername", { length: 30 }).notNull(),
  photoKey: varchar("photoKey", { length: 512 }).notNull(),
  photoUrl: varchar("photoUrl", { length: 1024 }).notNull(),
  photoFilename: varchar("photoFilename", { length: 255 }).notNull(),
  photoMimeType: varchar("photoMimeType", { length: 32 }).notNull(),
  photoSizeBytes: int("photoSizeBytes").notNull(),
  databaseMembershipConsent: boolean("databaseMembershipConsent").notNull(),
  instagramFollowConsent: boolean("instagramFollowConsent").notNull(),
  publicationConsent: boolean("publicationConsent").notNull(),
  consentedAt: timestamp("consentedAt").defaultNow().notNull(),
  reviewStatus: mysqlEnum("reviewStatus", ["new", "reviewing", "approved", "rejected"]).default("new").notNull(),
  reviewedAt: timestamp("reviewedAt"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SingleOfWeekApplication = typeof singleOfWeekApplications.$inferSelect;
export type InsertSingleOfWeekApplication = typeof singleOfWeekApplications.$inferInsert;
export type SingleOfWeekReviewStatus = "new" | "reviewing" | "approved" | "rejected";

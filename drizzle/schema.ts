import {
  int,
  bigint,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  float,
  index,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
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

/**
 * DNA personality types used across the platform.
 * leader = המנהיגה המגנטת
 * romantic = הרומנטית העמוקה
 * free_spirit = רוח חופשית
 * anchor = העוגן היציב
 */
export const DNA_TYPES = ["leader", "romantic", "free_spirit", "anchor"] as const;
export type DnaType = typeof DNA_TYPES[number];

export const DNA_LABELS: Record<DnaType, { he_f: string; he_m: string; en: string }> = {
  leader:      { he_f: "המנהיגה המגנטת",   he_m: "המנהיג המגנטי",    en: "The Magnetic Leader" },
  romantic:    { he_f: "הרומנטית העמוקה",  he_m: "הרומנטיקן העמוק",  en: "The Deep Romantic" },
  free_spirit: { he_f: "רוח חופשית",        he_m: "רוח חופשית",        en: "The Free Spirit" },
  anchor:      { he_f: "העוגן היציב",       he_m: "העוגן היציב",       en: "The Stable Anchor" },
};

/**
 * Singles profiles - both real registered users and seed/fictional profiles
 */
export const singles = mysqlTable("singles", {
  id: int("id").autoincrement().primaryKey(),

  // Identity
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }),
  gender: mysqlEnum("gender", ["female", "male"]).notNull(),
  age: int("age").notNull(),
  birthDate: varchar("birthDate", { length: 10 }), // ISO date YYYY-MM-DD for astrology
  city: varchar("city", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),

  // Profile details
  height: int("height"), // cm
  education: mysqlEnum("education", ["high_school", "vocational", "technician", "student", "bachelor", "master", "phd", "other"]),
  religiosity: mysqlEnum("religiosity", ["secular", "traditional", "religious", "orthodox", "datlash"]),
  religiosityOrigin: mysqlEnum("religiosityOrigin", ["cultural", "halachic"]), // For traditional: cultural/family tradition or halachic observance?
  shomerShabbat: boolean("shomerShabbat"), // For religious/traditional: do they observe Shabbat?
  occupation: varchar("occupation", { length: 150 }),
  about: text("about"),
  interests: text("interests"), // comma-separated

  // Family status
  maritalStatus: mysqlEnum("maritalStatus", ["single", "divorced", "widowed"]),
  hasKids: boolean("hasKids").default(false),
  numKids: int("numKids").default(0),
  wantsKids: mysqlEnum("wantsKids", ["yes", "no", "open"]),

  // DNA Personality type (from free quiz, auto-populated)
  dnaType: mysqlEnum("dnaType", ["leader", "romantic", "free_spirit", "anchor"]),
  // Score breakdown per group (stored as JSON string)
  dnaScores: text("dnaScores"),

  // Who they are seeking (supports same-sex)
  // "female" | "male" | "any"
  seekingGender: mysqlEnum("seekingGender", ["female", "male", "any"]),

  // Chapter 2 fields (for divorced/widowed with kids)
  stepParentOpenness: mysqlEnum("stepParentOpenness", ["yes", "open", "no"]),
  openToPartnerWithKids: mysqlEnum("openToPartnerWithKids", ["yes", "no", "depends_on_age"]), // Open to partner who already has kids?
  kidsInvolvement: mysqlEnum("kidsInvolvement", ["full_time", "weekends", "rarely", "grown"]),
  relationshipPace: mysqlEnum("relationshipPace", ["slow", "medium", "fast"]),

  // Pets
  hasPets: boolean("hasPets").default(false),
  petType: varchar("petType", { length: 100 }), // e.g. "כלב", "חתול"
  acceptsPets: boolean("acceptsPets"),

  // Partner preferences
  minAgePreference: int("minAgePreference"),
  maxAgePreference: int("maxAgePreference"),
  minHeightPreference: int("minHeightPreference"),
  maxHeightPreference: int("maxHeightPreference"),
  religiosityPreference: varchar("religiosityPreference", { length: 100 }), // comma-separated
  acceptsKids: boolean("acceptsKids"),
  locationPreference: mysqlEnum("locationPreference", ["close", "anywhere"]),
  // Smoking
  smokingStatus: mysqlEnum("smokingStatus", ["no", "occasionally", "yes"]),
  smokingPreference: mysqlEnum("smokingPreference", ["no_smokers", "occasionally_ok", "doesnt_matter"]),
  partnerDescription: text("partnerDescription"), // free text: what she/he is looking for

  // Photo
  photoUrl: text("photoUrl"),
  photoUploadToken: varchar("photoUploadToken", { length: 64 }),
  photoUploadTokenExpiresAt: bigint("photoUploadTokenExpiresAt", { mode: "number" }),

  // Scientific questionnaire token (sent by email after payment, used to complete the 15-question quiz)
  questionnaireToken: varchar("questionnaireToken", { length: 64 }),
  questionnaireCompletedAt: bigint("questionnaireCompletedAt", { mode: "number" }),
  // Registration source tracking
  registrationSource: varchar("registrationSource", { length: 50 }), // 'facebook_ad' | 'email' | 'direct' | 'organic'
  utmSource: varchar("utmSource", { length: 100 }),
  utmMedium: varchar("utmMedium", { length: 100 }),
  utmCampaign: varchar("utmCampaign", { length: 200 }),
  utmContent: varchar("utmContent", { length: 200 }),
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  isSeed: boolean("isSeed").default(false).notNull(),
  isPaid: boolean("isPaid").default(false).notNull(),
  paymentRef: varchar("paymentRef", { length: 100 }),

  // Subscription (₪199 entry + ₪119/month renewal)
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["active", "cancelled", "expired"]).default("active"),
  subscriptionStartedAt: bigint("subscriptionStartedAt", { mode: "number" }),
  subscriptionRenewsAt: bigint("subscriptionRenewsAt", { mode: "number" }),
  subscriptionCancelledAt: bigint("subscriptionCancelledAt", { mode: "number" }),

  // US Market fields
  market: mysqlEnum("market", ["il", "us"]).default("il"), // which market this single belongs to
  country: varchar("country", { length: 10 }).default("IL"), // ISO country code: "IL" or "US"
  usState: varchar("usState", { length: 100 }), // US state (for US market singles)
  zoomOk: boolean("zoomOk").default(false), // willing to do Zoom/video dates

  // Consent (collected at registration)
  consentMatchmaking: boolean("consentMatchmaking").default(false).notNull(), // agrees to receive match proposals
  consentDataSharing: boolean("consentDataSharing").default(false).notNull(), // agrees profile shared with matches
  consentEmailMarketing: boolean("consentEmailMarketing").default(false).notNull(), // agrees to marketing emails

  // CRM flags
  isCoachingClient: boolean("isCoachingClient").default(false).notNull(), // pink highlight - coaching client
  isNotBasic: boolean("isNotBasic").default(false).notNull(), // "דורש תשומת לב" flag
  adminNotes: text("adminNotes"), // internal notes visible only to admin/team

  createdAt: bigint("createdAt", { mode: "number" }).notNull().default(0),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull().default(0),
});

export type Single = typeof singles.$inferSelect;
export type InsertSingle = typeof singles.$inferInsert;

/**
 * DNA Quiz results - stores the 20-statement quiz answers and computed result
 */
export const dnaQuizResults = mysqlTable("dna_quiz_results", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  gender: mysqlEnum("gender", ["female", "male"]),
  dnaType: mysqlEnum("dnaType", ["leader", "romantic", "free_spirit", "anchor"]).notNull(),
  // Scores per group (A/B/C/D) stored as JSON: {"A":23,"B":18,"C":15,"D":20}
  scores: text("scores").notNull(),
  // Raw answers stored as JSON array of 20 numbers
  answers: text("answers"),
  // Whether this session converted to a paid profile
  convertedToRegistration: boolean("convertedToRegistration").default(false),
  singleId: int("singleId"), // set when they register
  // UTM tracking fields — captured from URL params when quiz is submitted
  utmSource: varchar("utmSource", { length: 100 }),
  utmMedium: varchar("utmMedium", { length: 100 }),
  utmCampaign: varchar("utmCampaign", { length: 200 }),
  utmContent: varchar("utmContent", { length: 200 }),
  utmTerm: varchar("utmTerm", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DnaQuizResult = typeof dnaQuizResults.$inferSelect;
export type InsertDnaQuizResult = typeof dnaQuizResults.$inferInsert;

/**
 * Matches - double opt-in matchmaking between two singles
 * Flow: Hilit proposes match → both get email → both click "I'm interested" → contact details revealed
 */
export const matches = mysqlTable("matches", {
  id: int("id").autoincrement().primaryKey(),

  // Legacy columns (kept for DB backward compatibility - NOT NULL in DB)
  singleId: int("singleId").notNull().default(0),
  matchedSingleId: int("matchedSingleId").notNull().default(0),

  // The two singles being matched
  singleAId: int("singleAId").notNull().default(0),
  singleBId: int("singleBId").notNull().default(0),

  // Compatibility score (0-100)
  score: float("score"),

  // Who proposed the match and when
  proposedAt: bigint("proposedAt", { mode: "number" }),
  emailAOpenedAt: bigint("emailAOpenedAt", { mode: "number" }),
  emailBOpenedAt: bigint("emailBOpenedAt", { mode: "number" }),

  // Double opt-in consent (legacy field names kept for compatibility)
  singleAConsent: boolean("singleAConsent").default(false).notNull(),
  singleBConsent: boolean("singleBConsent").default(false).notNull(),
  singleAConsentAt: bigint("singleAConsentAt", { mode: "number" }),
  singleBConsentAt: bigint("singleBConsentAt", { mode: "number" }),

  // Unique tokens for consent links in emails
  singleAToken: varchar("singleAToken", { length: 64 }),
  singleBToken: varchar("singleBToken", { length: 64 }),

  // New approval token fields (used in matchmaking flow)
  approvalTokenA: varchar("approvalTokenA", { length: 64 }),
  tokenAUsedAt: bigint("tokenAUsedAt", { mode: "number" }),
  approvalTokenB: varchar("approvalTokenB", { length: 64 }),
  tokenBUsedAt: bigint("tokenBUsedAt", { mode: "number" }),
  approvalExpiresAt: bigint("approvalExpiresAt", { mode: "number" }),
  approvedByA: boolean("approvedByA").default(false).notNull(),
  approvedByB: boolean("approvedByB").default(false).notNull(),

  // Match status
  status: mysqlEnum("status", ["pending", "proposed", "matched", "rejected", "expired"]).default("pending").notNull(),
  matchedAt: bigint("matchedAt", { mode: "number" }),
  contactRevealedAt: bigint("contactRevealedAt", { mode: "number" }),

  // Owner (Hilit) approval before sending to singles
  ownerApprovalToken: varchar("ownerApprovalToken", { length: 64 }),
  ownerApprovedAt: bigint("ownerApprovedAt", { mode: "number" }),

  // Score breakdown per dimension (JSON: {dna, age, religiosity, kids, city, total})
  scoreBreakdown: text("scoreBreakdown"),
  // Auto-generated explanation in Hilit's voice
  autoExplanation: text("autoExplanation"),
  // Notes
  notes: text("notes"),
  // Follow-up email tracking (sent 7 days after proposal if no response)
  followUpSentAt: bigint("followUpSentAt", { mode: "number" }),
  // Retry tracking: if initial proposal emails were not opened after 30 min, resend once
  emailRetriedAt: bigint("emailRetriedAt", { mode: "number" }),
  // WhatsApp notification tracking: when the initial match proposal WA was sent (prevents duplicates)
  waSentAt: bigint("waSentAt", { mode: "number" }),
  // Post-match lifecycle: after both approve, track follow-up emails and return-to-pool
  matchWeekFollowupSentAt: bigint("matchWeekFollowupSentAt", { mode: "number" }),
  matchMonthFollowupSentAt: bigint("matchMonthFollowupSentAt", { mode: "number" }),
  // When singles explicitly returned to the pool (null = still out)
  returnedToPoolAt: bigint("returnedToPoolAt", { mode: "number" }),
  // Post-match detailed status (set by admin)
  matchDetailStatus: mysqlEnum("matchDetailStatus", ["talking", "dating", "met", "together", "ended"]),

  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: bigint("updatedAt", { mode: "number" }).default(0),
});

export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;

/**
 * CRM Lead statuses:
 * new_lead        - filled DNA quiz + left contact details, no purchase yet
 * needs_followup  - 48h passed with no purchase → flag for WhatsApp follow-up
 * call_scheduled  - booked a 10-min intro call via Calendly
 * call_done       - call happened, outcome pending
 * client_database - paid ₪199, entered the singles database
 * client_guide    - purchased ₪149 guide
 * client_course   - purchased ₪249 course (המסע)
 * client_coaching - purchased ₪3,500 coaching package (8 sessions)
 * not_relevant    - cancelled / not interested
 */
export const CRM_STATUSES = [
  "new_lead",
  "needs_followup",
  "call_scheduled",
  "call_done",
  "client_database",
  "client_guide",
  "client_course",
  "client_coaching",
  "not_relevant",
] as const;
export type CrmStatus = typeof CRM_STATUSES[number];

/**
 * CRM Leads - full pipeline management for Hilit
 */
export const crmLeads = mysqlTable("crm_leads", {
  id: int("id").autoincrement().primaryKey(),

  // Contact info
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  gender: mysqlEnum("gender", ["female", "male"]),

  // Source tracking
  source: mysqlEnum("source", ["dna_quiz", "guide_form", "direct", "referral", "instagram", "podcast", "meta_lead_guide", "meta_lead_dna", "meta_lead_call", "press_article"]).default("dna_quiz"),

  // DNA quiz result (if came from quiz)
  dnaType: mysqlEnum("dnaType", ["leader", "romantic", "free_spirit", "anchor"]),
  quizSessionId: varchar("quizSessionId", { length: 64 }),

  // CRM pipeline status
  status: mysqlEnum("status", [
    "new_lead",
    "needs_followup",
    "call_scheduled",
    "call_done",
    "client_database",
    "client_guide",
    "client_course",
    "client_coaching",
    "not_relevant",
  ]).default("new_lead").notNull(),

  // Meeting scheduling
  meetingAt: timestamp("meetingAt"), // scheduled 10-min call time
  meetingReminder1Sent: boolean("meetingReminder1Sent").default(false), // day before
  meetingReminder2Sent: boolean("meetingReminder2Sent").default(false), // 2h before

  // Follow-up tracking
  followupSentAt: timestamp("followupSentAt"), // when automated follow-up email was sent
  followupFlaggedAt: timestamp("followupFlaggedAt"), // when flagged for manual WhatsApp

  // Notes (Hilit's private notes about this lead)
  notes: text("notes"),

  // Linked single profile (if they registered)
  singleId: int("singleId"),

  // Email opt-out
  emailUnsubscribed: boolean("emailUnsubscribed").default(false),
  emailUnsubscribedAt: bigint("emailUnsubscribedAt", { mode: "number" }),

  // Payment reference
  paymentRef: varchar("paymentRef", { length: 100 }),
  product: mysqlEnum("product", ["database", "guide", "course", "coaching", "coaching_mas"]),

  // UTM tracking — populated from Grow webhook when purchase occurs
  utmSource: varchar("utmSource", { length: 100 }),
  utmMedium: varchar("utmMedium", { length: 100 }),
  utmCampaign: varchar("utmCampaign", { length: 200 }),
  utmContent: varchar("utmContent", { length: 200 }),
  utmTerm: varchar("utmTerm", { length: 200 }),
  metaCampaignId: varchar("metaCampaignId", { length: 100 }),
  metaAdSetId: varchar("metaAdSetId", { length: 100 }),
  metaAdId: varchar("metaAdId", { length: 100 }),

  // GA4 browser client_id (from _ga cookie) — used to stitch server-side purchase events to the browser session
  ga4ClientId: varchar("ga4ClientId", { length: 100 }),
  ga4SessionId: varchar("ga4SessionId", { length: 50 }),

  createdAt: bigint("createdAt", { mode: "number" }).notNull().default(0),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull().default(0),
});

export type CrmLead = typeof crmLeads.$inferSelect;
export type InsertCrmLead = typeof crmLeads.$inferInsert;

/**
 * Email log - tracks all automated emails sent to leads (automation sequences)
 * Supports scheduling: emails with sentAt=null and scheduledAt in the future are pending
 */
export const emailLog = mysqlTable("email_log", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId"),  // optional link to crm_leads
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  recipientName: varchar("recipientName", { length: 100 }),
  journeyKey: varchar("journeyKey", { length: 50 }).notNull(), // e.g. 'women_first_step'
  emailIndex: int("emailIndex").notNull(), // 1, 2, or 3
  subject: varchar("subject", { length: 500 }).notNull(),
  htmlBody: text("htmlBody").notNull(),
  textBody: text("textBody"),
  scheduledAt: bigint("scheduledAt", { mode: "number" }).notNull(), // unix ms
  sentAt: bigint("sentAt", { mode: "number" }), // null = not yet sent
  status: mysqlEnum("status", ["pending", "processing", "sent", "failed", "cancelled"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  openedAt: bigint("openedAt", { mode: "number" }),       // first open timestamp
  openCount: int("openCount").default(0).notNull(),        // total opens
  clickedAt: bigint("clickedAt", { mode: "number" }),      // first click timestamp
  clickCount: int("clickCount").default(0).notNull(),      // total clicks
  createdAt: bigint("createdAt", { mode: "number" }).notNull().default(0),
});

export type EmailLog = typeof emailLog.$inferSelect;
export type InsertEmailLog = typeof emailLog.$inferInsert;

/**
 * Legacy leads table (from landing page guide form) - kept for backwards compatibility
 */
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  source: varchar("source", { length: 50 }).default("guide"),
  utmSource: varchar("utmSource", { length: 100 }),
  utmMedium: varchar("utmMedium", { length: 100 }),
  utmCampaign: varchar("utmCampaign", { length: 200 }),
  utmContent: varchar("utmContent", { length: 200 }),
  utmTerm: varchar("utmTerm", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Blog posts - articles written by Hilit for SEO and content marketing
 */
export const blogPosts = mysqlTable("blog_posts", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  slug: varchar("slug", { length: 300 }).notNull().unique(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(), // full markdown/HTML content
  coverImage: text("coverImage"), // CDN URL
  metaDescription: varchar("metaDescription", { length: 160 }),
  tags: varchar("tags", { length: 500 }), // comma-separated
  isPublished: boolean("isPublished").default(true).notNull(),
  publishedAt: bigint("publishedAt", { mode: "number" }).notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull().default(0),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull().default(0),
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;

/**
 * Free access tokens - single-use tokens that grant free entry to the matchmaking database
 * Generated when someone purchases the ₪149 guide; token is emailed and redeemed at /join
 */
export const freeAccessTokens = mysqlTable("free_access_tokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull(), // bound to the buyer's email
  source: varchar("source", { length: 50 }).default("guide_149"), // which product granted this
  usedAt: bigint("usedAt", { mode: "number" }), // null = not yet used
  usedByEmail: varchar("usedByEmail", { length: 320 }), // email of the person who redeemed it
  expiresAt: bigint("expiresAt", { mode: "number" }).notNull(), // 7 days from creation
  createdAt: bigint("createdAt", { mode: "number" }).notNull().default(0),
});

export type FreeAccessToken = typeof freeAccessTokens.$inferSelect;
export type InsertFreeAccessToken = typeof freeAccessTokens.$inferInsert;

/**
 * Product access tokens - long-lived tokens granting access to paid digital products
 * Generated when someone purchases the guide (149) or course (249)
 * Token never expires (or expires after 1 year, renewable)
 */
export const productAccessTokens = mysqlTable("product_access_tokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 100 }),
  product: mysqlEnum("product", ["guide_149", "course_249", "guide_live_bonus"]).notNull(),
  paymentRef: varchar("paymentRef", { length: 100 }),
  // Expires 1 year from creation (renewable)
  expiresAt: bigint("expiresAt", { mode: "number" }).notNull(),
  lastAccessAt: bigint("lastAccessAt", { mode: "number" }),
  accessCount: int("accessCount").default(0).notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull().default(0),
  // Device fingerprint: locked to the first device that accesses the token
  deviceFingerprint: varchar("deviceFingerprint", { length: 255 }),
});

export type ProductAccessToken = typeof productAccessTokens.$inferSelect;
export type InsertProductAccessToken = typeof productAccessTokens.$inferInsert;

/**
 * Course progress - tracks which modules/steps a user has completed
 * Keyed by token so no login required
 */
export const courseProgress = mysqlTable("course_progress", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 64 }).notNull(), // links to productAccessTokens
  product: mysqlEnum("product", ["guide_149", "course_249", "guide_live_bonus"]).notNull(),
  // Completed chapter/module IDs stored as JSON array: [1, 2, 3]
  completedChapters: text("completedChapters").notNull(),
  // Exercise answers stored as JSON: {"ch1_q1": "my answer", ...}
  exerciseAnswers: text("exerciseAnswers").notNull(),
  // Last chapter the user was on
  lastChapterId: int("lastChapterId").default(1).notNull(),
  // User profile collected at guide start
  userName: varchar("userName", { length: 100 }),
  userGender: mysqlEnum("userGender", ["female", "male", "other"]),
  userBirthdate: varchar("userBirthdate", { length: 10 }), // YYYY-MM-DD
  // AI-generated personal analysis (stored after completion)
  analysisResult: text("analysisResult"),
  analysisGeneratedAt: bigint("analysisGeneratedAt", { mode: "number" }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull().default(0),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull().default(0),
});

export type CourseProgress = typeof courseProgress.$inferSelect;
export type InsertCourseProgress = typeof courseProgress.$inferInsert;

/**
 * Matchmaking questionnaire answers - OkCupid-style compatibility questions
 * Each single answers 20 questions with:
 *   - their own answer (1-5 scale or option index)
 *   - how important it is that the match answers similarly (0=not important, 1=somewhat, 2=very important)
 * Stored as JSON for flexibility.
 *
 * answersJson format: [{ qId: string, myAnswer: number, importance: 0|1|2 }, ...]
 */
export const matchmakingAnswers = mysqlTable("matchmaking_answers", {
  id: int("id").autoincrement().primaryKey(),
  singleId: int("singleId").notNull(), // FK to singles.id
  // Full answers array as JSON
  answersJson: text("answersJson").notNull(),
  // Computed compatibility scores cache (updated on each run)
  // Format: { "singleId": score, ... } - top matches only
  compatibilityCache: text("compatibilityCache"),
  completedAt: bigint("completedAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull().default(0),
});

export type MatchmakingAnswers = typeof matchmakingAnswers.$inferSelect;
export type InsertMatchmakingAnswers = typeof matchmakingAnswers.$inferInsert;

/**
 * Free invite tokens - Hilit can generate and send these manually
 * Grants one-time free access to the matchmaking questionnaire (skips payment)
 * Different from freeAccessTokens (which come from guide purchase)
 */
export const inviteTokens = mysqlTable("invite_tokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  // Optional: bound to a specific email (if Hilit knows who she's inviting)
  boundEmail: varchar("boundEmail", { length: 320 }),
  // Note for Hilit's reference (who did she send this to)
  note: varchar("note", { length: 200 }),
  usedAt: bigint("usedAt", { mode: "number" }),
  usedByEmail: varchar("usedByEmail", { length: 320 }),
  usedBySingleId: int("usedBySingleId"),
  expiresAt: bigint("expiresAt", { mode: "number" }).notNull(), // 30 days
  createdAt: bigint("createdAt", { mode: "number" }).notNull().default(0),
});

export type InviteToken = typeof inviteTokens.$inferSelect;
export type InsertInviteToken = typeof inviteTokens.$inferInsert;

/**
 * Analytics Events - tracks every meaningful user action across the site
 * Used for: email opens (pixel), guide downloads, product page views, CTA clicks, etc.
 */
export const analyticsEvents = mysqlTable("analytics_events", {
  id: int("id").autoincrement().primaryKey(),
  eventType: mysqlEnum("eventType", [
    "email_open",
    "email_click",
    "guide_view",
    "guide_download",
    "database_view",
    "database_cta",
    "course_view",
    "course_cta",
    "coaching_view",
    "coaching_cta",
    "dna_quiz_start",
    "dna_quiz_complete",
    "calendly_click",
    "whatsapp_click",
    "podcast_click",
    "page_view",
    "button_click",
    "section_view",
    "scroll_depth",
    "form_start",
    "form_submit",
    "product_click",
    "intro_meeting_click",
    "free_guide_cta",
  ]).notNull(),
  email: varchar("email", { length: 320 }),
  leadId: int("leadId"),
  page: varchar("page", { length: 200 }),
  emailJourney: varchar("emailJourney", { length: 100 }),
  emailIndex: int("emailIndex"),
  utmSource: varchar("utmSource", { length: 100 }),
  utmMedium: varchar("utmMedium", { length: 100 }),
  utmCampaign: varchar("utmCampaign", { length: 100 }),
  utmContent: varchar("utmContent", { length: 200 }),
  metadata: text("metadata"),
  userAgent: varchar("userAgent", { length: 500 }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull().default(0),
});
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;

/**
 * Profile Update Requests - singles can submit changes to their profile
 * Hilit reviews and approves/rejects before changes are applied
 */
export const profileUpdateRequests = mysqlTable("profile_update_requests", {
  id: int("id").autoincrement().primaryKey(),
  singleId: int("singleId").notNull(), // FK to singles.id
  // Snapshot of requested changes as JSON (same fields as singles table)
  changesJson: text("changesJson").notNull(),
  // Optional photo upload URL (pending approval)
  pendingPhotoUrl: text("pendingPhotoUrl"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  // Admin note on rejection
  adminNote: varchar("adminNote", { length: 500 }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull().default(0),
  reviewedAt: bigint("reviewedAt", { mode: "number" }),
});
export type ProfileUpdateRequest = typeof profileUpdateRequests.$inferSelect;
export type InsertProfileUpdateRequest = typeof profileUpdateRequests.$inferInsert;

/**
 * Live Event Registrations - for the Q&A Zoom live event
 */
export const liveEventRegistrations = mysqlTable("live_event_registrations", {
  id: int("id").autoincrement().primaryKey(),
  eventSlug: varchar("eventSlug", { length: 100 }).notNull().default("live-qa-june-2026"),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  guideSent: boolean("guideSent").default(false),
  confirmationSent: boolean("confirmationSent").default(false),
  createdAt: bigint("createdAt", { mode: "number" }).notNull().default(0),
});
export type LiveEventRegistration = typeof liveEventRegistrations.$inferSelect;
export type InsertLiveEventRegistration = typeof liveEventRegistrations.$inferInsert;

/**
 * WhatsApp Group Click Tracking
 * Each row = one click on a WhatsApp group redirect link.
 * source values: 'site' | 'email' | 'thankyou' | 'bio' | 'instagram'
 */
export const waClicks = mysqlTable("wa_clicks", {
  id: int("id").autoincrement().primaryKey(),
  source: varchar("source", { length: 50 }).notNull(), // 'site' | 'email' | 'thankyou' | 'bio' | 'instagram'
  ip: varchar("ip", { length: 45 }),
  userAgent: varchar("userAgent", { length: 500 }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull().default(0),
});
export type WaClick = typeof waClicks.$inferSelect;
export type InsertWaClick = typeof waClicks.$inferInsert;

/**
 * Discount Codes (Coupons) - Hilit can create and distribute these
 * Each code gives a percentage or fixed discount on a specific product (or all products)
 */
export const discountCodes = mysqlTable("discount_codes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // e.g. "HILIT20"
  discountPercent: int("discountPercent"), // e.g. 20 for 20%
  discountAmount: int("discountAmount"),   // fixed ₪ discount (alternative to percent)
  fixedPrice: int("fixedPrice"),           // override to exact price (e.g. 1 for 1₪ test)
  // Which products this applies to (null = all products)
  product: varchar("product", { length: 50 }), // 'guide' | 'course' | 'coaching' | 'session' | 'database' | null
  maxUses: int("maxUses"),                // null = unlimited
  usedCount: int("usedCount").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  expiresAt: bigint("expiresAt", { mode: "number" }), // null = no expiry
  note: varchar("note", { length: 200 }), // admin note
  createdAt: bigint("createdAt", { mode: "number" }).notNull().default(0),
});
export type DiscountCode = typeof discountCodes.$inferSelect;
export type InsertDiscountCode = typeof discountCodes.$inferInsert;

/**
 * Payment Leads - contact details of users who initiated a payment flow
 * Used for lead tracking and follow-up even if payment was not completed
 */
import { uniqueIndex } from "drizzle-orm/mysql-core";

export const paymentLeads = mysqlTable("payment_leads", {
  id:        int("id").primaryKey().autoincrement(),
  name:      varchar("name", { length: 200 }).notNull(),
  email:     varchar("email", { length: 200 }).notNull(),
  phone:     varchar("phone", { length: 30 }).notNull(),
  product:   varchar("product", { length: 50 }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (t) => ({
  emailProductIdx: uniqueIndex("email_product_idx").on(t.email, t.product),
}));
export type PaymentLead = typeof paymentLeads.$inferSelect;
export type InsertPaymentLead = typeof paymentLeads.$inferInsert;

/**
 * Completed payments are the accounting source of truth for P&L revenue.
 * New rows are written from Grow with the actual paid amount. Historical rows
 * can be backfilled from product prices and remain explicitly marked estimated.
 */
export const completedPayments = mysqlTable("completed_payments", {
  id: int("id").primaryKey().autoincrement(),
  transactionId: varchar("transaction_id", { length: 200 }).notNull(),
  dedupeKey: varchar("dedupe_key", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  product: varchar("product", { length: 50 }).notNull(),
  amountAgorot: int("amount_agorot").notNull(),
  amountSource: mysqlEnum("amount_source", ["grow", "estimated"]).notNull().default("grow"),
  paidAt: bigint("paid_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (t) => ({
  transactionIdx: uniqueIndex("completed_payment_transaction_idx").on(t.transactionId),
  dedupeIdx: uniqueIndex("completed_payment_dedupe_idx").on(t.dedupeKey),
}));
export type CompletedPayment = typeof completedPayments.$inferSelect;
export type InsertCompletedPayment = typeof completedPayments.$inferInsert;

/**
 * Business expenses entered by the team for the monthly P&L.
 * Amounts are stored in agorot to avoid floating-point rounding.
 * Meta Ads spend is fetched live and is not duplicated in this table.
 */
export const businessExpenses = mysqlTable("business_expenses", {
  id: int("id").primaryKey().autoincrement(),
  expenseDate: bigint("expense_date", { mode: "number" }).notNull(),
  category: mysqlEnum("category", [
    "processing",
    "refund",
    "payroll",
    "contractor",
    "software",
    "office",
    "content",
    "event",
    "tax",
    "other",
  ]).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  vendor: varchar("vendor", { length: 150 }),
  amountAgorot: int("amount_agorot").notNull(),
  notes: text("notes"),
  createdBy: varchar("created_by", { length: 200 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type BusinessExpense = typeof businessExpenses.$inferSelect;
export type InsertBusinessExpense = typeof businessExpenses.$inferInsert;

/**
 * Recurring monthly finance items used by the P&L for costs and revenue that
 * do not pass through the website payment flow. Values are inclusive of VAT
 * and stored in agorot. Meta spend stays live and must not be duplicated here.
 */
export const businessRecurringItems = mysqlTable("business_recurring_items", {
  id: int("id").primaryKey().autoincrement(),
  itemType: mysqlEnum("item_type", ["income", "expense"]).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  vendor: varchar("vendor", { length: 150 }),
  amountAgorot: int("amount_agorot").notNull(),
  validFrom: bigint("valid_from", { mode: "number" }).notNull(),
  validTo: bigint("valid_to", { mode: "number" }),
  isActive: boolean("is_active").notNull().default(true),
  includesVat: boolean("includes_vat").notNull().default(true),
  notes: text("notes"),
  createdBy: varchar("created_by", { length: 200 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (t) => ({
  activeIdx: index("business_recurring_active_idx").on(t.isActive, t.itemType),
}));
export type BusinessRecurringItem = typeof businessRecurringItems.$inferSelect;
export type InsertBusinessRecurringItem = typeof businessRecurringItems.$inferInsert;

/**
 * Database Plus pilot lifecycle. One row per single keeps the waitlist,
 * eligibility, invitation, conversion and retention funnel auditable.
 */
export const plusPilotMembers = mysqlTable("plus_pilot_members", {
  id: int("id").primaryKey().autoincrement(),
  singleId: int("single_id").notNull().unique(),
  status: mysqlEnum("status", ["waitlist", "eligible", "invited", "active", "declined", "churned"]).default("waitlist").notNull(),
  billingStatus: mysqlEnum("billing_status", ["not_configured", "pending", "active", "past_due", "cancelled", "ended"]).default("not_configured").notNull(),
  eligibilityScore: int("eligibility_score"),
  eligibilityReasons: text("eligibility_reasons"),
  source: varchar("source", { length: 100 }).default("personal_area").notNull(),
  pilotCohort: varchar("pilot_cohort", { length: 100 }),
  pilotPriceAgorot: int("pilot_price_agorot"),
  monthlyMatchTarget: int("monthly_match_target").default(2).notNull(),
  billingCycleStartedAt: bigint("billing_cycle_started_at", { mode: "number" }),
  billingCycleEndsAt: bigint("billing_cycle_ends_at", { mode: "number" }),
  nextBillingAt: bigint("next_billing_at", { mode: "number" }),
  cancelledAt: bigint("cancelled_at", { mode: "number" }),
  providerSubscriptionId: varchar("provider_subscription_id", { length: 200 }),
  lastPaymentTransactionId: varchar("last_payment_transaction_id", { length: 200 }),
  lastPaymentAt: bigint("last_payment_at", { mode: "number" }),
  premiumSupportEnabled: boolean("premium_support_enabled").default(false).notNull(),
  socialExposureConsent: mysqlEnum("social_exposure_consent", ["not_asked", "declined", "approved"]).default("not_asked").notNull(),
  socialConsentAt: bigint("social_consent_at", { mode: "number" }),
  socialPhotoApproved: boolean("social_photo_approved").default(false).notNull(),
  socialCopyApproved: boolean("social_copy_approved").default(false).notNull(),
  socialApprovedText: text("social_approved_text"),
  waitlistedAt: bigint("waitlisted_at", { mode: "number" }).notNull(),
  invitedAt: bigint("invited_at", { mode: "number" }),
  activatedAt: bigint("activated_at", { mode: "number" }),
  endedAt: bigint("ended_at", { mode: "number" }),
  lastEngagedAt: bigint("last_engaged_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type PlusPilotMember = typeof plusPilotMembers.$inferSelect;
export type InsertPlusPilotMember = typeof plusPilotMembers.$inferInsert;

/** Auditable lifecycle of Plus recurring billing. One event per provider transaction/status change. */
export const plusPaymentEvents = mysqlTable("plus_payment_events", {
  id: int("id").primaryKey().autoincrement(),
  plusMemberId: int("plus_member_id").notNull(),
  singleId: int("single_id").notNull(),
  eventType: mysqlEnum("event_type", ["subscription_started", "payment_succeeded", "payment_failed", "subscription_cancelled", "subscription_ended"]).notNull(),
  amountAgorot: int("amount_agorot").default(9900).notNull(),
  providerTransactionId: varchar("provider_transaction_id", { length: 200 }),
  providerSubscriptionId: varchar("provider_subscription_id", { length: 200 }),
  billingPeriodStartedAt: bigint("billing_period_started_at", { mode: "number" }),
  billingPeriodEndsAt: bigint("billing_period_ends_at", { mode: "number" }),
  failureReason: text("failure_reason"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (t) => ({
  memberCreatedIdx: index("plus_payment_member_created_idx").on(t.plusMemberId, t.createdAt),
  providerTransactionIdx: index("plus_payment_provider_tx_idx").on(t.providerTransactionId),
}));
export type PlusPaymentEvent = typeof plusPaymentEvents.$inferSelect;
export type InsertPlusPaymentEvent = typeof plusPaymentEvents.$inferInsert;

/**
 * Explicit, revocable consent to participate in the algorithmic Match Boost
 * pool. A WhatsApp reaction is interest only; only an active row with all
 * consent flags accepted allows an anonymous card to be shown or received.
 */
export const matchBoostMemberships = mysqlTable("match_boost_memberships", {
  id: int("id").primaryKey().autoincrement(),
  singleId: int("single_id").notNull().unique(),
  status: mysqlEnum("status", ["invited", "active", "paused", "opted_out", "removed"]).default("invited").notNull(),
  consentVersion: varchar("consent_version", { length: 100 }),
  algorithmicDisclosureAccepted: boolean("algorithmic_disclosure_accepted").default(false).notNull(),
  anonymousProfileAccepted: boolean("anonymous_profile_accepted").default(false).notNull(),
  termsAccepted: boolean("terms_accepted").default(false).notNull(),
  consentedAt: bigint("consented_at", { mode: "number" }),
  optedOutAt: bigint("opted_out_at", { mode: "number" }),
  invitedAt: bigint("invited_at", { mode: "number" }),
  source: varchar("source", { length: 100 }).default("personal_area").notNull(),
  pilotCohort: varchar("pilot_cohort", { length: 100 }),
  eligibleAt: bigint("eligible_at", { mode: "number" }),
  eligibilitySnapshot: text("eligibility_snapshot"),
  lastActiveAt: bigint("last_active_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (t) => ({
  statusIdx: index("boost_membership_status_idx").on(t.status, t.consentedAt),
  cohortIdx: index("boost_membership_cohort_idx").on(t.pilotCohort, t.status),
}));
export type MatchBoostMembership = typeof matchBoostMemberships.$inferSelect;
export type InsertMatchBoostMembership = typeof matchBoostMemberships.$inferInsert;

/** Immutable audit trail for every Match Boost consent-state change. */
export const matchBoostConsentEvents = mysqlTable("match_boost_consent_events", {
  id: int("id").primaryKey().autoincrement(),
  singleId: int("single_id").notNull(),
  eventType: mysqlEnum("event_type", ["invited", "opted_in", "paused", "opted_out", "removed", "consent_updated"]).notNull(),
  consentVersion: varchar("consent_version", { length: 100 }),
  algorithmicDisclosureAccepted: boolean("algorithmic_disclosure_accepted").default(false).notNull(),
  anonymousProfileAccepted: boolean("anonymous_profile_accepted").default(false).notNull(),
  termsAccepted: boolean("terms_accepted").default(false).notNull(),
  source: varchar("source", { length: 100 }).default("personal_area").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (t) => ({
  singleCreatedIdx: index("boost_consent_single_created_idx").on(t.singleId, t.createdAt),
}));
export type MatchBoostConsentEvent = typeof matchBoostConsentEvents.$inferSelect;
export type InsertMatchBoostConsentEvent = typeof matchBoostConsentEvents.$inferInsert;

/**
 * Public interest in the invite-only Match Boost pilot. This is not consent to
 * receive algorithmic proposals; only an active matchBoostMembership can do so.
 */
export const matchBoostPilotInterests = mysqlTable("match_boost_pilot_interests", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 40 }),
  firstName: varchar("first_name", { length: 100 }),
  matchedSingleId: int("matched_single_id"),
  contactConsent: boolean("contact_consent").default(false).notNull(),
  consentVersion: varchar("consent_version", { length: 100 }).notNull(),
  source: varchar("source", { length: 100 }).default("match_boost_landing").notNull(),
  utmSource: varchar("utm_source", { length: 200 }),
  utmMedium: varchar("utm_medium", { length: 200 }),
  utmCampaign: varchar("utm_campaign", { length: 200 }),
  utmContent: varchar("utm_content", { length: 200 }),
  status: mysqlEnum("status", ["interested", "invited", "joined", "not_eligible", "declined"]).default("interested").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (t) => ({
  statusCreatedIdx: index("boost_interest_status_created_idx").on(t.status, t.createdAt),
  singleIdx: index("boost_interest_single_idx").on(t.matchedSingleId),
}));
export type MatchBoostPilotInterest = typeof matchBoostPilotInterests.$inferSelect;
export type InsertMatchBoostPilotInterest = typeof matchBoostPilotInterests.$inferInsert;

/**
 * Auditable Match Boost lifecycle. Eligible Boost proposals are dispatched
 * algorithmically to two opted-in members and remain anonymous until mutual consent.
 */
export const matchBoostRequests = mysqlTable("match_boost_requests", {
  id: int("id").primaryKey().autoincrement(),
  singleId: int("single_id").notNull(),
  matchId: int("match_id").notNull(),
  source: mysqlEnum("source", ["paid", "plus_included", "admin"]).notNull(),
  status: mysqlEnum("status", ["awaiting_payment", "paid", "queued", "reviewing", "approved", "rejected", "refunded", "cancelled"]).default("awaiting_payment").notNull(),
  amountAgorot: int("amount_agorot").default(1999).notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 200 }).notNull().unique(),
  providerTransactionId: varchar("provider_transaction_id", { length: 200 }).unique(),
  plusBillingCycleStartedAt: bigint("plus_billing_cycle_started_at", { mode: "number" }),
  requestedAt: bigint("requested_at", { mode: "number" }).notNull(),
  paidAt: bigint("paid_at", { mode: "number" }),
  reviewStartedAt: bigint("review_started_at", { mode: "number" }),
  decidedAt: bigint("decided_at", { mode: "number" }),
  fulfilledAt: bigint("fulfilled_at", { mode: "number" }),
  expiresAt: bigint("expires_at", { mode: "number" }),
  decisionReason: text("decision_reason"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (t) => ({
  singleStatusIdx: index("boost_single_status_idx").on(t.singleId, t.status),
  matchStatusIdx: index("boost_match_status_idx").on(t.matchId, t.status),
  requestedIdx: index("boost_requested_idx").on(t.requestedAt),
}));
export type MatchBoostRequest = typeof matchBoostRequests.$inferSelect;
export type InsertMatchBoostRequest = typeof matchBoostRequests.$inferInsert;

/** Team operations tasks for matching, follow-up, calls and outcome collection. */
export const crmTeamTasks = mysqlTable("crm_team_tasks", {
  id: int("id").primaryKey().autoincrement(),
  singleId: int("single_id"),
  matchId: int("match_id"),
  crmLeadId: int("crm_lead_id"),
  assignedTeamMemberId: int("assigned_team_member_id"),
  taskType: mysqlEnum("task_type", ["match_review", "followup", "call", "feedback", "profile", "plus", "partner", "event", "other"]).default("other").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal").notNull(),
  status: mysqlEnum("status", ["todo", "in_progress", "done", "cancelled"]).default("todo").notNull(),
  dueAt: bigint("due_at", { mode: "number" }),
  completedAt: bigint("completed_at", { mode: "number" }),
  createdBy: varchar("created_by", { length: 200 }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type CrmTeamTask = typeof crmTeamTasks.$inferSelect;
export type InsertCrmTeamTask = typeof crmTeamTasks.$inferInsert;

/** Partner, organization and event sources measured through dedicated UTM codes. */
export const partnerSources = mysqlTable("partner_sources", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 200 }).notNull(),
  type: mysqlEnum("type", ["partner", "event", "organization", "referrer"]).notNull(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  contactName: varchar("contact_name", { length: 150 }),
  contactEmail: varchar("contact_email", { length: 320 }),
  contactPhone: varchar("contact_phone", { length: 30 }),
  commissionType: mysqlEnum("commission_type", ["none", "fixed", "percentage"]).default("none").notNull(),
  commissionValue: int("commission_value").default(0).notNull(),
  eventDate: bigint("event_date", { mode: "number" }),
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type PartnerSource = typeof partnerSources.$inferSelect;
export type InsertPartnerSource = typeof partnerSources.$inferInsert;

/**
 * Webhook idempotency - ensures each Grow transactionId is processed exactly once.
 * Grow sends the webhook twice (server notification + payment confirmation).
 * Using a unique constraint on transactionId makes the INSERT atomic and race-condition-safe.
 */
export const webhookIdempotency = mysqlTable("webhook_idempotency", {
  id:            int("id").primaryKey().autoincrement(),
  transactionId: varchar("transaction_id", { length: 200 }).notNull().unique(),
  product:       varchar("product", { length: 50 }),
  email:         varchar("email", { length: 320 }),
  createdAt:     bigint("created_at", { mode: "number" }).notNull(),
});
export type WebhookIdempotency = typeof webhookIdempotency.$inferSelect;

/**
 * Unified feedback and testimonial funnel.
 * Public submission always requires a private token; publishing always requires team verification and explicit usage consent.
 */
export const testimonialRecords = mysqlTable("testimonial_records", {
  id: int("id").primaryKey().autoincrement(),
  publicToken: varchar("public_token", { length: 64 }).notNull().unique(),
  status: mysqlEnum("status", [
    "draft",
    "candidate",
    "approved_to_contact",
    "sent",
    "submitted",
    "awaiting_consent",
    "awaiting_verification",
    "approved",
    "published",
    "revoked",
    "archived",
  ]).default("draft").notNull(),
  proofType: mysqlEnum("proof_type", ["success", "progress", "product", "database", "service", "internal"]).notNull(),
  sourceType: mysqlEnum("source_type", ["match", "database", "dna", "guide", "course", "boost", "service", "manual"]).notNull(),
  singleId: int("single_id"),
  crmLeadId: int("crm_lead_id"),
  matchId: int("match_id"),
  contactName: varchar("contact_name", { length: 150 }).notNull(),
  contactEmail: varchar("contact_email", { length: 320 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 30 }),
  sourceSnapshot: text("source_snapshot"),
  rating: int("rating"),
  npsScore: int("nps_score"),
  feedbackText: text("feedback_text"),
  improvementText: text("improvement_text"),
  testimonialTextOriginal: text("testimonial_text_original"),
  testimonialTextApproved: text("testimonial_text_approved"),
  identityScope: mysqlEnum("identity_scope", ["anonymous", "first_name", "full_name", "full_name_photo"]).default("anonymous").notNull(),
  consentText: boolean("consent_text").default(false).notNull(),
  consentPhoto: boolean("consent_photo").default(false).notNull(),
  consentVideo: boolean("consent_video").default(false).notNull(),
  allowWebsite: boolean("allow_website").default(false).notNull(),
  allowOrganicSocial: boolean("allow_organic_social").default(false).notNull(),
  allowEmail: boolean("allow_email").default(false).notNull(),
  allowPaidAds: boolean("allow_paid_ads").default(false).notNull(),
  allowPr: boolean("allow_pr").default(false).notNull(),
  allowSpellingEdits: boolean("allow_spelling_edits").default(false).notNull(),
  allowMaterialEdits: boolean("allow_material_edits").default(false).notNull(),
  consentVersion: varchar("consent_version", { length: 50 }),
  consentConfirmedAt: bigint("consent_confirmed_at", { mode: "number" }),
  consentRevokedAt: bigint("consent_revoked_at", { mode: "number" }),
  teamVerifiedAt: bigint("team_verified_at", { mode: "number" }),
  teamVerifiedBy: varchar("team_verified_by", { length: 200 }),
  teamApprovedAt: bigint("team_approved_at", { mode: "number" }),
  teamApprovedBy: varchar("team_approved_by", { length: 200 }),
  publishedAt: bigint("published_at", { mode: "number" }),
  archivedAt: bigint("archived_at", { mode: "number" }),
  draftSubject: varchar("draft_subject", { length: 500 }),
  draftBody: text("draft_body"),
  requestApprovedAt: bigint("request_approved_at", { mode: "number" }),
  requestApprovedBy: varchar("request_approved_by", { length: 200 }),
  requestSentAt: bigint("request_sent_at", { mode: "number" }),
  lastResponseAt: bigint("last_response_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, table => ({
  statusIdx: index("testimonial_record_status_idx").on(table.status),
  sourceIdx: index("testimonial_record_source_idx").on(table.sourceType),
  singleIdx: index("testimonial_record_single_idx").on(table.singleId),
  matchIdx: index("testimonial_record_match_idx").on(table.matchId),
  emailIdx: index("testimonial_record_email_idx").on(table.contactEmail),
  createdIdx: index("testimonial_record_created_idx").on(table.createdAt),
}));
export type TestimonialRecord = typeof testimonialRecords.$inferSelect;
export type InsertTestimonialRecord = typeof testimonialRecords.$inferInsert;

/** S3 metadata for customer-supplied testimonial images and videos. */
export const testimonialMedia = mysqlTable("testimonial_media", {
  id: int("id").primaryKey().autoincrement(),
  recordId: int("record_id").notNull(),
  mediaType: mysqlEnum("media_type", ["image", "video"]).notNull(),
  storageKey: varchar("storage_key", { length: 500 }).notNull(),
  storageUrl: text("storage_url").notNull(),
  originalFileName: varchar("original_file_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  byteSize: bigint("byte_size", { mode: "number" }).notNull(),
  status: mysqlEnum("status", ["uploaded", "approved", "rejected", "revoked"]).default("uploaded").notNull(),
  uploadedAt: bigint("uploaded_at", { mode: "number" }).notNull(),
  approvedAt: bigint("approved_at", { mode: "number" }),
  approvedBy: varchar("approved_by", { length: 200 }),
  rejectedAt: bigint("rejected_at", { mode: "number" }),
  rejectedBy: varchar("rejected_by", { length: 200 }),
  rejectionReason: text("rejection_reason"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, table => ({
  recordIdx: index("testimonial_media_record_idx").on(table.recordId),
  statusIdx: index("testimonial_media_status_idx").on(table.status),
}));
export type TestimonialMedia = typeof testimonialMedia.$inferSelect;
export type InsertTestimonialMedia = typeof testimonialMedia.$inferInsert;

/** Immutable publishing/use history for each approved testimonial. */
export const testimonialUsage = mysqlTable("testimonial_usage", {
  id: int("id").primaryKey().autoincrement(),
  recordId: int("record_id").notNull(),
  mediaId: int("media_id"),
  channel: mysqlEnum("channel", ["website", "organic_social", "email", "paid_ads", "pr"]).notNull(),
  format: varchar("format", { length: 100 }),
  placement: varchar("placement", { length: 255 }),
  campaignName: varchar("campaign_name", { length: 255 }),
  publicUrl: text("public_url"),
  approvedCopySnapshot: text("approved_copy_snapshot"),
  publishedAt: bigint("published_at", { mode: "number" }).notNull(),
  removedAt: bigint("removed_at", { mode: "number" }),
  createdBy: varchar("created_by", { length: 200 }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, table => ({
  recordIdx: index("testimonial_usage_record_idx").on(table.recordId),
  channelIdx: index("testimonial_usage_channel_idx").on(table.channel),
}));
export type TestimonialUsage = typeof testimonialUsage.$inferSelect;
export type InsertTestimonialUsage = typeof testimonialUsage.$inferInsert;

/** Audit trail for public form and team actions. */
export const testimonialEvents = mysqlTable("testimonial_events", {
  id: int("id").primaryKey().autoincrement(),
  recordId: int("record_id").notNull(),
  eventType: mysqlEnum("event_type", [
    "created",
    "candidate_generated",
    "contact_approved",
    "request_marked_sent",
    "form_opened",
    "feedback_submitted",
    "consent_granted",
    "consent_updated",
    "media_uploaded",
    "team_verified",
    "approved",
    "published",
    "usage_removed",
    "consent_revoked",
    "archived",
  ]).notNull(),
  actorType: mysqlEnum("actor_type", ["customer", "team", "system"]).notNull(),
  actorRef: varchar("actor_ref", { length: 200 }),
  metadata: text("metadata"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, table => ({
  recordIdx: index("testimonial_event_record_idx").on(table.recordId),
  eventIdx: index("testimonial_event_type_idx").on(table.eventType),
  createdIdx: index("testimonial_event_created_idx").on(table.createdAt),
}));
export type TestimonialEvent = typeof testimonialEvents.$inferSelect;
export type InsertTestimonialEvent = typeof testimonialEvents.$inferInsert;

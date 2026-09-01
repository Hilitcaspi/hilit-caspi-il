import { and, desc, eq, gte, lt } from "drizzle-orm";
import {
  completedPayments,
  crmLeads,
  dailyReportRuns,
  dailyReportSettings,
  matches,
  singles,
  type DailyReportSettings,
} from "../drizzle/schema";
import { getDb } from "./db";
import { fetchMetaAdsInsights, fetchSocialInsights } from "./dashboardRouter";
import { calculateMatchmakingMetrics, getMissingProfileFields } from "./matchmakingMetrics";
import {
  buildDailyReportMessage,
  DAILY_REPORT_TIMEZONE,
  getReportDateForMidnightRun,
  getReportDateRange,
  type DailyReportMetrics,
  type DailyReportSourceStatus,
  type DailyReportTargets,
} from "./dailyReportMetrics";
import { sendSMS } from "./vibrate";

const SETTINGS_NAME = "israel-site-daily";
const SOCIAL_FOLLOWER_LOOKBACK_MS = 2 * 24 * 60 * 60 * 1000;
const EXTERNAL_SOURCE_TIMEOUT_MS = 8_000;

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

function targetsFromSettings(settings: DailyReportSettings): DailyReportTargets {
  return {
    databaseMonthlyMinTarget: settings.databaseMonthlyMinTarget,
    databaseMonthlyStretchTarget: settings.databaseMonthlyStretchTarget,
    databaseMonthlyBudgetAgorot: settings.databaseMonthlyBudgetAgorot,
    boostMonthlyTarget: settings.boostMonthlyTarget,
    bundleMonthlyTarget: settings.bundleMonthlyTarget,
    leadMonthlyTarget: settings.leadMonthlyTarget,
    revenueMonthlyTargetAgorot: settings.revenueMonthlyTargetAgorot,
  };
}

export function maskRecipient(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return "****";
  return `${digits.slice(0, 3)}****${digits.slice(-2)}`;
}

export function buildScheduledDailyReportRunKey(settingsId: number, reportDate: string): string {
  return `daily-report:${settingsId}:${reportDate}`;
}

export function getDailyReportDeliveryMode(settings: Pick<DailyReportSettings, "isEnabled" | "dryRun" | "recipientPhone">) {
  if (!settings.isEnabled) return "disabled" as const;
  if (settings.dryRun) return "dry_run" as const;
  if (!settings.recipientPhone) return "missing_recipient" as const;
  return "send" as const;
}

function isDuplicateKeyError(error: unknown): boolean {
  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate?.code === "ER_DUP_ENTRY" || candidate?.cause?.code === "ER_DUP_ENTRY";
}

export async function getOrCreateDailyReportSettings(db?: Db): Promise<DailyReportSettings> {
  const database = db || await getDb();
  if (!database) throw new Error("Database unavailable");
  const [existing] = await database.select().from(dailyReportSettings)
    .where(eq(dailyReportSettings.name, SETTINGS_NAME)).limit(1);
  if (existing) return existing;

  const now = Date.now();
  await database.insert(dailyReportSettings).values({
    name: SETTINGS_NAME,
    isEnabled: false,
    dryRun: true,
    timezone: DAILY_REPORT_TIMEZONE,
    deliveryHour: 0,
    deliveryMinute: 0,
    recipientPhone: null,
    scheduleCronTaskUid: null,
    databaseMonthlyMinTarget: 350,
    databaseMonthlyStretchTarget: 400,
    databaseMonthlyBudgetAgorot: 1_000_000,
    boostMonthlyTarget: null,
    bundleMonthlyTarget: null,
    leadMonthlyTarget: null,
    revenueMonthlyTargetAgorot: null,
    createdAt: now,
    updatedAt: now,
  });
  const [created] = await database.select().from(dailyReportSettings)
    .where(eq(dailyReportSettings.name, SETTINGS_NAME)).limit(1);
  if (!created) throw new Error("Failed to create daily report settings");
  return created;
}

function isSalesCampaign(campaign: { name?: string; objective?: string; purchases?: number }) {
  const objective = String(campaign.objective || "").toUpperCase();
  const name = String(campaign.name || "").toLowerCase();
  return objective.includes("SALES")
    || objective.includes("CONVERSION")
    || Number(campaign.purchases || 0) > 0
    || /(מכירות|מאגר|באנדל|קורס|מדריך|רכישה|sale|database|bundle|course|guide)/i.test(name);
}

function sumSpendAgorot(campaigns: Array<{ spend?: number }>): number {
  return Math.round(campaigns.reduce((sum, campaign) => sum + Number(campaign.spend || 0), 0) * 100);
}

async function externalOrNull<T>(promise: Promise<T>): Promise<T | null> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>(resolve => {
        timeout = setTimeout(() => resolve(null), EXTERNAL_SOURCE_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return null;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function paymentAggregate(rows: Array<{ product: string; amountAgorot: number; paidAt: number; amountSource: "grow" | "estimated" }>, start: number, end: number) {
  const inRange = rows.filter(row => row.paidAt >= start && row.paidAt < end);
  const verified = inRange.filter(row => row.amountSource === "grow");
  const byProduct = (product: string) => {
    const matches = verified.filter(row => row.product === product);
    return { count: matches.length, revenueAgorot: matches.reduce((sum, row) => sum + row.amountAgorot, 0) };
  };
  const nonBoost = verified.filter(row => row.product !== "match_boost");
  return {
    revenueAgorot: verified.reduce((sum, row) => sum + row.amountAgorot, 0),
    salesPurchases: nonBoost.length,
    estimatedExcluded: inRange.filter(row => row.amountSource === "estimated").length,
    database: byProduct("database"),
    boost: byProduct("match_boost"),
    bundle: byProduct("bundle_new_year"),
  };
}

export async function collectDailyReportPreview(settings: DailyReportSettings, reportDate = getReportDateForMidnightRun()) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const range = getReportDateRange(reportDate, settings.timezone);

  const [paymentRows, leadRows, singleRows, matchRows, dayMeta, monthMeta, social] = await Promise.all([
    db.select({
      product: completedPayments.product,
      amountAgorot: completedPayments.amountAgorot,
      amountSource: completedPayments.amountSource,
      paidAt: completedPayments.paidAt,
    }).from(completedPayments).where(and(
      gte(completedPayments.paidAt, range.monthStart),
      lt(completedPayments.paidAt, range.dayEnd),
    )),
    db.select({ createdAt: crmLeads.createdAt }).from(crmLeads).where(and(
      gte(crmLeads.createdAt, range.monthStart),
      lt(crmLeads.createdAt, range.dayEnd),
    )),
    db.select({
      id: singles.id,
      firstName: singles.firstName,
      lastName: singles.lastName,
      email: singles.email,
      phone: singles.phone,
      gender: singles.gender,
      age: singles.age,
      city: singles.city,
      height: singles.height,
      occupation: singles.occupation,
      religiosity: singles.religiosity,
      about: singles.about,
      partnerDescription: singles.partnerDescription,
      photoUrl: singles.photoUrl,
      dnaType: singles.dnaType,
      questionnaireCompletedAt: singles.questionnaireCompletedAt,
      createdAt: singles.createdAt,
      isActive: singles.isActive,
      isPaid: singles.isPaid,
      isSeed: singles.isSeed,
      subscriptionRenewsAt: singles.subscriptionRenewsAt,
    }).from(singles).where(and(eq(singles.isSeed, false), eq(singles.country, "IL"))),
    db.select({
      id: matches.id,
      singleAId: matches.singleAId,
      singleBId: matches.singleBId,
      status: matches.status,
      proposedAt: matches.proposedAt,
      emailAOpenedAt: matches.emailAOpenedAt,
      emailBOpenedAt: matches.emailBOpenedAt,
      approvedByA: matches.approvedByA,
      approvedByB: matches.approvedByB,
      matchedAt: matches.matchedAt,
      contactRevealedAt: matches.contactRevealedAt,
      returnedToPoolAt: matches.returnedToPoolAt,
      matchDetailStatus: matches.matchDetailStatus,
    }).from(matches),
    externalOrNull(fetchMetaAdsInsights(reportDate, reportDate)),
    externalOrNull(fetchMetaAdsInsights(range.monthStartDate, reportDate)),
    externalOrNull(fetchSocialInsights(range.dayStart - SOCIAL_FOLLOWER_LOOKBACK_MS, range.dayEnd)),
  ]);

  const todayPayments = paymentAggregate(paymentRows, range.dayStart, range.dayEnd);
  const monthPayments = paymentAggregate(paymentRows, range.monthStart, range.dayEnd);
  const activePaidSingles = singleRows.filter(single => single.isActive && single.isPaid && !single.isSeed);
  const matchmaking = calculateMatchmakingMetrics(singleRows as any, matchRows as any, {
    from: range.dayStart,
    to: range.dayEnd - 1,
    now: range.dayEnd,
  });
  const daySalesCampaigns = dayMeta?.campaigns.filter(isSalesCampaign) || [];
  const monthSalesCampaigns = monthMeta?.campaigns.filter(isSalesCampaign) || [];
  const metaConfigured = Boolean(process.env.META_ADS_TOKEN);
  const metaAvailable = Boolean(metaConfigured && dayMeta && monthMeta);
  const sources: DailyReportSourceStatus = {
    payments: { available: true, label: "Grow תשלומים מאומתים", freshAt: Date.now(), note: "עסקאות amount_source=grow בלבד" },
    leads: { available: true, label: "CRM לידים", freshAt: Date.now() },
    matches: { available: true, label: "CRM התאמות", freshAt: Date.now() },
    profiles: { available: true, label: "מאגר פעיל", freshAt: Date.now(), note: "פעילים, משלמים וללא נתוני דמה" },
    metaSales: {
      available: metaAvailable,
      label: "Meta חשבון ראשי",
      freshAt: metaAvailable ? Date.now() : null,
      note: !metaAvailable ? "הקריאה החיצונית לא הושלמה בזמן" : dayMeta!.campaigns.length > 0 && daySalesCampaigns.length === 0 ? "לא זוהה קמפיין מכירה לפי מטרה או שם" : "קמפיינים עם מטרת מכירה או רכישה",
    },
    metaBoost: { available: metaAvailable, label: "Meta חשבון Boost", freshAt: metaAvailable ? Date.now() : null, note: metaAvailable ? undefined : "הקריאה החיצונית לא הושלמה בזמן" },
    instagram: { available: Boolean(social), label: "Instagram עוקבים", freshAt: social ? Date.now() : null },
  };

  const metrics: DailyReportMetrics = {
    reportDate,
    dayOfMonth: range.dayOfMonth,
    daysInMonth: range.daysInMonth,
    revenueTodayAgorot: todayPayments.revenueAgorot,
    revenueMonthAgorot: monthPayments.revenueAgorot,
    salesPurchasesToday: todayPayments.salesPurchases,
    salesPurchasesMonth: monthPayments.salesPurchases,
    databasePurchasesToday: todayPayments.database.count,
    databasePurchasesMonth: monthPayments.database.count,
    databaseRevenueTodayAgorot: todayPayments.database.revenueAgorot,
    databaseRevenueMonthAgorot: monthPayments.database.revenueAgorot,
    boostPurchasesToday: todayPayments.boost.count,
    boostPurchasesMonth: monthPayments.boost.count,
    boostRevenueTodayAgorot: todayPayments.boost.revenueAgorot,
    boostRevenueMonthAgorot: monthPayments.boost.revenueAgorot,
    bundlePurchasesToday: todayPayments.bundle.count,
    bundlePurchasesMonth: monthPayments.bundle.count,
    bundleRevenueTodayAgorot: todayPayments.bundle.revenueAgorot,
    bundleRevenueMonthAgorot: monthPayments.bundle.revenueAgorot,
    leadsToday: leadRows.filter(row => row.createdAt >= range.dayStart && row.createdAt < range.dayEnd).length,
    leadsMonth: leadRows.length,
    instagramFollowersNew: social?.instagram.followerGrowth ?? null,
    salesCampaignSpendTodayAgorot: metaAvailable ? sumSpendAgorot(daySalesCampaigns) : null,
    salesCampaignSpendMonthAgorot: metaAvailable ? sumSpendAgorot(monthSalesCampaigns) : null,
    boostCampaignSpendTodayAgorot: metaAvailable ? sumSpendAgorot(dayMeta!.boosts) : null,
    boostCampaignSpendMonthAgorot: metaAvailable ? sumSpendAgorot(monthMeta!.boosts) : null,
    matchesSentToday: matchRows.filter(match => Number(match.proposedAt || 0) >= range.dayStart && Number(match.proposedAt || 0) < range.dayEnd).length,
    matchesMutualYesToday: matchRows.filter(match => Number(match.matchedAt || 0) >= range.dayStart && Number(match.matchedAt || 0) < range.dayEnd).length,
    activeSinglesNoMatch14Days: matchmaking.noMatchDuration.over14,
    activeSinglesMissingDetails: activePaidSingles.filter(single => getMissingProfileFields(single as any).length > 0).length,
    excludedEstimatedPaymentsToday: todayPayments.estimatedExcluded,
  };

  const targets = targetsFromSettings(settings);
  return {
    metrics,
    targets,
    sources,
    message: buildDailyReportMessage(metrics, targets, sources),
    generatedAt: Date.now(),
  };
}

export async function getDailyReportOverview() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const settings = await getOrCreateDailyReportSettings(db);
  const preview = await collectDailyReportPreview(settings);
  const runs = await db.select().from(dailyReportRuns)
    .where(eq(dailyReportRuns.settingsId, settings.id))
    .orderBy(desc(dailyReportRuns.id)).limit(30);
  return {
    settings: { ...settings, recipientPhone: undefined, recipientMasked: maskRecipient(settings.recipientPhone) },
    preview,
    runs: runs.map(run => ({ ...run, metricsJson: undefined, sourceStatusJson: undefined })),
  };
}

export async function updateDailyReportSettings(input: {
  recipientPhone?: string | null;
  databaseMonthlyMinTarget: number;
  databaseMonthlyStretchTarget: number;
  databaseMonthlyBudgetAgorot: number;
  boostMonthlyTarget?: number | null;
  bundleMonthlyTarget?: number | null;
  leadMonthlyTarget?: number | null;
  revenueMonthlyTargetAgorot?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const settings = await getOrCreateDailyReportSettings(db);
  await db.update(dailyReportSettings).set({
    ...input,
    isEnabled: false,
    dryRun: true,
    timezone: DAILY_REPORT_TIMEZONE,
    deliveryHour: 0,
    deliveryMinute: 0,
    updatedAt: Date.now(),
  }).where(eq(dailyReportSettings.id, settings.id));
  return getOrCreateDailyReportSettings(db);
}

export async function recordDailyReportDryRun() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const settings = await getOrCreateDailyReportSettings(db);
  const preview = await collectDailyReportPreview(settings);
  const now = Date.now();
  await db.insert(dailyReportRuns).values({
    settingsId: settings.id,
    runKey: `daily-report:${settings.id}:preview:${now}`,
    reportDate: preview.metrics.reportDate,
    trigger: "preview",
    status: "dry_run",
    message: preview.message,
    metricsJson: JSON.stringify(preview.metrics),
    sourceStatusJson: JSON.stringify(preview.sources),
    providerMessageId: null,
    error: null,
    startedAt: now,
    completedAt: Date.now(),
    createdAt: now,
  });
  return { ok: true, sent: false, preview };
}

export async function runScheduledDailyReport(taskUid: string, now = Date.now()) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [settings] = await db.select().from(dailyReportSettings)
    .where(eq(dailyReportSettings.scheduleCronTaskUid, taskUid)).limit(1);
  if (!settings) return { ok: true, skipped: "orphan" as const };
  const deliveryMode = getDailyReportDeliveryMode(settings);
  if (deliveryMode === "disabled") return { ok: true, skipped: "disabled" as const };

  const reportDate = getReportDateForMidnightRun(now, settings.timezone);
  const runKey = buildScheduledDailyReportRunKey(settings.id, reportDate);
  const [existing] = await db.select().from(dailyReportRuns).where(eq(dailyReportRuns.runKey, runKey)).limit(1);
  if (existing) return { ok: true, skipped: "duplicate" as const, runId: existing.id };

  const preview = await collectDailyReportPreview(settings, reportDate);
  const startedAt = Date.now();
  try {
    await db.insert(dailyReportRuns).values({
      settingsId: settings.id,
      runKey,
      reportDate,
      trigger: "scheduled",
      status: "dry_run",
      message: preview.message,
      metricsJson: JSON.stringify(preview.metrics),
      sourceStatusJson: JSON.stringify(preview.sources),
      providerMessageId: null,
      error: null,
      startedAt,
      completedAt: deliveryMode === "dry_run" ? Date.now() : null,
      createdAt: startedAt,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const [duplicate] = await db.select().from(dailyReportRuns).where(eq(dailyReportRuns.runKey, runKey)).limit(1);
      return { ok: true, skipped: "duplicate" as const, runId: duplicate?.id };
    }
    throw error;
  }
  const [run] = await db.select().from(dailyReportRuns).where(eq(dailyReportRuns.runKey, runKey)).limit(1);
  if (!run) throw new Error("Failed to create daily report run");
  if (deliveryMode === "dry_run") return { ok: true, sent: false, dryRun: true, runId: run.id };
  if (deliveryMode === "missing_recipient") {
    await db.update(dailyReportRuns).set({ status: "failed", error: "Recipient not configured", completedAt: Date.now() }).where(eq(dailyReportRuns.id, run.id));
    return { ok: false, sent: false, error: "Recipient not configured", runId: run.id };
  }

  const sent = await sendSMS(settings.recipientPhone!, preview.message);
  await db.update(dailyReportRuns).set({
    status: sent ? "sent" : "failed",
    error: sent ? null : "Vibrate did not accept the message",
    completedAt: Date.now(),
  }).where(eq(dailyReportRuns.id, run.id));
  return { ok: sent, sent, runId: run.id };
}

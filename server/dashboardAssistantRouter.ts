import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import type { TrpcContext } from "./_core/context";
import { router, teamProcedure } from "./_core/trpc";
import { dashboardRouter } from "./dashboardRouter";
import { getDb } from "./db";
import { hashActor, recordSelfServiceEvent } from "./usageMetrics";

const DASHBOARD_ASSISTANT_MODEL = "gpt-5-mini";
const MAX_ROWS = 12;

const dateRangeFields = {
  startDate: z.number().int().nonnegative(),
  endDate: z.number().int().nonnegative(),
};

const validDateRange = <T extends { startDate: number; endDate: number }>(schema: z.ZodType<T>) => schema.refine(value => value.endDate >= value.startDate, {
  message: "endDate must be on or after startDate",
  path: ["endDate"],
});

const dateRangeSchema = validDateRange(z.object(dateRangeFields));

const askInputSchema = validDateRange(z.object({
  ...dateRangeFields,
  question: z.string().trim().min(3).max(600),
}));

type DateRange = z.infer<typeof dateRangeSchema>;
type DashboardSection = "overviewWithComparison" | "dailyTrend" | "channelBreakdown" | "campaignJourney" | "metaAdsPerformance";
type DashboardCaller = {
  overviewWithComparison: (input: DateRange) => Promise<unknown>;
  dailyTrend: (input: DateRange) => Promise<unknown>;
  channelBreakdown: (input: DateRange) => Promise<unknown>;
  campaignJourney: (input: DateRange) => Promise<unknown>;
  metaAdsPerformance: (input: DateRange) => Promise<unknown>;
};
type DashboardCallerFactory = (ctx: TrpcContext) => DashboardCaller;
type SettledDashboardResults = Record<DashboardSection, PromiseSettledResult<unknown>>;

const dashboardSections: DashboardSection[] = [
  "overviewWithComparison",
  "dailyTrend",
  "channelBreakdown",
  "campaignJourney",
  "metaAdsPerformance",
];

const finiteNumber = (value: unknown, fallback = 0): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const finiteOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

const asRows = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.map(asRecord) : [];

const latestRows = (value: unknown): Record<string, unknown>[] =>
  asRows(value).slice(-MAX_ROWS);

const topRows = (value: unknown): Record<string, unknown>[] =>
  asRows(value).slice(0, MAX_ROWS);

const safeText = (value: unknown, fallback: string): string => {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > 100) return fallback;
  if (/https?:\/\/|@|utm[_-]?|\b\d{10,}\b/i.test(normalized)) return fallback;
  return normalized;
};

const safeChannel = (value: unknown): string => {
  const knownChannels = new Set([
    "Meta Ads (ממומן)",
    "Instagram (אורגני)",
    "Google / SEO",
    "Email (Newsletter)",
    "Email (Journeys)",
    "WhatsApp",
    "הפניה",
    "שירות לקוחות",
    "מדריך חינמי",
    "ישיר / לא ידוע",
  ]);
  return knownChannels.has(value as string) ? value as string : "ערוץ אחר";
};

const safeCampaignName = (row: Record<string, unknown>): string => {
  if (row.attributionBasis === "website_only") return "אתר ללא שיוך Meta";
  return safeText(row.campaignName, "קמפיין Meta ללא שם בטוח");
};

const formatDataWindow = (input: DateRange): string => {
  const formatter = new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return `${formatter.format(new Date(input.startDate))}–${formatter.format(new Date(input.endDate))}`;
};

const settledValue = (result: PromiseSettledResult<unknown>): Record<string, unknown> | null =>
  result.status === "fulfilled" ? asRecord(result.value) : null;

/**
 * Reduces existing dashboard outputs to aggregate-only facts. It intentionally
 * whitelists fields instead of copying source objects, so identities, database
 * IDs, and raw UTM aliases cannot enter the LLM context or snapshot response.
 */
export function reduceDashboardSnapshot(results: SettledDashboardResults, input: DateRange) {
  const overviewSource = settledValue(results.overviewWithComparison);
  const dailySource = settledValue(results.dailyTrend);
  const channelsSource = results.channelBreakdown.status === "fulfilled"
    ? topRows(results.channelBreakdown.value)
    : [];
  const journeySource = settledValue(results.campaignJourney);
  const metaSource = settledValue(results.metaAdsPerformance);

  const overviewCurrent = asRecord(overviewSource?.current);
  const overviewPrevious = asRecord(overviewSource?.previous);
  const overviewChange = asRecord(overviewSource?.change);
  const daily = dailySource || {};
  const journey = journeySource || {};
  const meta = metaSource || {};
  const metaTotals = asRecord(meta.totals);

  return {
    dataWindow: formatDataWindow(input),
    availability: Object.fromEntries(dashboardSections.map(section => [section, results[section].status === "fulfilled"])),
    failedSections: dashboardSections.filter(section => results[section].status === "rejected").slice(0, MAX_ROWS),
    overviewWithComparison: overviewSource ? {
      current: {
        leads: finiteNumber(overviewCurrent.leads),
        purchases: finiteNumber(overviewCurrent.purchases),
        revenue: finiteNumber(overviewCurrent.revenue),
        dna: finiteNumber(overviewCurrent.dna),
      },
      previous: {
        leads: finiteNumber(overviewPrevious.leads),
        purchases: finiteNumber(overviewPrevious.purchases),
        revenue: finiteNumber(overviewPrevious.revenue),
        dna: finiteNumber(overviewPrevious.dna),
      },
      change: {
        leads: finiteOrNull(overviewChange.leads),
        purchases: finiteOrNull(overviewChange.purchases),
        revenue: finiteOrNull(overviewChange.revenue),
        dna: finiteOrNull(overviewChange.dna),
      },
      salesComparisonAvailable: overviewSource.salesComparisonAvailable === true,
    } : null,
    dailyTrend: dailySource ? {
      leads: latestRows(daily.leads).map(row => ({
        day: safeText(row.day, "לא זוהה"),
        count: finiteNumber(row.count),
      })),
      revenue: latestRows(daily.revenue).map(row => ({
        day: safeText(row.day, "לא זוהה"),
        amount: finiteNumber(row.amount),
      })),
      purchases: latestRows(daily.purchases).map(row => ({
        day: safeText(row.day, "לא זוהה"),
        count: finiteNumber(row.count),
      })),
    } : null,
    channelBreakdown: channelsSource.map(row => ({
      channel: safeChannel(row.channel),
      leads: finiteNumber(row.leads),
      purchases: finiteNumber(row.purchases),
      revenue: finiteNumber(row.revenue),
      spend: finiteOrNull(row.spend),
      previous: {
        leads: finiteNumber(row.prevLeads),
        purchases: finiteNumber(row.prevPurchases),
        revenue: finiteNumber(row.prevRevenue),
      },
      salesComparisonAvailable: row.salesComparisonAvailable === true,
      metaSpendAvailable: row.metaSpendAvailable === true,
    })),
    campaignJourney: journeySource ? {
      status: safeText(journey.status, "לא זמין"),
      cohortDefinition: "מגע ראשון: לידים שנוצרו בטווח ורכישות Grow מאומתות עד סוף הטווח.",
      rows: topRows(journey.rows).map(row => ({
        campaign: safeCampaignName(row),
        objective: safeText(row.objective, "לא זוהה"),
        status: row.status === "active" || row.status === "inactive" ? row.status : "unknown",
        spend: finiteOrNull(row.spend),
        metaReported: {
          leads: finiteOrNull(row.metaLeads),
          purchases: finiteOrNull(row.metaPurchases),
        },
        firstTouchGrow: {
          leads: finiteNumber(row.crmLeads),
          buyers: finiteNumber(row.growBuyers),
          purchases: finiteNumber(row.growPurchases),
          revenue: finiteNumber(row.growRevenue),
          leadToBuyerRate: finiteOrNull(row.leadToBuyerRate),
          cac: finiteOrNull(row.growCac),
          roas: finiteOrNull(row.growRoas),
        },
        lastTouchGrow: {
          buyers: finiteNumber(row.directGrowBuyers),
          purchases: finiteNumber(row.directGrowPurchases),
          revenue: finiteNumber(row.directGrowRevenue),
          cac: finiteOrNull(row.directGrowCac),
          roas: finiteOrNull(row.directGrowRoas),
        },
        emailAssist: {
          buyersWithEmailBeforePurchase: finiteNumber(row.buyersWithEmailBeforePurchase),
          buyersWithEmailClickBeforePurchase: finiteNumber(row.buyersWithEmailClickBeforePurchase),
        },
      })),
    } : null,
    metaAdsPerformance: metaSource ? {
      status: safeText(meta.status, "לא זמין"),
      totals: {
        totalPaidMediaSpend: finiteNumber(metaTotals.totalPaidMediaSpend),
        acquisitionSpend: finiteNumber(metaTotals.acquisitionSpend),
        profileBoostSpend: finiteNumber(metaTotals.profileBoostSpend),
        metaReportedPurchases: finiteNumber(metaTotals.metaReportedPurchases),
        metaReportedLeads: finiteNumber(metaTotals.metaReportedLeads),
        metaReportedPurchaseValue: finiteOrNull(metaTotals.metaReportedPurchaseValue),
        metaReportedPurchaseCpa: finiteOrNull(metaTotals.metaReportedPurchaseCpa),
        metaReportedCpl: finiteOrNull(metaTotals.metaReportedCpl),
        metaReportedPurchaseValueRoas: finiteOrNull(metaTotals.metaReportedPurchaseValueRoas),
      },
      campaigns: topRows(meta.campaigns).map(row => ({
        campaign: safeText(row.name, "קמפיין Meta ללא שם בטוח"),
        objective: safeText(row.objective, "לא זוהה"),
        spend: finiteNumber(row.spend),
        impressions: finiteNumber(row.impressions),
        reach: finiteNumber(row.reach),
        clicks: finiteNumber(row.clicks),
        metaReportedLeads: finiteNumber(row.leads),
        metaReportedPurchases: finiteNumber(row.purchases),
        metaReportedPurchaseValue: finiteOrNull(row.purchaseValue),
        metaReportedCpl: finiteOrNull(row.cpl),
        metaReportedPurchaseCpa: finiteOrNull(row.cpa),
        metaReportedRoas: finiteOrNull(row.metaReportedRoas),
      })),
      boosts: topRows(meta.boosts).map(row => ({
        campaign: safeText(row.name, "קידום Meta ללא שם בטוח"),
        spend: finiteNumber(row.spend),
        impressions: finiteNumber(row.impressions),
        reach: finiteNumber(row.reach),
        clicks: finiteNumber(row.clicks),
      })),
    } : null,
  };
}

/** Calls the existing dashboard procedures concurrently; it never duplicates their SQL. */
export async function buildDashboardSnapshot(
  ctx: TrpcContext,
  input: DateRange,
  createCaller: DashboardCallerFactory = dashboardRouter.createCaller as DashboardCallerFactory,
) {
  const caller = createCaller(ctx);
  const [overviewWithComparison, dailyTrend, channelBreakdown, campaignJourney, metaAdsPerformance] = await Promise.allSettled([
    caller.overviewWithComparison(input),
    caller.dailyTrend(input),
    caller.channelBreakdown(input),
    caller.campaignJourney(input),
    caller.metaAdsPerformance(input),
  ]);

  return reduceDashboardSnapshot({
    overviewWithComparison,
    dailyTrend,
    channelBreakdown,
    campaignJourney,
    metaAdsPerformance,
  }, input);
}

const assistantResponseJsonSchema = {
  name: "dashboard_assistant_answer",
  strict: true,
  schema: {
    type: "object",
    properties: {
      answer: { type: "string" },
      keyFindings: { type: "array", items: { type: "string" }, maxItems: 4 },
      cautions: { type: "array", items: { type: "string" }, maxItems: 4 },
      suggestedQuestions: { type: "array", items: { type: "string" }, maxItems: 4 },
      dataWindow: { type: "string" },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
    },
    required: ["answer", "keyFindings", "cautions", "suggestedQuestions", "dataWindow", "confidence"],
    additionalProperties: false,
  },
} as const;

const assistantAnswerSchema = z.object({
  answer: z.string(),
  keyFindings: z.array(z.string()).max(4),
  cautions: z.array(z.string()).max(4),
  suggestedQuestions: z.array(z.string()).max(4),
  dataWindow: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
}).strict();

/** Parses only the strict JSON contract returned by the model. */
export function parseDashboardAssistantAnswer(content: unknown) {
  const text = typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map(part => typeof part === "string" ? part : part && typeof part === "object" && "text" in part ? String(part.text) : "").join("")
      : "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "תשובת העוזר לא התקבלה בפורמט תקין" });
  }

  const result = assistantAnswerSchema.safeParse(parsed);
  if (!result.success) {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "תשובת העוזר לא עמדה במבנה הנדרש" });
  }
  return result.data;
}

function assistantSystemPrompt(dataWindow: string): string {
  return `את/ה עוזר/ת ניתוח ללוח הבקרה של הילית כספי. ענה/י בעברית קצרה וברורה, ללא רשימות ארוכות (עד 4 פריטים בכל שדה). חלון הנתונים הוא ${dataWindow}.

כללי אמינות מחייבים:
- הכנסות, רכישות ו-ROAS של Grow הם מקור האמת רק כאשר הם מסומנים Grow מאומת.
- מדדי Meta הם דיווח של Meta בלבד; אל תאחד/י אותם עם Grow ואל תציג/י אותם כהכנסה מאומתת.
- מגע ראשון, מגע אחרון וסיוע אימייל הם מבטי שיוך נפרדים. סיוע אימייל אינו הוכחת סיבתיות.
- אין לטעון לסיבתיות. אין להמליץ על שינוי קמפיין בלי לציין חלון בדיקה, מדד הצלחה ותנאי עצירה.
- כאשר חסר נתון או סעיף נכשל, ציין/י זאת בזהירות והורד/י ביטחון.
- אין להמציא נתונים, מזהים או פרטים אישיים. dataWindow חייב להיות בדיוק ${dataWindow}.`;
}

async function recordAssistantUsage(ctx: TrpcContext, startedAt: number, usage: { prompt_tokens?: number; completion_tokens?: number } | undefined) {
  try {
    const db = await getDb();
    if (!db) return;
    await recordSelfServiceEvent(db, {
      eventKey: `sse_${randomUUID().replaceAll("-", "")}`,
      actionKey: "dashboard.generate_report",
      category: "dashboard",
      channel: "in_app_ai",
      outcome: "completed",
      durationMs: Math.max(0, Date.now() - startedAt),
      model: DASHBOARD_ASSISTANT_MODEL,
      promptTokens: finiteNumber(usage?.prompt_tokens),
      completionTokens: finiteNumber(usage?.completion_tokens),
      actorHash: hashActor(ctx),
      occurredAt: Date.now(),
      metadata: { reportType: "dashboard_assistant" },
    });
  } catch (error) {
    // Usage telemetry must not hide a completed answer from the team member.
    console.warn("[DashboardAssistant] Could not record usage event", error);
  }
}

export const dashboardAssistantRouter = router({
  snapshot: teamProcedure
    .input(dateRangeSchema)
    .query(({ ctx, input }) => buildDashboardSnapshot(ctx, input)),

  ask: teamProcedure
    .input(askInputSchema)
    .mutation(async ({ ctx, input }) => {
      const snapshot = await buildDashboardSnapshot(ctx, input);
      const startedAt = Date.now();
      const response = await invokeLLM({
        model: DASHBOARD_ASSISTANT_MODEL,
        reasoning: { effort: "low" },
        response_format: {
          type: "json_schema",
          json_schema: assistantResponseJsonSchema,
        },
        messages: [
          { role: "system", content: assistantSystemPrompt(snapshot.dataWindow) },
          {
            role: "user",
            content: `שאלת הצוות: ${input.question}\n\nנתוני snapshot מצומצמים ובטוחים:\n${JSON.stringify(snapshot)}`,
          },
        ],
      });
      if (!Array.isArray((response as any)?.choices)) {
        throw new TRPCError({ code: "BAD_GATEWAY", message: "מודל העוזר לא החזיר תשובה תקינה" });
      }
      const answer = parseDashboardAssistantAnswer(response.choices[0]?.message.content);
      await recordAssistantUsage(ctx, startedAt, response.usage);
      return answer;
    }),
});

export type DashboardAssistantAnswer = z.infer<typeof assistantAnswerSchema>;
export type DashboardSnapshot = Awaited<ReturnType<typeof buildDashboardSnapshot>>;

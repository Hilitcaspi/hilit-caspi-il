import { sql } from "drizzle-orm";
import { z } from "zod";
import { router, teamProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { acquisitionActorKey } from "./acquisitionCapture";
import {
  chooseClosing,
  findConservativeDuplicateReviewIds,
  type PaymentRow,
} from "./salesIntelligence";
import {
  decryptGrowReferences,
  growReceiptConflict,
  growReceiptKey,
} from "./growPaymentAccounting";
import { isProductionPurchaseMeasurement } from "../shared/metaPurchasePolicy";
import {
  classifyMarketingChannel,
  MARKETING_CHANNELS,
  MARKETING_PRODUCT_GROUPS,
  marketingProduct,
  type MarketingChannel,
  type MarketingProductGroup,
} from "../shared/marketingChannelClassification";

const DAY = 86_400_000;
const MAX_ROWS = 20_000;
const PRIVACY_MIN = 5;
const TIMEZONE = "Asia/Jerusalem";
export const marketingChannelsInputSchema = z
  .object({
    startDate: z.number().int().nonnegative().max(8_640_000_000_000_000),
    endDate: z.number().int().nonnegative().max(8_640_000_000_000_000),
  })
  .strict()
  .refine(
    ({ startDate, endDate }) =>
      endDate > startDate && endDate - startDate <= 93 * DAY,
    {
      message: "טווח הדוח חייב להיות חיובי ועד 93 ימים; סוף הטווח אינו כלול",
    }
  );
type Range = z.infer<typeof marketingChannelsInputSchema>;
export type Availability = "available" | "partial" | "unavailable";
export type AggregateMetric = {
  value: number | null;
  status: Availability;
  reason:
    | "small_cell"
    | "complementary_suppression"
    | "not_connected"
    | "no_cohort"
    | "missing_identity"
    | "source_unavailable"
    | "bounded_limit"
    | null;
};
type Touch = { source?: unknown; medium?: unknown; referrer?: unknown };
export type MarketingPurchase = {
  /** Internal only. Neither these identifiers nor raw tags are serialized. */
  transactionId: string;
  buyerKey: string | null;
  product: string;
  amountAgorot: number;
  paidAt: number;
  first: Touch;
  closing: Touch;
  firstSnapshot: boolean;
};
type Totals = {
  purchases: AggregateMetric;
  confirmedBuyers: AggregateMetric;
  revenueAgorot: AggregateMetric;
};
export type MarketingChannelsReport = {
  period: Range & {
    timezone: typeof TIMEZONE;
    endExclusive: true;
    partialToday: boolean;
  };
  generatedAt: number;
  sources: Record<
    | "payments"
    | "firstTouch"
    | "closingTouch"
    | "traffic"
    | "googleSpend"
    | "ga4"
    | "searchConsole"
    | "youtubeAnalytics"
    | "leads",
    { status: Availability; updatedAt: number | null; note: string }
  >;
  total: Totals;
  groups: Array<{
    group: MarketingProductGroup;
    label: string;
    totals: Totals;
  }>;
  views: Array<{
    key: "first" | "closing";
    label: string;
    groups: Array<{
      group: MarketingProductGroup;
      channels: Array<{
        channel: MarketingChannel;
        label: string;
        totals: Totals;
        spendAgorot: AggregateMetric;
        cpaAgorot: AggregateMetric;
        roas: AggregateMetric;
        newLeads: AggregateMetric;
      }>;
      products: Array<{ product: string; label: string; totals: Totals }>;
      unknownPurchaseShare: AggregateMetric;
      firstSnapshotShare: AggregateMetric;
    }>;
  }>;
  traffic: {
    totalPageViewEvents: AggregateMetric;
    channels: Array<{
      channel: MarketingChannel;
      label: string;
      pageViewEvents: AggregateMetric;
    }>;
    note: string;
  };
  privacy: { minimumBuyers: 5; breakdownSuppressed: boolean; note: string };
  quality: {
    providerReconciled: false;
    note: string;
    exclusions: string;
    plusBillingSplit: "unavailable";
    refunds: "unavailable";
  };
};
const metric = (value: number): AggregateMetric => ({
  value,
  status: "available",
  reason: null,
});
const missing = (
  reason: NonNullable<AggregateMetric["reason"]>,
  status: Availability = "unavailable"
): AggregateMetric => ({ value: null, status, reason });
function totals(rows: MarketingPurchase[], hide: boolean): Totals {
  const identitiesComplete = rows.every(row => row.buyerKey !== null);
  const buyers = new Set(
    rows.flatMap(row => (row.buyerKey ? [row.buyerKey] : []))
  );
  const small = rows.length > 0 && buyers.size < PRIVACY_MIN;
  if (hide || small || !identitiesComplete) {
    const reason = hide
      ? "complementary_suppression"
      : !identitiesComplete
        ? "missing_identity"
        : "small_cell";
    return {
      purchases: missing(reason, "partial"),
      confirmedBuyers: missing(reason, "partial"),
      revenueAgorot: missing(reason, "partial"),
    };
  }
  return {
    purchases: metric(rows.length),
    confirmedBuyers: metric(buyers.size),
    revenueAgorot: metric(rows.reduce((sum, row) => sum + row.amountAgorot, 0)),
  };
}
function channel(row: MarketingPurchase, view: "first" | "closing") {
  return classifyMarketingChannel(
    view === "first" && !row.firstSnapshot ? {} : row[view]
  );
}
/** Suppress the entire partition, not just one cell. A visible grand total cannot
 * reconstruct a hidden channel/product, and switching views cannot reconstruct
 * small intersections. This deliberately sacrifices granularity over privacy.
 * Arbitrary range differencing across separate requests is not differential privacy. */
export function needsMarketingBreakdownSuppression(rows: MarketingPurchase[]) {
  const cube = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!row.buyerKey) return true;
    const key = `${marketingProduct(row.product).key}|${channel(row, "first")}|${channel(row, "closing")}|${row.firstSnapshot}`;
    const buyers = cube.get(key) || new Set<string>();
    buyers.add(row.buyerKey);
    cube.set(key, buyers);
  }
  return Array.from(cube.values()).some(buyers => buyers.size < PRIVACY_MIN);
}
function uniquePurchases(rows: MarketingPurchase[]) {
  const unique = new Map<string, MarketingPurchase>();
  for (const row of rows)
    if (row.transactionId && !unique.has(row.transactionId))
      unique.set(row.transactionId, row);
  return Array.from(unique.values());
}
export function buildMarketingChannelsReport(input: {
  range: Range;
  purchases: MarketingPurchase[];
  now?: number;
  paymentStatus?: Availability;
  firstStatus?: Availability;
  closingStatus?: Availability;
  traffic?: Array<{ channel: MarketingChannel; count: number }>;
  trafficStatus?: Availability;
}): MarketingChannelsReport {
  const now = input.now ?? Date.now();
  const rows = uniquePurchases(input.purchases).filter(
    row =>
      row.paidAt >= input.range.startDate && row.paidAt < input.range.endDate
  );
  const unavailable = input.paymentStatus === "unavailable";
  const hide = needsMarketingBreakdownSuppression(rows) || unavailable;
  const readStatus = (status: Availability, note: string) => ({
    status,
    updatedAt: status === "unavailable" ? null : now,
    note,
  });
  const sourceUnavailable = (note: string) => readStatus("unavailable", note);
  const selectGroup = (group: MarketingProductGroup) =>
    group === "all"
      ? rows
      : rows.filter(row => marketingProduct(row.product).group === group);
  const safeTotals = (selected: MarketingPurchase[], suppress = false) =>
    unavailable
      ? {
          purchases: missing("source_unavailable"),
          confirmedBuyers: missing("source_unavailable"),
          revenueAgorot: missing("source_unavailable"),
        }
      : totals(selected, suppress);
  const pageViews = input.traffic || [];
  // Events are not people. With no stable consented visitor identity, a small
  // event bucket suppresses all event buckets and the total (no subtraction).
  const hideTraffic = pageViews.some(
    row => row.count > 0 && row.count < PRIVACY_MIN
  );
  const trafficMetric = (count: number) =>
    input.trafficStatus !== "available"
      ? missing("source_unavailable")
      : hideTraffic
        ? missing("complementary_suppression", "partial")
        : metric(count);
  return {
    period: {
      ...input.range,
      timezone: TIMEZONE,
      endExclusive: true,
      partialToday:
        new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(
          input.range.endDate - 1
        ) ===
        new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(now),
    },
    generatedAt: now,
    sources: {
      payments: readStatus(
        input.paymentStatus ?? "available",
        "completed_payments + קבלת Grow verified/provider_confirmed עם עסקה, מוצר וסכום תואמים; ללא קריאה חדשה לספק"
      ),
      firstTouch: readStatus(
        input.firstStatus ?? "partial",
        "רק צילום acquisition_first_touches שנשמר לפני התשלום; ללא השלמה ממקור CRM משתנה או מהעסקה"
      ),
      closingTouch: readStatus(
        input.closingStatus ?? "partial",
        "מגע סגירה לפי עוזר salesIntelligence: אתר/תהליך/מייל תואם; UTM אינו הוכחת קליק Ads"
      ),
      traffic: readStatus(
        input.trafficStatus ?? "unavailable",
        "אירועי page_view פנימיים בלבד; לא sessions ולא משתמשים"
      ),
      googleSpend: sourceUnavailable(
        "אין חיבור Google Ads מאומת או ייבוא הוצאה שנבדק"
      ),
      ga4: sourceUnavailable("אין חיבור נתוני GA4 מאומת"),
      searchConsole: sourceUnavailable("אין חיבור Search Console מאומת"),
      youtubeAnalytics: sourceUnavailable(
        "אין חיבור YouTube Analytics מאומת; אין נתוני צפייה"
      ),
      leads: sourceUnavailable(
        "אין קוהורט לידים חדש, מנוכה כפילות ובעל מקור גיוס היסטורי אמין; לא מחושב משפך או שיעור המרה"
      ),
    },
    total: safeTotals(rows),
    groups: MARKETING_PRODUCT_GROUPS.map(group => ({
      group: group.key,
      label: group.label,
      totals: safeTotals(selectGroup(group.key), group.key !== "all" && hide),
    })),
    views: (["first", "closing"] as const).map(view => ({
      key: view,
      label: view === "first" ? "המגע הראשון שנשמר" : "מגע הסגירה המתועד",
      groups: MARKETING_PRODUCT_GROUPS.map(({ key: group }) => {
        const selected = selectGroup(group);
        const productKeys =
          group === "all"
            ? [
                "database",
                "bundle_november",
                "bundle_tubav",
                "bundle_new_year",
                "session",
                "plus",
                "database_plus",
                "match_boost",
                "boost",
                "guide",
                "course",
                "coaching",
                "coaching_mas",
                "live_october",
                "unknown",
              ]
            : [
                "database",
                "bundle_november",
                "bundle_tubav",
                "bundle_new_year",
                "session",
                "plus",
                "database_plus",
                "match_boost",
                "boost",
                "guide",
                "course",
                "coaching",
                "coaching_mas",
                "live_october",
                "unknown",
              ].filter(key => marketingProduct(key).group === group);
        const safeShare = (matched: number) =>
          unavailable
            ? missing("source_unavailable")
            : hide
              ? missing("complementary_suppression", "partial")
              : selected.length === 0
                ? missing("source_unavailable")
                : metric(matched / selected.length);
        return {
          group,
          channels: MARKETING_CHANNELS.map(item => ({
            channel: item.key,
            label: item.label,
            totals: safeTotals(
              selected.filter(row => channel(row, view) === item.key),
              hide
            ),
            spendAgorot: missing("not_connected"),
            cpaAgorot: missing("not_connected"),
            roas: missing("not_connected"),
            newLeads: missing("no_cohort"),
          })),
          products: productKeys.map(key => ({
            product: key,
            label: marketingProduct(key).label,
            totals: safeTotals(
              selected.filter(row => marketingProduct(row.product).key === key),
              hide
            ),
          })),
          unknownPurchaseShare: safeShare(
            selected.filter(row => channel(row, view) === "unknown").length
          ),
          firstSnapshotShare: safeShare(
            selected.filter(row => row.firstSnapshot).length
          ),
        };
      }),
    })),
    traffic: {
      totalPageViewEvents: trafficMetric(
        pageViews.reduce((sum, row) => sum + row.count, 0)
      ),
      channels: MARKETING_CHANNELS.map(item => ({
        channel: item.key,
        label: item.label,
        pageViewEvents: trafficMetric(
          pageViews.find(row => row.channel === item.key)?.count ?? 0
        ),
      })),
      note: "ספירות אירועים לכל המוצרים בתקופה, ללא שיוך לרוכשים או למבט המגע הראשון. מקור חסר נשאר לא ידוע. אין מדידת צפיות YouTube או קליקי מודעה.",
    },
    privacy: {
      minimumBuyers: 5,
      breakdownSuppressed: hide,
      note: "קבוצה עם פחות מ־5 רוכשים מזוהים אינה נחשפת. אם אחד החתכים קטן, כל פירוט המקורות, המוצרים ושיעורי האיכות מוסתר גם בתאים משלימים; סה״כ מוצג רק כשבטוח. רוכשים שונים אינם ניתנים לסכימה בין ערוצים/מוצרים.",
    },
    quality: {
      providerReconciled: false,
      note: "סכום ששולם בפועל בלבד בקבלות ספק מאומתות שנשמרו באתר; אין הצלבה מחדש בדוח Grow. שני מבטי השיוך מתארים אותן רכישות ולא נסכמים יחד. מקור google/youtube לבדו אינו אורגני; hostname ללא medium נשאר לא מסווג.",
      exclusions:
        "estimated, קופוני test, חיובים עד 150 אגורות, חשד כפילות, קבלה חסרה/notification_only/review/duplicate_existing או חוסר התאמה אינם נכללים. הסף תואם מדיניות המדידה הקיימת; לא מחיר קטלוג.",
      plusBillingSplit: "unavailable",
      refunds: "unavailable",
    },
  };
}

type Receipt = {
  receiptKey: string;
  product: string;
  amountAgorot: number;
  state: string;
  category: string;
  referencesEncrypted: string;
};
/** Uses existing strict receipt identity/decryption/conflict helpers. Never calls
 * checkoutStatus (expiring browser proof), inquiry, accounting or fulfillment. */
export function isVerifiedMarketingPayment(
  row: PaymentRow,
  receipt: Receipt | undefined,
  duplicateIds: Set<number>
): boolean {
  if (
    row.amountSource !== "grow" ||
    duplicateIds.has(row.id) ||
    /^test/i.test(row.couponCode?.trim() || "") ||
    !Number.isSafeInteger(row.amountAgorot) ||
    !isProductionPurchaseMeasurement({
      amount: row.amountAgorot / 100,
      couponCode: row.couponCode,
    }) ||
    !/^\d{3,30}$/.test(row.transactionId)
  )
    return false;
  if (
    !receipt ||
    receipt.receiptKey !== growReceiptKey(row.transactionId) ||
    receipt.state !== "verified" ||
    receipt.category !== "provider_confirmed" ||
    growReceiptConflict(receipt, row)
  )
    return false;
  try {
    return (
      decryptGrowReferences(receipt.referencesEncrypted).transactionId ===
      row.transactionId
    );
  } catch {
    return false;
  }
}

/** All queries are SELECT, parameterized, and bounded. Overflow fails closed,
 * not a silently truncated report. Emails/references exist only server-side. */
export async function loadMarketingChannelsReport(
  range: Range
): Promise<MarketingChannelsReport> {
  marketingChannelsInputSchema.parse(range);
  const db = await getDb();
  if (!db)
    return buildMarketingChannelsReport({
      range,
      purchases: [],
      paymentStatus: "unavailable",
    });
  const read = async <T>(query: ReturnType<typeof sql>): Promise<T[]> => {
    const result = (await db.execute(query)) as unknown as [T[], unknown];
    if (result[0].length > MAX_ROWS) throw new Error("marketing_bounded_limit");
    return result[0];
  };
  const chunks = async <T>(
    keys: string[],
    fn: (keys: string[]) => Promise<T[]>
  ): Promise<T[]> => {
    const result: T[] = [];
    for (let index = 0; index < keys.length; index += 250) {
      result.push(...(await fn(keys.slice(index, index + 250))));
      if (result.length > MAX_ROWS) throw new Error("marketing_bounded_limit");
    }
    return result;
  };
  const list = (values: string[]) =>
    sql.join(
      values.map(value => sql`${value}`),
      sql`, `
    );
  const emailKey = (value: unknown) =>
    String(value || "")
      .trim()
      .toLowerCase();
  const result =
    await read<PaymentRow>(sql`SELECT id, transaction_id AS transactionId, email, product, coupon_code AS couponCode,
    utm_source AS utmSource, utm_medium AS utmMedium, amount_agorot AS amountAgorot, amount_source AS amountSource, paid_at AS paidAt
    FROM completed_payments WHERE paid_at >= ${range.startDate - 3_600_000} AND paid_at < ${range.endDate + 3_600_000}
    ORDER BY paid_at ASC, id ASC LIMIT ${MAX_ROWS + 1}`);
  const payments = result.map(row => ({
    ...row,
    id: Number(row.id),
    paidAt: Number(row.paidAt),
    amountAgorot: Number(row.amountAgorot),
  }));
  const duplicateIds = findConservativeDuplicateReviewIds(payments);
  const selected = payments.filter(
    row => row.paidAt >= range.startDate && row.paidAt < range.endDate
  );
  const receiptKeys = Array.from(
    new Set(
      selected
        .filter(row => /^\d{3,30}$/.test(row.transactionId))
        .map(row => growReceiptKey(row.transactionId))
    )
  );
  let receipts: Receipt[];
  try {
    receipts = await chunks(receiptKeys, keys =>
      read<Receipt>(sql`SELECT receipt_key AS receiptKey, product, amount_agorot AS amountAgorot, state, category, references_encrypted AS referencesEncrypted
      FROM grow_payment_receipts WHERE receipt_key IN (${list(keys)}) LIMIT ${MAX_ROWS + 1}`)
    );
  } catch {
    return buildMarketingChannelsReport({
      range,
      purchases: [],
      paymentStatus: "unavailable",
    });
  }
  const receiptMap = new Map(
    receipts.map(row => [
      row.receiptKey,
      { ...row, amountAgorot: Number(row.amountAgorot) },
    ])
  );
  const verified = selected.filter(row =>
    isVerifiedMarketingPayment(
      row,
      receiptMap.get(growReceiptKey(row.transactionId)),
      duplicateIds
    )
  );
  const emails = Array.from(
    new Set(verified.map(row => emailKey(row.email)).filter(Boolean))
  );
  const transactions = Array.from(
    new Set(verified.map(row => row.transactionId))
  );
  if (selected.length > 0 && !process.env.JWT_SECRET)
    return buildMarketingChannelsReport({
      range,
      purchases: [],
      paymentStatus: "unavailable",
    });
  type First = {
    actorKey: string;
    utmSource: string | null;
    utmMedium: string | null;
    capturedAt: number;
  };
  let firstStatus: Availability = "unavailable";
  let first: First[] = [];
  const actors = process.env.JWT_SECRET
    ? new Map(emails.map(email => [acquisitionActorKey(email), email]))
    : new Map<string, string>();
  if (process.env.JWT_SECRET) {
    try {
      first = await chunks(Array.from(actors.keys()), keys =>
        read<First>(sql`SELECT actor_key AS actorKey, utm_source AS utmSource, utm_medium AS utmMedium, captured_at AS capturedAt FROM acquisition_first_touches
        WHERE actor_key IN (${list(keys)}) AND captured_at < ${range.endDate} LIMIT ${MAX_ROWS + 1}`)
      );
      firstStatus = "available";
    } catch {
      firstStatus = "unavailable";
    }
  }
  const firstMap = new Map(first.map(row => [actors.get(row.actorKey), row]));
  type History = Parameters<typeof chooseClosing>[1][number];
  type Email = Parameters<typeof chooseClosing>[2][number];
  type Boost = Parameters<typeof chooseClosing>[3][number];
  type Plus = Parameters<typeof chooseClosing>[4][number];
  let history: History[] = [],
    emailTouches: Email[] = [],
    boosts: Boost[] = [],
    plus: Plus[] = [];
  let closingStatus: Availability = "available";
  try {
    const historyFrom = range.startDate - 7 * DAY;
    const values = await Promise.all([
      chunks(emails, keys =>
        read<History>(sql`SELECT email, utmSource, utmMedium, page, eventType, createdAt, 'analytics' AS sourceKind FROM analytics_events
        WHERE LOWER(TRIM(email)) IN (${list(keys)}) AND createdAt >= ${historyFrom} AND createdAt < ${range.endDate} LIMIT ${MAX_ROWS + 1}`)
      ),
      chunks(transactions, keys =>
        read<History>(sql`SELECT email, utm_source AS utmSource, utm_medium AS utmMedium, created_at AS createdAt, confirmed_transaction_id AS confirmedTransactionId, product, 'payment' AS sourceKind FROM payment_leads
        WHERE confirmed_transaction_id IN (${list(keys)}) AND created_at < ${range.endDate} LIMIT ${MAX_ROWS + 1}`)
      ),
      chunks(transactions, keys =>
        read<History>(sql`SELECT email, utm_source AS utmSource, utm_medium AS utmMedium, created_at AS createdAt, provider_transaction_id AS transactionId, 'plus_intent' AS sourceKind FROM plus_checkout_intents
        WHERE provider_transaction_id IN (${list(keys)}) AND created_at < ${range.endDate} LIMIT ${MAX_ROWS + 1}`)
      ),
      chunks(emails, keys =>
        read<Email>(sql`SELECT recipientEmail AS email, journeyKey, sentAt, clickedAt, paymentAttemptProduct FROM email_log
        WHERE LOWER(TRIM(recipientEmail)) IN (${list(keys)}) AND clickedAt >= ${historyFrom} AND clickedAt < ${range.endDate} LIMIT ${MAX_ROWS + 1}`)
      ),
      chunks(transactions, keys =>
        read<Boost>(sql`SELECT s.email, r.provider_transaction_id AS providerTransactionId, r.entry_channel AS entryChannel, r.requested_at AS requestedAt, r.paid_at AS paidAt FROM match_boost_requests r JOIN singles s ON s.id = r.single_id
        WHERE r.provider_transaction_id IN (${list(keys)}) AND r.requested_at < ${range.endDate} LIMIT ${MAX_ROWS + 1}`)
      ),
      chunks(transactions, keys =>
        read<Plus>(sql`SELECT s.email, e.provider_transaction_id AS providerTransactionId, e.event_type AS eventType, e.created_at AS createdAt FROM plus_payment_events e JOIN singles s ON s.id = e.single_id
        WHERE e.provider_transaction_id IN (${list(keys)}) AND e.created_at < ${range.endDate} AND e.event_type = 'payment_succeeded' LIMIT ${MAX_ROWS + 1}`)
      ),
    ]);
    history = [...values[0], ...values[1], ...values[2]].map(row => ({
      ...row,
      createdAt: Number(row.createdAt),
    }));
    if (history.length > MAX_ROWS) throw new Error("marketing_bounded_limit");
    emailTouches = values[3].map(row => ({
      ...row,
      clickedAt: row.clickedAt === null ? null : Number(row.clickedAt),
      sentAt: row.sentAt === null ? null : Number(row.sentAt),
    }));
    boosts = values[4].map(row => ({
      ...row,
      requestedAt: Number(row.requestedAt),
      paidAt: row.paidAt === null ? null : Number(row.paidAt),
    }));
    plus = values[5].map(row => ({ ...row, createdAt: Number(row.createdAt) }));
  } catch {
    closingStatus = "partial";
  }
  const forEmail = <T extends { email: string }>(items: T[]) => {
    const map = new Map<string, T[]>();
    for (const item of items) {
      const key = emailKey(item.email);
      const bucket = map.get(key) || [];
      bucket.push(item);
      map.set(key, bucket);
    }
    return map;
  };
  const histories = forEmail(history),
    clicks = forEmail(emailTouches),
    boostMap = forEmail(boosts),
    plusMap = forEmail(plus);
  const purchases: MarketingPurchase[] = verified.map(row => {
    const email = emailKey(row.email);
    const snapshot = firstMap.get(email);
    const firstSnapshot =
      !!snapshot &&
      Number(snapshot.capturedAt) > 0 &&
      Number(snapshot.capturedAt) <= row.paidAt;
    // A failed evidence read cannot claim it selected the latest touch. Fail to unknown.
    const closing =
      closingStatus === "available"
        ? chooseMarketingClosing(
            row,
            histories.get(email) || [],
            clicks.get(email) || [],
            boostMap.get(email) || [],
            plusMap.get(email) || []
          )
        : null;
    return {
      transactionId: row.transactionId,
      buyerKey: email || null,
      product: row.product,
      amountAgorot: row.amountAgorot,
      paidAt: row.paidAt,
      firstSnapshot,
      first: firstSnapshot
        ? { source: snapshot!.utmSource, medium: snapshot!.utmMedium }
        : {},
      closing: closing
        ? { source: closing.channelSource, medium: closing.medium }
        : {},
    };
  });
  if (firstStatus === "available" && purchases.some(row => !row.firstSnapshot))
    firstStatus = "partial";
  if (
    purchases.some(row => classifyMarketingChannel(row.closing) === "unknown")
  )
    closingStatus = "partial";
  let trafficStatus: Availability = "unavailable";
  let traffic: Array<{ channel: MarketingChannel; count: number }> = [];
  try {
    const events = await read<{
      utmSource: string | null;
      utmMedium: string | null;
    }>(sql`SELECT utmSource, utmMedium FROM analytics_events
      WHERE eventType = 'page_view' AND createdAt >= ${range.startDate} AND createdAt < ${range.endDate} LIMIT ${MAX_ROWS + 1}`);
    const counts = new Map<MarketingChannel, number>();
    for (const event of events) {
      const key = classifyMarketingChannel({
        source: event.utmSource,
        medium: event.utmMedium,
      });
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    traffic = Array.from(counts).map(([channel, count]) => ({
      channel,
      count,
    }));
    trafficStatus = "available";
  } catch {
    /* unavailable is not zero */
  }
  return buildMarketingChannelsReport({
    range,
    purchases,
    paymentStatus:
      selected.length === verified.length ? "available" : "partial",
    firstStatus,
    closingStatus,
    trafficStatus,
    traffic,
  });
}

/** Existing evaluator, with explicit temporal guards on exact transaction rows. */
export function chooseMarketingClosing(
  ...[payment, history, email, boost, plus]: Parameters<typeof chooseClosing>
) {
  return chooseClosing(
    payment,
    history.filter(row => row.createdAt > 0 && row.createdAt <= payment.paidAt),
    email,
    boost.filter(
      row =>
        row.requestedAt > 0 &&
        row.requestedAt <= payment.paidAt &&
        (row.paidAt === null || row.paidAt <= payment.paidAt)
    ),
    plus.filter(row => row.createdAt > 0 && row.createdAt <= payment.paidAt)
  );
}

export const marketingChannelsRouter = router({
  summary: teamProcedure
    .use(({ ctx, next }) => {
      ctx.res.setHeader("Cache-Control", "private, no-store");
      return next();
    })
    .input(marketingChannelsInputSchema)
    .query(async ({ input }) => {
      try {
        return await loadMarketingChannelsReport(input);
      } catch {
        return buildMarketingChannelsReport({
          range: input,
          purchases: [],
          paymentStatus: "unavailable",
        });
      }
    }),
});

import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import {
  businessExpenses,
  businessRecurringItems,
} from "../drizzle/schema";
import { prorateMonthlyAmountAgorot } from "./businessFinance";
import { getDb } from "./db";
import { acquisitionActorKey } from "./acquisitionCapture";
import { META_ADS_ACCOUNT_TIMEZONE } from "./dashboardMetaSpend";
import { israelDateKey } from "./dashboardRevenue";
import { buildMetaDestinationUtmIndex } from "./metaDestinationAttribution";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const DUPLICATE_WINDOW_MS = 60 * 60 * 1000;
const TOUCH_WINDOW_MS = 7 * DAY_MS;
const HISTORY_WINDOW_MS = 5 * 365 * DAY_MS;
const EXTERNAL_SOURCE_TIMEOUT_MS = 20_000;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_RE = /(?:https?:\/\/|www\.)[^\s]+/gi;
const LONG_ID_RE = /\b\d{7,}\b/g;
const SECRET_RE = /\b(?:token|session|transaction|process|tracking|fbc|fbp)[\s:_=/-]*[A-Za-z0-9._~+/=-]{4,}/gi;

const PRODUCT_LABELS: Record<string, string> = {
  database: "מאגר רווקים",
  match_boost: "Boost",
  plus: "Database Plus",
  guide: "מדריך",
  course: "קורס",
  session: "פגישה",
  coaching: "ליווי",
  coaching_mas: "ליווי",
  bundle_tubav: "באנדל ט״ו באב",
  bundle_new_year: "באנדל",
  live_october: "אירוע לייב",
};

export type SalesIntelligence = {
  startDate: number;
  endDate: number;
  generatedAt: number;
  partialToday: boolean;
  summary: {
    recordedCount: number;
    recordedRevenueAgorot: number;
    includedCount: number;
    includedRevenueAgorot: number;
    reviewCount: number;
    reviewRevenueAgorot: number;
    excludedTests: number;
    excludedEstimated: number;
    knownClosingCount: number;
    knownAcquisitionCount: number;
    metaSpendAgorot: number | null;
    otherExpenseAgorot: number | null;
    totalExpenseAgorot: number | null;
    balanceAgorot: number | null;
    expenseComplete: boolean;
  };
  sales: Array<{
    order: number;
    buyerName?: string | null;
    creative?: string | null;
    paidAt: number;
    day: string;
    product: string;
    productLabel: string;
    amountAgorot: number;
    coupon: string | null;
    status: "included" | "review";
    paymentEvidence: string;
    acquisition: { channel: string; campaign: string; confidence: string; creative?: string | null; source?: string | null; medium?: string | null; content?: string | null };
    closing: { channel: string; campaign: string; confidence: string; source?: string | null; medium?: string | null; content?: string | null };
    emailAssist: { campaign: string; clicked: boolean; sameDay: boolean } | null;
    lagDays: number | null;
    sourceDiagnostics?: { checkoutTagged: boolean; priorSourceFound: boolean; mutableCrmAfterPurchase: boolean; capturedFirstTouch: boolean };
  }>;
  channels: Array<{ channel: string; count: number; revenueAgorot: number }>;
  products: Array<{ product: string; label: string; count: number; revenueAgorot: number }>;
  campaigns: Array<{
    campaign: string;
    channel: string;
    count: number;
    revenueAgorot: number;
    emailClosedCount: number;
    products: string[];
    mapping: string;
    spendAgorot: number | null;
    metaPurchases: number | null;
  }>;
  daily: Array<{ day: string; count: number; revenueAgorot: number; reviewCount: number }>;
  insights: Array<{ title: string; detail: string; tone: "positive" | "warning" | "neutral" }>;
  quality: {
    providerReconciled: false;
    attributionNote: string;
    expenseNote: string;
    metaTimezone: string;
    notes: string[];
  };
};

type SourceFields = {
  source?: unknown;
  utmSource?: unknown;
  utmMedium?: unknown;
  utmCampaign?: unknown;
  utmContent?: unknown;
};

export type PaymentRow = SourceFields & {
  id: number;
  transactionId: string;
  email: string;
  product: string;
  couponCode: string | null;
  amountAgorot: number;
  amountSource: "grow" | "estimated";
  paidAt: number;
};

type HistoricalTouch = SourceFields & {
  email: string;
  createdAt: number;
  updatedAt?: number | null;
  sourceKind: "crm" | "legacy" | "single" | "payment" | "plus_intent" | "analytics" | "first_touch" | "linked_dna";
  metaCampaignId?: string | null;
  metaAdId?: string | null;
  transactionId?: string | null;
  product?: string | null;
  confirmedTransactionId?: string | null;
  page?: string | null;
  eventType?: string | null;
  emailJourney?: string | null;
};

export type EmailTouch = {
  email: string;
  journeyKey: string;
  sentAt: number | null;
  clickedAt: number | null;
  paymentAttemptProduct: string | null;
};

type BoostTouch = {
  email: string;
  providerTransactionId: string | null;
  entryChannel: string;
  requestedAt: number;
  paidAt: number | null;
};

type PlusPaymentTouch = {
  email: string;
  providerTransactionId: string | null;
  eventType: string;
  createdAt: number;
};

type InternalAttribution = {
  channelSource: string;
  medium: string;
  campaignRaw: string;
  creative?: string;
  confidence: string;
  at: number | null;
  metaCampaignId: string | null;
  mapping: string;
};

type ResolvedAttribution = {
  channel: string;
  campaign: string;
  confidence: string;
  mapping: string;
  metaCampaignId: string | null;
  creative?: string;
};

type InternalSale = {
  payment: PaymentRow;
  status: "included" | "review";
  acquisition: InternalAttribution;
  closing: InternalAttribution;
  emailAssist: { campaignRaw: string; clicked: boolean; sameDay: boolean } | null;
  lagDays: number | null;
};

type MetaCampaign = {
  id: string;
  name: string;
  spend: number;
  purchases: number;
};

type MetaContext = {
  status: "available" | "partial" | "unavailable";
  campaigns: Map<string, MetaCampaign>;
  uniqueUtmCampaigns: Map<string, string>;
  activeCampaignIds: Set<string>;
  adReferences?: Map<string, { campaignId: string; name: string }>;
  uniqueUtmAds?: Map<string, { campaignId: string; name: string }>;
};

function text(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function lower(value: unknown): string {
  return text(value).toLowerCase();
}

function normalizedEmail(value: unknown): string {
  return lower(value);
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Removes PII, technical identifiers, URLs and credentials only at the display boundary. */
export function sanitizeSalesLabel(value: unknown, fallback = "לא זוהה"): string {
  const cleaned = text(value)
    .replace(EMAIL_RE, "[כתובת הוסרה]")
    .replace(URL_RE, "[קישור הוסר]")
    .replace(SECRET_RE, "[ערך טכני הוסר]")
    .replace(LONG_ID_RE, "[מזהה הוסר]")
    .replace(/[\r\n|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  return cleaned && !/^\[[^\]]+\]$/.test(cleaned) ? cleaned : fallback;
}

function productLabel(product: string): string {
  return PRODUCT_LABELS[product] || sanitizeSalesLabel(product, "מוצר לא מזוהה");
}

function productForOutput(product: string): string {
  const safe = sanitizeSalesLabel(product, "unknown");
  return safe === "unknown" ? "unknown" : safe;
}

function campaignLabel(value: unknown): string {
  const raw = text(value);
  const key = lower(raw).replace(/:\d+$/, "");
  const known: Record<string, string> = {
    women_first_step_v2: "הצעד הראשון לנשים",
    men_first_step_v2: "הצעד הראשון לגברים",
    boost_opportunity: "הצעת Boost אישית",
    boost_opportunity_v1: "הצעת Boost אישית",
    boost_plus_upsell_v1: "הצעת Plus אחרי Boost",
    database_session_upsell_v1: "הצעת פגישה לחברי המאגר",
    live_launch26_cold: "השקת מאגר עם מתנת לייב",
    live_launch26_plus: "הזמנת Plus ללייב",
    database_holiday_now_sep27: "הטבת NOW סוף ספטמבר",
  };
  return known[key] || sanitizeSalesLabel(raw, "ללא קמפיין");
}

function hasSourceFields(row: SourceFields): boolean {
  const source = lower(row.utmSource) || lower(row.source);
  // A lifecycle label describes a service, not a channel. It must never hide
  // a later valid source record in the same person's historical evidence.
  const identifiableSource = !!source && !["paid_database", "paid_plus", "paid_guide", "dna_quiz", "database", "direct", "unknown", "(direct)", "none"].includes(source);
  return identifiableSource || Boolean(text(row.utmMedium) || text(row.utmCampaign) || text(row.utmContent));
}

function isTestOrTiny(row: Pick<PaymentRow, "couponCode" | "amountAgorot">): boolean {
  return /^test/i.test(text(row.couponCode)) || numberValue(row.amountAgorot) <= 150;
}

function isCanonicalNumericTransaction(transactionId: string | null | undefined): boolean {
  return /^\d+$/.test(text(transactionId));
}

export function findConservativeDuplicateReviewIds(rows: PaymentRow[]): Set<number> {
  const reviewIds = new Set<number>();
  const groups = new Map<string, PaymentRow[]>();
  for (const row of [...rows].sort((a, b) => a.paidAt - b.paidAt || a.id - b.id)) {
    if (row.product === "match_boost" || row.amountSource !== "grow" || isTestOrTiny(row)) continue;
    const key = `${normalizedEmail(row.email)}\u0000${lower(row.product)}\u0000${numberValue(row.amountAgorot)}`;
    const group = groups.get(key) || [];
    for (let index = group.length - 1; index >= 0; index -= 1) {
      const previous = group[index]!;
      if (row.paidAt - previous.paidAt > DUPLICATE_WINDOW_MS) break;
      if (isCanonicalNumericTransaction(previous.transactionId) !== isCanonicalNumericTransaction(row.transactionId)) {
        // Never remove a ledger row. The later member is review-only until Grow is reconciled.
        reviewIds.add(row.id);
        break;
      }
    }
    group.push(row);
    groups.set(key, group);
  }
  return reviewIds;
}

function classifyChannel(sourceInput: unknown, mediumInput: unknown): string {
  const rawSource = lower(sourceInput);
  const source = /(^|\.)facebook\.com$/.test(rawSource) ? "facebook" : /(^|\.)instagram\.com$/.test(rawSource) ? "instagram" : rawSource;
  const medium = lower(mediumInput);
  const paidMedium = /(?:^|[_\s-])(paid|cpc|ppc|paid_social|social_paid)(?:$|[_\s-])/.test(medium);
  if (source === "email" || source === "brevo" || source === "newsletter" || medium === "email") return "Email";
  if (source === "whatsapp") return "WhatsApp";
  if (["sms", "vibrate"].includes(source) || medium === "sms") return "SMS";
  if (source === "site_upsell" || medium === "onsite") return "הצעה באתר";
  if (!source || ["direct", "unknown", "(direct)", "none"].includes(source)) return "ישיר / לא ידוע";
  if (source === "google") return paidMedium ? "Google Ads" : "Google / SEO";
  if (["meta", "meta_ads", "meta_lead_guide", "meta_lead_dna", "meta_lead_call"].includes(source)) return "Meta Ads (ממומן)";
  if (["facebook", "fb", "instagram", "ig"].includes(source)) {
    return paidMedium ? "Meta Ads (ממומן)" : `${source === "instagram" || source === "ig" ? "Instagram" : "Facebook"} (אורגני/לא ידוע)`;
  }
  if (source === "referral" || source === "shahar") return "הפניה";
  if (source === "personal_area") return "אזור אישי";
  if (source === "subscription") return "חידוש";
  if (source === "dna_quiz") return "שאלון DNA / מקור לא ידוע";
  return sanitizeSalesLabel(source, "ישיר / לא ידוע");
}

function internalAttribution(
  row: SourceFields,
  confidence: string,
  at: number | null,
  options: { metaCampaignId?: string | null; mapping?: string } = {},
): InternalAttribution {
  // CRM source is often a lifecycle label (for example dna_quiz). Prefer the
  // separately captured UTM source except where the immutable Meta-lead label
  // is the only source evidence available.
  const explicitSource = text(row.source);
  const utmSource = text(row.utmSource);
  return {
    channelSource: utmSource || explicitSource,
    medium: text(row.utmMedium),
    campaignRaw: text(row.utmCampaign),
    creative: text(row.utmContent),
    confidence,
    at,
    metaCampaignId: text(options.metaCampaignId) || null,
    mapping: options.mapping || "מקור שמור באתר (ללא מיפוי Meta)",
  };
}

function unknownAttribution(confidence: string): InternalAttribution {
  return {
    channelSource: "",
    medium: "",
    campaignRaw: "",
    confidence,
    at: null,
    metaCampaignId: null,
    mapping: "ללא מיפוי",
  };
}

export function resolveAttribution(value: InternalAttribution, meta: MetaContext): ResolvedAttribution {
  const rawCampaign = text(value.campaignRaw);
  const rawCampaignKey = lower(rawCampaign);
  const channel = classifyChannel(value.channelSource, value.medium);
  // An Email click remains Email even if its generic UTM happens to resemble a
  // Meta creative. Only explicit paid evidence may bridge it to Meta.
  const isEmailLayer = channel === "Email";
  const isMetaLayer = channel === "Meta Ads (ממומן)" || /^(?:Facebook|Instagram)/.test(channel)
    || (["ישיר / לא ידוע", "שאלון DNA / מקור לא ידוע", "facebook_shabek"].includes(channel)
      && /^(?:facebook_shabek|dna_quiz|direct|unknown|\(direct\)|none)?$/.test(lower(value.channelSource)));
  const adReference = isMetaLayer && !isEmailLayer ? meta.adReferences?.get(text(value.creative)) : undefined;
  const byExactAd = adReference ? meta.campaigns.get(adReference.campaignId) : undefined;
  if (byExactAd) return {
    channel: "Meta Ads (ממומן)",
    campaign: sanitizeSalesLabel(byExactAd.name, "קמפיין Meta לא מזוהה"),
    confidence: `${value.confidence}; מזהה מודעה תואם`,
    mapping: "מזהה מודעת Meta תואם",
    metaCampaignId: byExactAd.id,
    creative: sanitizeSalesLabel(adReference!.name, "מודעת Meta"),
  };
  const byId = isMetaLayer && !isEmailLayer && value.metaCampaignId ? meta.campaigns.get(value.metaCampaignId) : undefined;
  const byRawId = isMetaLayer && !isEmailLayer && rawCampaign ? meta.campaigns.get(rawCampaign) : undefined;
  const byUniqueUtmId = isMetaLayer && !isEmailLayer && rawCampaignKey ? meta.uniqueUtmCampaigns.get(rawCampaignKey) : undefined;
  const mapped = byId || byRawId || (byUniqueUtmId ? meta.campaigns.get(byUniqueUtmId) : undefined);
  if (mapped) {
    const uniqueAd = byUniqueUtmId ? meta.uniqueUtmAds?.get(rawCampaignKey) : undefined;
    const matchedUniqueAd = uniqueAd?.campaignId === mapped.id ? uniqueAd : undefined;
    const mapping = byId || byRawId
      ? "מזהה קמפיין Meta תואם"
      : "UTM קריאטיב ייחודי תואם";
    return {
      channel: "Meta Ads (ממומן)",
      campaign: sanitizeSalesLabel(mapped.name, "קמפיין Meta לא מזוהה"),
      confidence: matchedUniqueAd ? `${value.confidence}; תיוג מודעה ייחודי תואם` : value.confidence,
      mapping,
      metaCampaignId: mapped.id,
      ...(matchedUniqueAd ? { creative: sanitizeSalesLabel(matchedUniqueAd.name, "מודעת Meta") } : {}),
    };
  }

  if (isMetaLayer && !isEmailLayer && value.metaCampaignId) {
    return {
      channel: "Meta Ads (ממומן)",
      campaign: "מקור Meta מתועד; קמפיין לא ממופה",
      confidence: value.confidence,
      mapping: "מזהה Meta מתועד, ללא קמפיין בחלון ההוצאות",
      metaCampaignId: null,
    };
  }

  if (channel === "Google Ads" && /(?:^|[_-])(?:sales_warm|database|dna(?:[_-]quiz)?)(?:$|[_-])/i.test(rawCampaign)) {
    return {
      channel: "ישיר / לא ידוע",
      campaign: "קמפיין לא חד־משמעי",
      confidence: "UTM ללא מיפוי Meta ייחודי",
      mapping: "UTM לא חד־משמעי",
      metaCampaignId: null,
    };
  }
  const campaign = rawCampaign
    ? campaignLabel(rawCampaign)
    : channel === "ישיר / לא ידוע" ? "ללא מקור מתועד" : "ללא קמפיין";
  return { channel, campaign, confidence: value.confidence, mapping: value.mapping, metaCampaignId: null };
}

function byEmail<T extends { email: string }>(rows: T[]): Map<string, T[]> {
  const result = new Map<string, T[]>();
  for (const row of rows) {
    const key = normalizedEmail(row.email);
    if (!key) continue;
    const list = result.get(key) || [];
    list.push(row);
    result.set(key, list);
  }
  for (const list of Array.from(result.values())) list.sort((a: any, b: any) => numberValue(a.createdAt ?? a.sentAt ?? a.paidAt) - numberValue(b.createdAt ?? b.sentAt ?? b.paidAt));
  return result;
}

function productMatchesEmailTouch(product: string, touch: EmailTouch): boolean {
  const attempted = lower(touch.paymentAttemptProduct);
  if (attempted) return attempted === lower(product);
  const journey = lower(touch.journeyKey);
  if (product === "database") {
    return /(?:database|מאגר|women_first_step|men_first_step|meta_lead_dna|free_guide_nurture|live_launch_oct|live_oct)/.test(journey);
  }
  const terms: Record<string, RegExp> = {
    match_boost: /boost|בוסט/,
    plus: /\bplus\b/,
    guide: /guide|מדריך/,
    course: /course|קורס/,
    coaching: /coaching|ליווי/,
    session: /session|פגישה/,
  };
  return terms[product]?.test(journey) || false;
}

function productMatchesAnalyticsTouch(product: string, touch: HistoricalTouch): boolean {
  const page = lower(touch.page);
  const event = lower(touch.eventType);
  if (!page && !event) return true;
  if (product === "match_boost") return /boost/.test(page) || /boost/.test(event);
  if (product === "database") return /database|singles|join/.test(page) || /database/.test(event);
  if (product === "plus") return /plus/.test(page) || /plus/.test(event);
  if (product === "guide") return /guide/.test(page) || /guide/.test(event);
  if (product === "course") return /course/.test(page) || /course/.test(event);
  if (product === "coaching" || product === "session") return /coaching|session|calendly/.test(page) || /coaching|calendly/.test(event);
  return true;
}

function exactTransactionMatch(value: unknown, transactionId: string): boolean {
  return Boolean(text(value) && text(value) === text(transactionId));
}

export function chooseAcquisition(payment: PaymentRow, history: HistoricalTouch[]): InternalAttribution {
  const before = history.filter(row => numberValue(row.createdAt) > 0 && numberValue(row.createdAt) <= payment.paidAt);
  const snapshot = before.filter(row => row.sourceKind === "first_touch").sort((a, b) => a.createdAt - b.createdAt)[0];
  if (snapshot && (hasSourceFields(snapshot) || snapshot.metaCampaignId)) return internalAttribution({ ...snapshot, utmContent: snapshot.metaAdId || snapshot.utmContent }, "מקור ראשוני נפרד שנשמר בהרשמה", snapshot.createdAt, { metaCampaignId: snapshot.metaCampaignId });
  const immutableAnalytics = before
    .filter(row => ["analytics", "linked_dna"].includes(row.sourceKind) && hasSourceFields(row))
    .sort((a, b) => a.createdAt - b.createdAt)[0];
  const crmMetaLead = before
    .filter(row => row.sourceKind === "crm" && ["meta_lead_guide", "meta_lead_dna", "meta_lead_call"].includes(lower(row.source)) && text(row.metaCampaignId) && numberValue(row.updatedAt) <= payment.paidAt)
    .sort((a, b) => a.createdAt - b.createdAt)[0];
  if (crmMetaLead) {
    return internalAttribution(crmMetaLead, "מקור Meta שמור ב־CRM; אינו צילום היסטורי", crmMetaLead.createdAt, {
      metaCampaignId: text(crmMetaLead.metaCampaignId),
      mapping: "מזהה קמפיין Meta נשמר ב־CRM",
    });
  }

  const legacy = before.filter(row => row.sourceKind === "legacy" && hasSourceFields(row)).sort((a, b) => a.createdAt - b.createdAt)[0];
  if (legacy) return internalAttribution(legacy, "מקור ראשון היסטורי (legacy)", legacy.createdAt);

  if (immutableAnalytics) return internalAttribution(immutableAnalytics, "מקור מתועד באירוע אתר היסטורי", immutableAnalytics.createdAt);

  const crmFirst = before.filter(row => row.sourceKind === "crm" && hasSourceFields(row) && numberValue(row.updatedAt) <= payment.paidAt).sort((a, b) => a.createdAt - b.createdAt)[0];
  if (crmFirst) {
    return internalAttribution(crmFirst, "מקור ראשון שמור; עשוי להשתנות", crmFirst.createdAt, {
      metaCampaignId: text(crmFirst.metaCampaignId) || null,
    });
  }

  const profile = before.filter(row => row.sourceKind === "single" && hasSourceFields(row)).sort((a, b) => a.createdAt - b.createdAt)[0];
  if (profile) return internalAttribution(profile, "מקור רישום שמור; עשוי להשתנות", profile.createdAt);

  const directPayment = before.filter(row => row.sourceKind === "payment" && exactTransactionMatch(row.confirmedTransactionId, payment.transactionId) && hasSourceFields(row))[0];
  if (directPayment) return internalAttribution(directPayment, "מקור בעסקה; לא נמצא מקור קודם", directPayment.createdAt);

  if (hasSourceFields(payment)) return internalAttribution(payment, "מקור בעסקה; לא נמצא מקור קודם", payment.paidAt);
  return unknownAttribution("לא נמצא מקור רכישה היסטורי מתועד");
}

/** Only booleans leave the server; mutable late CRM tags are not attributed. */
export function diagnoseSalesSource(payment: PaymentRow, history: HistoricalTouch[]) {
  const before = history.filter(row => numberValue(row.createdAt) > 0 && numberValue(row.createdAt) <= payment.paidAt);
  const acquisition = chooseAcquisition(payment, history);
  return {
    checkoutTagged: hasSourceFields(payment) || before.some(row => row.sourceKind === "payment" && exactTransactionMatch(row.confirmedTransactionId, payment.transactionId) && hasSourceFields(row)),
    priorSourceFound: !["ישיר / לא ידוע", "שאלון DNA / מקור לא ידוע"].includes(classifyChannel(acquisition.channelSource, acquisition.medium)),
    mutableCrmAfterPurchase: before.some(row => row.sourceKind === "crm" && hasSourceFields(row) && numberValue(row.updatedAt) > payment.paidAt),
    capturedFirstTouch: before.some(row => row.sourceKind === "first_touch" && hasSourceFields(row)),
  };
}

export function chooseClosing(
  payment: PaymentRow,
  history: HistoricalTouch[],
  emailRows: EmailTouch[],
  boostRows: BoostTouch[],
  plusPaymentRows: PlusPaymentTouch[],
): InternalAttribution {
  const exactBoost = boostRows.find(row => exactTransactionMatch(row.providerTransactionId, payment.transactionId));
  if (payment.product === "match_boost" && exactBoost && lower(exactBoost.entryChannel) === "personal_area") {
    return internalAttribution({ source: "personal_area", utmCampaign: "Boost באזור האישי" }, "בקשת Boost מותאמת לעסקה", exactBoost.paidAt || exactBoost.requestedAt, {
      mapping: "ראיית Boost תואמת לעסקה",
    });
  }

  const exactPlusPayment = plusPaymentRows.find(row => exactTransactionMatch(row.providerTransactionId, payment.transactionId) && row.eventType === "payment_succeeded");
  if (exactPlusPayment) {
    return internalAttribution({ source: "subscription", utmCampaign: "חיוב Plus תואם" }, "אירוע חיוב Plus מותאם לעסקה", exactPlusPayment.createdAt, {
      mapping: "ראיית חיוב תואמת לעסקה",
    });
  }

  const siteTouch = history
    .filter(row => row.sourceKind === "analytics" && row.createdAt <= payment.paidAt && row.createdAt >= payment.paidAt - TOUCH_WINDOW_MS && hasSourceFields(row) && productMatchesAnalyticsTouch(payment.product, row))
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  const relevantClick = emailRows
    .filter(row => row.clickedAt != null && row.clickedAt <= payment.paidAt && row.clickedAt >= payment.paidAt - TOUCH_WINDOW_MS && productMatchesEmailTouch(payment.product, row))
    .sort((a, b) => numberValue(b.clickedAt) - numberValue(a.clickedAt))[0];
  const exactPaymentLead = history.find(row => row.sourceKind === "payment" && exactTransactionMatch(row.confirmedTransactionId, payment.transactionId) && hasSourceFields(row));
  const exactIntent = history.find(row => row.sourceKind === "plus_intent" && exactTransactionMatch(row.transactionId, payment.transactionId) && hasSourceFields(row));
  const observed = [
    siteTouch ? internalAttribution(siteTouch, "מגע אתר מתועד ב־7 ימים לפני התשלום", siteTouch.createdAt) : null,
    relevantClick ? internalAttribution({ source: "email", utmCampaign: relevantClick.journeyKey }, "קליק אימייל רלוונטי מתועד ב־7 ימים לפני התשלום", relevantClick.clickedAt, {
      mapping: "קליק אימייל מתועד",
    }) : null,
    exactPaymentLead ? internalAttribution(exactPaymentLead, "UTM בתהליך תשלום מותאם לעסקה", exactPaymentLead.createdAt) : null,
    exactIntent ? internalAttribution(exactIntent, "UTM בכוונת Plus מותאמת לעסקה", exactIntent.createdAt) : null,
  ].filter((value): value is InternalAttribution => value !== null)
    .sort((a, b) => numberValue(b.at) - numberValue(a.at));
  if (observed[0]) return observed[0];

  // paidAt on the ledger is not independent touch evidence; it is only a final fallback.
  if (hasSourceFields(payment)) return internalAttribution(payment, "UTM שנשמר על עסקת התשלום", null);

  return unknownAttribution("לא נמצאה ראיית סגירה מתועדת");
}

function chooseEmailAssist(payment: PaymentRow, rows: EmailTouch[]): InternalSale["emailAssist"] {
  const windowRows = rows
    .filter(row => {
      const sent = numberValue(row.sentAt);
      const clicked = numberValue(row.clickedAt);
      return (sent > 0 && sent <= payment.paidAt && sent >= payment.paidAt - TOUCH_WINDOW_MS)
        || (clicked > 0 && clicked <= payment.paidAt && clicked >= payment.paidAt - TOUCH_WINDOW_MS);
    })
    .sort((a, b) => Math.max(numberValue(b.clickedAt), numberValue(b.sentAt)) - Math.max(numberValue(a.clickedAt), numberValue(a.sentAt)));
  const relevantClick = windowRows.find(row => row.clickedAt != null && numberValue(row.clickedAt) <= payment.paidAt && productMatchesEmailTouch(payment.product, row));
  const best = relevantClick || windowRows[0];
  if (!best) return null;
  const clickedAt = numberValue(best.clickedAt) > 0 && numberValue(best.clickedAt) <= payment.paidAt ? numberValue(best.clickedAt) : 0;
  const moment = clickedAt || best.sentAt || 0;
  return {
    campaignRaw: best.journeyKey,
    clicked: clickedAt > 0,
    sameDay: moment > 0 && israelDateKey(moment) === israelDateKey(payment.paidAt),
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = EXTERNAL_SOURCE_TIMEOUT_MS): Promise<T | null> {
  return new Promise(resolve => {
    const timeout = setTimeout(() => resolve(null), timeoutMs);
    promise.then(value => {
      clearTimeout(timeout);
      resolve(value);
    }).catch(() => {
      clearTimeout(timeout);
      resolve(null);
    });
  });
}

async function getMetaContext(startDate: number, endDate: number): Promise<MetaContext> {
  try {
    const module = await withTimeout(import("./dashboardRouter"));
    if (!module) return { status: "unavailable", campaigns: new Map(), uniqueUtmCampaigns: new Map(), activeCampaignIds: new Set() };
    // Meta receives calendar labels and interprets them in its own verified
    // account timezone; these are not Israel-hour windows.
    const since = israelDateKey(startDate);
    const until = israelDateKey(Math.max(startDate, endDate - 1));
    const [insights, destinations] = await Promise.all([
      withTimeout(module.fetchMetaAdsInsights(since, until)),
      withTimeout(module.fetchMetaCampaignDestinations()),
    ]);
    if (!insights) return { status: "unavailable", campaigns: new Map(), uniqueUtmCampaigns: new Map(), activeCampaignIds: new Set() };
    const campaigns = new Map<string, MetaCampaign>();
    for (const row of [...(insights.campaigns || []), ...(insights.boosts || [])]) {
      const id = text(row.id);
      if (!id) continue;
      campaigns.set(id, {
        id,
        name: text(row.name),
        spend: numberValue(row.spend),
        purchases: numberValue(row.purchases),
      });
    }
    // Only an exact creative UTM which belongs to precisely one campaign is
    // eligible. Names and generic aliases are deliberately never inferred.
    const activeCampaignIds = new Set<string>();
    const adReferences = new Map<string, { campaignId: string; name: string }>();
    for (const [id, destination] of Object.entries(destinations || {})) {
      // Historical ads remain valid source evidence even without period spend.
      if (!campaigns.has(id)) campaigns.set(id, { id, name: destination.campaignName, spend: 0, purchases: 0 });
      for (const ad of destination.adReferences) adReferences.set(ad.id, { campaignId: id, name: ad.name });
      if (destination.activeAds > 0) activeCampaignIds.add(id);
    }
    const { uniqueUtmCampaigns, uniqueUtmAds } = buildMetaDestinationUtmIndex(destinations || {});
    for (const campaign of Array.from(campaigns.values())) if (campaign.spend > 0) activeCampaignIds.add(campaign.id);
    return { status: insights.status, campaigns, uniqueUtmCampaigns, uniqueUtmAds, activeCampaignIds, adReferences };
  } catch {
    return { status: "unavailable", campaigns: new Map(), uniqueUtmCampaigns: new Map(), activeCampaignIds: new Set() };
  }
}

async function queryByEmailChunks<T>(
  emails: string[],
  read: (chunk: string[]) => Promise<T[]>,
): Promise<T[]> {
  const output: T[] = [];
  for (let index = 0; index < emails.length; index += 250) output.push(...await read(emails.slice(index, index + 250)));
  return output;
}

/** Buyer names are opt-in at the guarded staff route only; digests/QA stay anonymous. */
export type SalesIntelligenceOptions = { includeExpenses?: boolean; includeBuyerNames?: boolean };

export function chooseStaffBuyerName(payment: PaymentRow, contacts: Array<{ email: string; name: string; confirmedTransactionId?: string | null; product?: string | null; kind: string }>): string | null {
  const matching = contacts.filter(contact => normalizedEmail(contact.email) === normalizedEmail(payment.email));
  const unique = (rows: typeof contacts) => {
    const names = Array.from(new Set(rows.map(row => sanitizeSalesLabel(row.name, "")).filter(Boolean)));
    return names.length === 1 ? names[0]! : null;
  };
  return unique(matching.filter(row => row.kind === "payment" && row.product === payment.product && exactTransactionMatch(row.confirmedTransactionId, payment.transactionId)))
    || unique(matching.filter(row => row.kind === "single"))
    || unique(matching.filter(row => row.kind === "crm"));
}

export async function getSalesIntelligence(
  startDate: number,
  endDate: number,
  { includeExpenses = true, includeBuyerNames = false }: SalesIntelligenceOptions = {},
): Promise<SalesIntelligence> {
  if (!Number.isFinite(startDate) || !Number.isFinite(endDate) || endDate <= startDate) throw new Error("Invalid sales intelligence date range");
  const db = await getDb();
  if (!db) throw new Error("Sales ledger database unavailable");

  const ledgerFrom = startDate - DUPLICATE_WINDOW_MS;
  const ledgerTo = endDate + DUPLICATE_WINDOW_MS;
  const historyFrom = startDate - HISTORY_WINDOW_MS;
  const touchFrom = startDate - TOUCH_WINDOW_MS;

  const metaPromise = getMetaContext(startDate, endDate);
  const [paymentResult, expenseRows, recurringRows] = await Promise.all([
    db.execute(sql`
      SELECT id, transaction_id AS transactionId, email, product, coupon_code AS couponCode,
             utm_source AS utmSource, utm_medium AS utmMedium, utm_campaign AS utmCampaign, utm_content AS utmContent,
             amount_agorot AS amountAgorot, amount_source AS amountSource, paid_at AS paidAt
      FROM completed_payments
      WHERE paid_at >= ${ledgerFrom} AND paid_at < ${ledgerTo}
      ORDER BY paid_at ASC, id ASC
    `),
    includeExpenses ? db.select({ amountAgorot: businessExpenses.amountAgorot }).from(businessExpenses).where(and(
      gte(businessExpenses.expenseDate, startDate),
      lte(businessExpenses.expenseDate, endDate - 1),
    )) : Promise.resolve([]),
    includeExpenses ? db.select({
      itemType: businessRecurringItems.itemType,
      amountAgorot: businessRecurringItems.amountAgorot,
      validFrom: businessRecurringItems.validFrom,
      validTo: businessRecurringItems.validTo,
    }).from(businessRecurringItems).where(and(
      eq(businessRecurringItems.isActive, true),
      eq(businessRecurringItems.itemType, "expense"),
      lte(businessRecurringItems.validFrom, endDate - 1),
      or(isNull(businessRecurringItems.validTo), gte(businessRecurringItems.validTo, startDate)),
    )) : Promise.resolve([]),
  ]);
  const paymentRows = ((paymentResult as any)[0] || []).map((row: any) => ({
    ...row,
    id: numberValue(row.id),
    transactionId: text(row.transactionId),
    email: text(row.email),
    product: text(row.product),
    couponCode: row.couponCode == null ? null : text(row.couponCode),
    amountAgorot: numberValue(row.amountAgorot),
    amountSource: text(row.amountSource) === "grow" ? "grow" as const : "estimated" as const,
    paidAt: numberValue(row.paidAt),
  })) as PaymentRow[];

  const selectedRows = paymentRows.filter(row => row.paidAt >= startDate && row.paidAt < endDate);
  const commercialGrowRows = selectedRows.filter(row => row.amountSource === "grow" && !isTestOrTiny(row));
  const duplicateReviewIds = findConservativeDuplicateReviewIds(paymentRows);
  const emails = Array.from(new Set(commercialGrowRows.map(row => normalizedEmail(row.email)).filter(Boolean)));

  const buyerContacts = includeBuyerNames ? await queryByEmailChunks(emails, async chunk => {
    const inEmails = sql.join(chunk.map(value => sql`${value}`), sql`, `);
    const [rows] = await db.execute(sql`
      SELECT email, name, confirmed_transaction_id AS confirmedTransactionId, product, 'payment' AS kind FROM payment_leads WHERE LOWER(TRIM(email)) IN (${inEmails})
      UNION ALL
      SELECT email, CONCAT_WS(' ', firstName, NULLIF(lastName, '')) AS name, NULL AS confirmedTransactionId, NULL AS product, 'single' AS kind FROM singles WHERE LOWER(TRIM(email)) IN (${inEmails})
      UNION ALL
      SELECT email, name, NULL AS confirmedTransactionId, NULL AS product, 'crm' AS kind FROM crm_leads WHERE LOWER(TRIM(email)) IN (${inEmails})
    `) as any;
    return rows as Array<{ email: string; name: string; confirmedTransactionId: string | null; product: string | null; kind: string }>;
  }) : [];

  const [crmRows, legacyRows, singleRows, paymentLeadRows, plusIntentRows, analyticsRows, emailRows, boostRows, plusPaymentRows] = await Promise.all([
    queryByEmailChunks(emails, async chunk => {
      const [rows] = await db.execute(sql`
        SELECT email, source, utmSource, utmMedium, utmCampaign, utmContent, metaCampaignId, createdAt, updatedAt
        FROM crm_leads
        WHERE LOWER(TRIM(email)) IN (${sql.join(chunk.map(value => sql`${value}`), sql`, `)})
          AND createdAt >= ${historyFrom} AND createdAt < ${endDate}
      `) as any;
      return rows as any[];
    }),
    queryByEmailChunks(emails, async chunk => {
      const [rows] = await db.execute(sql`
        SELECT email, source, utmSource, utmMedium, utmCampaign, utmContent,
               UNIX_TIMESTAMP(createdAt) * 1000 AS createdAt
        FROM leads
        WHERE LOWER(TRIM(email)) IN (${sql.join(chunk.map(value => sql`${value}`), sql`, `)})
          AND createdAt >= FROM_UNIXTIME(${historyFrom / 1000}) AND createdAt < FROM_UNIXTIME(${endDate / 1000})
      `) as any;
      return rows as any[];
    }),
    queryByEmailChunks(emails, async chunk => {
      const [rows] = await db.execute(sql`
        SELECT email, registrationSource AS source, utmSource, utmMedium, utmCampaign, utmContent, createdAt
        FROM singles
        WHERE LOWER(TRIM(email)) IN (${sql.join(chunk.map(value => sql`${value}`), sql`, `)})
          AND createdAt >= ${historyFrom} AND createdAt < ${endDate}
      `) as any;
      return rows as any[];
    }),
    queryByEmailChunks(emails, async chunk => {
      const [rows] = await db.execute(sql`
        SELECT email, product, utm_source AS utmSource, utm_medium AS utmMedium, utm_campaign AS utmCampaign,
               utm_content AS utmContent, confirmed_transaction_id AS confirmedTransactionId, created_at AS createdAt
        FROM payment_leads
        WHERE LOWER(TRIM(email)) IN (${sql.join(chunk.map(value => sql`${value}`), sql`, `)})
          AND created_at >= ${historyFrom} AND created_at < ${endDate}
      `) as any;
      return rows as any[];
    }),
    queryByEmailChunks(emails, async chunk => {
      const [rows] = await db.execute(sql`
        SELECT email, utm_source AS utmSource, utm_medium AS utmMedium, utm_campaign AS utmCampaign,
               utm_content AS utmContent, provider_transaction_id AS transactionId, created_at AS createdAt
        FROM plus_checkout_intents
        WHERE LOWER(TRIM(email)) IN (${sql.join(chunk.map(value => sql`${value}`), sql`, `)})
          AND created_at >= ${historyFrom} AND created_at < ${endDate}
      `) as any;
      return rows as any[];
    }),
    queryByEmailChunks(emails, async chunk => {
      const [rows] = await db.execute(sql`
        SELECT email, eventType, page, emailJourney, utmSource, utmMedium, utmCampaign, utmContent, createdAt
        FROM analytics_events
        WHERE LOWER(TRIM(email)) IN (${sql.join(chunk.map(value => sql`${value}`), sql`, `)})
          AND createdAt >= ${touchFrom} AND createdAt < ${endDate}
      `) as any;
      return rows as any[];
    }),
    queryByEmailChunks(emails, async chunk => {
      const [rows] = await db.execute(sql`
        SELECT recipientEmail AS email, journeyKey, sentAt, clickedAt, paymentAttemptProduct
        FROM email_log
        WHERE LOWER(TRIM(recipientEmail)) IN (${sql.join(chunk.map(value => sql`${value}`), sql`, `)})
          AND ((sentAt >= ${touchFrom} AND sentAt < ${endDate}) OR (clickedAt >= ${touchFrom} AND clickedAt < ${endDate}))
      `) as any;
      return rows as any[];
    }),
    queryByEmailChunks(emails, async chunk => {
      const [rows] = await db.execute(sql`
        SELECT s.email, r.provider_transaction_id AS providerTransactionId, r.entry_channel AS entryChannel,
               r.requested_at AS requestedAt, r.paid_at AS paidAt
        FROM match_boost_requests r JOIN singles s ON s.id = r.single_id
        WHERE LOWER(TRIM(s.email)) IN (${sql.join(chunk.map(value => sql`${value}`), sql`, `)})
          AND r.requested_at >= ${historyFrom} AND r.requested_at < ${endDate}
      `) as any;
      return rows as any[];
    }),
    queryByEmailChunks(emails, async chunk => {
      const [rows] = await db.execute(sql`
        SELECT s.email, e.provider_transaction_id AS providerTransactionId, e.event_type AS eventType, e.created_at AS createdAt
        FROM plus_payment_events e JOIN singles s ON s.id = e.single_id
        WHERE LOWER(TRIM(s.email)) IN (${sql.join(chunk.map(value => sql`${value}`), sql`, `)})
          AND e.created_at >= ${historyFrom} AND e.created_at < ${endDate}
      `) as any;
      return rows as any[];
    }),
  ]);

  const capturedSources = process.env.JWT_SECRET ? await queryByEmailChunks(emails, async chunk => {
    const lookup = new Map(chunk.map(email => [acquisitionActorKey(email), email]));
    try {
      const [rows] = await db.execute(sql`SELECT actor_key AS actorKey, utm_source AS utmSource,
        utm_medium AS utmMedium, utm_campaign AS utmCampaign, utm_content AS utmContent,
        meta_campaign_id AS metaCampaignId, meta_ad_id AS metaAdId, captured_at AS createdAt
        FROM acquisition_first_touches WHERE actor_key IN (${sql.join(Array.from(lookup.keys()).map(key => sql`${key}`), sql`, `)})
          AND captured_at < ${endDate}`) as any;
      return rows.map((row: any) => ({ ...row, email: lookup.get(row.actorKey), sourceKind: "first_touch" as const }));
    } catch { return []; } // Missing new table must never erase historical sales.
  }) : [];

  const linkedDnaRows = await queryByEmailChunks(emails, async chunk => {
    const [rows] = await db.execute(sql`
      SELECT s.email, q.utmSource, q.utmMedium, q.utmCampaign, q.utmContent,
        UNIX_TIMESTAMP(q.createdAt) * 1000 AS createdAt
      FROM dna_quiz_results q JOIN singles s ON s.id = q.singleId
      WHERE LOWER(TRIM(s.email)) IN (${sql.join(chunk.map(value => sql`${value}`), sql`, `)})
        AND q.createdAt >= FROM_UNIXTIME(${historyFrom / 1000}) AND q.createdAt < FROM_UNIXTIME(${endDate / 1000})
      UNION
      SELECT c.email, q.utmSource, q.utmMedium, q.utmCampaign, q.utmContent,
        UNIX_TIMESTAMP(q.createdAt) * 1000 AS createdAt
      FROM dna_quiz_results q JOIN crm_leads c ON c.quizSessionId = q.sessionId
      WHERE LOWER(TRIM(c.email)) IN (${sql.join(chunk.map(value => sql`${value}`), sql`, `)})
        AND q.createdAt >= FROM_UNIXTIME(${historyFrom / 1000}) AND q.createdAt < FROM_UNIXTIME(${endDate / 1000})
    `) as any;
    return rows as any[];
  });
  const history = byEmail<HistoricalTouch>([
    ...capturedSources,
    ...linkedDnaRows.map((row: any) => ({ ...row, email: text(row.email), createdAt: numberValue(row.createdAt), sourceKind: "linked_dna" as const })),

    ...crmRows.map((row: any) => ({ ...row, email: text(row.email), createdAt: numberValue(row.createdAt), sourceKind: "crm" as const, metaCampaignId: text(row.metaCampaignId) || null })),
    ...legacyRows.map((row: any) => ({ ...row, email: text(row.email), createdAt: numberValue(row.createdAt), sourceKind: "legacy" as const })),
    ...singleRows.map((row: any) => ({ ...row, email: text(row.email), createdAt: numberValue(row.createdAt), sourceKind: "single" as const })),
    ...paymentLeadRows.map((row: any) => ({ ...row, email: text(row.email), createdAt: numberValue(row.createdAt), sourceKind: "payment" as const, confirmedTransactionId: text(row.confirmedTransactionId) || null, product: text(row.product) || null })),
    ...plusIntentRows.map((row: any) => ({ ...row, email: text(row.email), createdAt: numberValue(row.createdAt), sourceKind: "plus_intent" as const, transactionId: text(row.transactionId) || null })),
    ...analyticsRows.map((row: any) => ({ ...row, email: text(row.email), createdAt: numberValue(row.createdAt), sourceKind: "analytics" as const, eventType: text(row.eventType) || null, page: text(row.page) || null, emailJourney: text(row.emailJourney) || null })),
  ]);
  const emailsByEmail = byEmail<EmailTouch>(emailRows.map((row: any) => ({
    email: text(row.email), journeyKey: text(row.journeyKey), sentAt: row.sentAt == null ? null : numberValue(row.sentAt), clickedAt: row.clickedAt == null ? null : numberValue(row.clickedAt), paymentAttemptProduct: row.paymentAttemptProduct == null ? null : text(row.paymentAttemptProduct),
  })));
  const boostsByEmail = byEmail<BoostTouch>(boostRows.map((row: any) => ({
    email: text(row.email), providerTransactionId: text(row.providerTransactionId) || null, entryChannel: text(row.entryChannel), requestedAt: numberValue(row.requestedAt), paidAt: row.paidAt == null ? null : numberValue(row.paidAt),
  })));
  const plusPaymentsByEmail = byEmail<PlusPaymentTouch>(plusPaymentRows.map((row: any) => ({
    email: text(row.email), providerTransactionId: text(row.providerTransactionId) || null, eventType: text(row.eventType), createdAt: numberValue(row.createdAt),
  })));

  const internalSales: InternalSale[] = commercialGrowRows.map(payment => {
    const email = normalizedEmail(payment.email);
    const historical = history.get(email) || [];
    const emailTouches = emailsByEmail.get(email) || [];
    const boosts = boostsByEmail.get(email) || [];
    const plusPayments = plusPaymentsByEmail.get(email) || [];
    const acquisition = chooseAcquisition(payment, historical);
    return {
      payment,
      status: duplicateReviewIds.has(payment.id) ? "review" : "included",
      acquisition,
      closing: chooseClosing(payment, historical, emailTouches, boosts, plusPayments),
      emailAssist: chooseEmailAssist(payment, emailTouches),
      lagDays: acquisition.at == null ? null : Math.max(0, Math.floor((payment.paidAt - acquisition.at) / DAY_MS)),
    };
  });

  const meta = await metaPromise;
  const resolved = internalSales.map(row => ({
    ...row,
    acquisitionResolved: resolveAttribution(row.acquisition, meta),
    closingResolved: resolveAttribution(row.closing, meta),
  }));
  const included = resolved.filter(row => row.status === "included");
  const review = resolved.filter(row => row.status === "review");

  const channelTotals = new Map<string, { count: number; revenueAgorot: number }>();
  const productTotals = new Map<string, { label: string; count: number; revenueAgorot: number }>();
  const campaignTotals = new Map<string, {
    campaign: string;
    channel: string;
    count: number;
    revenueAgorot: number;
    emailClosedCount: number;
    products: Set<string>;
    mapping: string;
    metaCampaignId: string | null;
  }>();
  const dailyTotals = new Map<string, { count: number; revenueAgorot: number; reviewCount: number }>();

  for (const row of resolved) {
    const day = israelDateKey(row.payment.paidAt);
    const daily = dailyTotals.get(day) || { count: 0, revenueAgorot: 0, reviewCount: 0 };
    if (row.status === "review") daily.reviewCount += 1;
    else {
      daily.count += 1;
      daily.revenueAgorot += row.payment.amountAgorot;
    }
    dailyTotals.set(day, daily);

    if (row.status !== "included") continue;
    const channel = row.closingResolved.channel;
    const currentChannel = channelTotals.get(channel) || { count: 0, revenueAgorot: 0 };
    currentChannel.count += 1;
    currentChannel.revenueAgorot += row.payment.amountAgorot;
    channelTotals.set(channel, currentChannel);

    const product = productForOutput(row.payment.product);
    const currentProduct = productTotals.get(product) || { label: productLabel(row.payment.product), count: 0, revenueAgorot: 0 };
    currentProduct.count += 1;
    currentProduct.revenueAgorot += row.payment.amountAgorot;
    productTotals.set(product, currentProduct);

    const campaignKey = row.acquisitionResolved.metaCampaignId
      ? `meta:${row.acquisitionResolved.metaCampaignId}`
      : `${row.acquisitionResolved.channel}\u0000${row.acquisitionResolved.campaign}\u0000${row.acquisitionResolved.mapping}`;
    const currentCampaign = campaignTotals.get(campaignKey) || {
      campaign: row.acquisitionResolved.campaign,
      channel: row.acquisitionResolved.channel,
      count: 0,
      revenueAgorot: 0,
      emailClosedCount: 0,
      products: new Set<string>(),
      mapping: row.acquisitionResolved.mapping,
      metaCampaignId: row.acquisitionResolved.metaCampaignId,
    };
    currentCampaign.count += 1;
    currentCampaign.revenueAgorot += row.payment.amountAgorot;
    currentCampaign.products.add(productLabel(row.payment.product));
    if (row.closingResolved.channel === "Email") currentCampaign.emailClosedCount += 1;
    campaignTotals.set(campaignKey, currentCampaign);
  }

  // Add only active, spend-bearing Meta rows that have no included acquisition sale.
  for (const [id, campaign] of Array.from(meta.campaigns.entries())) {
    if (!meta.activeCampaignIds.has(id) || campaign.spend <= 0 || campaignTotals.has(`meta:${id}`)) continue;
    campaignTotals.set(`meta:${id}`, {
      campaign: sanitizeSalesLabel(campaign.name, "קמפיין Meta לא מזוהה"),
      channel: "Meta Ads (ממומן)",
      count: 0,
      revenueAgorot: 0,
      emailClosedCount: 0,
      products: new Set<string>(),
      mapping: "קמפיין Meta פעיל ללא מכירה אתרית ממופה",
      metaCampaignId: id,
    });
  }

  const metaSpendAgorot = includeExpenses && meta.status === "available"
    ? Math.round(Array.from(meta.campaigns.values()).reduce((sum, campaign) => sum + campaign.spend, 0) * 100)
    : null;
  const manualExpenseAgorot = expenseRows.reduce((sum, row) => sum + numberValue(row.amountAgorot), 0);
  const recurringExpenseAgorot = recurringRows.reduce((sum, row) => sum + prorateMonthlyAmountAgorot(
    numberValue(row.amountAgorot),
    startDate,
    endDate - 1,
    numberValue(row.validFrom),
    row.validTo == null ? null : numberValue(row.validTo),
  ), 0);
  const otherExpenseAgorot = includeExpenses ? manualExpenseAgorot + recurringExpenseAgorot : null;
  const totalExpenseAgorot = metaSpendAgorot !== null && otherExpenseAgorot !== null
    ? metaSpendAgorot + otherExpenseAgorot
    : null;
  const includedRevenueAgorot = included.reduce((sum, row) => sum + row.payment.amountAgorot, 0);
  const recordedRevenueAgorot = resolved.reduce((sum, row) => sum + row.payment.amountAgorot, 0);
  const reviewRevenueAgorot = review.reduce((sum, row) => sum + row.payment.amountAgorot, 0);
  const currentTime = Date.now();
  const partialToday = israelDateKey(endDate - 1) === israelDateKey(currentTime) && endDate > currentTime - DAY_MS;
  const knownAcquisitionCount = included.filter(row => !["ישיר / לא ידוע", "שאלון DNA / מקור לא ידוע"].includes(row.acquisitionResolved.channel)).length;
  const knownClosingCount = included.filter(row => row.closingResolved.channel !== "ישיר / לא ידוע").length;
  const excludedTests = selectedRows.filter(row => row.amountSource === "grow" && isTestOrTiny(row)).length;
  const excludedEstimated = selectedRows.filter(row => row.amountSource === "estimated").length;

  const sales: SalesIntelligence["sales"] = resolved
    .sort((a, b) => a.payment.paidAt - b.payment.paidAt || a.payment.id - b.payment.id)
    .map((row, index) => ({
      order: index + 1,
      ...(includeBuyerNames ? { buyerName: chooseStaffBuyerName(row.payment, buyerContacts) } : {}),
      creative: row.closingResolved.creative || (row.closing.creative ? sanitizeSalesLabel(row.closing.creative, "לא תועד") : null),
      paidAt: row.payment.paidAt,
      day: israelDateKey(row.payment.paidAt),
      product: productForOutput(row.payment.product),
      productLabel: productLabel(row.payment.product),
      amountAgorot: row.payment.amountAgorot,
      coupon: row.payment.couponCode ? sanitizeSalesLabel(row.payment.couponCode, "קופון") : null,
      status: row.status,
      paymentEvidence: "דיווח תשלום באתר; טרם הוצלב בדוח Grow",
      sourceDiagnostics: diagnoseSalesSource(row.payment, history.get(normalizedEmail(row.payment.email)) || []),
      acquisition: {
        channel: row.acquisitionResolved.channel,
        campaign: row.acquisitionResolved.campaign,
        confidence: row.acquisitionResolved.confidence,
        creative: row.acquisitionResolved.creative || null,
        source: sanitizeSalesLabel(row.acquisition.channelSource, "") || null,
        medium: sanitizeSalesLabel(row.acquisition.medium, "") || null,
        content: sanitizeSalesLabel(row.acquisition.creative, "") || null,
      },
      closing: {
        channel: row.closingResolved.channel,
        campaign: row.closingResolved.campaign,
        confidence: row.closingResolved.confidence,
        source: sanitizeSalesLabel(row.closing.channelSource, "") || null,
        medium: sanitizeSalesLabel(row.closing.medium, "") || null,
        content: sanitizeSalesLabel(row.closing.creative, "") || null,
      },
      emailAssist: row.emailAssist ? {
        campaign: campaignLabel(row.emailAssist.campaignRaw),
        clicked: row.emailAssist.clicked,
        sameDay: row.emailAssist.sameDay,
      } : null,
      lagDays: row.lagDays,
    }));

  const channels = Array.from(channelTotals, ([channel, total]) => ({ channel, ...total }))
    .sort((a, b) => b.revenueAgorot - a.revenueAgorot || a.channel.localeCompare(b.channel));
  const products = Array.from(productTotals, ([product, total]) => ({ product, ...total }))
    .sort((a, b) => b.revenueAgorot - a.revenueAgorot || a.label.localeCompare(b.label));
  const campaigns = Array.from(campaignTotals.values()).map(total => {
    const metaCampaign = total.metaCampaignId ? meta.campaigns.get(total.metaCampaignId) : undefined;
    return {
      campaign: total.campaign,
      channel: total.channel,
      count: total.count,
      revenueAgorot: total.revenueAgorot,
      emailClosedCount: total.emailClosedCount,
      products: Array.from(total.products).sort(),
      mapping: total.mapping,
      spendAgorot: metaCampaign && meta.status === "available" ? Math.round(metaCampaign.spend * 100) : null,
      metaPurchases: metaCampaign && meta.status !== "unavailable" ? metaCampaign.purchases : null,
    };
  }).sort((a, b) => b.count - a.count || b.revenueAgorot - a.revenueAgorot || Number(b.spendAgorot || 0) - Number(a.spendAgorot || 0) || a.campaign.localeCompare(b.campaign));
  const daily = Array.from(dailyTotals, ([day, total]) => ({ day, ...total })).sort((a, b) => a.day.localeCompare(b.day));

  const insights: SalesIntelligence["insights"] = [];
  const topProduct = products[0];
  if (topProduct) insights.push({
    title: `המוצר שמוביל בהכנסות: ${topProduct.label}`,
    detail: `${topProduct.count} רכישות בסך ₪${(topProduct.revenueAgorot / 100).toLocaleString("he-IL")}. יש להעריך את איכות המכירות לפי מוצר והכנסה, לא רק לפי מספר עסקאות.`,
    tone: "positive",
  });
  const emailClosed = included.filter(row => row.closingResolved.channel === "Email").length;
  const metaEmailClosed = included.filter(row => row.acquisitionResolved.channel === "Meta Ads (ממומן)" && row.closingResolved.channel === "Email").length;
  if (emailClosed > 0) insights.push({
    title: "המיילים הם חלק ממסלול הרכישה",
    detail: `${emailClosed} מכירות כוללות ראיית סגירה ממייל, מהן ${metaEmailClosed} עם מקור גיוס Meta מתועד. כדאי למדוד את המסע כולו לפני החלטת תקציב; זו אינה ספירת המרות של Meta.`,
    tone: "neutral",
  });
  if (review.length > 0) {
    insights.push({
      title: "רשומות לבדיקת כפילות",
      detail: `${review.length} רשומות בסך ₪${(reviewRevenueAgorot / 100).toLocaleString("he-IL")} נשארו ביומן אך הוחרגו מהכלול עד הצלבה מול Grow; לא נמחקה אף עסקה.`,
      tone: "warning",
    });
  }
  if (knownAcquisitionCount > 0) {
    insights.push({
      title: "מקור רכישה מתועד",
      detail: `${knownAcquisitionCount} מתוך ${included.length} מכירות כלולות קיבלו מקור רכישה מתועד; מקור UTM ב־CRM עשוי להיות בר־שינוי ומסומן בהתאם.`,
      tone: "neutral",
    });
  }
  if (meta.status !== "available") {
    insights.push({
      title: "הוצאות Meta חלקיות או לא זמינות",
      detail: "הכנסות האתר נשמרו, אך סכום Meta ויתרת ההוצאות אינם מוצגים עד לקריאה מלאה של שני חשבונות Meta.",
      tone: "warning",
    });
  } else if (metaSpendAgorot !== null) {
    insights.push({
      title: "הוצאות Meta מוצגות בנפרד",
      detail: "Spend והמרות Ads Manager אינם הוכחת סגירה של כל מכירה עם מקור Meta באתר.",
      tone: "neutral",
    });
  }
  if (insights.length === 0) {
    insights.push({
      title: "אין חריגים מזוהים בחלון",
      detail: "כל המכירות המסחריות בחלון נותרו כלולות, בכפוף לכך שהיומן טרם הוצלב בדוח Grow.",
      tone: "positive",
    });
  }

  return {
    startDate,
    endDate,
    generatedAt: currentTime,
    partialToday,
    summary: {
      recordedCount: resolved.length,
      recordedRevenueAgorot,
      includedCount: included.length,
      includedRevenueAgorot,
      reviewCount: review.length,
      reviewRevenueAgorot,
      excludedTests,
      excludedEstimated,
      knownClosingCount,
      knownAcquisitionCount,
      metaSpendAgorot,
      otherExpenseAgorot,
      totalExpenseAgorot,
      balanceAgorot: totalExpenseAgorot === null ? null : includedRevenueAgorot - totalExpenseAgorot,
      // Entered expenses and a live Meta call are not accounting-complete evidence.
      expenseComplete: false,
    },
    sales,
    channels,
    products,
    campaigns,
    daily,
    insights,
    quality: {
      providerReconciled: false,
      attributionNote: "מקור רכישה, ראיית סגירה והמרות Ads Manager הם מושגים נפרדים. UTM בר־שינוי אינו מוצג כמקור ראשון ודאי.",
      expenseNote: includeExpenses
        ? "ההוצאות כוללות Meta כאשר הקריאה מלאה, הוצאות עסקיות שהוזנו ופריסה של סעיפים חוזרים פעילים; זו אינה הנהלת חשבונות מלאה."
        : "הוצאות לא התבקשו בקריאה זו ולכן לא חושבו.",
      metaTimezone: META_ADS_ACCOUNT_TIMEZONE,
      notes: [
        "completed_payments הוא יומן תשלומים מדווח באתר, לא הצלבה עצמאית מול Grow.",
        "דיווח תשלום באתר; טרם הוצלב בדוח Grow.",
        "כפילויות חשודות נשארות ברשימת review ואינן נמחקות.",
        "Meta Ads Manager מדווח לפי אזור הזמן של חשבון הפרסום America/Los_Angeles.",
      ],
    },
  };
}

import { describe, expect, it, vi, afterEach } from "vitest";
import type { TrpcContext } from "./_core/context";
import {
  classifyMarketingChannel,
  marketingProduct,
} from "../shared/marketingChannelClassification";
import {
  buildMarketingChannelsReport,
  chooseMarketingClosing,
  isVerifiedMarketingPayment,
  marketingChannelsInputSchema,
  marketingChannelsRouter,
  needsMarketingBreakdownSuppression,
  loadMarketingChannelsReport,
  type MarketingPurchase,
} from "./marketingChannelsRouter";
import { encryptGrowReferences, growReceiptKey } from "./growPaymentAccounting";
import {
  findConservativeDuplicateReviewIds,
  type PaymentRow,
} from "./salesIntelligence";
import { acquisitionActorKey } from "./acquisitionCapture";
import { getDb } from "./db";
import {
  getIsraelCalendarDaysStart,
  parseIsraelCalendarDate,
  addCalendarDays,
} from "../client/src/lib/dashboardDateRange";

vi.mock("./db", () => ({ getDb: vi.fn() }));
const now = Date.parse("2026-11-15T12:00:00Z");
const range = { startDate: getIsraelCalendarDaysStart(30, now), endDate: now };
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
function payment(overrides: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: 1,
    transactionId: "123456",
    email: "buyer@example.test",
    product: "database",
    couponCode: null,
    amountAgorot: 29_900,
    amountSource: "grow",
    paidAt: now - 1000,
    ...overrides,
  };
}
function receipt(
  overrides: Partial<Parameters<typeof isVerifiedMarketingPayment>[1]> = {}
) {
  return {
    receiptKey: growReceiptKey("123456"),
    product: "database",
    amountAgorot: 29_900,
    state: "verified",
    category: "provider_confirmed",
    referencesEncrypted: encryptGrowReferences({
      transactionId: "123456",
      transactionToken: "abcdefgh123456789",
    }),
    ...overrides,
  };
}
function purchases(
  count = 5,
  overrides: Partial<MarketingPurchase> = {}
): MarketingPurchase[] {
  return Array.from({ length: count }, (_, index) => ({
    transactionId: `purchase-${index}`,
    buyerKey: `buyer-${index}@example.test`,
    product: "database",
    amountAgorot: 29_900,
    paidAt: now - 1000,
    first: { source: "google", medium: "organic" },
    closing: { source: "youtube", medium: "paid_video" },
    firstSnapshot: true,
    ...overrides,
  }));
}
function ctx(kind: "anonymous" | "user" | "admin" | "team"): TrpcContext {
  return {
    user:
      kind === "user" || kind === "admin"
        ? ({ role: kind === "admin" ? "admin" : "user" } as TrpcContext["user"])
        : null,
    teamMember:
      kind === "team"
        ? { id: 2, email: "staff@example.test", name: "Staff", role: "team" }
        : null,
    req: {} as TrpcContext["req"],
    res: { setHeader: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("marketing channel proof and medium classification", () => {
  it.each([
    [{ source: "google" }, "google_unclassified"],
    [{ source: "Google.com", medium: "CPC" }, "google_paid"],
    [
      { source: "www.google.co.il", medium: "organic_search" },
      "google_organic",
    ],
    [{ source: "google", medium: "paid-search" }, "google_paid"],
    [{ source: "google", medium: "organic_paid" }, "google_unclassified"],
    [
      { source: "google", medium: "sales_warm_audience" },
      "google_unclassified",
    ],
    [{ source: "youtube", medium: "organic_video" }, "youtube_organic"],
    [
      { source: "https://m.youtube.com/watch?v=no-output", medium: "CPV" },
      "youtube_paid",
    ],
    [{ source: "youtu.be", medium: "referral" }, "youtube_unclassified"],
    [
      { referrer: "https://www.google.com/search?q=private" },
      "google_unclassified",
    ],
    [{ source: "email", referrer: "google.com", medium: "email" }, "other"],
    [{ source: "google.com.evil.test", medium: "organic" }, "other"],
    [{ source: "notgoogle.com", medium: "cpc" }, "other"],
    [{ source: "dna_quiz" }, "unknown"],
    [{}, "unknown"],
  ] as const)("classifies %j conservatively", (input, expected) => {
    expect(classifyMarketingChannel(input)).toBe(expected);
  });
  it("groups all database bundles, but preserves exact subtype and separates meetings, Plus and Boost", () => {
    for (const product of [
      "database",
      "bundle_november",
      "bundle_tubav",
      "bundle_new_year",
    ])
      expect(marketingProduct(product)).toMatchObject({
        key: product,
        group: "database",
      });
    expect(marketingProduct("session").group).toBe("meetings");
    expect(marketingProduct("plus").group).toBe("plus");
    expect(marketingProduct("match_boost").group).toBe("boost");
    expect(marketingProduct("private-person@example.test")).toEqual({
      key: "unknown",
      group: "other",
      label: "מוצר לא מזוהה",
    });
  });
  it("requires exact provider-confirmed encrypted receipt, never merely amount_source=grow", () => {
    vi.stubEnv("JWT_SECRET", "test-secret-only");
    expect(isVerifiedMarketingPayment(payment(), receipt(), new Set())).toBe(
      true
    );
    for (const r of [
      undefined,
      receipt({ state: "notification_only" }),
      receipt({ state: "duplicate_existing" }),
      receipt({ state: "review" }),
      receipt({ category: "test_checkout" }),
      receipt({ product: "plus" }),
      receipt({ amountAgorot: 19900 }),
      receipt({ receiptKey: "wrong" }),
      receipt({ referencesEncrypted: "bad" }),
      receipt({
        referencesEncrypted: encryptGrowReferences({
          transactionId: "654321",
          transactionToken: "abcdefgh123456789",
        }),
      }),
    ])
      expect(isVerifiedMarketingPayment(payment(), r, new Set())).toBe(false);
  });
  it("excludes estimated, tiny, fractional, test-prefix and mixed-format duplicates with existing helpers", () => {
    vi.stubEnv("JWT_SECRET", "test-secret-only");
    for (const row of [
      payment({ amountSource: "estimated" }),
      payment({ couponCode: "TeSt-extra" }),
      payment({ amountAgorot: 150 }),
      payment({ amountAgorot: 29900.5 }),
      payment({ transactionId: "encoded" }),
    ])
      expect(isVerifiedMarketingPayment(row, receipt(), new Set())).toBe(false);
    const rows = [
      payment({
        id: 10,
        transactionId: "654321",
        paidAt: range.startDate - 1000,
      }),
      payment({
        id: 11,
        transactionId: "encoded",
        paidAt: range.startDate + 1000,
      }),
    ];
    expect(findConservativeDuplicateReviewIds(rows)).toEqual(new Set([11]));
    expect(isVerifiedMarketingPayment(payment(), receipt(), new Set([1]))).toBe(
      false
    );
  });
  it("rejects future exact payment, Boost and Plus touches before invoking the closing evaluator", () => {
    const paid = payment();
    const future = paid.paidAt + 1000;
    expect(
      chooseMarketingClosing(
        paid,
        [
          {
            email: paid.email,
            createdAt: future,
            sourceKind: "payment",
            confirmedTransactionId: paid.transactionId,
            utmSource: "google",
            utmMedium: "cpc",
          },
        ],
        [],
        [],
        []
      ).channelSource
    ).toBe("");
    expect(
      chooseMarketingClosing(
        { ...paid, product: "match_boost" },
        [],
        [],
        [
          {
            email: paid.email,
            providerTransactionId: paid.transactionId,
            entryChannel: "personal_area",
            requestedAt: future,
            paidAt: future,
          },
        ],
        []
      ).channelSource
    ).toBe("");
    expect(
      chooseMarketingClosing(
        { ...paid, product: "plus" },
        [],
        [],
        [],
        [
          {
            email: paid.email,
            providerTransactionId: paid.transactionId,
            eventType: "payment_succeeded",
            createdAt: future,
          },
        ]
      ).channelSource
    ).toBe("");
  });
});

describe("aggregate privacy and truthful missingness", () => {
  it("counts distinct transactions and buyers independently without summing source views", () => {
    const rows = purchases(6);
    rows[5].buyerKey = rows[0].buyerKey;
    const data = buildMarketingChannelsReport({
      range,
      purchases: [...rows, rows[0]],
      now,
    });
    expect(data.total.purchases.value).toBe(6);
    expect(data.total.confirmedBuyers.value).toBe(5);
    for (const view of data.views)
      expect(
        view.groups
          .find(g => g.group === "all")!
          .channels.reduce((sum, c) => sum + (c.totals.purchases.value ?? 0), 0)
      ).toBe(6);
    expect(data.views[0].groups[0].channels[0].totals.purchases.value).toBe(6);
    expect(
      data.views[1].groups[0].channels.find(c => c.channel === "youtube_paid")!
        .totals.purchases.value
    ).toBe(6);
    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain("@example.test");
    expect(serialized).not.toContain("purchase-");
  });
  it("never substitutes checkout tags for a missing first-touch snapshot", () => {
    const data = buildMarketingChannelsReport({
      range,
      purchases: purchases(5, { firstSnapshot: false }),
      now,
    });
    const view = data.views[0].groups[0];
    expect(
      view.channels.find(c => c.channel === "unknown")!.totals.purchases.value
    ).toBe(5);
    expect(view.firstSnapshotShare.value).toBe(0);
    expect(view.unknownPurchaseShare.value).toBe(1);
  });
  it("suppresses a small total and all correlated revenue/buyer cells", () => {
    const data = buildMarketingChannelsReport({
      range,
      purchases: purchases(4),
      now,
    });
    expect(data.total.purchases.value).toBeNull();
    expect(data.total.revenueAgorot.value).toBeNull();
    expect(data.privacy.breakdownSuppressed).toBe(true);
  });
  it("avoids subtraction from visible total, product totals and two source views", () => {
    const rows = [
      ...purchases(8),
      ...purchases(1, {
        transactionId: "private",
        buyerKey: "different@example.test",
        product: "bundle_november",
      }),
    ];
    const data = buildMarketingChannelsReport({ range, purchases: rows, now });
    expect(data.total.purchases.value).toBe(9);
    expect(
      data.groups
        .filter(g => g.group !== "all")
        .every(g => g.totals.purchases.value === null)
    ).toBe(true);
    for (const view of data.views)
      for (const group of view.groups) {
        expect(
          group.channels.every(
            c =>
              c.totals.purchases.value === null &&
              c.totals.revenueAgorot.value === null
          )
        ).toBe(true);
        expect(
          group.products.every(p => p.totals.purchases.value === null)
        ).toBe(true);
        expect(group.unknownPurchaseShare.value).toBeNull();
        expect(group.firstSnapshotShare.value).toBeNull();
      }
  });
  it("requires 5 different confirmed buyer identities, not 5 charges from one buyer", () => {
    expect(
      needsMarketingBreakdownSuppression(
        purchases(8, { buyerKey: "same@example.test" })
      )
    ).toBe(true);
    const data = buildMarketingChannelsReport({
      range,
      purchases: purchases(5, { buyerKey: null }),
      now,
    });
    expect(data.total.confirmedBuyers.value).toBeNull();
    expect(data.total.purchases.value).toBeNull();
  });
  it("hides small intersections even when each marginal cell has at least 5 buyers", () => {
    const rows = purchases(12).map((p, i) => ({
      ...p,
      first: { source: i < 6 ? "google" : "youtube", medium: "organic" },
      closing: {
        source: i === 0 || i > 6 ? "google" : "youtube",
        medium: "organic",
      },
    }));
    expect(needsMarketingBreakdownSuppression(rows)).toBe(true);
  });
  it("missing spend, CPA, ROAS, leads and external analytics are null, never fake zero", () => {
    const data = buildMarketingChannelsReport({
      range,
      purchases: purchases(),
      now,
    });
    for (const view of data.views)
      for (const group of view.groups)
        for (const c of group.channels)
          for (const m of [c.spendAgorot, c.cpaAgorot, c.roas, c.newLeads])
            expect(m.value).toBeNull();
    expect(data.sources.googleSpend).toMatchObject({
      status: "unavailable",
      updatedAt: null,
    });
    expect(data.sources.leads.status).toBe("unavailable");
    expect(data.quality.providerReconciled).toBe(false);
    expect(data.quality.plusBillingSplit).toBe("unavailable");
  });
  it("uses actual bundle amounts and exposes safe subtype breakdown only with adequate cells", () => {
    const data = buildMarketingChannelsReport({
      range,
      purchases: [
        ...purchases(),
        ...purchases(5, { product: "bundle_tubav", amountAgorot: 25000 }).map(
          (p, i) => ({
            ...p,
            transactionId: `bundle-${i}`,
            buyerKey: `bundle-${i}`,
          })
        ),
      ],
      now,
    });
    expect(data.total.purchases.value).toBe(10);
    expect(data.total.revenueAgorot.value).toBe(274500);
    expect(
      data.views[0].groups[0].products.find(p => p.product === "bundle_tubav")!
        .totals.revenueAgorot.value
    ).toBe(125000);
  });
  it("page views remain events independent of product/source view and suppress complementary small cells", () => {
    const data = buildMarketingChannelsReport({
      range,
      purchases: purchases(),
      trafficStatus: "available",
      traffic: [
        { channel: "google_paid", count: 3 },
        { channel: "other", count: 100 },
      ],
      now,
    });
    expect(data.traffic.totalPageViewEvents.value).toBeNull();
    expect(
      data.traffic.channels.every(c => c.pageViewEvents.value === null)
    ).toBe(true);
    const unavailable = buildMarketingChannelsReport({
      range,
      purchases: [],
      paymentStatus: "unavailable",
      now,
    });
    expect(unavailable.total.purchases.value).toBeNull();
    expect(unavailable.sources.payments.updatedAt).toBeNull();
  });
});

describe("range, permissions and no-store", () => {
  it("accepts at most 93 days and rejects invalid/fractional timestamps", () => {
    expect(
      marketingChannelsInputSchema.safeParse({
        startDate: 0,
        endDate: 93 * 86400000,
      }).success
    ).toBe(true);
    for (const input of [
      { startDate: 0, endDate: 93 * 86400000 + 1 },
      { startDate: now, endDate: now },
      { startDate: -1, endDate: now },
      { startDate: now + 1, endDate: now },
      { startDate: 0, endDate: Infinity },
      { startDate: 0.5, endDate: 10 },
    ])
      expect(marketingChannelsInputSchema.safeParse(input).success).toBe(false);
  });
  it("uses Jerusalem UTC boundaries including DST and exclusive payment end", () => {
    expect(parseIsraelCalendarDate("2026-11-15")).toBe(
      Date.parse("2026-11-14T22:00:00Z")
    );
    expect(parseIsraelCalendarDate("2026-07-15")).toBe(
      Date.parse("2026-07-14T21:00:00Z")
    );
    const start = parseIsraelCalendarDate("2026-10-25");
    const end = parseIsraelCalendarDate(addCalendarDays("2026-10-25", 1));
    expect(end - start).toBe(25 * 3600000);
    const data = buildMarketingChannelsReport({
      range,
      purchases: [
        ...purchases(),
        ...purchases(5, { paidAt: range.endDate, transactionId: "outside" }),
      ],
      now,
    });
    expect(data.total.purchases.value).toBe(5);
    expect(data.period.endExclusive).toBe(true);
    expect(data.period.timezone).toBe("Asia/Jerusalem");
  });
  it("denies anonymous and regular users before any DB access", async () => {
    for (const kind of ["anonymous", "user"] as const)
      await expect(
        marketingChannelsRouter.createCaller(ctx(kind)).summary(range)
      ).rejects.toMatchObject({
        code: kind === "anonymous" ? "UNAUTHORIZED" : "FORBIDDEN",
      });
    expect(getDb).not.toHaveBeenCalled();
  });
  it("allows staff/admin and uses private no-store, while DB missing is unavailable", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    for (const kind of ["team", "admin"] as const) {
      const context = ctx(kind);
      const result = await marketingChannelsRouter
        .createCaller(context)
        .summary(range);
      expect(context.res.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "private, no-store"
      );
      expect(result.sources.payments.status).toBe("unavailable");
      expect(result.total.purchases.value).toBeNull();
    }
  });
  it("fails closed on bounded ledger overflow, without partial counts", async () => {
    vi.mocked(getDb).mockResolvedValue({
      execute: vi
        .fn()
        .mockResolvedValue([
          Array.from({ length: 20001 }, () => payment()),
          [],
        ]),
    } as any);
    const report = await marketingChannelsRouter
      .createCaller(ctx("admin"))
      .summary(range);
    expect(report.sources.payments.status).toBe("unavailable");
    expect(report.total.purchases.value).toBeNull();
  });
  it("does not query external accounts when empty ledger is available", async () => {
    const execute = vi.fn().mockResolvedValue([[], []]);
    vi.mocked(getDb).mockResolvedValue({ execute } as any);
    const data = await loadMarketingChannelsReport(range);
    expect(data.total.purchases.value).toBe(0);
    expect(data.traffic.totalPageViewEvents.value).toBe(0);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(data.sources.googleSpend.status).toBe("unavailable");
  });
  it("loads only verified receipts, immutable snapshots and closing evidence; no PII crosses response", async () => {
    vi.stubEnv("JWT_SECRET", "test-secret-only");
    const paid = Array.from({ length: 5 }, (_, index) =>
      payment({
        id: index + 1,
        transactionId: String(123456 + index),
        email: `buyer-${index}@example.test`,
        product: "bundle_november",
      })
    );
    const proven = paid.map(row =>
      receipt({
        receiptKey: growReceiptKey(row.transactionId),
        product: row.product,
        referencesEncrypted: encryptGrowReferences({
          transactionId: row.transactionId,
          transactionToken: "abcdefgh123456789",
        }),
      })
    );
    const first = paid.map(row => ({
      actorKey: acquisitionActorKey(row.email),
      utmSource: "google.com",
      utmMedium: null,
      capturedAt: row.paidAt - 10000,
    }));
    const closing = paid.map(row => ({
      email: row.email,
      utmSource: "google",
      utmMedium: "cpc",
      createdAt: row.paidAt - 500,
      confirmedTransactionId: row.transactionId,
      product: row.product,
      sourceKind: "payment",
    }));
    const execute = vi.fn();
    for (const rows of [paid, proven, first, [], closing, [], [], [], [], []])
      execute.mockResolvedValueOnce([rows, []]);
    vi.mocked(getDb).mockResolvedValue({ execute } as any);
    const report = await loadMarketingChannelsReport(range);
    expect(report.total.purchases.value).toBe(5);
    expect(report.sources.payments.status).toBe("available");
    expect(
      report.views[0].groups[0].channels.find(
        c => c.channel === "google_unclassified"
      )!.totals.purchases.value
    ).toBe(5);
    expect(
      report.views[1].groups[0].channels.find(c => c.channel === "google_paid")!
        .totals.purchases.value
    ).toBe(5);
    expect(
      report.views[0].groups[0].products.find(
        p => p.product === "bundle_november"
      )!.totals.purchases.value
    ).toBe(5);
    expect(execute).toHaveBeenCalledTimes(10);
    expect(JSON.stringify(report)).not.toMatch(
      /buyer-\d|@example|123456|abcdefgh123456789/
    );
  });
});

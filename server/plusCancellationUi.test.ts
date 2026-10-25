import * as React from "react";
import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import PlusCancellationQueue, {
  type PlusCancellationSummary,
  type PlusCancellationTrackingRow,
} from "../client/src/components/PlusCancellationQueue";

const queueSource = readFileSync(new URL("../client/src/components/PlusCancellationQueue.tsx", import.meta.url), "utf8");
const adminSource = readFileSync(new URL("../client/src/components/PlusPilotAdminSection.tsx", import.meta.url), "utf8");
const dashboardSource = readFileSync(new URL("../client/src/pages/UserDashboard.tsx", import.meta.url), "utf8");

const exampleRows: PlusCancellationTrackingRow[] = [
  {
    requestId: 701,
    plusMemberId: 91,
    single: {
      id: 701,
      firstName: "דוגמה",
      lastName: "ממתינה",
      email: "pending@example.test",
      phone: "050-0000000",
      isCoachingClient: true,
      isNotBasic: true,
    },
    joinedAt: Date.UTC(2025, 0, 3),
    requestedAt: Date.UTC(2025, 1, 15, 10, 30),
    requestDateSource: "request_record",
    providerStoppedAt: null,
    providerStopEvidence: "not_confirmed",
    resolvedAt: null,
    serviceState: "finishing_cycle",
    serviceEndsAt: Date.UTC(2025, 2, 3),
    remaining: 3,
    target: 3,
    delivered: 0,
    legacy: false,
    subscriptionUnverified: false,
    pushStatus: "accepted",
    emailStatus: "accepted",
    smsStatus: "failed",
  },
  {
    requestId: 702,
    plusMemberId: 92,
    single: { id: 702, firstName: "דוגמה", lastName: "מאושרת", email: "confirmed@example.test", phone: "050-0000001" },
    joinedAt: Date.UTC(2025, 0, 5),
    requestedAt: Date.UTC(2025, 1, 16, 8, 0),
    requestDateSource: "request_record",
    providerStoppedAt: Date.UTC(2025, 1, 17, 12, 0),
    providerStopEvidence: "staff_confirmation",
    resolvedAt: Date.UTC(2025, 1, 17, 12, 0),
    serviceState: "archived",
    serviceEndsAt: Date.UTC(2025, 1, 20),
    remaining: 0,
    outstandingAtClosure: 2,
    target: 3,
    delivered: 1,
    legacy: false,
    subscriptionUnverified: false,
    pushStatus: "accepted",
    emailStatus: "accepted",
    smsStatus: "accepted",
  },
  {
    requestId: null,
    plusMemberId: 93,
    single: { id: 703, firstName: "רשומה", lastName: "ישנה", email: "legacy@example.test", phone: null },
    joinedAt: null,
    requestedAt: Date.UTC(2024, 7, 2),
    requestDateSource: "member_cancellation",
    providerStoppedAt: null,
    providerStopEvidence: "not_confirmed",
    resolvedAt: null,
    serviceState: "needs_review",
    serviceEndsAt: null,
    remaining: 0,
    target: 0,
    delivered: 0,
    legacy: true,
    subscriptionUnverified: true,
    pushStatus: "not_recorded",
    emailStatus: "not_recorded",
    smsStatus: "not_recorded",
  },
];

const summary: PlusCancellationSummary = {
  requested: 14,
  pendingGrow: 13,
  confirmedGrow: 1,
  withRemaining: 2,
  archived: 12,
  subscriptionUnverified: 9,
};

function renderQueue(
  rows = exampleRows,
  selectedSummary = summary,
  initialTab: "pendingGrow" | "confirmedGrow" | "unverified" | "all" = "pendingGrow",
) {
  return renderToStaticMarkup(createElement(PlusCancellationQueue, {
    rows,
    summary: selectedSummary,
    refreshing: false,
    onRefresh: () => undefined,
    onConfirmProviderStopped: () => undefined,
    initialTab,
  }));
}

describe("Plus cancellation tracking UI", () => {
  it("renders pending Grow work first and separates billing confirmation from Plus service", () => {
    const html = renderQueue();

    expect(html).toContain('data-plus-cancellation-queue="true"');
    expect(html).toContain('data-plus-cancellation-tracking="true"');
    expect(html).toContain("בקשות הפסקת Plus");
    expect(html).toContain("טרם אישרת עצירה ב־Grow");
    expect(html).toContain("אישור עצירת החיוב ב־Grow");
    expect(html).toContain('data-confirm-provider-stop="91"');
    expect(html).toContain("זכאות השירות נשמרת עד סוף המחזור");
    expect(html).toContain("נותרו 3 מתוך 3 הצעות במחזור");
    expect(html).toContain("הצטרפות לפלוס:");
    expect(html).toContain("דוגמה ממתינה");
    expect(html).toContain("pending@example.test");
    expect(html).toContain('data-profile-coaching="true"');
    expect(html).toContain('data-profile-special-attention="true"');
    expect(html).toContain('data-cancellation-summary="בקשות Plus מתועדות">14</strong>');
    expect(html).toContain('data-cancellation-summary="טרם אישרת עצירה ב־Grow">13</strong>');
    expect(html).toContain('data-cancellation-summary="עצירה ב־Grow אושרה">1</strong>');
    expect(html).toContain('data-cancellation-summary="נותרו התאמות במחזור">2</strong>');

    // Default urgent view does not show confirmed or unverified historical records.
    expect(html).not.toContain("דוגמה מאושרת");
    expect(html).not.toContain("רשומה ישנה");
    expect(html).not.toContain("החיוב ממשיך");
  });

  it("renders confirmed and historical views with explicit evidence and no confirmation action for unverified records", () => {
    const allHtml = renderQueue(exampleRows, summary, "all");
    const unverifiedHtml = renderQueue(exampleRows, summary, "unverified");

    expect(allHtml).toContain("דוגמה מאושרת");
    expect(allHtml).toContain('data-provider-stop-confirmed="true"');
    expect(allHtml).toContain("עצירת החיוב ב־Grow אושרה");
    expect(allHtml).toContain("שירות Plus נסגר");
    expect(allHtml).toContain("פער בסגירת המחזור: 2 הצעות שלא הושלמו מתוך יעד 3");
    expect(allHtml).toContain("רשומה ישנה לבירור");
    expect(allHtml).toContain("לא נמצאה הפעלת Plus או רכישת Plus מתועדת");
    expect(allHtml).toContain("לא מתועד");
    expect(allHtml).toContain("כל התיעוד");

    expect(unverifiedHtml).toContain('data-provider-stop-unverified="true"');
    expect(unverifiedHtml).toContain("אין לאשר עצירת חיוב ב־Grow מתוך רשומה זו");
    expect(unverifiedHtml).not.toContain('data-confirm-provider-stop="93"');
    expect(unverifiedHtml).not.toContain("טרם אישרת עצירה ב־Grow</strong>");
  });

  it("keeps refresh and an explicit empty state", () => {
    const html = renderQueue([], { ...summary, requested: 0, pendingGrow: 0, confirmedGrow: 0, withRemaining: 0, archived: 0, subscriptionUnverified: 0 });

    expect(html).toContain("רענון");
    expect(html).toContain("אין בקשות בתצוגה זו.");
    expect(html).not.toContain("data-cancellation-request=");
  });

  it("remains a presentational component and keeps the confirmation mutation exclusively in the admin section", () => {
    expect(queueSource).toContain("onConfirmProviderStopped: (row: PlusCancellationTrackingRow) => void");
    expect(queueSource).toContain('timeZone: "Asia/Jerusalem"');
    expect(queueSource).toContain("subscriptionUnverified");
    expect(queueSource).toContain("רשומות ישנות לבירור");
    expect(queueSource).not.toMatch(/trpc|fetch\(|\.mutate|sendEmail|sendSms|Grow.*(?:api|request)/i);

    expect(adminSource).toContain("cancellationTracking");
    expect(adminSource).toContain("cancellationSummary");
    expect(adminSource).toContain("adminConfirmProviderStopped");
    expect(adminSource).toContain("confirmed: true");
    expect(adminSource).toContain("עצרתי את החיוב ב־Grow");
    expect(adminSource).toContain("שירות Plus לא הסתיים");
    expect(adminSource).toContain("data-provider-stop-dialog");
    expect(adminSource).toContain("data-provider-stop-checkbox");
    expect(adminSource).toContain("data-confirm-provider-stop-submit");
    expect(adminSource.indexOf("<PlusCancellationQueue")).toBeLessThan(adminSource.indexOf("נתוני פיילוט, קמפיינים והגדרות שירות"));
    expect(adminSource).toContain("עצירת Grow אושרה");
    expect(adminSource).not.toContain("החיוב ממשיך");
  });

  it("keeps existing member cancellation access independent from admin tracking", () => {
    expect(dashboardSource).toContain('const { status, pilot, eligibility, benefits, cycleProgress, cancellationPending, databaseMembershipActive } = statusQuery.data;');
    expect(dashboardSource).toContain('const canRequestCancellation = status === "active"');
    expect(dashboardSource).toContain('pilot?.billingStatus === "active" || pilot?.billingStatus === "past_due"');
    expect(dashboardSource).toContain("&& !cancellationPending;");
    expect(dashboardSource).toContain('onError: error => toast.error(error.message)');
    expect(dashboardSource).toContain("ניהול המנוי וביטול החידוש");
    expect(dashboardSource).toContain("בקשת הביטול התקבלה והועברה לטיפול בעצירת הוראת הקבע.");
    expect(dashboardSource).toContain('{cancelPlus.isPending ? "הבקשה נשלחת…" : "ביטול החידוש הבא"}');
    expect(dashboardSource).toContain('window.confirm("לבטל את חידוש Database Plus?")');
    expect(dashboardSource.match(/window\.confirm\("לבטל את חידוש Database Plus\?"\)/g)).toHaveLength(1);
  });

  it("uses only synthetic data and callbacks in SSR coverage", () => {
    const onConfirmProviderStopped = vi.fn();
    const html = renderToStaticMarkup(createElement(PlusCancellationQueue, {
      rows: exampleRows,
      summary,
      refreshing: false,
      onRefresh: vi.fn(),
      onConfirmProviderStopped,
    }));

    expect(html).toContain("דוגמה ממתינה");
    expect(onConfirmProviderStopped).not.toHaveBeenCalled();
  });
});

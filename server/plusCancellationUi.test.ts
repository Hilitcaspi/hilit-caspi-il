import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import PlusCancellationQueue, { type PlusCancellationQueueRow } from "../client/src/components/PlusCancellationQueue";

const queueSource = readFileSync(new URL("../client/src/components/PlusCancellationQueue.tsx", import.meta.url), "utf8");
const adminSource = readFileSync(new URL("../client/src/components/PlusPilotAdminSection.tsx", import.meta.url), "utf8");
const dashboardSource = readFileSync(new URL("../client/src/pages/UserDashboard.tsx", import.meta.url), "utf8");

const exampleRows: PlusCancellationQueueRow[] = [
  {
    plusMemberId: 91,
    single: { id: 701, firstName: "דוגמה", lastName: "בדיקה", email: "example-queue@example.test", phone: "050-0000000" },
    requestedAt: Date.UTC(2025, 0, 15, 10, 30),
    legacy: false,
    pushStatus: "accepted",
    emailStatus: "accepted",
    smsStatus: "accepted",
  },
  {
    plusMemberId: 92,
    single: { id: 702, firstName: "בדיקת", lastName: null, email: null, phone: null },
    requestedAt: null,
    legacy: true,
    pushStatus: "failed",
    emailStatus: "unknown",
    smsStatus: "failed",
  },
  {
    plusMemberId: 93,
    single: { id: 703, firstName: "מצב", lastName: "שליחה", email: "sending-queue@example.test", phone: null },
    requestedAt: Date.UTC(2025, 0, 16, 8, 0),
    legacy: false,
    pushStatus: "sending",
    emailStatus: "pending",
    smsStatus: "sending",
  },
  {
    plusMemberId: 94,
    single: { id: 704, firstName: "SMS", lastName: "לא ידוע", email: null, phone: null },
    requestedAt: null,
    legacy: false,
    pushStatus: "unknown",
    emailStatus: "not_recorded",
    smsStatus: "unknown",
  },
  {
    plusMemberId: 95,
    single: { id: 705, firstName: "SMS", lastName: "לא תועד", email: null, phone: null },
    requestedAt: null,
    legacy: true,
    pushStatus: "not_recorded",
    emailStatus: "not_recorded",
    smsStatus: "not_recorded",
  },
];

function renderQueue(rows = exampleRows) {
  return renderToStaticMarkup(createElement(PlusCancellationQueue, {
    rows,
    refreshing: false,
    onRefresh: () => undefined,
    onEnd: () => undefined,
  }));
}

describe("Plus cancellation queue UI", () => {
  it("renders the independent staff queue with the required Grow stop guidance", () => {
    const html = renderQueue();

    expect(html).toContain("בקשות עצירת חיוב ב־Grow");
    expect(html).toContain('data-cancellation-count="5">5</span>');
    expect(html).toContain("הבקשה התקבלה באתר. נדרש לעצור את הוראת הקבע ב־Grow; אין אישור ספק אוטומטי.");
    expect(html).toContain("כל בקשה נשארת בתור עד לסיום Plus באתר, גם אם העברת המייל נכשלה.");
    expect(html).toContain("דוגמה בדיקה");
    expect(html).toContain("example-queue@example.test");
    expect(html).toContain("הבקשה התקבלה:");
    expect(html).toContain("מייל הועבר לשליחה");
    expect(html).toContain("התראה התקבלה");
    expect(html).toContain("שליחת ההתראה נכשלה");
    expect(html).toContain("מצב העברת המייל אינו ידוע");
    expect(html).toContain("התראה נשלחת");
    expect(html).toContain("ממתין להעברת מייל");
    expect(html).toContain("SMS הועבר לשליחה");
    expect(html).toContain("העברת ה־SMS נכשלה");
    expect(html).toContain("ה־SMS מועבר לשליחה");
    expect(html).toContain("מצב העברת ה־SMS אינו ידוע");
    expect(html).toContain("מצב העברת ה־SMS לא תועד");
    expect(html).toContain('data-sms-status="accepted"');
    expect(html).toContain('data-sms-status="failed"');
    expect(html).toContain('data-sms-status="sending"');
    expect(html).toContain("בקשה ישנה · סטטוסי שליחה לא תועדו");
    expect(html).toContain("החיוב הופסק ב־Grow? סיום Plus באתר");
    expect(html).not.toContain("נמסר");
  });

  it("keeps an explicit empty state while preserving the refresh control", () => {
    const html = renderQueue([]);

    expect(html).toContain("אין כרגע בקשות עצירה פתוחות.");
    expect(html).toContain("רענון");
    expect(html).not.toContain("data-cancellation-request=");
  });

  it("uses a presentational, callback-only queue and connects it before Plus metrics", () => {
    expect(queueSource).toContain('rows: PlusCancellationQueueRow[]');
    expect(queueSource).toContain('smsStatus: PlusCancellationDeliveryStatus');
    expect(queueSource).toContain("onRefresh: () => void");
    expect(queueSource).toContain("onEnd: (row: PlusCancellationQueueRow) => void");
    expect(queueSource).toContain('timeZone: "Asia/Jerusalem"');
    expect(queueSource).not.toMatch(/trpc|fetch\(|\.mutate|sendEmail|sendSms|Grow.*(?:api|request)/i);

    expect(adminSource).toContain("<PlusCancellationQueue");
    expect(adminSource).toContain("rows={cancellationQueue}");
    expect(adminSource).toContain("onEnd={request =>");
    expect(adminSource).toContain("providerStoppedConfirmed: true");
    expect(adminSource).toContain("row.cancellationPending ?");
    expect(adminSource).toContain("בקשת עצירה · ממתין לטיפול ב־Grow");
    expect(adminSource.indexOf("<PlusCancellationQueue")).toBeLessThan(adminSource.indexOf("grid grid-cols-2 md:grid-cols-5"));
  });

  it("keeps cancellation access restrained while exposing failure and pending feedback", () => {
    expect(dashboardSource).toContain('const { status, pilot, eligibility, benefits, cycleProgress, cancellationPending, databaseMembershipActive } = statusQuery.data;');
    expect(dashboardSource).toContain('const canRequestCancellation = status === "active"');
    expect(dashboardSource).toContain('pilot?.billingStatus === "active" || pilot?.billingStatus === "past_due"');
    expect(dashboardSource).toContain("&& !cancellationPending;");
    expect(dashboardSource).toContain('onError: error => toast.error(error.message)');
    expect(dashboardSource).toContain("ניהול המנוי וביטול החידוש");
    expect(dashboardSource).toContain("בקשת הביטול התקבלה והועברה לטיפול בעצירת הוראת הקבע. החיוב אצל ספק התשלום עדיין דורש טיפול; החברות הרגילה במאגר נשארת ללא שינוי.");
    expect(dashboardSource).toContain('{cancelPlus.isPending ? "הבקשה נשלחת…" : "ביטול החידוש הבא"}');
    expect(dashboardSource).toContain('window.confirm("לבטל את חידוש Database Plus?")');
    expect(dashboardSource.match(/window\.confirm\("לבטל את חידוש Database Plus\?"\)/g)).toHaveLength(1);
    expect(dashboardSource).not.toContain("לא יתחדש לאחר מכן");

    const cancellationDetails = dashboardSource.slice(
      dashboardSource.indexOf('{canRequestCancellation && ('),
      dashboardSource.indexOf("// ─── Types"),
    );
    expect(cancellationDetails).toContain('className="mt-4 border-t border-[#eadf9e] pt-3 text-xs text-slate-600"');
    expect(cancellationDetails).toContain("hover:underline focus:underline");
    expect(cancellationDetails).toContain("focus-visible:ring-2");
    expect(cancellationDetails).not.toMatch(/bg-red|text-red/);
  });
});

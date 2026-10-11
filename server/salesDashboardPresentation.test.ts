import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dashboardSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/Dashboard.tsx"),
  "utf8"
);

describe("sales dashboard presentation", () => {
  it("uses the read-only sales intelligence service and a three-complete-day default", () => {
    expect(dashboardSource).toContain(
      "trpc.dashboard.salesIntelligence.useQuery"
    );
    expect(dashboardSource).toContain('useState<Preset>("threeFullDays")');
    expect(dashboardSource).toContain('label: "3 ימים מלאים"');
    expect(dashboardSource).toContain("selectedDays <= 93");
    expect(dashboardSource).toContain("setRefreshedAt(Date.now())");
  });

  it("presents recorded website payments without claiming independent Grow reconciliation", () => {
    expect(dashboardSource).toContain("דיווחי תשלום שהתקבלו באתר");
    expect(dashboardSource).toContain("הכנסה ללא רשומות חשודות");
    expect(dashboardSource).toContain("רשומות לבדיקה");
    expect(dashboardSource).toContain(
      "ההתאמה העצמאית ל־Grow עדיין אינה מאושרת"
    );
    expect(dashboardSource).not.toContain("Grow מאומת");
  });

  it("keeps product, source, closing, campaign, trend and all-sales views visible", () => {
    expect(dashboardSource).toContain("מוצרים שנמכרו");
    expect(dashboardSource).toContain("מקור הגיוס");
    expect(dashboardSource).toContain("ערוץ הסגירה");
    expect(dashboardSource).toContain("קמפיין הגיוס → הרכישה");
    expect(dashboardSource).toContain("המרות ש־Meta ייחסה");
    expect(dashboardSource).toContain("מכירות לאורך זמן");
    expect(dashboardSource).toContain("כל המכירות");
    expect(dashboardSource).toContain("ללא שמות, כתובות דוא״ל או מזהי לקוחות");
    expect(dashboardSource).toContain('lens="acquisition"');
    expect(dashboardSource).toContain('lens="closing"');
    expect(dashboardSource).toContain("sale[lens].channel");
    expect(dashboardSource).not.toContain('title="מקור הגיוס" rows={data.channels}');
  });

  it("does not expose external-send controls and keeps technical areas collapsed", () => {
    expect(dashboardSource).not.toContain("sendWeeklyReport");
    expect(dashboardSource).not.toContain("sendCompletionSms");
    expect(dashboardSource).toContain('title="ניהול הוצאות"');
    expect(dashboardSource).toContain("expensesOnly");
    expect(dashboardSource).toContain('title="מצב מדידה"');
    expect(dashboardSource).toContain("useState(false)");
  });
});

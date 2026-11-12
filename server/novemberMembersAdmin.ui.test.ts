import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const crmSource = readFileSync(resolve(process.cwd(), "client/src/pages/CRMMatchmaking.tsx"), "utf8");
const octoberSource = readFileSync(resolve(process.cwd(), "client/src/components/LiveOctoberAdminSection.tsx"), "utf8");
const novemberSource = readFileSync(resolve(process.cwd(), "client/src/components/NovemberMembersAdminSection.tsx"), "utf8");

describe("November purchasers CRM staff tab", () => {
  it("registers a dedicated deep-linkable tab and mounts its queue only from that tab", () => {
    expect(crmSource).toContain('import NovemberMembersAdminSection from "@/components/NovemberMembersAdminSection"');
    expect(crmSource).toContain('"november_members"');
    expect(crmSource).toContain('{ id: "november_members" as const, label: "מצטרפי נובמבר"');
    expect(crmSource).toContain('{activeTab === "november_members" && (\n          <NovemberMembersAdminSection />');
  });

  it("removes the November queue from the legacy October section", () => {
    expect(octoberSource).not.toContain("adminNovemberBundleFirstMatchQueue");
    expect(octoberSource).not.toContain("מצטרפי נובמבר: מאגר והקורס במתנה");
  });

  it("uses only the verified read-only queue and preserves its urgency order locally", () => {
    expect(novemberSource).toContain("adminNovemberBundleFirstMatchQueue.useQuery");
    expect(novemberSource).toContain("Do not sort here: the server is authoritative for urgency order.");
    expect(novemberSource).not.toContain(".sort(");
    expect(novemberSource).not.toContain("useMutation");
    expect(novemberSource).not.toContain(".mutate(");
    expect(novemberSource).toContain("התור לא יוצר, מסמן או שולח התאמות");
  });

  it("keeps practical local filters, local name search, and evidence-backed timestamps", () => {
    for (const label of ["לטיפול עכשיו", "ממתינים לפרופיל", "נדרש בירור", "הצעה נשלחה", "הכול"]) {
      expect(novemberSource).toContain(label);
    }
    expect(novemberSource).toContain('state === "ready" || state === "overdue"');
    expect(novemberSource).toContain('placeholder="חיפוש לפי שם"');
    expect(novemberSource).toContain("row.name.toLocaleLowerCase");
    expect(novemberSource).toContain("row.paidAt");
    expect(novemberSource).toContain("row.readyAt");
    expect(novemberSource).toContain("row.dueAt");
    expect(novemberSource).toContain("row.profileRequirementsMissing");
    expect(novemberSource).toContain("row.eligibilityIssues");
    expect(novemberSource).toContain("row.firstProposalDeliveredAt");
    expect(novemberSource).toContain("row.dueAt ?");
    expect(novemberSource).toContain("אין דדליין מוצג ללא מועד השלמה מוכח");
    expect(novemberSource).toContain("מועד שליחה מתועדת");
  });

  it("uses established profile and compatibility routes without automatic matching", () => {
    expect(novemberSource).toContain("/crm/matchmaking?tab=singles&singleId=${row.singleId}");
    expect(novemberSource).toContain("/crm/matchmaking?tab=compatibility&singleId=${row.singleId}");
    expect(crmSource).toContain('if (activeTab !== "compatibility" || selectedSingle === null || compatPersonA === selectedSingle) return;');
    expect(crmSource).toContain("compatibility workflow still requires staff to choose person B");
    expect(crmSource).toContain("this never runs a comparison or a send");
  });
});

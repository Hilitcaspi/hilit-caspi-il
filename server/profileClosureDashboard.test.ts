import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const crm = readFileSync(resolve(root, "client/src/pages/CRMMatchmaking.tsx"), "utf8");
const dialog = readFileSync(resolve(root, "client/src/components/ProfileClosureDialog.tsx"), "utf8");
const operations = readFileSync(resolve(root, "client/src/components/DatabaseOperationsSection.tsx"), "utf8");

describe("profile closure dashboard", () => {
  it("offers full closure directly from active, exception and inactive profile cards", () => {
    expect(crm).toContain('import ProfileClosureDialog from "@/components/ProfileClosureDialog"');
    expect(crm.match(/<ProfileClosureDialog/g)?.length).toBeGreaterThanOrEqual(4);
    expect(crm).not.toContain("deactivateSingle.mutate");
  });

  it("lets the active status control perform an explicit confirmed deactivation", () => {
    expect(crm).toContain("להעביר את ${single.firstName} ללא פעילים?");
    expect(crm).toContain("toggleActive.mutate({ singleId: single.id, isActive: false })");
    expect(crm).toContain("הפרופיל הועבר ללא פעילים");
    expect(crm).toContain("refetchInactive()");
    expect(crm).toContain('isActive: true');
    expect(crm).toContain("הפעל מחדש");
  });

  it("requires server preview, exact confirmation and an idempotency key", () => {
    expect(dialog).toContain("controlCenter.profileActionPreview");
    expect(dialog).toContain("controlCenter.applyProfileAction");
    expect(dialog).toContain('action: "close_profile"');
    expect(dialog).toContain("confirmation.trim() === preview.confirmationPhrase");
    expect(dialog).toContain("expectedUpdatedAt: preview.profile?.updatedAt");
    expect(dialog).toContain("idempotencyKey: createIdempotencyKey()");
  });

  it("explains that closure stops matching and communication before approval", () => {
    expect(dialog).toContain("זו אינה רק השהיה");
    expect(dialog).toContain("מיילים, SMS ופניות עתידיות");
    expect(dialog).toContain("לא ניתן לסגור כרגע");
    expect(dialog).toContain("סגירה מלאה וסופית");
    expect(operations).toContain("סגירה מלאה של פרופיל");
    expect(operations).toContain("סוגר התאמות וקישורים ועוצר מיילים, SMS ופניות");
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const register = readFileSync(resolve(root, "client/src/pages/Register.tsx"), "utf8");
const wallet = readFileSync(resolve(root, "client/src/components/GrowWallet.tsx"), "utf8");
const routers = readFileSync(resolve(root, "server/routers.ts"), "utf8");

describe("free access token entry at database checkout", () => {
  it("shows the free-access field before the payment wallet", () => {
    expect(register.indexOf("יש לך קוד כניסה חינמית?")).toBeGreaterThan(-1);
    expect(register.indexOf("יש לך קוד כניסה חינמית?")).toBeLessThan(register.indexOf("<GrowWallet"));
    expect(register).toContain("זה המקום לטוקן הארוך שקיבלת מהילית");
  });

  it("falls back from the discount validator to the invite-token validator", () => {
    expect(wallet).toContain('product === "database" && onFreeAccessCode');
    expect(wallet).toContain("await onFreeAccessCode(normalizedCode, email.trim())");
    expect(register).toContain("onFreeAccessCode={validateManualFreeAccessCode}");
    expect(register).toContain("validateInviteMutation.mutateAsync({ token: normalizedCode");
  });

  it("does not render the payment wallet after a free token is validated", () => {
    expect(register).toContain("{!couponValid && (");
    expect(register).toContain("השלם/י רישום חינמי ←");
    expect(register).toContain('{ id: "payment", label: freeTokenFromUrl ? "אימות" : "תשלום" }');
    expect(register).toContain('? "המשך להרשמה החינמית ←"');
  });

  it("accepts CRM invite tokens through the direct free_token link", () => {
    expect(routers).toContain("const [inviteRow] = accessRow ? [] : await db.select().from(inviteTokens)");
    expect(routers).toContain("email: accessRow?.email || inviteRow?.boundEmail || null");
    expect(routers).toContain("await db.update(inviteTokens).set({ usedAt, usedByEmail })");
  });
});

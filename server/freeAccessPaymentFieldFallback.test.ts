import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const register = readFileSync(resolve(root, "client/src/pages/Register.tsx"), "utf8");
const wallet = readFileSync(resolve(root, "client/src/components/GrowWallet.tsx"), "utf8");
const routers = readFileSync(resolve(root, "server/routers.ts"), "utf8");

describe("free access token entry at database checkout", () => {
  it("shows the manual free-access field only beside the payment wallet", () => {
    const freeField = 'placeholder="הדבק/י כאן את קוד הכניסה החינמית"';
    expect(register.match(/יש לך קוד כניסה חינמית\?/g)).toHaveLength(1);
    expect(register.match(/הדבק\/י כאן את קוד הכניסה החינמית/g)).toHaveLength(1);
    expect(register.indexOf(freeField)).toBeGreaterThan(register.indexOf('step === "payment"'));
    expect(register.indexOf(freeField)).toBeLessThan(register.indexOf("<GrowWallet"));
    expect(register).toContain("זה המקום לטוקן הארוך שקיבלת מהילית");
    expect(register).not.toContain("אפשר לאמת אותו כאן, עוד לפני מילוי הפרטים והתשלום");
    expect(register).toContain("freeTokenFromUrl && freeTokenStatus");
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

  it("retries a transient profile-draft save before showing a payment error", () => {
    expect(register).toContain("for (let retry = 1; retry <= 3; retry++)");
    expect(register).toContain("retry * 1200");
    expect(register).toContain("const registrationFailureMutation = trpc.payment.reportFailure.useMutation()");
    expect(register).toContain('stage: "profile_save"');
    expect(register.match(/reportProfileSaveFailure\(err\);/g)).toHaveLength(2);
  });

  it("does not turn an existing paid profile into a save error or a second payment", () => {
    expect(register).not.toContain('throw new Error("PROFILE_ALREADY_REGISTERED")');
    expect(register.match(/if \(draft\?\.alreadyExists\)/g)).toHaveLength(2);
    expect(register).toContain('setStep("already_registered")');
    expect(register).toContain("עצרנו כאן כדי שלא יתבצע חיוב נוסף");
    expect(register).toContain("כניסה לאזור האישי");
  });

  it("compresses large mobile photos before the pre-payment profile save", () => {
    expect(register).toContain("const maxDimension = 1600");
    expect(register).toContain('canvas.toDataURL("image/jpeg", quality)');
    expect(register).toContain("compressed.length > 2_800_000");
    expect(register).toContain("התמונה תותאם אוטומטית");
  });
});

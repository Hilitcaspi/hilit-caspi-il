import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const salesPage = readFileSync(new URL("../client/src/pages/DatabasePlusSales.tsx", import.meta.url), "utf8");
const checkoutGate = readFileSync(new URL("./plusDatabaseCheckout.ts", import.meta.url), "utf8");
const eligibility = readFileSync(new URL("../shared/plusDatabaseEligibility.ts", import.meta.url), "utf8");
const statusRouter = readFileSync(new URL("./plusPilotRouter.ts", import.meta.url), "utf8");

function checkoutSection() {
  const start = salesPage.indexOf('<section id="join"');
  const end = salesPage.indexOf('<section className="bg-[#fff7f8] px-5 py-20 md:px-10">', start);
  return salesPage.slice(start, end);
}

describe("Database Plus checkout UI gate", () => {
  it("fails closed until a personal link has successfully proved paid, active database membership", () => {
    expect(salesPage).toContain('const isPersonalLink = Boolean(email && token);');
    expect(salesPage).toContain('enabled: isPersonalLink, retry: false');
    expect(salesPage).toContain('isPersonalLink\n    && statusQuery.isSuccess\n    && plusData?.databaseMembershipActive === true\n    && !alreadyActive');
    expect(salesPage).toContain('enabled: verifiedPaidDatabaseMember');
    expect(salesPage).toContain('isPersonalLink\n    && statusQuery.isSuccess\n    && plusData?.databaseMembershipActive === true\n    && !alreadyActive\n    && checkoutConfig?.configured === true\n    && termsAccepted\n    && renewalAccepted\n    && boostAccepted');
    expect(salesPage).not.toContain('!personalLinkMissingDatabaseMembership && termsAccepted');
  });

  it("does not render Grow or load its SDK for public, pending, invalid, error, unpaid, or already-active states", () => {
    const join = checkoutSection();

    expect(join).toContain('{canPurchase ? <GrowWallet');
    expect(join).toContain('!isPersonalLink ? "יש להיכנס דרך הקישור האישי"');
    expect(join).toContain('statusQuery.isPending ? "מאמתים את הקישור האישי"');
    expect(join).toContain('statusQuery.isError ? "לא ניתן לאמת את הקישור"');
    expect(join).toContain('personalLinkMissingDatabaseMembership ? "נדרשת חברות מאגר פעילה"');
    expect(join).toContain('alreadyActive ? "המנוי שלך פעיל"');
    expect(join).toContain('checkoutConfigQuery.isError || !checkoutConfig?.configured ? "התשלום אינו זמין כרגע"');
    expect(join).toContain('verifiedPaidDatabaseMember && checkoutConfigQuery.isError');
    expect(join).toContain('onClick={() => void statusQuery.refetch()}');
    expect(join).toContain('href="/my-profile"');
    expect(join).toContain('href="/database"');
    expect(join).toContain('prefillEmail={plusData?.profile.email ?? undefined}');
    expect(join).toContain('personalToken={token}');
  });

  it("retains the server-side email-and-token paid-profile check as the authoritative guard", () => {
    expect(checkoutGate).toContain('if (!personalToken || personalToken.length < 16 || personalToken.length > 200)');
    expect(checkoutGate).toContain('LOWER(TRIM(${singles.email})) = ${email.trim().toLowerCase()}');
    expect(checkoutGate).toContain('eq(singles.questionnaireToken, personalToken)');
    expect(checkoutGate).toContain('isPaid: singles.isPaid');
    expect(checkoutGate).toContain('isActive: singles.isActive');
    expect(checkoutGate).toContain('isSeed: singles.isSeed');
    expect(checkoutGate).toContain('market: singles.market');
    expect(eligibility).toContain('profile?.isPaid === true && profile.isActive === true');
    expect(eligibility).toContain('profile.isSeed !== true');
    expect(eligibility).toContain('(profile.market == null || profile.market === "il")');
    expect(statusRouter).toContain('firstName: single.firstName');
    expect(statusRouter).toContain('lastName: single.lastName');
    expect(statusRouter).toContain('email: single.email');
    expect(statusRouter).toContain('phone: single.phone');
  });

  it("uses the corrected member-only badge and makes the separate database membership price clear", () => {
    expect(salesPage).toContain('"לחברי המאגר בתשלום בלבד"');
    expect(salesPage).toContain('הרחבה לחברות קיימת במאגר, שאינה כלולה במחיר');
    expect(salesPage).not.toContain('הצטרפות פתוחה למי שרוצה יותר הזדמנויות');
    expect(salesPage).not.toContain('כולל הצטרפות לתהליך ההיכרויות');
  });
});

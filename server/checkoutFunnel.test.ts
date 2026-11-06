import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCheckoutFunnelFromEventRows,
  classifyCheckoutErrorReason,
  classifyInvalidField,
  sanitizeLandingPath,
} from "../shared/checkoutFunnel";

const meta = (o: Record<string, unknown>) => JSON.stringify(o);

describe("checkout funnel reason codes", () => {
  it("maps the existing expected rejection messages to fixed codes", () => {
    expect(classifyCheckoutErrorReason("כבר נפתח תהליך תשלום עבור בקשה זו. אין לפתוח תהליך נוסף.")).toBe("open_process");
    expect(classifyCheckoutErrorReason("התשלום עבור מוצר זה כבר זוהה")).toBe("already_paid");
    expect(classifyCheckoutErrorReason("נמצאה בקשת תשלום קודמת שעדיין ממתינה לאישור")).toBe("pending_previous");
    expect(classifyCheckoutErrorReason("בקשת התשלום כבר נמצאת בעיבוד")).toBe("pending_previous");
    expect(classifyCheckoutErrorReason("Database Plus זמין רק לחברי המאגר הפעילים")).toBe("plus_requires_database");
    expect(classifyCheckoutErrorReason("מנוי Plus כבר פעיל")).toBe("plus_already_active");
    expect(classifyCheckoutErrorReason("נדרש קישור אישי ואישור תקנון Boost לפני התשלום")).toBe("boost_link_required");
    expect(classifyCheckoutErrorReason("Failed to fetch")).toBe("connectivity");
    expect(classifyCheckoutErrorReason("PAYMENT_PHONE_INVALID")).toBe("phone");
    expect(classifyCheckoutErrorReason("something unexpected user@example.com 0501234567")).toBe("other");
    expect(classifyCheckoutErrorReason(undefined)).toBe("other");
  });
});

describe("landing path sanitizer", () => {
  it("keeps the path only and masks long opaque segments", () => {
    expect(sanitizeLandingPath("/november-love?utm_source=meta&email=a@b.co")).toBe("/november-love");
    expect(sanitizeLandingPath("/join#x")).toBe("/join");
    expect(sanitizeLandingPath("/register/abcdef0123456789abcdef0123456789abcdef")).toBe("/register/:id");
    expect(sanitizeLandingPath("https://evil.example")).toBe("/");
    expect(sanitizeLandingPath(42)).toBe("/");
  });
});

describe("registration invalid field classification", () => {
  it("uses field type and name only", () => {
    expect(classifyInvalidField({ type: "file", name: "photo" })).toBe("photo");
    expect(classifyInvalidField({ type: "tel", name: "" })).toBe("phone");
    expect(classifyInvalidField({ type: "email" })).toBe("email");
    expect(classifyInvalidField({ type: "text", name: "fullName" })).toBe("name");
    expect(classifyInvalidField({ type: "select-one", name: "city" })).toBe("required_field");
    expect(classifyInvalidField(null)).toBe("other");
  });

  it("counts profile_invalid as a form stop and never reads the field value in Register", () => {
    const r = buildCheckoutFunnelFromEventRows(
      [{ metadata: JSON.stringify({ action: "checkout_stage", product: "database", stage: "profile_invalid", reason: "photo", landing: "/join" }), cnt: 3 }],
      [],
    );
    expect(r.byProduct[0]).toMatchObject({ product: "database", validation: 3 });
    expect(r.byProduct[0].topReasons).toEqual([{ reason: "profile_invalid:photo", count: 3 }]);
    const register = readFileSync(path.resolve(import.meta.dirname, "..", "client/src/pages/Register.tsx"), "utf8");
    const calls = register.match(/trackCheckoutStage\([^;]*\);/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (const c of calls) expect(c).not.toMatch(/\.value|email|fullName/);
  });
});

describe("buildCheckoutFunnelFromEventRows", () => {
  it("aggregates stages per product and landing, and drops unknown values", () => {
    const stageRows = [
      { metadata: meta({ action: "checkout_stage", product: "database", stage: "wallet_opened", reason: "-", landing: "/database" }), cnt: 10 },
      { metadata: meta({ action: "checkout_stage", product: "database", stage: "sdk_success", reason: "-", landing: "/database" }), cnt: 7 },
      { metadata: meta({ action: "checkout_stage", product: "database", stage: "sdk_closed", reason: "-", landing: "/database" }), cnt: 3 },
      { metadata: meta({ action: "checkout_stage", product: "database", stage: "rejected", reason: "open_process", landing: "/join" }), cnt: 2 },
      { metadata: meta({ action: "checkout_stage", product: "database", stage: "validation_error", reason: "phone", landing: "/join" }), cnt: 4 },
      { metadata: meta({ action: "checkout_stage", product: "bundle_november", stage: "wallet_opened", reason: "-", landing: "/november-love" }), cnt: 2 },
      // Unknown stage, free-text reason and invalid product are dropped or neutralised.
      { metadata: meta({ action: "checkout_stage", product: "database", stage: "hack", reason: "x", landing: "/" }), cnt: 99 },
      { metadata: meta({ action: "checkout_stage", product: "Database<script>", stage: "error", reason: "user@example.com", landing: "/" }), cnt: 1 },
      { metadata: "not json", cnt: 5 },
      { metadata: meta({ action: "other", stage: "wallet_opened" }), cnt: 50 },
    ];
    const initiateRows = [
      { metadata: meta({ product: "database", action: "initiate_checkout", value: 299 }), cnt: 11 },
      { metadata: meta({ product: "bundle_november", action: "initiate_checkout", value: 349 }), cnt: 2 },
    ];
    const result = buildCheckoutFunnelFromEventRows(stageRows, initiateRows);
    const db = result.byProduct.find(r => r.product === "database")!;
    expect(db.starts).toBe(11);
    expect(db.walletOpened).toBe(10);
    expect(db.success).toBe(7);
    expect(db.closed).toBe(3);
    expect(db.rejected).toBe(2);
    expect(db.validation).toBe(4);
    expect(db.topReasons.map(r => r.reason)).toEqual(["validation_error:phone", "rejected:open_process"]);
    const unknown = result.byProduct.find(r => r.product === "unknown")!;
    expect(unknown.errors).toBe(1);
    expect(unknown.topReasons).toEqual([]);
    const nov = result.byProduct.find(r => r.product === "bundle_november")!;
    expect(nov.starts).toBe(2);
    expect(nov.walletOpened).toBe(2);
    const landing = result.byLanding.find(r => r.landing === "/database")!;
    expect(landing).toMatchObject({ walletOpened: 10, success: 7, closed: 3 });
    expect(JSON.stringify(result)).not.toMatch(/@|<script>|hack/);
  });
});

describe("checkout funnel client wiring", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const wallet = readFileSync(path.join(root, "client/src/components/GrowWallet.tsx"), "utf8");
  const track = readFileSync(path.join(root, "client/src/lib/track.ts"), "utf8");

  it("excludes TEST1 diagnostics and never sends contact details with stage events", () => {
    expect(wallet).toMatch(/isDiagnosticCheckout[\s\S]{0,260}TEST1/);
    expect(wallet).toMatch(/if \(isDiagnosticCheckout\) return;/);
    const fn = track.slice(track.indexOf("export function trackCheckoutStage"));
    expect(fn).not.toMatch(/email|phone|fullName|coupon/i);
    expect(fn).toContain("CHECKOUT_FUNNEL_ACTION");
  });

  it("records the main wallet outcomes", () => {
    for (const s of ["wallet_opened", "sdk_success", "sdk_closed", "sdk_failure", "sdk_timeout", "validation_error"]) {
      expect(wallet).toContain(`stage("${s}"`);
    }
    expect(wallet).toMatch(/stage\(expectedRejection \? "rejected" : "error", classifyCheckoutErrorReason\(technicalMessage\)\)/);
  });
});

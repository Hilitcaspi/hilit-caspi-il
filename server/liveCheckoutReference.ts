import crypto from "node:crypto";

export type LiveCheckoutTier = "database_live" | "friends" | "standalone";
const TTL_MS = 48 * 60 * 60 * 1000;

function secret(): string {
  const value = process.env.JWT_SECRET?.trim();
  if (!value || value.length < 32) throw new Error("Missing signing secret for live ticket checkout");
  return value;
}
function emailDigest(email: string) {
  return crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}
export function createLiveCheckoutReference(email: string, tier: LiveCheckoutTier, now = Date.now()) {
  const data = Buffer.from(JSON.stringify({
    v: 1, h: emailDigest(email), t: tier, i: now, n: crypto.randomBytes(12).toString("hex"),
  })).toString("base64url");
  const mac = crypto.createHmac("sha256", secret()).update(data).digest("base64url");
  return `${data}.${mac}`;
}
export function verifyLiveCheckoutReference(reference: string | undefined, email: string, now = Date.now()): LiveCheckoutTier | null {
  if (!reference || reference.length > 400) return null;
  const [data, mac, extra] = reference.split(".");
  if (!data || !mac || extra) return null;
  try {
    const expected = crypto.createHmac("sha256", secret()).update(data).digest();
    const actual = Buffer.from(mac, "base64url");
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
    const p = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (p.v !== 1 || p.h !== emailDigest(email) || !Number.isFinite(p.i) || p.i > now + 60_000 || now - p.i > TTL_MS) return null;
    return p.t === "database_live" || p.t === "friends" || p.t === "standalone" ? p.t : null;
  } catch { return null; }
}

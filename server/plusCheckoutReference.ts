import crypto from "node:crypto";

const VERSION = "v1";
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

function normalizedEmailHash(email: string) {
  return crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}

function signingSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error("JWT_SECRET is required for Plus checkout references");
  return secret;
}

function signature(payload: string) {
  return crypto.createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function createPlusCheckoutReference(email: string, now = Date.now()) {
  const issuedAt = Math.floor(now / 1000);
  const payload = `${VERSION}.${issuedAt}.${normalizedEmailHash(email)}`;
  return `${payload}.${signature(payload)}`;
}

export function verifyPlusCheckoutReference(reference: string | undefined, email: string, now = Date.now()) {
  if (!reference) return false;
  const parts = reference.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) return false;
  const [version, issuedAtRaw, emailHash, suppliedSignature] = parts;
  const issuedAt = Number(issuedAtRaw) * 1000;
  if (!Number.isFinite(issuedAt) || issuedAt > now + 60_000 || now - issuedAt > MAX_AGE_MS) return false;
  if (emailHash !== normalizedEmailHash(email)) return false;
  const payload = `${version}.${issuedAtRaw}.${emailHash}`;
  const expectedSignature = signature(payload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

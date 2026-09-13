import crypto from "node:crypto";
import type { Request } from "express";

export const PAYMENT_ATTRIBUTION_TTL_MS = 24 * 60 * 60 * 1000;

const META_COOKIE_PATTERN = /^fb\.[12]\.\d{8,}\.[A-Za-z0-9_-]{4,}$/;

export function normalizeMetaCookie(value?: string): string | undefined {
  const normalized = value?.trim();
  if (!normalized || normalized.length > 255 || !META_COOKIE_PATTERN.test(normalized)) return undefined;
  return normalized;
}

export function createPurchaseTrackingIdentity(): { trackingToken: string; purchaseEventId: string } {
  return {
    trackingToken: crypto.randomBytes(32).toString("hex"),
    purchaseEventId: `checkout-${crypto.randomUUID()}`,
  };
}

export function getClientIp(req: Request): string | undefined {
  const candidate = String(req.ip || "").trim();
  if (!candidate || candidate.length > 64) return undefined;
  return candidate.replace(/^::ffff:/, "");
}


import { eq } from "drizzle-orm";
import { singles } from "../drizzle/schema";

type BoostIdentity = { email?: string | null; phone?: string | null; isSeed?: boolean | null; boostExcluded?: boolean | null };
export type BoostExclusionAnchors = { emails: Set<string>; phones: Set<string> };

function comparableEmail(email: string | null | undefined): string | null {
  const normalized = String(email || "").trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at < 1) return null;
  const domain = normalized.slice(at + 1);
  let local = normalized.slice(0, at).split("+")[0];
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.replace(/\./g, "");
    return `${local}@gmail.com`;
  }
  return `${local}@${domain}`;
}

function comparableIsraeliMobile(phone: string | null | undefined): string | null {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("972")) digits = `0${digits.slice(3)}`;
  return /^05\d{8}$/.test(digits) ? digits : null;
}

/** Explicitly excluded profiles anchor future duplicates; a name alone is never enough. */
export async function loadBoostExclusionAnchors(db: any): Promise<BoostExclusionAnchors> {
  const marked = await db.select({ email: singles.email, phone: singles.phone })
    .from(singles).where(eq(singles.boostExcluded, true));
  return {
    emails: new Set((marked as BoostIdentity[]).map(row => comparableEmail(row.email)).filter((value): value is string => Boolean(value))),
    phones: new Set((marked as BoostIdentity[]).map(row => comparableIsraeliMobile(row.phone)).filter((value): value is string => Boolean(value))),
  };
}

export function isBoostExcludedProfile(profile: BoostIdentity | null | undefined, anchors?: BoostExclusionAnchors): boolean {
  if (!profile) return false;
  if (profile.boostExcluded || profile.isSeed) return true;
  if (!anchors) return false;
  const email = comparableEmail(profile.email);
  const phone = comparableIsraeliMobile(profile.phone);
  return Boolean((email && anchors.emails.has(email)) || (phone && anchors.phones.has(phone)));
}

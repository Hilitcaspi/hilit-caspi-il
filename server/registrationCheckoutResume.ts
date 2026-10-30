import { and, eq, sql } from "drizzle-orm";
import { singles } from "../drizzle/schema";
import { normalizeIsraeliPhone } from "../shared/profileValidation";
import { getDb } from "./db";

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
export interface RegistrationCheckoutResumeInput {
  product: string;
  token: string;
  email: string;
  phone?: string;
  fullName: string;
}
export interface RegistrationCheckoutResumeProfile {
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  isPaid: boolean | number;
}

const normalizeName = (value: string) => value.trim().replace(/\s+/g, " ");

/** A bearer link proves access to exactly this unpaid draft; email alone never does. */
export function matchesRegistrationCheckoutResume(
  profile: RegistrationCheckoutResumeProfile | null | undefined,
  input: RegistrationCheckoutResumeInput,
): boolean {
  if (input.product !== "database" || !/^[a-f0-9]{64}$/i.test(input.token) || !profile || profile.isPaid) return false;
  if (!profile.firstName.trim() || !profile.lastName?.trim()) return false;
  const phone = normalizeIsraeliPhone(input.phone || "");
  return Boolean(phone
    && phone === normalizeIsraeliPhone(profile.phone || "")
    && input.email.trim().toLowerCase() === (profile.email || "").trim().toLowerCase()
    && normalizeName(input.fullName) === normalizeName(`${profile.firstName} ${profile.lastName}`));
}

/** Read-only validation. No checkout state, profile, receipt, consent, or provider is mutated. */
export async function verifyRegistrationCheckoutResume(
  input: RegistrationCheckoutResumeInput,
  db: Database,
): Promise<boolean> {
  if (input.product !== "database" || !/^[a-f0-9]{64}$/i.test(input.token)) return false;
  const [profile] = await db.select({
    firstName: singles.firstName,
    lastName: singles.lastName,
    email: singles.email,
    phone: singles.phone,
    isPaid: singles.isPaid,
  }).from(singles).where(and(
    eq(singles.questionnaireToken, input.token.toLowerCase()),
    sql`LOWER(TRIM(${singles.email})) = ${input.email.trim().toLowerCase()}`,
  )).limit(1);
  return matchesRegistrationCheckoutResume(profile, input);
}

import { TRPCError } from "@trpc/server";
import { eq, sql, and } from "drizzle-orm";
import { singles } from "../drizzle/schema";
import { getDb } from "./db";
import { hasPaidDatabaseMembership } from "../shared/plusDatabaseEligibility";

export const PLUS_DATABASE_REQUIRED_MESSAGE = "Plus זמין רק למי שכבר השלים את ההרשמה והתשלום למאגר. יש להיכנס דרך הקישור האישי של חברות המאגר";

/** Fail closed before any intent, consent, tracking or provider write. */
export async function requirePlusDatabaseCheckout(email: string, personalToken?: string) {
  if (!personalToken || personalToken.length < 16 || personalToken.length > 200) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: PLUS_DATABASE_REQUIRED_MESSAGE });
  }
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "לא ניתן לאמת כרגע את חברות המאגר. יש לנסות שוב בהמשך" });
  const [profile] = await db.select({
    id: singles.id,
    gender: singles.gender,
    isPaid: singles.isPaid,
    isActive: singles.isActive,
    isSeed: singles.isSeed,
    market: singles.market,
  }).from(singles).where(and(
    sql`LOWER(TRIM(${singles.email})) = ${email.trim().toLowerCase()}`,
    eq(singles.questionnaireToken, personalToken),
  )).limit(1);
  if (!hasPaidDatabaseMembership(profile)) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: PLUS_DATABASE_REQUIRED_MESSAGE });
  }
  return profile;
}

import { sql } from "drizzle-orm";
import { crmLeads, dnaQuizResults, singles } from "../drizzle/schema";

export type EmailRecipientGender = "female" | "male";
export type EmailGenderResolution = {
  gender: EmailRecipientGender | null;
  source: "profile" | "dna" | "lead" | "provided" | "unknown" | "conflict";
};
export function validEmailGender(value: unknown): EmailRecipientGender | null {
  return value === "female" || value === "male" ? value : null;
}

/** The recipient's profile wins over stale lead metadata. Never infer from a name. */
export function resolveEmailGenderEvidence(input: {
  profiles?: unknown[]; dna?: unknown[]; leads?: unknown[]; provided?: unknown;
}): EmailGenderResolution {
  for (const [source, values] of [
    ["profile", input.profiles], ["dna", input.dna], ["lead", input.leads],
  ] as const) {
    const genders = new Set((values || []).map(validEmailGender).filter((value): value is EmailRecipientGender => value !== null));
    if (genders.size > 1) return { gender: null, source: "conflict" };
    if (genders.size === 1) return { gender: Array.from(genders)[0], source };
  }
  const gender = validEmailGender(input.provided);
  return { gender, source: gender ? "provided" : "unknown" };
}

export function journeyRecipientGender(key: string): EmailRecipientGender | null {
  return key.startsWith("women_") ? "female" : key.startsWith("men_") ? "male" : null;
}
export function alignJourneyGender(key: string, gender: EmailRecipientGender | null): string {
  if (!journeyRecipientGender(key)) return key;
  if (!gender) throw new Error("email_gender_unverified");
  return key.replace(/^(women|men)_/, gender === "female" ? "women_" : "men_");
}

/** Three bounded batch reads, rather than one query per pending message. */
export async function loadEmailRecipientGenders(db: any, emails: string[]): Promise<Map<string, EmailGenderResolution>> {
  const normalized = Array.from(new Set(emails.map(email => email.trim().toLowerCase()).filter(Boolean)));
  const result = new Map<string, EmailGenderResolution>();
  if (!normalized.length) return result;
  if (normalized.length > 100) throw new Error("email_gender_batch_too_large");
  const filter = (column: any) => sql`LOWER(TRIM(${column})) IN (${sql.join(normalized.map(email => sql`${email}`), sql`, `)})`;
  const [profiles, leads] = await Promise.all([
    db.select({ email: singles.email, gender: singles.gender }).from(singles).where(filter(singles.email)),
    db.select({ email: crmLeads.email, gender: crmLeads.gender, sessionId: crmLeads.quizSessionId })
      .from(crmLeads).where(filter(crmLeads.email)),
  ]);
  const sessions = Array.from(new Set(leads.map((lead: any) => lead.sessionId).filter(Boolean)));
  const dna = sessions.length ? await db.select({ sessionId: dnaQuizResults.sessionId, gender: dnaQuizResults.gender })
    .from(dnaQuizResults).where(sql`${dnaQuizResults.sessionId} IN (${sql.join(sessions.map(session => sql`${session}`), sql`, `)})`) : [];
  for (const email of normalized) {
    const sameEmail = (row: any) => String(row.email || "").trim().toLowerCase() === email;
    const leadRows = leads.filter(sameEmail);
    const linkedSessions = new Set(leadRows.map((row: any) => row.sessionId).filter(Boolean));
    result.set(email, resolveEmailGenderEvidence({
      profiles: profiles.filter(sameEmail).map((row: any) => row.gender),
      dna: dna.filter((row: any) => linkedSessions.has(row.sessionId)).map((row: any) => row.gender),
      leads: leadRows.map((row: any) => row.gender),
    }));
  }
  return result;
}

export async function resolveEmailRecipientGender(db: any, email: string, provided?: unknown): Promise<EmailGenderResolution> {
  const data = await loadEmailRecipientGenders(db, [email]);
  const existing = data.get(email.trim().toLowerCase()) || { gender: null, source: "unknown" as const };
  if (existing.source !== "unknown") return existing;
  return resolveEmailGenderEvidence({ provided });
}

/** Already-queued gendered copy must not be sent if the evidence changed. */
export function queuedEmailGenderBlockReason(key: string, evidence: EmailGenderResolution): string | null {
  const expected = journeyRecipientGender(key);
  if (!expected) return null;
  if (!evidence.gender) return evidence.source === "conflict" ? "email_gender_conflict" : "email_gender_unverified";
  return expected === evidence.gender ? null : "email_gender_mismatch";
}

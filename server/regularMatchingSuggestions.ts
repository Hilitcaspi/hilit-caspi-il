import { and, eq, ne, or, sql } from "drizzle-orm";
import { singles, matches, matchmakingAnswers } from "../drizzle/schema";
import { getDb } from "./db";
import { computeFullScore, computeFullScoreAdmin } from "./compatibility";
import { hasRegularMatchingAccess, regularMatchingAccessSql } from "./regularMatchingEligibility";
import { wasMatchProposalSent } from "../shared/matchDelivery";

/** Only an admin preview. It cannot create a record or send any proposal. */
export async function previewRegularCandidates(singleId: number, excludedIds: number[] = [], limit = 3) {
  const db = await getDb();
  if (!db) return [];
  const [main] = await db.select().from(singles).where(eq(singles.id, singleId)).limit(1);
  if (!main || !hasRegularMatchingAccess(main)) return [];
  const existing = await db.select().from(matches).where(or(eq(matches.singleAId, singleId), eq(matches.singleBId, singleId)));
  if (existing.some(m => (m.status === "proposed" || (m.status === "matched" && !m.returnedToPoolAt && m.matchDetailStatus !== "ended")))) return [];
  const blocked = new Set(excludedIds);
  for (const m of existing) if (wasMatchProposalSent(m) || m.status === "rejected") blocked.add(m.singleAId === singleId ? m.singleBId : m.singleAId);
  const seeking = main.seekingGender || (main.gender === "male" ? "female" : "male");
  const people = await db.select().from(singles).where(and(regularMatchingAccessSql(), ne(singles.id, singleId), seeking === "any" ? sql`1=1` : eq(singles.gender, seeking as "male" | "female")));
  const activePairs = await db.select().from(matches).where(or(eq(matches.status, "proposed"), eq(matches.status, "matched")));
  for (const m of activePairs) if (m.status === "proposed" || (!m.returnedToPoolAt && m.matchDetailStatus !== "ended")) { blocked.add(m.singleAId); blocked.add(m.singleBId); }
  const answers = await db.select().from(matchmakingAnswers);
  const answerMap = new Map(answers.map(r => { try { return [r.singleId, JSON.parse(r.answersJson || "[]")]; } catch { return [r.singleId, []]; } }));
  const ownAnswers = answerMap.get(singleId) || [];
  return people.filter(p => !blocked.has(p.id) && !p.boostExcluded && p.photoUrl && p.questionnaireCompletedAt && (!p.seekingGender || p.seekingGender === "any" || p.seekingGender === main.gender))
    .map(p => {
      const strict = computeFullScore(main as any, p as any, ownAnswers, answerMap.get(p.id) || []);
      const preview = computeFullScoreAdmin(main as any, p as any, ownAnswers, answerMap.get(p.id) || []);
      const warnings = [...(preview.warnings || [])];
      if (!strict.total) {
        const reason = strict.details.find(d => d.startsWith("פסילה מוחלטת:"));
        if (reason && !warnings.includes(reason)) warnings.unshift(reason);
      }
      return { matchId: 0, score: preview.total, status: "preview", approvedByA: false, approvedByB: false, scoreBreakdown: JSON.stringify(preview), warnings, requiresCriteriaOverride: !strict.total,
        opponent: { id: p.id, name: `${p.firstName} ${p.lastName || ""}`.trim(), age: p.age, city: p.city, gender: p.gender, dnaType: p.dnaType, photoUrl: p.photoUrl, phone: p.phone, occupation: p.occupation, religiosity: p.religiosity, height: p.height, education: p.education, maritalStatus: p.maritalStatus, hasKids: p.hasKids, numKids: p.numKids, wantsKids: p.wantsKids, smokingStatus: p.smokingStatus, hasPets: p.hasPets, shomerShabbat: p.shomerShabbat, about: p.about, partnerDescription: p.partnerDescription, email: p.email } };
    }).filter(p => p.score > 0).sort((a, b) => Number(a.requiresCriteriaOverride) - Number(b.requiresCriteriaOverride) || b.score - a.score).slice(0, limit);
}

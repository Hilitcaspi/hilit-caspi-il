// Read-only aggregate audit: no writes, names, emails, tokens, or pair identifiers in output.
import { and, gte, inArray, isNotNull } from "drizzle-orm";
import { singles, matches, matchmakingAnswers } from "../drizzle/schema";
import { getDb } from "../server/db";
import { computeFullScore } from "../server/compatibility";
import type { MatchAnswer } from "../shared/matchmakingTypes";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const lastWeek = new Date(Date.now() - 7 * 86400000);
  const rows = await db.select({
    a: matches.singleAId, b: matches.singleBId,
    score: matches.score, scoreBreakdown: matches.scoreBreakdown,
  }).from(matches).where(and(
    gte(matches.createdAt, lastWeek), isNotNull(matches.scoreBreakdown),
  )).limit(2500);
  const ids = [...new Set(rows.flatMap(row => [row.a, row.b]).filter(id => id > 0))];
  const people = new Map<number, typeof singles.$inferSelect>();
  const answerMap = new Map<number, MatchAnswer[]>();
  for (let i = 0; i < ids.length; i += 350) {
    const batch = ids.slice(i, i + 350);
    const profiles = await db.select().from(singles).where(inArray(singles.id, batch));
    for (const item of profiles) people.set(item.id, item);
    const answers = await db.select({ singleId: matchmakingAnswers.singleId, answersJson: matchmakingAnswers.answersJson })
      .from(matchmakingAnswers).where(inArray(matchmakingAnswers.singleId, batch));
    for (const row of answers) {
      try { answerMap.set(row.singleId, JSON.parse(row.answersJson) as MatchAnswer[]); }
      catch { answerMap.set(row.singleId, []); }
    }
  }
  let comparable = 0, becameInvalid = 0, closeDistanceRejected = 0;
  let oldHigh = 0, newHigh = 0, droppedHigh = 0, gainedHigh = 0;
  let deltaSum = 0, largestIncrease = -Infinity, largestDecrease = Infinity;
  let likelyScreenshot = 0;
  let screenshotNewScore: number | null = null;
  for (const row of rows) {
    const a = people.get(row.a), b = people.get(row.b);
    if (!a || !b || row.score == null) continue;
    const score = computeFullScore(a, b, answerMap.get(a.id) ?? [], answerMap.get(b.id) ?? []);
    if (score.total === 0) {
      becameInvalid++;
      if (score.details.some(text => text.includes("מחפש קרוב"))) closeDistanceRejected++;
      continue;
    }
    comparable++;
    const old = Math.round(row.score), current = score.total;
    const delta = current - old;
    deltaSum += delta;
    largestIncrease = Math.max(largestIncrease, delta);
    largestDecrease = Math.min(largestDecrease, delta);
    if (old >= 80) oldHigh++;
    if (current >= 80) newHigh++;
    if (old >= 80 && current < 80) droppedHigh++;
    if (old < 80 && current >= 80) gainedHigh++;
    try {
      const bd = JSON.parse(row.scoreBreakdown ?? "{}");
      if (old === 82 && bd.education === 70 && bd.questionnaire === 54 && bd.dna === 80) {
        likelyScreenshot++;
        screenshotNewScore = score.total;
      }
    } catch { /* malformed historical breakdown is not a validation failure */ }
  }
  console.log(JSON.stringify({
    windowDays: 7, readOnly: true, sampled: rows.length, comparable,
    invalidUnderCurrentDataOrPolicy: becameInvalid,
    closeDistanceRejected,
    previous80Plus: oldHigh, proposed80Plus: newHigh, old80PlusNowBelow80: droppedHigh,
    oldBelow80Now80Plus: gainedHigh, meanChange: comparable ? +(deltaSum / comparable).toFixed(1) : null,
    changeRange: comparable ? [largestDecrease, largestIncrease] : null,
    screenshotPatternMatches: likelyScreenshot,
    screenshotCurrentDataNewScore: likelyScreenshot === 1 ? screenshotNewScore : null,
    disclaimer: "Compares today's profiles and answers with historical scores; not a causal A/B test.",
  }));
}
main().then(() => process.exit(0)).catch(error => {
  console.error("Aggregate audit failed:", error instanceof Error ? error.name : "unknown");
  process.exit(1);
});

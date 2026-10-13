export type PlusCycleProgressView = {
  cycleStart: number;
  cycleEnd: number;
  target: number;
  delivered: number;
  daysRemaining: number;
  progressPercent: number;
};
/** Presentation only: never advances a billing period or grants a benefit. */
export function presentPlusCycle(progress: PlusCycleProgressView, now = Date.now(), billingStatus?: string | null) {
  const valid = Number.isFinite(progress.cycleStart) && Number.isFinite(progress.cycleEnd)
    && progress.cycleStart > 0 && progress.cycleEnd > progress.cycleStart;
  const phase = !valid ? "unknown" : now < progress.cycleStart ? "upcoming" : now >= progress.cycleEnd ? "ended" : "current";
  const date = (at: number) => new Date(at).toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" });
  return {
    phase,
    title: phase === "current" ? "הצעות שנשלחו במחזור הנוכחי" : phase === "ended" ? "הצעות שנשלחו במחזור האחרון" : "הצעות שנשלחו במחזור המתועד",
    period: valid ? `${date(progress.cycleStart)} עד ${date(progress.cycleEnd)}` : "תאריכי המחזור אינם זמינים כרגע",
    count: `${progress.delivered} מתוך ${progress.target}`,
    timing: phase === "current" ? `נותרו ${Math.max(0, Math.ceil((progress.cycleEnd - now) / 86400000))} ימים` : phase === "ended" ? `המחזור הסתיים ב־${date(progress.cycleEnd)}` : phase === "upcoming" ? `המחזור יתחיל ב־${date(progress.cycleStart)}` : "נדרש בירור של תאריכי המחזור",
    notice: phase === "ended" ? (["cancelled", "ended"].includes(billingStatus || "") ? "המחזור האחרון הסתיים והחידוש אינו פעיל לפי הרישום באתר. המונה מציג את היסטוריית המחזור האחרון." : "חידוש המחזור עדיין לא מתועד באתר. המונה כאן שייך למחזור האחרון, ולא למחזור חדש. לאחר עדכון חידוש מאומת יוצג המונה של המחזור החדש.") : phase === "unknown" ? "לא ניתן להציג מחזור נוכחי בלי תאריכים תקינים. צוות Plus יכול לבדוק זאת." : null,
  } as const;
}

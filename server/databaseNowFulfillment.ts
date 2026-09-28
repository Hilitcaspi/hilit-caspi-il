import { and, desc, eq, inArray } from "drizzle-orm";
import { crmTeamTasks, paymentLeads } from "../drizzle/schema";
import { isDatabaseNowCoupon } from "../shared/databaseHolidayNow";
import { getDb } from "./db";

const DAY = 24 * 60 * 60 * 1000;
export const DATABASE_NOW_TASK_CREATED_BY = "automation:database_now";
export const DATABASE_NOW_TASK_TITLE = "NOW · התאמה ראשונה בתוך 3 ימים";
export type DatabaseNowSlaState = "awaiting_profile" | "active" | "due_soon" | "overdue" | "fulfilled";

export function databaseNowDueAt(eligibleAt: number) {
  return eligibleAt + 3 * DAY;
}

export function databaseNowSlaState(input: {
  eligibleAt?: number | null;
  dueAt?: number | null;
  firstMatchSentAt?: number | null;
}, now = Date.now()): DatabaseNowSlaState {
  if (input.firstMatchSentAt) return "fulfilled";
  if (!input.eligibleAt) return "awaiting_profile";
  const dueAt = input.dueAt || databaseNowDueAt(input.eligibleAt);
  if (dueAt <= now) return "overdue";
  if (dueAt - now <= DAY) return "due_soon";
  return "active";
}

export async function ensureDatabaseNowMatchTask(input: {
  singleId: number;
  email: string;
  eligibleAt: number;
  couponCode?: string | null;
}) {
  const db = await getDb();
  if (!db) return { created: false, reason: "db_unavailable" as const };
  let couponCode = input.couponCode?.trim().toUpperCase() || null;

  if (!isDatabaseNowCoupon(couponCode)) {
    const [purchase] = await db.select({ couponCode: paymentLeads.couponCode })
      .from(paymentLeads)
      .where(and(
        eq(paymentLeads.email, input.email.trim().toLowerCase()),
        eq(paymentLeads.product, "database"),
      ))
      .orderBy(desc(paymentLeads.createdAt))
      .limit(1);
    couponCode = purchase?.couponCode?.trim().toUpperCase() || null;
  }

  if (!isDatabaseNowCoupon(couponCode)) {
    return { created: false, reason: "not_now_purchase" as const };
  }

  const [existing] = await db.select({ id: crmTeamTasks.id })
    .from(crmTeamTasks)
    .where(and(
      eq(crmTeamTasks.singleId, input.singleId),
      eq(crmTeamTasks.createdBy, DATABASE_NOW_TASK_CREATED_BY),
      inArray(crmTeamTasks.status, ["todo", "in_progress", "done"]),
    ))
    .limit(1);
  if (existing) return { created: false, reason: "already_exists" as const, taskId: existing.id };

  const dueAt = databaseNowDueAt(input.eligibleAt);
  const now = Date.now();
  const [result] = await db.insert(crmTeamTasks).values({
    singleId: input.singleId,
    taskType: "match_review",
    title: DATABASE_NOW_TASK_TITLE,
    description: "רכישת מאגר דרך הצעת NOW. יש לשלוח הצעת התאמה ראשונה בתוך 3 ימים מהשלמת הפרופיל והשאלון.",
    priority: "urgent",
    status: "todo",
    dueAt,
    createdBy: DATABASE_NOW_TASK_CREATED_BY,
    createdAt: now,
    updatedAt: now,
  });

  return { created: true, taskId: Number((result as any).insertId || 0), dueAt };
}

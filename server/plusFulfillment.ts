import { and, eq } from "drizzle-orm";
import { plusCheckoutIntents, plusPaymentEvents, plusPilotMembers } from "../drizzle/schema";
import type { Single } from "../drizzle/schema";
import { sendEmail } from "./brevo";
import { getDb } from "./db";
import { notifyOwner } from "./_core/notification";
import { addOneBillingMonth } from "./plusSubscription";

const SITE_BASE = "https://hilitcaspi.com";

export type PlusActivationInput = {
  single: Pick<Single, "id" | "questionnaireToken">;
  email: string;
  name: string;
  transactionId: string;
  amountAgorot: number;
  providerSubscriptionId?: string | null;
  paidAt?: number;
};

export async function activatePlusForSingle(input: PlusActivationInput) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const now = Date.now();
  const cycleStart = input.paidAt || now;
  const cycleEnd = addOneBillingMonth(cycleStart);
  const [existing] = await db.select().from(plusPilotMembers)
    .where(eq(plusPilotMembers.singleId, input.single.id)).limit(1);

  const memberValues = {
    status: "active" as const,
    billingStatus: "active" as const,
    pilotPriceAgorot: input.amountAgorot || 9900,
    monthlyMatchTarget: 2,
    billingCycleStartedAt: cycleStart,
    billingCycleEndsAt: cycleEnd,
    nextBillingAt: cycleEnd,
    providerSubscriptionId: input.providerSubscriptionId || null,
    lastPaymentTransactionId: input.transactionId || null,
    lastPaymentAt: cycleStart,
    premiumSupportEnabled: true,
    activatedAt: existing?.activatedAt || now,
    endedAt: null,
    cancelledAt: null,
    lastEngagedAt: now,
    updatedAt: now,
  };

  if (existing) {
    await db.update(plusPilotMembers).set(memberValues).where(eq(plusPilotMembers.id, existing.id));
  } else {
    await db.insert(plusPilotMembers).values({
      singleId: input.single.id,
      source: "grow_recurring",
      waitlistedAt: cycleStart,
      createdAt: now,
      ...memberValues,
    });
  }

  const [member] = await db.select().from(plusPilotMembers)
    .where(eq(plusPilotMembers.singleId, input.single.id)).limit(1);
  if (!member) throw new Error("Plus member row was not created");

  const [existingEvent] = input.transactionId
    ? await db.select({ id: plusPaymentEvents.id }).from(plusPaymentEvents)
      .where(and(
        eq(plusPaymentEvents.plusMemberId, member.id),
        eq(plusPaymentEvents.providerTransactionId, input.transactionId),
      )).limit(1)
    : [];
  if (!existingEvent) {
    await db.insert(plusPaymentEvents).values({
      plusMemberId: member.id,
      singleId: input.single.id,
      eventType: existing?.billingStatus === "active" ? "payment_succeeded" : "subscription_started",
      amountAgorot: input.amountAgorot || 9900,
      providerTransactionId: input.transactionId || null,
      providerSubscriptionId: input.providerSubscriptionId || null,
      billingPeriodStartedAt: cycleStart,
      billingPeriodEndsAt: cycleEnd,
      createdAt: now,
    });
  }

  await db.update(plusCheckoutIntents).set({
    status: "active",
    singleId: input.single.id,
    plusMemberId: member.id,
    activatedAt: now,
    updatedAt: now,
  }).where(eq(plusCheckoutIntents.email, input.email.trim().toLowerCase()));

  const personalUrl = input.single.questionnaireToken
    ? `${SITE_BASE}/my-profile?email=${encodeURIComponent(input.email)}&token=${encodeURIComponent(input.single.questionnaireToken)}`
    : `${SITE_BASE}/database-plus`;
  await sendEmail({
    to: { email: input.email, name: input.name },
    subject: "Database Plus שלך פעיל",
    htmlContent: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:28px;color:#292552"><h2 style="color:#191265">ברוכים הבאים ל־Database Plus</h2><p style="line-height:1.8">המנוי שלך פעיל. במחזור הנוכחי נשלח לפחות שתי הצעות התאמה חדשות שנבדקו. באזור האישי ניתן לראות את ההתקדמות ולפנות לערוץ השירות בעדיפות.</p><p style="line-height:1.8;font-size:13px;color:#666">ההבטחה היא להצעות שנבדקו ונשלחו; אישור הדדי, דייט או זוגיות אינם מובטחים.</p><p style="text-align:center;margin:28px 0"><a href="${personalUrl}" style="display:inline-block;background:#191265;color:#ffe27c;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:bold">כניסה לאזור האישי</a></p></div>`,
  });
  await notifyOwner({ title: "מנוי Database Plus חדש", content: `${input.name} (${input.email}) הפעיל/ה Plus.` });
  return { memberId: member.id };
}

export async function activatePendingPlusAfterRegistration(single: Pick<Single, "id" | "email" | "firstName" | "lastName" | "questionnaireToken">) {
  if (!single.email) return null;
  const db = await getDb();
  if (!db) return null;
  const normalizedEmail = single.email.trim().toLowerCase();
  const [intent] = await db.select().from(plusCheckoutIntents)
    .where(and(
      eq(plusCheckoutIntents.email, normalizedEmail),
      eq(plusCheckoutIntents.status, "paid_pending_profile"),
      eq(plusCheckoutIntents.renewalAccepted, true),
      eq(plusCheckoutIntents.termsAccepted, true),
      eq(plusCheckoutIntents.boostAccepted, true),
    )).limit(1);
  if (!intent) return null;
  return activatePlusForSingle({
    single,
    email: normalizedEmail,
    name: `${single.firstName} ${single.lastName || ""}`.trim() || intent.fullName,
    transactionId: intent.providerTransactionId || "",
    amountAgorot: intent.amountAgorot || 9900,
    providerSubscriptionId: intent.providerSubscriptionId,
    paidAt: intent.paidAt || Date.now(),
  });
}

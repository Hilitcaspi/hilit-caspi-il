import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  plusCancellationRequests,
  plusCancellationSettings,
  plusPilotMembers,
  singles,
} from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { sendEmail } from "./brevo";
import { normalizeIsraeliMobile, sendSMSBulkDetailed } from "./vibrate";

export const PLUS_CANCELLATION_ADMIN_URL =
  "https://hilitcaspi.com/crm/matchmaking?tab=plus";
const TITLE = "בקשת עצירת חיוב Plus חדשה";
const MAX_NAME_LENGTH = 120;
const MAX_PUSH_CONTENT_LENGTH = 1_200;
const MAX_EMAIL_TEXT_LENGTH = 2_000;
const MAX_SMS_LENGTH = 450;
const STOP_AND_CONFIRM_COPY =
  "יש לעצור תחילה את הוראת הקבע ב־Grow, ואז ללחוץ על אישור עצירת החיוב ב־Grow באתר. האישור מתעד את עצירת החיוב בלבד; זכאות השירות נשמרת עד סוף המחזור המתועד.";

type CancellationNotificationDetails = {
  fullName: string;
  requestedAt: string;
  activatedAt: string | null;
};

type NotificationContent = {
  push: string;
  emailText: string;
  emailHtml: string;
  sms: string;
};

function boundedText(value: string, maxLength: number) {
  return Array.from(value).slice(0, maxLength).join("").trim();
}

function normalizeNamePart(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fullName(firstName: unknown, lastName: unknown) {
  return boundedText(
    [normalizeNamePart(firstName), normalizeNamePart(lastName)]
      .filter(Boolean)
      .join(" "),
    MAX_NAME_LENGTH
  );
}

function formatDateIsrael(value: unknown) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(timestamp));
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    character =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] || character
  );
}

function sanitizeSms(value: string) {
  return boundedText(
    value
      .replace(/[\r\n\u2028\u2029]+/g, " ")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/(?:^|\s)(?:to|from|cc|bcc|subject)\s*:/gi, " ")
      .replace(/\s+/g, " "),
    MAX_SMS_LENGTH
  );
}

/**
 * Reads only the identity and lifecycle dates necessary for an owner alert.
 * A missing or malformed row intentionally falls back to the established generic alert.
 */
async function loadCancellationNotificationDetails(
  db: any,
  requestKey: string
): Promise<CancellationNotificationDetails | null> {
  try {
    const [row] = await db
      .select({
        firstName: singles.firstName,
        lastName: singles.lastName,
        requestedAt: plusCancellationRequests.requestedAt,
        activatedAt: plusPilotMembers.activatedAt,
      })
      .from(plusCancellationRequests)
      .innerJoin(
        plusPilotMembers,
        eq(plusCancellationRequests.plusMemberId, plusPilotMembers.id)
      )
      .innerJoin(singles, eq(plusPilotMembers.singleId, singles.id))
      .where(eq(plusCancellationRequests.requestKey, requestKey))
      .limit(1);

    const name = fullName(row?.firstName, row?.lastName);
    const requestedAt = formatDateIsrael(row?.requestedAt);
    if (!name || !requestedAt) return null;
    return {
      fullName: name,
      requestedAt,
      activatedAt: formatDateIsrael(row?.activatedAt),
    };
  } catch {
    // Lookup failures must not disclose technical details or interrupt the durable request.
    return null;
  }
}

function renderNotificationContent(
  details: CancellationNotificationDetails | null
): NotificationContent {
  const identityLines = details
    ? [
        `התקבלה בקשת ביטול Plus מאת: ${details.fullName}.`,
        `נשלחה: ${details.requestedAt}.`,
        ...(details.activatedAt ? [`הופעל Plus: ${details.activatedAt}.`] : []),
      ]
    : ["התקבלה בקשת ביטול Plus."];
  const plainText = boundedText(
    [
      ...identityLines,
      STOP_AND_CONFIRM_COPY,
      `לטיפול: ${PLUS_CANCELLATION_ADMIN_URL}`,
    ].join("\n"),
    MAX_EMAIL_TEXT_LENGTH
  );
  const htmlDetails = details
    ? `<p>התקבלה בקשת ביטול Plus מאת: <strong>${escapeHtml(details.fullName)}</strong>.</p><p>נשלחה: ${escapeHtml(details.requestedAt)}.</p>${details.activatedAt ? `<p>הופעל Plus: ${escapeHtml(details.activatedAt)}.</p>` : ""}`
    : "<p>התקבלה בקשת ביטול Plus.</p>";
  const emailHtml = `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:28px;color:#292552"><h2>${TITLE}</h2>${htmlDetails}<p>${escapeHtml(STOP_AND_CONFIRM_COPY)}</p><p><a href="${PLUS_CANCELLATION_ADMIN_URL}">לתור בקשות עצירת חיוב Plus</a></p></div>`;
  const smsDetails = details
    ? [
        `בקשת ביטול Plus: ${details.fullName}.`,
        `נשלחה: ${details.requestedAt}.`,
        ...(details.activatedAt ? [`הופעל Plus: ${details.activatedAt}.`] : []),
      ]
    : ["בקשת ביטול Plus חדשה."];
  const sms = sanitizeSms(
    [
      ...smsDetails,
      "יש לעצור חיוב ב־Grow ואז לסמן באתר שעצרת. האישור אינו מסיים את השירות; הזכאות נשמרת עד סוף המחזור.",
      `לטיפול: ${PLUS_CANCELLATION_ADMIN_URL}`,
    ].join(" ")
  );

  return {
    push: boundedText(plainText, MAX_PUSH_CONTENT_LENGTH),
    emailText: plainText,
    emailHtml,
    sms,
  };
}

function ownerSmsIdempotencyKey(requestKey: string) {
  // Preserve a stable provider idempotency key without sharing the internal request key.
  return `plus-cancellation-owner-${createHash("sha256").update(requestKey).digest("hex")}`;
}

export async function getPlusCancellationRecipients(db: any) {
  const [settings] = await db
    .select({
      email: plusCancellationSettings.recipientEmail,
      phone: plusCancellationSettings.recipientPhone,
    })
    .from(plusCancellationSettings)
    .where(
      eq(plusCancellationSettings.ownerOpenId, process.env.OWNER_OPEN_ID || "")
    )
    .limit(1);
  const email = (
    process.env.PLUS_CANCELLATION_OWNER_EMAIL ||
    settings?.email ||
    ""
  ).trim();
  const phone = normalizeIsraeliMobile(
    process.env.PLUS_CANCELLATION_OWNER_SMS || settings?.phone || ""
  );
  return {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
    phone,
  };
}

type Dependencies = {
  push: typeof notifyOwner;
  email: typeof sendEmail;
  sms: typeof sendSMSBulkDetailed;
};

/** Called only for the transaction winner, after the request has durably committed. */
export async function notifyPlusCancellation(
  db: any,
  requestKey: string,
  deps: Dependencies = {
    push: notifyOwner,
    email: sendEmail,
    sms: sendSMSBulkDetailed,
  }
) {
  const details = await loadCancellationNotificationDetails(db, requestKey);
  const content = renderNotificationContent(details);
  let recipients: Awaited<ReturnType<typeof getPlusCancellationRecipients>> = {
    email: null,
    phone: null,
  };
  try {
    recipients = await getPlusCancellationRecipients(db);
  } catch {
    /* Fail individual channels, not intake. */
  }
  const attempt = async (
    field: "pushStatus" | "emailStatus" | "smsStatus",
    send: () => Promise<boolean>
  ) => {
    let accepted = false;
    try {
      accepted = await send();
    } catch {
      /* No raw provider errors or identifiers in logs. */
    }
    try {
      await db
        .update(plusCancellationRequests)
        .set({
          [field]: accepted ? "accepted" : "failed",
          updatedAt: Date.now(),
        })
        .where(eq(plusCancellationRequests.requestKey, requestKey));
    } catch {
      console.warn(
        "[PlusCancellation] Could not record notification outcome; request remains queued."
      );
    }
  };
  await Promise.all([
    attempt("pushStatus", () =>
      deps.push({ title: TITLE, content: content.push })
    ),
    attempt("emailStatus", async () => {
      if (!recipients.email) return false;
      const result = await deps.email({
        to: { email: recipients.email },
        subject: TITLE,
        textContent: content.emailText,
        htmlContent: content.emailHtml,
      });
      return result.success && result.messageId !== "blocked";
    }),
    attempt("smsStatus", async () => {
      if (!recipients.phone) return false;
      const result = await deps.sms({
        messages: [{ phone: recipients.phone, message: content.sms }],
        idempotencyKey: ownerSmsIdempotencyKey(requestKey),
      });
      return result.accepted;
    }),
  ]);
}

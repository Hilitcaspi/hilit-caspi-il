/**
 * Brevo (Sendinblue) API helper
 * Handles: sending transactional emails, managing contacts, adding to lists
 */

// BREVO_API_KEY is read directly from process.env

const BREVO_API_URL = "https://api.brevo.com/v3";
const SENDER = { name: "הילית כספי", email: "hilit@hilitcaspi.com" };

// Brevo contact list IDs - will be created on first use
// These are stored as constants; actual IDs are fetched/created dynamically
export const LIST_NAMES = {
  women_first_step: "נשים - הצעד הראשון",
  men_first_step: "גברים - הצעד הראשון",
  women_guide: "נשים - מדריך",
  men_guide: "גברים - מדריך",
  women_matchmaking: "נשים - מאגר",
  men_matchmaking: "גברים - מאגר",
  women_transformation: "נשים - טרנספורמציה",
  men_transformation: "גברים - טרנספורמציה",
  // Abandoned cart
  abandoned_guide: "נטישת עגלה - מדריך",
  abandoned_database: "נטישת עגלה - מאגר",
  abandoned_course: "נטישת עגלה - קורס",
  abandoned_coaching: "נטישת עגלה - ליווי",
  // Course purchase
  women_course: "נשים - קורס",
  men_course: "גברים - קורס",
  // Meta / Facebook Lead Ads
  free_guide_nurture: "מדריך חינמי - חימום",
  sales_call_lead: "שיחת היכרות - ליד",
  meta_lead_dna: "מטא - שאלון DNA",
  women_first_step_v2: "נשים - מסע מאגר V2",
  men_first_step_v2: "גברים - מסע מאגר V2",
  women_matchmaking_welcome: "נשים - ברוך הבא למאגר",
  men_matchmaking_welcome: "גברים - ברוך הבא למאגר",
  // English (US market)
  en_free_guide_nurture: "EN - Free Guide Nurture",
} as const;

type ListKey = keyof typeof LIST_NAMES;

// In-memory cache for list IDs (populated on first use)
const listIdCache: Partial<Record<ListKey, number>> = {};

async function brevoFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY is not set");

  return fetch(`${BREVO_API_URL}${path}`, {
    ...options,
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
  });
}

/**
 * Send a transactional email via Brevo
 */
export async function sendEmail({
  to,
  subject,
  htmlContent,
  textContent,
}: {
  to: { email: string; name?: string };
  subject: string;
  htmlContent: string;
  textContent?: string;
}): Promise<{ messageId?: string; success: boolean; error?: string }> {
  try {
    const body = {
      sender: SENDER,
      to: [to],
      subject,
      htmlContent,
      textContent,
    };

    const res = await brevoFetch("/smtp/email", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[Brevo] Send email failed:", err);
      return { success: false, error: JSON.stringify(err) };
    }

    const data = await res.json();
    return { success: true, messageId: data.messageId };
  } catch (err) {
    console.error("[Brevo] Send email exception:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Get or create a Brevo contact list by name
 */
export async function getOrCreateList(listKey: ListKey): Promise<number> {
  if (listIdCache[listKey]) return listIdCache[listKey]!;

  const listName = LIST_NAMES[listKey];

  // Fetch all lists
  const res = await brevoFetch("/contacts/lists?limit=50&offset=0");
  if (!res.ok) throw new Error("Failed to fetch Brevo lists");

  const data = await res.json();
  const lists: Array<{ id: number; name: string }> = data.lists ?? [];

  // Find existing
  const existing = lists.find((l) => l.name === listName);
  if (existing) {
    listIdCache[listKey] = existing.id;
    return existing.id;
  }

  // Create new list
  const createRes = await brevoFetch("/contacts/lists", {
    method: "POST",
    body: JSON.stringify({ name: listName, folderId: 1 }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(`Failed to create Brevo list: ${JSON.stringify(err)}`);
  }

  const created = await createRes.json();
  listIdCache[listKey] = created.id;
  return created.id;
}

/**
 * Add or update a contact in Brevo and add them to a list
 */
export async function addContactToList({
  email,
  firstName,
  lastName,
  phone,
  attributes,
  listKey,
}: {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  attributes?: Record<string, string | number | boolean>;
  listKey: ListKey;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const listId = await getOrCreateList(listKey);

    const contactBody = {
      email,
      attributes: {
        FIRSTNAME: firstName ?? "",
        LASTNAME: lastName ?? "",
        SMS: phone ?? "",
        ...attributes,
      },
      listIds: [listId],
      updateEnabled: true,
    };

    const res = await brevoFetch("/contacts", {
      method: "POST",
      body: JSON.stringify(contactBody),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // 400 with "Contact already exist" is fine - they were added to list via updateEnabled
      if (res.status === 400 && JSON.stringify(err).includes("already exist")) {
        return { success: true };
      }
      console.error("[Brevo] Add contact failed:", err);
      return { success: false, error: JSON.stringify(err) };
    }

    return { success: true };
  } catch (err) {
    console.error("[Brevo] Add contact exception:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Schedule a delayed email (stored in DB, sent by scheduler)
 * Returns the scheduled send time
 */
export function getScheduledTime(delayHours: number): Date {
  const d = new Date();
  d.setHours(d.getHours() + delayHours);
  return d;
}

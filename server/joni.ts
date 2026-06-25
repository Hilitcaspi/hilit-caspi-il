/**
 * WhatsApp Integration via Green API
 * https://green-api.com
 *
 * Works with WhatsApp Business — no browser needed.
 *
 * Setup:
 * 1. Register at green-api.com
 * 2. Create an instance and scan QR with WhatsApp Business
 * 3. Add secrets: GREEN_API_INSTANCE_ID and GREEN_API_TOKEN
 */

const GREEN_API_INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID ?? "";
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN ?? "";
const GREEN_API_URL = "https://7107.api.greenapi.com";

/**
 * Send a WhatsApp message via Green API
 * @param phone - Phone number in Israeli format (e.g. "0541234567") or international
 * @param message - Message text (plain text, no HTML)
 */
export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  if (!GREEN_API_INSTANCE_ID || !GREEN_API_TOKEN) {
    console.warn("[GreenAPI] GREEN_API_INSTANCE_ID or GREEN_API_TOKEN not set, skipping WhatsApp send");
    return false;
  }
  // Normalize phone: remove spaces, dashes, leading +
  let normalized = phone.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "");
  // Convert Israeli local format (05X) to international (9725X)
  if (normalized.startsWith("05")) {
    normalized = "972" + normalized.slice(1);
  }
  // Remove leading 0 if starts with 0 but not 05 (edge case)
  if (normalized.startsWith("0") && !normalized.startsWith("05")) {
    normalized = "972" + normalized.slice(1);
  }
  // Green API chatId format: 972XXXXXXXXX@c.us
  const chatId = `${normalized}@c.us`;
  try {
    const url = `${GREEN_API_URL}/waInstance${GREEN_API_INSTANCE_ID}/sendMessage/${GREEN_API_TOKEN}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, message }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[GreenAPI] Failed to send WhatsApp to ${normalized}: ${res.status} ${text}`);
      return false;
    }
    const data = await res.json().catch(() => ({}));
    console.log(`[GreenAPI] WhatsApp sent to ${normalized}`, data);
    return true;
  } catch (err) {
    console.error(`[GreenAPI] Error sending WhatsApp to ${normalized}:`, err);
    return false;
  }
}

/**
 * Send a WhatsApp notification to Hilit (owner) about a new lead
 */
export async function notifyOwnerWhatsApp(params: {
  name: string;
  phone?: string;
  email: string;
  source: string;
}): Promise<void> {
  const ownerPhone = process.env.OWNER_WHATSAPP ?? "972552442334";
  // Hilit's personal phone — always receives all notifications
  const hilitPhone = "0544530975";
  // Partner phone — also receives all owner notifications
  const partnerPhone = "0529467614";

  const isPaidProduct = params.source.startsWith("paid_");

  const sourceLabel =
    params.source === "meta_lead_call" ? "קמפיין שיחת היכרות" :
    params.source === "meta_lead_guide" ? "קמפיין מדריך חינמי" :
    params.source === "meta_lead_dna" ? "קמפיין שאלון DNA" :
    params.source === "paid_guide" ? "מדריך לבחור נכון (149 ₪) 💛" :
    params.source === "paid_course" ? "קורס המסע (249 ₪) 🎓" :
    params.source === "paid_coaching" ? "ליווי אישי (3 חודשים) 🌟" :
    params.source === "paid_coaching_mas" ? "ליווי מסע מלא (5 חודשים) ✨" :
    params.source === "paid_session" ? "פגישה אישית אחת (500 ₪) 💬" :
    params.source === "paid_database" ? "מאגר הרווקים (249 ₪) 💛" :
    params.source;

  const msg = [
    isPaidProduct ? `💳 רכישה חדשה!` : `🎉 ליד חדש!`,
    `שם: ${params.name}`,
    params.phone ? `טלפון: ${params.phone}` : null,
    `מייל: ${params.email}`,
    `מוצר: ${sourceLabel}`,
  ].filter(Boolean).join("\n");

  // Send to Hilit (personal + OWNER_WHATSAPP env) and her partner simultaneously
  const recipients = [hilitPhone, partnerPhone];
  if (ownerPhone && ownerPhone !== "972552442334" && ownerPhone !== "9720544530975" && ownerPhone !== "0544530975") {
    // Only add ownerPhone if it's different from hilitPhone (avoid duplicates)
    recipients.push(ownerPhone);
  }
  await Promise.all(recipients.map(phone => sendWhatsApp(phone, msg)));
}

/**
 * Send a WhatsApp welcome message to a new lead
 */
export async function sendLeadWelcomeWhatsApp(params: {
  name: string;
  phone: string;
  source: string;
}): Promise<void> {
  const firstName = params.name.trim().split(" ")[0];

  let message: string;
  if (params.source === "meta_lead_call") {
    message = `היי ${firstName}! קיבלתי את הפנייה שלך לשיחת ההיכרות.\nאחזור אלייך תוך 24 שעות לתיאום.\nהילית 💛`;
  } else if (params.source === "meta_lead_guide") {
    message = `היי ${firstName}! המדריך שלך בדרך אלייך.\nכדאי לבדוק את תיבת המייל (גם תיקיית הספאם).\nהילית 💛`;
  } else {
    message = `היי ${firstName}! קיבלתי את הפנייה שלך.\nאחזור אלייך בקרוב.\nהילית 💛`;
  }

  await sendWhatsApp(params.phone, message);
}

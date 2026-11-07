import { isNovemberBundleOfferActive } from "@shared/novemberBundleOffer";

export const PROMO_SEEN_KEY = "hc_november10_popup_seen_v1";
export const PROMO_SESSION_KEY = "hc_november10_popup_session_v1";
export const PROMO_BAR_KEY = "hc_november_bar_closed_v1";
export const PROMO_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export const PROMO_DELAY_MS = 25_000;

const SALES_PAGES = new Set(["/", "/database", "/maagar", "/course", "/course-sales", "/guide", "/coaching", "/single-session", "/blog"]);
export function isNovemberPromoPage(path: string, now = Date.now()): boolean {
  return isNovemberBundleOfferActive(now) && (SALES_PAGES.has(path) || path.startsWith("/blog/"));
}
export function isNovemberPopupPage(path: string, now = Date.now()): boolean {
  return isNovemberBundleOfferActive(now) && (path === "/" || path === "/blog" || path.startsWith("/blog/"));
}
export function canShowNovemberPopup(path: string, lastSeen: string | null, sessionSeen: string | null, now = Date.now()): boolean {
  if (!isNovemberPopupPage(path, now) || sessionSeen === "1") return false;
  if (lastSeen === null) return true;
  const timestamp = Number(lastSeen);
  // Malformed/future storage fails closed; no repeated interruption.
  return Number.isFinite(timestamp) && timestamp > 0 && now - timestamp >= PROMO_COOLDOWN_MS;
}
export const NOVEMBER10_PRODUCTS = [
  { label: "מאגר ההיכרויות", href: "/join?coupon=NOVEMBER10", id: "database" },
  { label: "הקורס המלא שלי", href: "/course?coupon=NOVEMBER10", id: "course" },
  { label: "המדריך לבחור נכון", href: "/guide?coupon=NOVEMBER10", id: "guide" },
  { label: "פגישה אישית", href: "/single-session?coupon=NOVEMBER10", id: "session" },
  { label: "ליווי אישי", href: "/coaching?coupon=NOVEMBER10", id: "coaching" },
] as const;

/** Only recognize an explicitly selected onsite coupon. Never auto-discount a visitor. */
export function getSalesPromoCoupon(search: string): "NOVEMBER10" | "LOVE10" | "BACK10" | undefined {
  const code = new URLSearchParams(search).get("coupon")?.trim().toUpperCase();
  return code === "NOVEMBER10" || code === "LOVE10" || code === "BACK10" ? code : undefined;
}

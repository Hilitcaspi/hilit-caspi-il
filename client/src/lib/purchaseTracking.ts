export const PURCHASE_TRACKING_STORAGE_KEY = "pending_purchase_tracking_token";

export function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const prefix = `${name}=`;
  const row = document.cookie.split("; ").find(value => value.startsWith(prefix));
  if (!row) return undefined;
  try {
    return decodeURIComponent(row.slice(prefix.length));
  } catch {
    return row.slice(prefix.length);
  }
}

export function getMetaBrowserIdentifiers(): { fbp?: string; fbc?: string } {
  const fbp = readCookie("_fbp");
  const cookieFbc = readCookie("_fbc");
  if (cookieFbc) return { fbp, fbc: cookieFbc };

  const fbclid = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("fbclid")?.trim()
    : undefined;
  const fbc = fbclid && /^[A-Za-z0-9_-]{4,255}$/.test(fbclid)
    ? `fb.1.${Date.now()}.${fbclid}`
    : undefined;
  return { fbp, fbc };
}

export function rememberPurchaseTrackingToken(token?: string): void {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return;
  try {
    localStorage.setItem(PURCHASE_TRACKING_STORAGE_KEY, token);
  } catch {
    // The server-side CAPI event still records the verified Purchase.
  }
}

export function readPurchaseTrackingToken(): string | undefined {
  try {
    const token = localStorage.getItem(PURCHASE_TRACKING_STORAGE_KEY) || undefined;
    return token && /^[a-f0-9]{64}$/.test(token) ? token : undefined;
  } catch {
    return undefined;
  }
}

export function clearPurchaseTrackingToken(): void {
  try {
    localStorage.removeItem(PURCHASE_TRACKING_STORAGE_KEY);
  } catch {}
}


const SITE_BASE_URL = "https://hilitcaspi.com";
const STORAGE_PATH_PREFIX = "/manus-storage/";
const EMAIL_IMAGE_PATH_PREFIX = "/email-images/";

function normalizeStorageKey(value: string): string | null {
  const key = value.replace(/^\/+/, "").trim();
  if (!key || key.length > 1024 || key.includes("..") || /[\0\r\n]/.test(key)) return null;
  return key;
}

function encodeStorageKey(key: string): string {
  return key.split("/").map(segment => encodeURIComponent(segment)).join("/");
}

export function extractEmailStorageKey(photoUrl?: string | null): string | null {
  const raw = String(photoUrl || "").trim();
  if (!raw) return null;

  if (raw.startsWith(STORAGE_PATH_PREFIX)) {
    return normalizeStorageKey(raw.slice(STORAGE_PATH_PREFIX.length));
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      if (["hilitcaspi.com", "www.hilitcaspi.com"].includes(parsed.hostname.toLowerCase()) && parsed.pathname.startsWith(STORAGE_PATH_PREFIX)) {
        return normalizeStorageKey(decodeURIComponent(parsed.pathname.slice(STORAGE_PATH_PREFIX.length)));
      }
    } catch {
      return null;
    }
  }

  return null;
}

export function toEmailImageUrl(photoUrl?: string | null): string | undefined {
  const raw = String(photoUrl || "").trim();
  if (!raw) return undefined;

  const storageKey = extractEmailStorageKey(raw);
  if (storageKey) {
    return `${SITE_BASE_URL}${EMAIL_IMAGE_PATH_PREFIX}${encodeStorageKey(storageKey)}`;
  }

  if (/^https:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      if (!parsed.username && !parsed.password) return parsed.toString();
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export function extractEmailImageKeyFromPath(pathValue: string): string | null {
  try {
    return normalizeStorageKey(decodeURIComponent(pathValue));
  } catch {
    return null;
  }
}

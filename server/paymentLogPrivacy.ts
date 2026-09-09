export function getSafeEmailDomain(email?: string): string {
  const domain = email?.trim().toLowerCase().split("@")[1];
  return domain && /^[a-z0-9.-]+$/i.test(domain) ? domain : "unknown";
}

export function sanitizePaymentLogDetail(detail?: string): string {
  return (detail || "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\b(?:\+?972|0)5\d[\d\s()-]{7,}\b/g, "[phone]")
    .replace(/\b[A-Fa-f0-9]{24,}(?:%[A-Za-z0-9%+/=]+)?\b/g, "[token]")
    .slice(0, 200);
}


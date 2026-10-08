export type BoostEntryChannel = "email" | "personal_area" | "other" | "unknown";

/** Attribution is the tagged entry used for this action, not proof of causation. */
export function boostEntryChannelFromSearch(search: string): BoostEntryChannel {
  const params = new URLSearchParams(search);
  const source = (params.get("utm_source") || "").toLowerCase();
  const medium = (params.get("utm_medium") || "").toLowerCase();
  if (["email", "brevo", "newsletter"].includes(source) || ["email", "newsletter"].includes(medium) || (medium === "lifecycle" && source === "email")) return "email";
  if (source || medium) return "other";
  return "personal_area";
}

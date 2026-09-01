export const allowlistedManagementEmails = [
  "ofrivaturi@gmail.com",
] as const;

export function isAllowlistedManagementEmail(email: string | null | undefined) {
  return Boolean(email && allowlistedManagementEmails.includes(email.trim().toLowerCase() as (typeof allowlistedManagementEmails)[number]));
}

export function canManageSingleOfWeekApplications(
  user: { email?: string | null; role?: string | null } | null | undefined,
) {
  return user?.role === "admin" || isAllowlistedManagementEmail(user?.email);
}

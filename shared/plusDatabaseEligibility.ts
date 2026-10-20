/** A Plus payment or intent is never evidence of database membership. */
export function hasPaidDatabaseMembership(profile: {
  isPaid?: boolean | null;
  isActive?: boolean | null;
  isSeed?: boolean | null;
  market?: string | null;
} | null | undefined): boolean {
  return Boolean(profile?.isPaid === true && profile.isActive === true
    && profile.isSeed !== true && (profile.market == null || profile.market === "il"));
}

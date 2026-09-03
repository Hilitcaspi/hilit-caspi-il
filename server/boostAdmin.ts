export type BoostAdminState = "approved" | "needs_reconsent" | "invited" | "paused" | "opted_out" | "removed";

export type BoostAdminRow = {
  membershipStatus: string;
  consentVersion: string | null;
  algorithmicDisclosureAccepted: boolean;
  anonymousProfileAccepted: boolean;
  termsAccepted: boolean;
  pilotCohort: string | null;
  gender: string | null;
  isActive: boolean;
  isPaid: boolean;
};

export function getBoostAdminState(row: BoostAdminRow, currentConsentVersion: string): BoostAdminState {
  if (row.membershipStatus === "active") {
    const consentIsCurrent = row.consentVersion === currentConsentVersion
      && row.algorithmicDisclosureAccepted
      && row.anonymousProfileAccepted
      && row.termsAccepted;
    return consentIsCurrent ? "approved" : "needs_reconsent";
  }
  if (row.membershipStatus === "paused") return "paused";
  if (row.membershipStatus === "opted_out") return "opted_out";
  if (row.membershipStatus === "removed") return "removed";
  return "invited";
}

export function summarizeBoostMembers(rows: BoostAdminRow[], currentConsentVersion: string) {
  const counts = {
    total: rows.length,
    approved: 0,
    approvedCustomers: 0,
    testAccounts: 0,
    activePaidProfiles: 0,
    needsReconsent: 0,
    invited: 0,
    paused: 0,
    optedOut: 0,
    removed: 0,
    female: 0,
    male: 0,
  };

  for (const row of rows) {
    const state = getBoostAdminState(row, currentConsentVersion);
    if (state === "approved") {
      counts.approved += 1;
      const isTest = row.pilotCohort === "controlled_test";
      if (isTest) counts.testAccounts += 1;
      else counts.approvedCustomers += 1;
      if (row.isActive && row.isPaid) counts.activePaidProfiles += 1;
      if (row.gender === "female") counts.female += 1;
      if (row.gender === "male") counts.male += 1;
    } else if (state === "needs_reconsent") counts.needsReconsent += 1;
    else if (state === "paused") counts.paused += 1;
    else if (state === "opted_out") counts.optedOut += 1;
    else if (state === "removed") counts.removed += 1;
    else counts.invited += 1;
  }

  return counts;
}

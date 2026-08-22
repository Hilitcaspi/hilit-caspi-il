export function canEditTask(isAdmin: boolean, actorId: number | undefined, assignedTeamMemberId: number | null) {
  if (isAdmin) return true;
  if (!assignedTeamMemberId) return true;
  return Boolean(actorId && actorId === assignedTeamMemberId);
}

export function canAssignTask(isAdmin: boolean, actorId: number | undefined, requestedTeamMemberId: number | null | undefined) {
  if (isAdmin) return true;
  if (!requestedTeamMemberId) return true;
  return Boolean(actorId && actorId === requestedTeamMemberId);
}

export function buildPartnerTrackingUrl(type: string, code: string) {
  return `https://hilitcaspi.com/dna-quiz?utm_source=${encodeURIComponent(type)}&utm_medium=referral&utm_campaign=${encodeURIComponent(code)}`;
}

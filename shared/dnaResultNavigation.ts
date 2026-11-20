type DnaJoinContext = {
  dnaType: "leader" | "romantic" | "free_spirit" | "anchor";
  gender: "female" | "male";
  sessionId: string;
  freeToken?: string | null;
};

/** Preserve quiz continuity without putting contact details in the address bar. */
export function buildDnaJoinReturnHref({ dnaType, gender, sessionId, freeToken }: DnaJoinContext): string {
  const params = new URLSearchParams();
  if (freeToken) params.set("free_token", freeToken);
  params.set("dna", dnaType);
  params.set("gender", gender);
  params.set("session", sessionId);
  return `/join?${params.toString()}`;
}

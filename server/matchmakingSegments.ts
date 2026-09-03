type SegmentSingle = {
  id: number;
  sourceLabel?: string | null;
  productLabel?: string | null;
  religiosity?: string | null;
};

type SegmentMatch = {
  singleAId: number;
  singleBId: number;
  status?: string | null;
  approvedByA?: boolean | null;
  approvedByB?: boolean | null;
  matchDetailStatus?: string | null;
  returnedToPoolAt?: number | null;
};

const POSITIVE_OUTCOMES = new Set(["continuing", "together", "relationship", "engaged", "married"]);

function percentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function summarizeGroup(label: string, members: SegmentSingle[], matches: SegmentMatch[]) {
  const ids = new Set(members.map(member => member.id));
  let covered = 0;
  let mutual = 0;
  let positive = 0;
  for (const member of members) {
    const memberMatches = matches.filter(match => !match.returnedToPoolAt && (match.singleAId === member.id || match.singleBId === member.id));
    if (memberMatches.length > 0) covered += 1;
    if (memberMatches.some(match => match.status === "matched" || (match.approvedByA && match.approvedByB))) mutual += 1;
    if (memberMatches.some(match => POSITIVE_OUTCOMES.has(match.matchDetailStatus || ""))) positive += 1;
  }
  return {
    label,
    members: ids.size,
    covered,
    coverageRate: percentage(covered, ids.size),
    mutual,
    mutualRate: percentage(mutual, ids.size),
    positive,
    positiveRate: percentage(positive, ids.size),
  };
}

function groupBy(singles: SegmentSingle[], key: keyof Pick<SegmentSingle, "sourceLabel" | "productLabel" | "religiosity">) {
  const groups = new Map<string, SegmentSingle[]>();
  for (const single of singles) {
    const label = String(single[key] || "לא ידוע");
    groups.set(label, [...(groups.get(label) || []), single]);
  }
  return groups;
}

export function calculateOutcomeSegments(singles: SegmentSingle[], matches: SegmentMatch[]) {
  const summarize = (key: keyof Pick<SegmentSingle, "sourceLabel" | "productLabel" | "religiosity">) =>
    Array.from(groupBy(singles, key).entries())
      .map(([label, members]) => summarizeGroup(label, members, matches))
      .sort((a, b) => b.members - a.members || b.positiveRate - a.positiveRate)
      .slice(0, 12);
  return {
    bySource: summarize("sourceLabel"),
    byProduct: summarize("productLabel"),
    bySegment: summarize("religiosity"),
  };
}

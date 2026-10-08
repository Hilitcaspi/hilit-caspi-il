type UnsentMatchRow = {
  status: string;
  score: number | null;
  proposedAt: number | null;
  ownerApprovedAt: number | null;
  notes: string | null;
};

/** A failed hard-filter fallback created an unsent 0% pending row. It is not a proposal. */
export function isInvalidMatchPlaceholder(row: UnsentMatchRow): boolean {
  return row.status === "pending" && row.score === 0 &&
    row.proposedAt == null && row.ownerApprovedAt == null && row.notes == null;
}

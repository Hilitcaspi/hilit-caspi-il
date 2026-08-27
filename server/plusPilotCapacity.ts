export const PLUS_PILOT_LIMIT_PER_GENDER = 20;

export type PlusPilotGender = "female" | "male";

export type PlusPilotCapacityRow = {
  status: string;
  gender: string | null | undefined;
};

const RESERVED_STATUSES = new Set(["invited", "active"]);

export function isPlusPilotSlotReserved(status: string | null | undefined): boolean {
  return Boolean(status && RESERVED_STATUSES.has(status));
}

export function calculatePlusPilotCapacity(rows: PlusPilotCapacityRow[]) {
  const femaleReserved = rows.filter(row => row.gender === "female" && isPlusPilotSlotReserved(row.status)).length;
  const maleReserved = rows.filter(row => row.gender === "male" && isPlusPilotSlotReserved(row.status)).length;
  return {
    female: {
      reserved: femaleReserved,
      remaining: Math.max(0, PLUS_PILOT_LIMIT_PER_GENDER - femaleReserved),
      limit: PLUS_PILOT_LIMIT_PER_GENDER,
    },
    male: {
      reserved: maleReserved,
      remaining: Math.max(0, PLUS_PILOT_LIMIT_PER_GENDER - maleReserved),
      limit: PLUS_PILOT_LIMIT_PER_GENDER,
    },
  };
}

export function hasPlusPilotCapacity(rows: PlusPilotCapacityRow[], gender: string | null | undefined): boolean {
  if (gender !== "female" && gender !== "male") return false;
  return calculatePlusPilotCapacity(rows)[gender].remaining > 0;
}

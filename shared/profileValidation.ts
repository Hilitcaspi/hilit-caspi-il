const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function calculateAgeFromBirthDate(value: string, today = new Date()): number | null {
  const match = ISO_DATE_PATTERN.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) return null;

  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  let age = todayYear - year;
  if (todayMonth < month || (todayMonth === month && todayDay < day)) age -= 1;

  return Number.isInteger(age) && age >= 18 && age <= 120 ? age : null;
}

export function parseOptionalIntegerInRange(value: string, min: number, max: number): number | undefined {
  const normalized = value.trim();
  if (!normalized || !/^\d+$/.test(normalized)) return undefined;
  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : undefined;
}

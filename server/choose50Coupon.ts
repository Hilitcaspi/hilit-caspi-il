export const CHOOSE50_CODE = "CHOOSE50";
export const CHOOSE50_PRODUCT = "guide";
export const CHOOSE50_DISCOUNT_PERCENT = 50;
export const CHOOSE50_BASE_PRICE_AGOROT = 14_900;
export const CHOOSE50_PRICE_AGOROT = 7_450;
export const CHOOSE50_PRICE_ILS = CHOOSE50_PRICE_AGOROT / 100;

export type JerusalemDateTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
};

/** Converts an unambiguous Asia/Jerusalem civil time to a UTC Unix timestamp. */
export function jerusalemDateTimeToUtcMs(parts: JerusalemDateTime): number {
  const desired = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond,
  );
  let candidate = desired;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  for (let iteration = 0; iteration < 6; iteration += 1) {
    const local = Object.fromEntries(
      formatter
        .formatToParts(new Date(candidate))
        .filter(part => part.type !== "literal")
        .map(part => [part.type, part.value]),
    );
    const observed = Date.UTC(
      Number(local.year),
      Number(local.month) - 1,
      Number(local.day),
      Number(local.hour),
      Number(local.minute),
      Number(local.second),
      parts.millisecond,
    );
    const adjustment = desired - observed;
    candidate += adjustment;
    if (adjustment === 0) break;
  }

  return candidate;
}

export const CHOOSE50_START_AT = jerusalemDateTimeToUtcMs({
  year: 2026,
  month: 10,
  day: 26,
  hour: 0,
  minute: 0,
  second: 0,
  millisecond: 0,
});

export const CHOOSE50_END_AT = jerusalemDateTimeToUtcMs({
  year: 2026,
  month: 10,
  day: 31,
  hour: 23,
  minute: 59,
  second: 59,
  millisecond: 999,
});

export function isChoose50Product(product: string | null | undefined): boolean {
  return product === CHOOSE50_PRODUCT;
}

export function isChoose50ActiveAt(now = Date.now()): boolean {
  return now >= CHOOSE50_START_AT && now <= CHOOSE50_END_AT;
}

export type Choose50Validation =
  | {
      valid: true;
      code: typeof CHOOSE50_CODE;
      discountPercent: typeof CHOOSE50_DISCOUNT_PERCENT;
      fixedPrice: typeof CHOOSE50_PRICE_ILS;
      priceAgorot: typeof CHOOSE50_PRICE_AGOROT;
    }
  | { valid: false; error: string };

/**
 * Product/window validation for the dedicated promotion. It deliberately
 * returns a 74.50 ILS fixed price alongside the 50% discount so consumers of
 * the helper do not round a half-shekel amount to a whole shekel.
 */
export function validateChoose50Coupon(input: {
  code: string | null | undefined;
  product: string | null | undefined;
  now?: number;
}): Choose50Validation {
  if (input.code?.trim().toUpperCase() !== CHOOSE50_CODE) {
    return { valid: false, error: "קוד קופון לא נמצא" };
  }
  if (!isChoose50Product(input.product)) {
    return { valid: false, error: "קוד Choose50 תקף למדריך ׳לבחור נכון׳ בלבד" };
  }
  const now = input.now ?? Date.now();
  if (now < CHOOSE50_START_AT) {
    return { valid: false, error: "קוד Choose50 עדיין אינו בתוקף" };
  }
  if (now > CHOOSE50_END_AT) {
    return { valid: false, error: "קוד Choose50 פג תוקף" };
  }
  return {
    valid: true,
    code: CHOOSE50_CODE,
    discountPercent: CHOOSE50_DISCOUNT_PERCENT,
    fixedPrice: CHOOSE50_PRICE_ILS,
    priceAgorot: CHOOSE50_PRICE_AGOROT,
  };
}

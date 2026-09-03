/**
 * Israeli Cities Database
 * Coordinates: WGS84 lat/lng
 * socioEconomic: 1 (low) – 10 (high), based on CBS Israel cluster index
 * religiousProfile: estimated % traditional/religious/orthodox residents
 * region: geographic region for fallback grouping
 */

export type CityData = {
  lat: number;
  lng: number;
  socioEconomic: number;   // 1–10 (CBS cluster)
  religiousRatio: number;  // 0–1 (fraction of non-secular residents)
  region: "center" | "north" | "south" | "jerusalem" | "sharon" | "shfela";
};

export const CITY_DB: Record<string, CityData> = {
  // ── Greater Tel Aviv ──────────────────────────────────────────────────────
  "תל אביב":          { lat: 32.0853, lng: 34.7818, socioEconomic: 9,  religiousRatio: 0.15, region: "center" },
  "תל אביב-יפו":      { lat: 32.0853, lng: 34.7818, socioEconomic: 9,  religiousRatio: 0.15, region: "center" },
  "רמת גן":           { lat: 32.0681, lng: 34.8238, socioEconomic: 8,  religiousRatio: 0.20, region: "center" },
  "גבעתיים":          { lat: 32.0694, lng: 34.8117, socioEconomic: 9,  religiousRatio: 0.12, region: "center" },
  "בני ברק":          { lat: 32.0833, lng: 34.8333, socioEconomic: 4,  religiousRatio: 0.92, region: "center" },
  "פתח תקווה":        { lat: 32.0869, lng: 34.8878, socioEconomic: 7,  religiousRatio: 0.30, region: "center" },
  "ראשון לציון":      { lat: 31.9730, lng: 34.7925, socioEconomic: 7,  religiousRatio: 0.25, region: "center" },
  "חולון":            { lat: 32.0167, lng: 34.7667, socioEconomic: 6,  religiousRatio: 0.22, region: "center" },
  "בת ים":            { lat: 32.0167, lng: 34.7500, socioEconomic: 5,  religiousRatio: 0.25, region: "center" },
  "אור יהודה":        { lat: 32.0278, lng: 34.8556, socioEconomic: 6,  religiousRatio: 0.28, region: "center" },
  "יהוד":             { lat: 32.0333, lng: 34.8833, socioEconomic: 7,  religiousRatio: 0.22, region: "center" },
  "קריית אונו":       { lat: 32.0606, lng: 34.8561, socioEconomic: 8,  religiousRatio: 0.18, region: "center" },
  "גן יבנה":          { lat: 31.7833, lng: 34.7167, socioEconomic: 7,  religiousRatio: 0.35, region: "center" },
  "אזור":             { lat: 31.9833, lng: 34.8000, socioEconomic: 6,  religiousRatio: 0.25, region: "center" },

  // ── Sharon ────────────────────────────────────────────────────────────────
  "הרצליה":           { lat: 32.1663, lng: 34.8436, socioEconomic: 9,  religiousRatio: 0.15, region: "sharon" },
  "רעננה":            { lat: 32.1847, lng: 34.8706, socioEconomic: 9,  religiousRatio: 0.18, region: "sharon" },
  "כפר סבא":          { lat: 32.1753, lng: 34.9069, socioEconomic: 8,  religiousRatio: 0.20, region: "sharon" },
  "הוד השרון":        { lat: 32.1500, lng: 34.8833, socioEconomic: 8,  religiousRatio: 0.20, region: "sharon" },
  "נתניה":            { lat: 32.3328, lng: 34.8600, socioEconomic: 6,  religiousRatio: 0.30, region: "sharon" },
  "רמת השרון":        { lat: 32.1469, lng: 34.8392, socioEconomic: 9,  religiousRatio: 0.14, region: "sharon" },
  "כפר יונה":         { lat: 32.3167, lng: 34.9333, socioEconomic: 7,  religiousRatio: 0.28, region: "sharon" },
  "טייבה":            { lat: 32.2667, lng: 35.0000, socioEconomic: 4,  religiousRatio: 0.95, region: "sharon" },
  "אלקנה":            { lat: 32.1167, lng: 35.0167, socioEconomic: 8,  religiousRatio: 0.70, region: "sharon" },

  // ── Jerusalem area ────────────────────────────────────────────────────────
  "ירושלים":          { lat: 31.7683, lng: 35.2137, socioEconomic: 5,  religiousRatio: 0.65, region: "jerusalem" },
  "מעלה אדומים":      { lat: 31.7731, lng: 35.2981, socioEconomic: 7,  religiousRatio: 0.45, region: "jerusalem" },
  "בית שמש":          { lat: 31.7500, lng: 34.9833, socioEconomic: 5,  religiousRatio: 0.60, region: "jerusalem" },
  "מודיעין":          { lat: 31.8969, lng: 35.0103, socioEconomic: 9,  religiousRatio: 0.25, region: "jerusalem" },
  "מודיעין עילית":    { lat: 31.9333, lng: 35.0500, socioEconomic: 3,  religiousRatio: 0.99, region: "jerusalem" },
  "ביתר עילית":       { lat: 31.6944, lng: 35.1153, socioEconomic: 3,  religiousRatio: 0.99, region: "jerusalem" },
  "אבו גוש":          { lat: 31.8053, lng: 35.1111, socioEconomic: 5,  religiousRatio: 0.90, region: "jerusalem" },

  // ── Shfela / South ────────────────────────────────────────────────────────
  "רחובות":           { lat: 31.8928, lng: 34.8114, socioEconomic: 7,  religiousRatio: 0.25, region: "shfela" },
  "נס ציונה":         { lat: 31.9308, lng: 34.7978, socioEconomic: 8,  religiousRatio: 0.20, region: "shfela" },
  "לוד":              { lat: 31.9500, lng: 34.8833, socioEconomic: 4,  religiousRatio: 0.40, region: "shfela" },
  "רמלה":             { lat: 31.9333, lng: 34.8667, socioEconomic: 4,  religiousRatio: 0.45, region: "shfela" },
  "יבנה":             { lat: 31.8764, lng: 34.7444, socioEconomic: 6,  religiousRatio: 0.30, region: "shfela" },
  "אשדוד":            { lat: 31.8044, lng: 34.6553, socioEconomic: 6,  religiousRatio: 0.35, region: "south" },
  "אשקלון":           { lat: 31.6658, lng: 34.5664, socioEconomic: 5,  religiousRatio: 0.30, region: "south" },
  "קריית גת":         { lat: 31.6100, lng: 34.7642, socioEconomic: 5,  religiousRatio: 0.35, region: "south" },
  "באר שבע":          { lat: 31.2530, lng: 34.7915, socioEconomic: 5,  religiousRatio: 0.25, region: "south" },
  "אילת":             { lat: 29.5581, lng: 34.9482, socioEconomic: 6,  religiousRatio: 0.15, region: "south" },
  "דימונה":           { lat: 31.0686, lng: 35.0317, socioEconomic: 3,  religiousRatio: 0.30, region: "south" },
  "נתיבות":           { lat: 31.4197, lng: 34.5883, socioEconomic: 3,  religiousRatio: 0.55, region: "south" },
  "שדרות":            { lat: 31.5236, lng: 34.5961, socioEconomic: 4,  religiousRatio: 0.40, region: "south" },
  "אופקים":           { lat: 31.3119, lng: 34.6228, socioEconomic: 3,  religiousRatio: 0.45, region: "south" },

  // ── North ─────────────────────────────────────────────────────────────────
  "חיפה":             { lat: 32.7940, lng: 34.9896, socioEconomic: 6,  religiousRatio: 0.25, region: "north" },
  "קריית אתא":        { lat: 32.8000, lng: 35.1000, socioEconomic: 5,  religiousRatio: 0.28, region: "north" },
  "קריית ביאליק":     { lat: 32.8333, lng: 35.0833, socioEconomic: 6,  religiousRatio: 0.22, region: "north" },
  "קריית מוצקין":     { lat: 32.8333, lng: 35.0667, socioEconomic: 5,  religiousRatio: 0.25, region: "north" },
  "קריית ים":         { lat: 32.8500, lng: 35.0667, socioEconomic: 4,  religiousRatio: 0.28, region: "north" },
  "עכו":              { lat: 32.9236, lng: 35.0686, socioEconomic: 4,  religiousRatio: 0.50, region: "north" },
  "נהריה":            { lat: 33.0069, lng: 35.0981, socioEconomic: 6,  religiousRatio: 0.22, region: "north" },
  "כרמיאל":           { lat: 32.9167, lng: 35.3000, socioEconomic: 6,  religiousRatio: 0.20, region: "north" },
  "נצרת":             { lat: 32.7000, lng: 35.3000, socioEconomic: 4,  religiousRatio: 0.95, region: "north" },
  "נצרת עילית":       { lat: 32.7000, lng: 35.3167, socioEconomic: 5,  religiousRatio: 0.25, region: "north" },
  "עפולה":            { lat: 32.6078, lng: 35.2897, socioEconomic: 4,  religiousRatio: 0.30, region: "north" },
  "בית שאן":          { lat: 32.5000, lng: 35.5000, socioEconomic: 3,  religiousRatio: 0.30, region: "north" },
  "טבריה":            { lat: 32.7922, lng: 35.5311, socioEconomic: 4,  religiousRatio: 0.35, region: "north" },
  "צפת":              { lat: 32.9647, lng: 35.4961, socioEconomic: 3,  religiousRatio: 0.55, region: "north" },
  "קצרין":            { lat: 32.9833, lng: 35.6833, socioEconomic: 6,  religiousRatio: 0.20, region: "north" },
  "מגדל העמק":        { lat: 32.6833, lng: 35.2333, socioEconomic: 4,  religiousRatio: 0.28, region: "north" },
  "יוקנעם":           { lat: 32.6583, lng: 35.1083, socioEconomic: 7,  religiousRatio: 0.22, region: "north" },
  "זכרון יעקב":       { lat: 32.5667, lng: 34.9500, socioEconomic: 8,  religiousRatio: 0.18, region: "north" },
  "פרדס חנה":         { lat: 32.4667, lng: 34.9667, socioEconomic: 6,  religiousRatio: 0.25, region: "north" },
  "חדרה":             { lat: 32.4333, lng: 34.9167, socioEconomic: 6,  religiousRatio: 0.28, region: "north" },

  // ── West Bank settlements (included for completeness) ─────────────────────
  "אריאל":            { lat: 32.1000, lng: 35.1667, socioEconomic: 6,  religiousRatio: 0.35, region: "center" },
  "מעלה אפרים":       { lat: 32.1500, lng: 35.3667, socioEconomic: 6,  religiousRatio: 0.45, region: "center" },
  "אפרת":             { lat: 31.6583, lng: 35.1583, socioEconomic: 8,  religiousRatio: 0.60, region: "jerusalem" },
};

/**
 * Haversine distance between two lat/lng points, returns km.
 */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Location score (0–100) based on haversine distance.
 * Bonus/penalty applied for socioeconomic and religious profile alignment.
 */
export function scoreLocation(
  cityA: string | null | undefined,
  cityB: string | null | undefined,
  locationPrefA?: string | null,
  locationPrefB?: string | null,
  religiosityA?: string | null,
  religiosityB?: string | null
): { score: number; distanceKm: number | null; notes: string[] } {
  const notes: string[] = [];

  // Both "anywhere" → full score
  if (locationPrefA === "anywhere" && locationPrefB === "anywhere") {
    return { score: 100, distanceKm: null, notes: ["שניהם פתוחים לכל מרחק"] };
  }

  const dataA = cityA ? CITY_DB[cityA] : null;
  const dataB = cityB ? CITY_DB[cityB] : null;

  // No city data → neutral
  if (!dataA || !dataB) {
    return { score: 55, distanceKm: null, notes: [] };
  }

  const km = haversineKm(dataA.lat, dataA.lng, dataB.lat, dataB.lng);

  // Base distance score
  let base: number;
  if (km <= 5)        base = 100;
  else if (km <= 15)  base = 90;
  else if (km <= 30)  base = 75;
  else if (km <= 50)  base = 58;
  else if (km <= 80)  base = 38;
  else if (km <= 120) base = 20;
  else                base = 5;

  // Preference adjustment
  if (locationPrefA === "close" && km > 30) base = Math.min(base, 30);
  if (locationPrefB === "close" && km > 30) base = Math.min(base, 30);
  if (locationPrefA === "anywhere" || locationPrefB === "anywhere") base = Math.max(base, 50);

  // ── City inference bonuses ─────────────────────────────────────────────────
  let bonus = 0;

  // Socioeconomic alignment (±5 pts)
  const seDiff = Math.abs(dataA.socioEconomic - dataB.socioEconomic);
  if (seDiff <= 1) {
    bonus += 5;
    notes.push("רמה סוציואקונומית דומה");
  } else if (seDiff >= 4) {
    bonus -= 5;
    notes.push("פער סוציואקונומי משמעותי בין הערים");
  }

  // Religious profile alignment (±5 pts)
  // Only apply if we don't already have explicit religiosity data
  if (!religiosityA || !religiosityB) {
    const relDiff = Math.abs(dataA.religiousRatio - dataB.religiousRatio);
    if (relDiff <= 0.15) {
      bonus += 5;
      notes.push("אווירה דתית דומה בשתי הערים");
    } else if (relDiff >= 0.40) {
      bonus -= 5;
      notes.push("פער דתי-תרבותי בין הערים");
    }
  }

  // Same region bonus (+3 pts)
  if (dataA.region === dataB.region && km > 5) {
    bonus += 3;
    notes.push(`שניהם מאזור ה${regionLabel(dataA.region)}`);
  }

  const final = Math.max(0, Math.min(100, base + bonus));
  return { score: final, distanceKm: Math.round(km), notes };
}

function regionLabel(r: string): string {
  const map: Record<string, string> = {
    center: "מרכז", north: "צפון", south: "דרום",
    jerusalem: "ירושלים", sharon: "שרון", shfela: "שפלה",
  };
  return map[r] ?? r;
}

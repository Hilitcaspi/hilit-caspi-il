import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { attractionChapters } from "../shared/attractionGuideContent";
import { attractionEntryHref, attractionHref, ATTRACTION_CAMPAIGN } from "../shared/attractionFunnel";
import { captureAcquisition, getFirstTouchAcquisition, getLastUtmAcquisition } from "../client/src/lib/acquisitionTracking";

const page = readFileSync("client/src/pages/AttractionGuide.tsx", "utf8");
const app = readFileSync("client/src/App.tsx", "utf8");
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else delete (globalThis as { window?: unknown }).window;
  if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
  else delete (globalThis as { document?: unknown }).document;
});

const allContent = attractionChapters.flatMap(chapter => [chapter.title, chapter.kicker, ...chapter.paragraphs, chapter.scene, chapter.script, chapter.exercise, chapter.takeaway, ...(chapter.clinicCase?.paragraphs ?? []), ...chapter.links.flatMap(link => [link.text, link.label])]).join(" ");

describe("attraction guide content and funnel", () => {
  it("has four complete original chapters with concrete examples and actions", () => {
    expect(attractionChapters).toHaveLength(4);
    expect(new Set(attractionChapters.map(chapter => chapter.id)).size).toBe(4);
    for (const chapter of attractionChapters) {
      expect(chapter.paragraphs.length).toBeGreaterThanOrEqual(3);
      for (const field of [chapter.title, chapter.scene, chapter.script, chapter.exercise, chapter.takeaway]) expect(field.length).toBeGreaterThan(15);
      expect(chapter.links.length).toBeGreaterThanOrEqual(1);
    }
  });
  it("retains the requested personal quote without adjacent disclaimer", () => {
    const heading = page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<br\s*\/>/g, " ").replace(/<[^>]+>/g, "");
    expect(heading).toBe("״אין גבר שרציתי ולא השגתי.״");
    const hero = page.slice(page.indexOf("<header"), page.indexOf("</header>"));
    expect(hero).toContain("לא כי אני הכי יפה. לא כי אני הכי צעירה. לא כי אני הכי אטרקטיבית.");
    expect(hero).not.toMatch(/לא הבטחה|החוויה האישית|להתעלם מסירוב|דיסקליימר/);
  });
  it("removes the old guide title and redundant read button while preserving keyboard access", () => {
    expect(page + allContent).not.toContain("שיבושי החשיבה");
    expect(page).not.toContain("לקריאת המדריך החינמי");
    expect(page).toContain("תני לו לרצות אותך. בלי להפסיק להיות את.");
    expect(page).toContain("דילוג לתוכן");
    expect(page).toContain('id="guide"');
    const body = page.slice(page.indexOf("<main>"), page.indexOf("</main>"));
    expect(body).not.toMatch(/py-20|py-14|text-8xl/);
    expect(page + allContent).not.toMatch(/[—–]|[\u0590-\u05ff]\/[\u0590-\u05ff]/);
    expect(page).toContain("לבחור נכון");
  });
  it("shows interest on dates but leaves room for his initiative rather than sending first", () => {
    expect(allContent).toContain("בתחילת היכרות, אני מעדיפה לתת לו ליזום");
    expect(allContent).toContain("שיתקשר. שיציע להיפגש. שיבחר מקום");
    expect(allContent).toContain("ואם נוח לך, גם שיציע לאסוף אותך");
    expect(attractionChapters[0].scene).toContain("במקום לשלוח הודעת סיכום");
    expect(allContent).not.toMatch(/אפשר לשלוח ״היה לי ממש כיף|עשר הודעות ברצף/);
    expect(allContent).toContain("העצמאות שלך לא נועדה לגרום לו לרדוף");
    expect(allContent).toContain("גבול לא דורש ריב, הסברים ארוכים או עונש");
  });
  it("uses only the supplied anonymized clinic example without inventing outcome or message quotation", () => {
    const cases = attractionChapters.filter(chapter => chapter.clinicCase).map(chapter => chapter.clinicCase!);
    expect(cases).toHaveLength(1);
    const story = cases[0].paragraphs.join(" ");
    expect(story).toContain("השבוע אחת הנשים שאני מלווה, בתחילתו של קשר");
    expect(story).toContain("לא התקשר בתדירות שציפתה");
    expect(story).toContain("הודעה שהיא לא מעוניינת");
    expect(story).toContain("סבלנות היא לא לחכות ליד הטלפון");
    expect(story).not.toMatch(/״|בת \d+|דייטים? \d+|חזר אליה|הם ביחד|שלח לה פרחים|@|\+972/);
    expect(page).toContain("data-guide-clinic-case");
    expect(page).toContain("כשכבר נבנתה היכרות, אפשר לומר");
  });
  it("connects positive psychology strengths to an action without diagnostic or scientific promises", () => {
    expect(allContent).toContain("בחרי איכות אחת שאת אוהבת בעצמך");
    expect(allContent).toContain("הפסיכולוגיה החיובית שאני משלבת בליווי");
    expect(allContent).toContain("גבוה, מצליח, כריזמטי");
    expect(allContent).toContain("הקשבה? חום?");
    expect(page + allContent).not.toMatch(/מחקרים מוכיחים|מובטח שכל גבר|עקרון המשיכה מספר|100 עקרונות/);
  });
  it("keeps mutual choice and realistic database terms, not unrestricted access or promised thousands of suitable men", () => {
    expect(allContent).toContain("אם הוא לא בעניין, אני לא מתווכחת עם זה. אני ממשיכה.");
    expect(page).toContain("פרטי הקשר נחשפים רק לאחר אישור הדדי");
    expect(page).toContain("אין התחייבות למספר התאמות, לתדירות או לתוצאה");
    expect(page).toContain("המדריך החינמי אינו מקנה חברות במאגר");
    expect(page + allContent).not.toMatch(/אלפי גברים שמתאימים לך|גישה חופשית לכל|כולם מתאימים לך/);
  });
  it("offers DNA, paid guide and database in context using distinct placements", () => {
    const links = attractionChapters.flatMap(chapter => chapter.links);
    expect(links.map(link => link.destination)).toEqual(["guide", "dna", "database", "dna", "guide"]);
    const contents = links.map(link => new URL(attractionHref(link.destination, link.placement), "https://hilitcaspi.com").searchParams.get("utm_content"));
    expect(new Set(contents).size).toBe(5);
    expect(links.filter(link => link.destination === "dna").every(link => link.label.includes("חינמי"))).toBe(true);
    expect(links.filter(link => link.destination === "guide").every(link => link.label.includes("בתשלום"))).toBe(true);
    expect(page).toContain("attractionHref(link.destination, link.placement)");
    expect(page).toContain("clicked(link.destination, link.placement)");
    expect(page).toContain("data-guide-placement={link.placement}");
  });
  it("opens without a lead gate, outbound messages or checkout", () => {
    expect(page).not.toMatch(/leads\.submit|startJourney|useMutation|GrowWallet|trackLead|trackPurchase|type="email"/);
    expect(page).toContain('data-guide-cta="database"');
    expect(page).toContain('data-guide-cta="paid-guide"');
  });
  it("uses an isolated lazy Israeli route and leaves signs in place", () => {
    expect(app).toContain('path={"/attraction"} component={AttractionGuide}');
    expect(app).toContain('path={"/signs"} component={SignsGuide}');
  });
  it("gates guide events and Meta view behind an explicit choice", () => {
    expect(page).toContain('>("undecided")');
    expect(page.match(/if \(measurement !== "allowed"\) return;/g)).toHaveLength(2);
    expect(page).toContain('setMeasurement("declined")');
    expect(page).toContain("observer.disconnect()");
    expect(page).not.toMatch(/email:|phone:|token:|leadId:/);
  });
  it.each(["database", "guide", "dna", "community"] as const)("tags %s as an internal touch without personal fields", destination => {
    const url = new URL(attractionHref(destination, "test"), "https://hilitcaspi.com");
    expect(url.searchParams.get("utm_source")).toBe("website");
    expect(url.searchParams.get("utm_medium")).toBe("onsite");
    expect(url.searchParams.get("utm_campaign")).toBe(ATTRACTION_CAMPAIGN);
    expect(url.searchParams.get("utm_content")).toBe(`${destination}_test`);
    expect([...url.searchParams.keys()]).not.toEqual(expect.arrayContaining(["email", "phone", "token"]));
    if (destination === "community") expect(url.searchParams.get("mode")).toBe("gi_t");
  });
  it.each(["instagram", "facebook", "youtube", "whatsapp"] as const)("makes a distinct public %s entry link", source => {
    const url = new URL(attractionEntryHref(source, "podcast_video"));
    expect(url.pathname).toBe("/attraction");
    expect(url.searchParams.get("utm_source")).toBe(source);
    expect(url.searchParams.get("utm_medium")).toBe(source === "whatsapp" ? "community" : "organic_social");
  });
  it.each(attractionChapters.flatMap(chapter => chapter.links))("retains external acquisition through inline $destination $placement", link => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
    const entry = new URL(attractionEntryHref("instagram", "podcast_reel"));
    const location = { hostname: "hilitcaspi.com", pathname: entry.pathname, search: entry.search };
    Object.defineProperty(globalThis, "window", { configurable: true, value: { location, sessionStorage: storage, localStorage: storage } });
    Object.defineProperty(globalThis, "document", { configurable: true, value: { referrer: "" } });
    captureAcquisition(1000);
    const first = getFirstTouchAcquisition();
    const internal = new URL(attractionHref(link.destination, link.placement), "https://hilitcaspi.com");
    location.pathname = internal.pathname;
    location.search = internal.search;
    captureAcquisition(2000);
    expect(getFirstTouchAcquisition()).toEqual(first);
    expect(first?.utmSource).toBe("instagram");
    expect(getLastUtmAcquisition()).toMatchObject({ utmSource: "website", utmMedium: "onsite", utmCampaign: ATTRACTION_CAMPAIGN, utmContent: `${link.destination}_${link.placement}` });
  });
});

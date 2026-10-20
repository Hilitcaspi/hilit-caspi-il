import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { attractionChapters, attractionIntro } from "../shared/attractionGuideContent";
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

const blocks = attractionChapters.flatMap(chapter => chapter.blocks);
const links = blocks.filter(block => block.kind === "link");
const allContent = [...attractionIntro, ...attractionChapters.map(chapter => chapter.title), ...blocks.flatMap(block => block.kind === "clinic" ? [block.title, ...block.paragraphs] : block.kind === "link" ? [block.text, block.label] : [block.text])].join(" ");
const article = page.slice(page.indexOf('<article id="guide"'), page.indexOf("</article>"));

function captureNavigation(href: string) {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
  const entry = new URL(attractionEntryHref("instagram", "podcast_reel"));
  const location = { hostname: "hilitcaspi.com", pathname: entry.pathname, search: entry.search };
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location, sessionStorage: storage, localStorage: storage } });
  Object.defineProperty(globalThis, "document", { configurable: true, value: { referrer: "" } });
  captureAcquisition(1000);
  const first = getFirstTouchAcquisition();
  const internal = new URL(href, "https://hilitcaspi.com");
  location.pathname = internal.pathname;
  location.search = internal.search;
  captureAcquisition(2000);
  expect(getFirstTouchAcquisition()).toEqual(first);
  expect(first?.utmSource).toBe("instagram");
  return getLastUtmAcquisition();
}

describe("attraction editorial guide and funnel", () => {
  it("has one narrative with four ordered sections rather than repeated lesson modules", () => {
    expect(attractionIntro).toHaveLength(2);
    expect(attractionChapters.map(chapter => chapter.id)).toEqual(["audition", "certainty", "boundaries", "choosing"]);
    expect(page.match(/<article\b/g)).toHaveLength(1);
    expect(article).toContain("data-guide-section");
    expect(article).toContain("chapter.blocks.map");
    for (const chapter of attractionChapters) {
      expect(chapter.blocks.length).toBeGreaterThanOrEqual(5);
      expect(chapter).not.toHaveProperty("scene");
      expect(chapter).not.toHaveProperty("exercise");
      expect(chapter).not.toHaveProperty("script");
      expect(chapter).not.toHaveProperty("takeaway");
    }
    expect(article).not.toMatch(/rounded-|bg-\[|grid|תכלס|נסי את זה|אפשר לומר|מה לקחת/);
    expect(blocks.filter(block => block.kind === "quote")).toHaveLength(2);
  });
  it("uses a single author-observer voice rather than alternating reader instructions and examples", () => {
    expect(attractionIntro[0]).toContain("אחרי דייט טוב");
    expect(attractionIntro[0]).toContain("בעיניי");
    expect(attractionIntro[1]).toContain("כשאמרתי בפודקאסט");
    expect(attractionIntro[1]).toContain("בין לרצות אדם לבין להזדקק לאישור שלו");
    expect(allContent + page).not.toMatch(/תני לו|תשאירי|חייכי|תהיי|תעשי|תצחקי|תספרי|שאלי את עצמך|בואי נדבר|בעינייך|ההומור שלך|פנויה ורוצה/);
    expect(attractionChapters.every(chapter => !chapter.title.includes("?") || chapter.id === "boundaries")).toBe(true);
  });
  it("retains the requested personal quote without adjacent disclaimer", () => {
    const heading = page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<br\s*\/>/g, " ").replace(/<[^>]+>/g, "");
    expect(heading).toBe("״אין גבר שרציתי ולא השגתי.״");
    const hero = page.slice(page.indexOf("<header"), page.indexOf("</header>"));
    expect(hero).toContain("לא כי אני הכי יפה. לא כי אני הכי צעירה. לא כי אני הכי אטרקטיבית.");
    expect(hero).not.toMatch(/לא הבטחה|החוויה האישית|להתעלם מסירוב|דיסקליימר/);
  });
  it("has accessible, readable, non-collapsed article content and a compact mobile portrait", () => {
    expect(page).toContain("דילוג לתוכן");
    expect(page).toContain('id="guide"');
    expect(page).toContain('lang="he"');
    expect(article).toContain("max-w-[47rem]");
    expect(article).toContain("text-[17px]");
    expect(article).toContain("leading-[1.95]");
    expect(article).not.toMatch(/Accordion|<details|py-20|py-14|text-8xl/);
    expect(page).toContain("h-24 w-24");
    expect(page + allContent).not.toMatch(/שיבושי החשיבה|לקריאת המדריך החינמי|[—–]|[\u0590-\u05ff]\/[\u0590-\u05ff]/);
  });
  it("connects the end of each section to the subject of the next", () => {
    expect(attractionIntro.join(" ")).toContain("המקום שנותר לצד השני להתקרב");
    expect(attractionChapters[0].blocks.at(-1)).toMatchObject({ kind: "paragraph", text: expect.stringContaining("קשה לשאת את סימן השאלה") });
    expect(attractionChapters[1].blocks.at(-1)).toMatchObject({ kind: "paragraph", text: expect.stringContaining("לחזור לערב שכבר היה לנו") });
    expect(attractionChapters[2].blocks.at(-1)).toMatchObject({ kind: "paragraph", text: expect.stringContaining("אם בכלל נכון לבחור בו") });
  });
  it("shows warmth on dates, his initiative and ordinary autonomy without threats or fabricated unavailability", () => {
    expect(allContent).toContain("לתת לגבר ליזום");
    expect(allContent).toContain("להתקשר, להציע פגישה, לתכנן אותה");
    expect(allContent).toContain("אם זה נוח לשני הצדדים, גם להציע לאסוף");
    expect(allContent).toContain("אפשר להיות חמה ונוכחת");
    expect(allContent).toContain("אין בעיניי טעם לחשב כמה דקות לחכות לפני תשובה");
    expect(allContent).toContain("כשההיכרות מתקדמת, אפשר לדבר בפשטות");
    expect(allContent).toContain("אינה הסכמה לחוסר יחס מתמשך");
    expect(allContent).not.toMatch(/שלחי לו ראשונה|העמידי פנים|תגרמי לו לקנא/);
  });
  it("uses exactly the supplied anonymous clinic case without invented dialogue, identity or outcome", () => {
    const cases = blocks.filter(block => block.kind === "clinic");
    expect(cases).toHaveLength(1);
    const story = cases[0].paragraphs.join(" ");
    expect(cases[0].title).toContain("השבוע");
    expect(cases[0].title).toContain("אחת הנשים שאני מלווה");
    expect(story).toContain("היא הייתה בתחילתו של קשר");
    expect(story).toContain("לא התקשר בתדירות שציפתה");
    expect(story).toContain("הודעה שהיא לא מעוניינת");
    expect(story).not.toMatch(/״|בת \d+|דייטים? \d+|חזר אליה|הם ביחד|שלח לה פרחים|@|\+972/);
    expect(page).toContain("data-guide-clinic-case");
  });
  it("includes concrete everyday action and strengths without diagnostic or scientific promises", () => {
    expect(allContent).toContain("נקבע ערב עם חברה");
    expect(allContent).toContain("כלים מהפסיכולוגיה החיובית");
    expect(allContent).toContain("הומור, חום, סקרנות ותעוזה");
    expect(page + allContent).not.toMatch(/מחקרים מוכיחים|מובטח שכל גבר|עקרון המשיכה מספר|100 עקרונות/);
  });
  it("keeps mutual choice and realistic database terms", () => {
    expect(allContent).toContain("אם הוא לא בעניין, אני ממשיכה");
    expect(allContent).toContain("אין לי צורך לשכנע מישהו לרצות את מה שאינו רוצה");
    expect(page).toContain("פרטי הקשר נחשפים רק לאחר אישור הדדי");
    expect(page).toContain("אין התחייבות למספר התאמות, לתדירות או לתוצאה");
    expect(page).toContain("המדריך החינמי אינו מקנה חברות במאגר");
    expect(page + allContent).not.toMatch(/אלפי גברים שמתאימים לך|גישה חופשית לכל|כולם מתאימים לך/);
  });
  it("uses only two natural inline invitations and never suggests new matches within an existing relationship", () => {
    expect(links.map(link => link.destination)).toEqual(["dna", "guide"]);
    expect(links.map(link => link.placement)).toEqual(["chapter_2", "chapter_4"]);
    expect(links[0].text).toContain("לפני קשר או בתוך קשר");
    expect(links[0].label).toContain("חינמי");
    expect(links[1].label).toContain("בתשלום");
    expect(article).not.toMatch(/attractionHref\("database"|data-guide-cta="database"/);
    const understanding = page.slice(page.indexOf('data-guide-path="self-understanding"'), page.indexOf('data-guide-path="new-relationship"'));
    expect(understanding).toContain("לפני קשר או בתוך קשר");
    expect(understanding).toContain('attractionHref("dna", "self_understanding")');
    expect(understanding).not.toContain('attractionHref("database"');
    const newRelationship = page.slice(page.indexOf('data-guide-path="new-relationship"'), page.indexOf("</main>"));
    expect(newRelationship).toContain("לקראת היכרות חדשה");
    expect(newRelationship).toContain("אם אין כרגע קשר זוגי");
    expect(newRelationship).toContain("להכיר אדם מתאים וליישם את הדברים שעליהם כתבתי");
    expect(newRelationship).toContain('attractionHref("database", "main")');
  });
  it("opens without lead gate, outbound messages or checkout", () => {
    expect(page).not.toMatch(/leads\.submit|startJourney|useMutation|GrowWallet|trackLead|trackPurchase|type="email"/);
    expect(page).toContain('data-guide-cta="database"');
    expect(page).toContain('data-guide-cta="paid-guide"');
  });
  it("keeps the existing Israeli route and signs guide", () => {
    expect(app).toContain('path={"/attraction"} component={AttractionGuide}');
    expect(app).toContain('path={"/signs"} component={SignsGuide}');
  });
  it("gates guide events and Meta view behind explicit choice with disconnect on cleanup", () => {
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
  it.each(links)("retains acquisition through inline $destination $placement", link => {
    expect(captureNavigation(attractionHref(link.destination, link.placement))).toMatchObject({ utmSource: "website", utmMedium: "onsite", utmCampaign: ATTRACTION_CAMPAIGN, utmContent: `${link.destination}_${link.placement}` });
  });
  it.each([{ destination: "dna", placement: "self_understanding" }, { destination: "guide", placement: "secondary" }, { destination: "database", placement: "main" }] as const)("retains acquisition through final $destination $placement", link => {
    expect(captureNavigation(attractionHref(link.destination, link.placement))).toMatchObject({ utmSource: "website", utmMedium: "onsite", utmCampaign: ATTRACTION_CAMPAIGN, utmContent: `${link.destination}_${link.placement}` });
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCourseCompassWaitlistEmail } from "./courseCompassRouter";

const root = process.cwd();
const page = readFileSync(resolve(root, "client/src/pages/CourseCompass.tsx"), "utf8");
const app = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");
const router = readFileSync(resolve(root, "server/courseCompassRouter.ts"), "utf8");
const schema = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const crm = readFileSync(resolve(root, "client/src/pages/CRM.tsx"), "utf8");
const compassAdmin = readFileSync(resolve(root, "client/src/components/CourseCompassAdminSection.tsx"), "utf8");

describe("course compass simple prelaunch funnel", () => {
  it("keeps a standalone route without replacing the DNA or existing course routes", () => {
    expect(app).toContain('const CourseCompass = lazy(() => import("@/pages/CourseCompass"))');
    expect(app).toContain('<Route path={"/compass"} component={CourseCompass} />');
    expect(app).toContain('<Route path={"/dna-quiz"} component={DnaQuiz} />');
    expect(app).toContain('<Route path={"/course"} component={CourseSales} />');
  });

  it("follows the DNA structure: gender, short choices, details, reveal, result", () => {
    expect(page).toContain("כמה לחיצות שיכולות לשנות את הכיוון");
    expect(page).toContain("אישה");
    expect(page).toContain("גבר");
    expect(page).toContain("שאלה {number} מתוך 8");
    expect(page).toContain('setPhase("capture")');
    expect(page).toContain('setPhase("reveal")');
    expect(page).toContain('setPhase("result")');
    expect(page).toContain("לאן לשלוח את הפיצוח שלך?");
    expect(page).toContain("זה לא קסם. זה מדע.");
    expect(page).not.toContain("The Pattern Code");
    expect(page).not.toContain("Fingerprint");
    expect(page).not.toContain("ניחוש הראשון");
    expect(page).not.toContain("ניסוי אחד");
  });

  it("connects the result directly to the course while keeping sales closed", () => {
    expect(page).toContain("סוד ההתאמה המושלמת");
    expect(page).toContain("מהניצוץ למצפן");
    expect(page).toContain("זה קורס דיגיטלי מלא");
    expect(page).toContain("לא ספריית ידע. מערכת החלטה");
    expect(page).toContain("כ־38 אלף מילים");
    expect(page).toContain("כ־5 שעות של הסבר ממוקד ממני");
    expect(page).toContain("תשעה מודולים שעוברים מהבנה לבחירה חדשה");
    expect(page).toContain("דייטים והודעות בזמן אמת");
    expect(page).toContain("לא לדעת יותר על אהבה. להתנהל אחרת בתוכה");
    expect(page).toContain("9");
    expect(page).toContain("27");
    expect(page).toContain("30");
    expect(page).toContain("ערכת המצפן מגיעה אליכם הביתה");
    expect(page).toContain("45 קלפי רגע האמת");
    expect(page).toContain("מחיר מייסדים והטבה מיוחדת");
    expect(page).toContain("המחיר, התאריך והכמות יאושרו");
    expect(page).toContain("אין כרגע תשלום או הזמנה");
    expect(page).not.toContain("GrowWallet");
  });

  it("starts the result with a concrete recommendation about the person in mind", () => {
    expect(page).toContain("יש אדם מסוים בראש. זו ההמלצה שלי כרגע.");
    expect(page).toContain("מה לעשות ב־72 השעות הקרובות");
    expect(page).toContain("מה המצפן לא יכול לדעת");
    expect(page).toContain("recommendationTitle");
    expect(page).toContain("next72Hours");
  });

  it("repeats real interest actions and stores a hot-course signal without opening checkout", () => {
    expect(page).toContain("אני רוצה לקבל את מחיר ההשקה");
    expect(page).toContain("כן, אני רוצה עדיפות ומחיר השקה");
    expect(page).toContain("course_launch_interest");
    expect(page).toContain("markCourseInterest.useMutation");
    expect(router).toContain("markCourseInterest: publicProcedure");
    expect(router).toContain('selectedAction: "course_launch_interest"');
    expect(page).not.toContain("createProcess");
  });

  it("adds a richer result without inventing testimonials or storing poll answers", () => {
    expect(page).toContain("מפת המצפן שלך");
    expect(page).toContain("עד כמה המצפן קלע?");
    expect(page).toContain("בול. זה אני.");
    expect(page).toContain("result_accuracy");
    expect(page).toContain("approvedTestimonials.useQuery");
    expect(page).toContain('blog.getBySlug.useQuery({ slug: "sipurei-hatzlacha" }');
    expect(page).toContain("הם אינם עדויות על הקורס החדש");
    expect(page).toContain("אחרי יותר מ־200 זוגות שנוצרו");
    expect(page).toContain("הקורס החדש עדיין לא הושק ואינו מבטיח תוצאה אישית");
    expect(page).not.toContain("הכסף הכי טוב שהשקעתי");
    expect(page).not.toContain("price: 1497");
  });

  it("stores gender and result metadata but no answer trail", () => {
    expect(schema).toContain('mysqlTable("course_compass_leads"');
    expect(schema).toContain('gender: mysqlEnum("gender", ["female", "male"])');
    expect(schema).toContain('resultKey: mysqlEnum("result_key"');
    const tableSource = schema.slice(schema.indexOf('mysqlTable("course_compass_leads"'), schema.indexOf("export type CourseCompassLead"));
    expect(tableSource).not.toContain("answers");
    expect(tableSource).not.toContain("responses");
    expect(router).not.toMatch(/joinWaitlist:[\s\S]*?answers:/);
    expect(router).not.toMatch(/joinWaitlist:[\s\S]*?responses:/);
  });

  it("sends a gendered confirmation with the result and no purchase claim", () => {
    const email = buildCourseCompassWaitlistEmail({ name: "נועה", gender: "female", resultKey: "uncertainty_loop" });
    expect(email.subject).toContain("המצפן שלך מוכן");
    expect(email.htmlContent).toContain("שהוא רוצה אותך");
    expect(email.htmlContent).toContain("זה לא קסם. זה מדע");
    expect(email.htmlContent).toContain("לא בוצע חיוב ולא נפתחה הזמנה");
    expect(email.textContent).toContain("הטבת ההשקה המיוחדת");
  });

  it("shows the separate prelaunch list in CRM", () => {
    expect(crm).toContain("CourseCompassAdminSection");
    expect(router).toContain("adminList: teamProcedure.query");
    expect(router).toContain('courseInterest: rows.filter(row => row.selectedAction === "course_launch_interest").length');
    expect(compassAdmin).toContain("רוצים מחיר השקה");
    expect(compassAdmin).toContain("עניין גבוה בקורס");
  });
});

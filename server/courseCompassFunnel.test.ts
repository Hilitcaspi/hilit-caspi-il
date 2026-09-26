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

describe("course compass prelaunch funnel", () => {
  it("publishes a standalone route without replacing the existing DNA or course routes", () => {
    expect(app).toContain('const CourseCompass = lazy(() => import("@/pages/CourseCompass"))');
    expect(app).toContain('<Route path={"/compass"} component={CourseCompass} />');
    expect(app).toContain('<Route path={"/dna-quiz"} component={DnaQuiz} />');
    expect(app).toContain('<Route path={"/course"} component={CourseSales} />');
  });

  it("keeps the public experience closed-choice and reveals the result before the waitlist form", () => {
    expect(page).toContain("8 לחיצות. בלי לכתוב דבר.");
    expect(page).toContain("התוצאה נחשפת לפני השארת פרטים");
    expect(page).toContain("איך הגענו לתוצאה הזאת?");
    expect(page.indexOf("המצפן שלכם מצביע על")).toBeLessThan(page.indexOf("שמרו לי קדימות והטבת השקה"));
  });

  it("is transparent that the course and physical kit are not yet for sale", () => {
    expect(page).toContain("המכירה עדיין לא נפתחה");
    expect(page).toContain("לא יתבצע חיוב ולא תיפתח הזמנה");
    expect(page).not.toContain("GrowWallet");
  });

  it("stores result metadata but no answer trail", () => {
    expect(schema).toContain('mysqlTable("course_compass_leads"');
    expect(schema).toContain('resultKey: mysqlEnum("result_key"');
    const tableSource = schema.slice(schema.indexOf('mysqlTable("course_compass_leads"'), schema.indexOf("export type CourseCompassLead"));
    expect(tableSource).not.toContain("answers");
    expect(tableSource).not.toContain("responses");
    expect(router).not.toMatch(/joinWaitlist:[\s\S]*?answers:/);
    expect(router).not.toMatch(/joinWaitlist:[\s\S]*?responses:/);
  });

  it("sends a transactional confirmation with the result and no purchase claim", () => {
    const email = buildCourseCompassWaitlistEmail({ name: "נועה", resultKey: "pace" });
    expect(email.subject).toContain("המצפן שלך נשמר");
    expect(email.htmlContent).toContain("הצעד הבא הוא לכוון את הקצב");
    expect(email.htmlContent).toContain("לא בוצע חיוב ולא נפתחה הזמנה");
    expect(email.textContent).toContain("הטבת השקה מיוחדת");
  });

  it("shows the separate prelaunch list in CRM", () => {
    expect(crm).toContain("CourseCompassAdminSection");
    expect(router).toContain("adminList: teamProcedure.query");
  });
});

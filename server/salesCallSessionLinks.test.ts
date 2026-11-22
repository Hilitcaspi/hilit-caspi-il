import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, runInContext } from "node:vm";
import { transformSync } from "esbuild";

const source = readFileSync(resolve(process.cwd(), "server/emailTemplates.ts"), "utf8");
const context = createContext({
  exports: {}, module: { exports: {} },
  require: (name: string) => {
    if (name === "./emailImages") return { toEmailImageUrl: (url: string) => url };
    if (name === "./emailUnsubscribe") return { buildSignedUnsubscribeUrl: () => { throw new Error("No personalized email send allowed"); } };
    throw new Error(`Unmocked import forbidden: ${name}`);
  },
});
runInContext(transformSync(source, { loader: "ts", format: "cjs" }).code, context);
const sequences = (context as any).module.exports.EMAIL_SEQUENCES;

describe("Sales Call emails 2/3 use valid paid single-session destinations", () => {
  it("retains the existing three-step journey, with no scheduling or sending", () => {
    expect(sequences.sales_call_lead).toHaveLength(3);
    expect(sequences.sales_call_lead[0].subject).toBe("קיבלתי את הפנייה שלך, {{firstName}}");
  });

  it.each([1, 2])("email index %s parses single-session CTA queries rather than malformed paths", index => {
    const email = sequences.sales_call_lead[index];
    const htmlLinks = [...email.htmlBody.matchAll(/href="([^"]+)"/g)].map(match => match[1].replaceAll("&amp;", "&"));
    const textLinks = email.textBody.match(/https?:\/\/[^\s]+/g) ?? [];
    for (const links of [htmlLinks, textLinks]) {
      const sessionLinks = links.filter((link: string) => link.includes("single-session"));
      expect(sessionLinks).toHaveLength(1);
      for (const link of sessionLinks) {
        const url = new URL(link);
        expect(url.origin).toBe("https://hilitcaspi.com");
        expect(url.pathname).toBe("/single-session");
        expect(url.searchParams.get("utm_campaign")).toBe("sales_call_lead");
        expect(url.pathname).not.toContain("&");
        expect(url.hash).toBe("");
      }
    }
    for (const body of [email.htmlBody, email.textBody]) {
      expect(body).toContain("60 דקות");
      expect(body).toContain("₪500");
      expect(body).toContain("בתשלום");
      expect(body).toContain("מלווה מקצועי מהצוות");
      expect(body).not.toMatch(/15 דקות|חינם|חינמי|שמרתי לך מקום|לממתינים ברשימה/);
    }
  });

  it("matches the checked-in standard session catalog price and page duration", () => {
    const catalog = readFileSync(resolve(process.cwd(), "server/growPayment.ts"), "utf8");
    const page = readFileSync(resolve(process.cwd(), "client/src/pages/SingleSessionSales.tsx"), "utf8");
    expect(catalog).toMatch(/session:\s*\{[^\n]*sum:\s*500\b/);
    expect(page).toContain("לפגישה אחת של 60 דקות");
    expect(page).toContain("₪500");
  });
});

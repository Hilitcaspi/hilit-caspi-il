import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "client/src/pages/TestimonialFeedback.tsx"), "utf8");

describe("testimonial satisfaction NPS direction", () => {
  it("renders the numeric scale in RTL so 0 is below the low-probability label", () => {
    expect(source).toContain('className="mt-3 grid grid-cols-11 gap-1" dir="rtl"');
    expect(source).toContain("0 = לא סביר, 10 = סביר מאוד");
    expect(source).not.toContain('className="mt-3 grid grid-cols-11 gap-1" dir="ltr"');
  });
});

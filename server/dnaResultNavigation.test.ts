import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildDnaJoinReturnHref } from "../shared/dnaResultNavigation";

const quiz = readFileSync(new URL("../client/src/pages/DnaQuiz.tsx", import.meta.url), "utf8");
const card = readFileSync(new URL("../client/src/components/DnaResultProfileCard.tsx", import.meta.url), "utf8");

describe("DNA result navigation", () => {
  it("returns to an actual /join path without a free token", () => {
    const url = new URL(buildDnaJoinReturnHref({ dnaType: "anchor", gender: "male", sessionId: "qa-session" }), "https://example.invalid");
    expect(url.pathname).toBe("/join");
    expect(Object.fromEntries(url.searchParams)).toEqual({ dna: "anchor", gender: "male", session: "qa-session" });
  });
  it("preserves and safely encodes free access tokens", () => {
    const token = "qa+token&not_a_param=?";
    const url = new URL(buildDnaJoinReturnHref({ dnaType: "romantic", gender: "female", sessionId: "qa-session", freeToken: token }), "https://example.invalid");
    expect(url.searchParams.get("free_token")).toBe(token);
    expect(url.searchParams.get("not_a_param")).toBeNull();
    expect(url.searchParams.get("dna")).toBe("romantic");
    expect(url.pathname).toBe("/join");
  });
  it("preserves the November allowlist helper and popup continuation", () => {
    expect(quiz).toContain("buildNovemberDnaResultHref(novemberContext)");
    expect(quiz).toContain('type: "DNA_RESULT"');
    expect(quiz).toContain("window.location.origin");
    expect(quiz).toContain('returnTo !== "join" && <DnaResultProfileCard');
    expect(quiz).toContain('registration_recovery_prefill');
  });
  it("links to the existing meeting and keeps the WhatsApp redirect", () => {
    expect(quiz).toContain('href="/single-session"');
    expect(quiz).toContain('href="https://hilitcaspi.com/api/wa/site"');
    expect(quiz).not.toContain('href="/coaching"');
    expect(quiz).not.toContain("מילאת את השאלון + תשלום דמי רישום");
  });
  it("uses first-party CTA metadata rather than invented internal acquisition tags", () => {
    expect(quiz).toContain('eventType: "intro_meeting_click"');
    expect(quiz).toContain('eventType: "whatsapp_click"');
    expect(quiz).toContain('eventType: "database_cta"');
    expect(quiz).not.toMatch(/utmSource:\s*["'](?:dna|site|internal)["']/);
    expect(quiz).not.toContain("utm_source=site");
  });
  it("keeps fictional examples identifiable and makes no personal availability claim", () => {
    expect(card).toContain("תצוגת פרופילים לדוגמה");
    expect(card).toContain('gender === "male" ? "נשים" : "גברים"');
    expect(card).not.toContain("1378");
    expect(card).not.toContain("מחכות לך");
    expect(card).not.toContain("הגדול בישראל");
  });
});

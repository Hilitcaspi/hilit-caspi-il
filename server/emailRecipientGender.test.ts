import { describe, expect, it } from "vitest";
import { alignJourneyGender, journeyRecipientGender, loadEmailRecipientGenders, queuedEmailGenderBlockReason, resolveEmailGenderEvidence, resolveEmailRecipientGender, validEmailGender } from "./emailRecipientGender";
import { crmLeads, dnaQuizResults, singles } from "../drizzle/schema";
import { readFileSync } from "node:fs";

function mockDb(rows: { profiles?: any[]; leads?: any[]; dna?: any[] } = {}) {
  const reads: any[] = [];
  return {
    reads,
    select: (fields: any) => ({ from: (table: any) => ({ where: async (_condition: any) => {
      reads.push({ table, fields });
      return table === singles ? rows.profiles || [] : table === crmLeads ? rows.leads || [] : rows.dna || [];
    } }) }),
  };
}

describe("recipient email gender resolution", () => {
  it.each(["female", "male"] as const)("keeps explicit %s and rejects guesses", gender => {
    expect(validEmailGender(gender)).toBe(gender);
    for (const invalid of [undefined, null, "", "other", "{{gender}}", "woman", "man", 1]) expect(validEmailGender(invalid)).toBeNull();
  });
  it("uses the recipient profile rather than a stale or opposite-party lead", () => {
    expect(resolveEmailGenderEvidence({ profiles: ["female"], dna: ["male"], leads: ["male"], provided: "male" })).toEqual({ gender: "female", source: "profile" });
    expect(resolveEmailGenderEvidence({ profiles: ["male"], leads: ["female"] })).toEqual({ gender: "male", source: "profile" });
  });
  it("uses the linked DNA choice before stale lead metadata", () => {
    expect(resolveEmailGenderEvidence({ dna: ["female"], leads: ["male"] })).toEqual({ gender: "female", source: "dna" });
  });
  it("uses a unique known lead gender and only then explicit fresh input", () => {
    expect(resolveEmailGenderEvidence({ leads: [null, "female", "female"] })).toEqual({ gender: "female", source: "lead" });
    expect(resolveEmailGenderEvidence({ provided: "male" })).toEqual({ gender: "male", source: "provided" });
  });
  it("does not use input to bypass conflicting authoritative records", () => {
    for (const input of [
      { profiles: ["female", "male"], provided: "female" },
      { dna: ["male", "female"], leads: ["female"], provided: "male" },
      { leads: ["female", "male"], provided: "female" },
    ]) expect(resolveEmailGenderEvidence(input)).toEqual({ gender: null, source: "conflict" });
  });
  it("does not default an unknown recipient to either gender", () => {
    expect(resolveEmailGenderEvidence({ profiles: [null], leads: [null] })).toEqual({ gender: null, source: "unknown" });
  });
  it("aligns gendered journey variants without changing product or sequence", () => {
    expect(alignJourneyGender("men_first_step_v2", "female")).toBe("women_first_step_v2");
    expect(alignJourneyGender("women_matchmaking_welcome", "male")).toBe("men_matchmaking_welcome");
    expect(alignJourneyGender("abandoned_database", null)).toBe("abandoned_database");
    expect(() => alignJourneyGender("men_guide", null)).toThrow("email_gender_unverified");
    expect(journeyRecipientGender("meta_lead_dna")).toBeNull();
  });
  it("blocks wrong or uncertain queued personal copy while leaving neutral copy sendable", () => {
    expect(queuedEmailGenderBlockReason("men_first_step_v2", { gender: "female", source: "profile" })).toBe("email_gender_mismatch");
    expect(queuedEmailGenderBlockReason("women_course", { gender: null, source: "unknown" })).toBe("email_gender_unverified");
    expect(queuedEmailGenderBlockReason("women_guide", { gender: null, source: "conflict" })).toBe("email_gender_conflict");
    expect(queuedEmailGenderBlockReason("women_first_step", { gender: "female", source: "profile" })).toBeNull();
    expect(queuedEmailGenderBlockReason("meta_lead_dna", { gender: null, source: "unknown" })).toBeNull();
  });
  it("loads only gender evidence with bounded reads and case-insensitive recipient keys", async () => {
    const db = mockDb({ profiles: [{ email: "person@example.test", gender: "female" }], leads: [{ email: "other@example.test", gender: "male", sessionId: "synthetic-session" }], dna: [{ sessionId: "synthetic-session", gender: "female" }] });
    const map = await loadEmailRecipientGenders(db, [" Person@Example.test ", "person@example.test", "other@example.test"]);
    expect(map.size).toBe(2);expect(map.get("person@example.test")?.gender).toBe("female");
    expect(map.get("other@example.test")).toEqual({ gender: "female", source: "dna" });
    expect(db.reads.length).toBe(3);
    for (const read of db.reads) {
      expect(Object.keys(read.fields)).not.toContain("name");
      expect(Object.keys(read.fields)).not.toContain("phone");
      expect(Object.keys(read.fields)).not.toContain("answers");
    }
  });
  it("does not query for empty batches or allow unlimited work", async () => {
    const db=mockDb();expect((await loadEmailRecipientGenders(db, [])).size).toBe(0);expect(db.reads).toHaveLength(0);
    await expect(loadEmailRecipientGenders(db, Array.from({length:101},(_,i)=>`sample${i}@example.test`))).rejects.toThrow("email_gender_batch_too_large");
  });
  it("does not replace an existing profile with caller input", async () => {
    const db=mockDb({profiles:[{email:"person@example.test",gender:"female"}]});
    expect(await resolveEmailRecipientGender(db,"person@example.test","male")).toEqual({gender:"female",source:"profile"});
  });
  it("places checks before enrolment side effects and after the queue claim before dispatch", () => {
    const source=readFileSync(new URL("./automation.ts",import.meta.url),"utf8");
    expect(source.indexOf("resolveEmailRecipientGender(db, email, gender)")).toBeLessThan(source.indexOf("await addContactToList"));
    expect(source.indexOf("alignJourneyGender(journeyKey, gender)")).toBeLessThan(source.indexOf("await claimLifecycleMessage(tx, journeyClaimKey"));
    const sender=source.slice(source.indexOf("async function sendScheduledEmail"),source.indexOf("function injectEmailTracking"));
    expect(sender.indexOf("queuedEmailGenderBlockReason")).toBeLessThan(sender.indexOf("await sendEmail"));
    expect(source).toContain('status: "failed", errorMessage: blocked');
    expect(source).not.toContain('profile?.gender === "male" ? "male" : "female"');
  });
});

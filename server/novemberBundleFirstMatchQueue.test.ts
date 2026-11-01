import { describe, expect, it } from "vitest";
import {
  buildNovemberBundleFirstMatchQueueRow,
  novemberBundleProfileRequirements,
} from "./novemberBundleFirstMatchQueue";

const PAID_AT = Date.parse("2026-11-01T10:00:00+02:00");
const QUESTIONNAIRE_AT = Date.parse("2026-11-02T14:30:00+02:00");

function completeRow(overrides: Record<string, unknown> = {}) {
  return {
    payment_id: 1,
    payment_email: "member@example.test",
    paid_at: PAID_AT,
    single_id: 7,
    first_name: "הילה",
    last_name: "בדיקה",
    age: 31,
    city: "חיפה",
    gender: "female",
    seeking_gender: "male",
    height: 168,
    photo_url: "https://example.test/photo.jpg",
    dna_type: "anchor",
    occupation: "מעצבת",
    religiosity: "secular",
    about: "תיאור אישי משמעותי ומלא",
    partner_description: "מחפשת חיבור יציב ומשמעותי",
    min_age_preference: 29,
    max_age_preference: 39,
    min_height_preference: 170,
    max_height_preference: 190,
    religiosity_preference: "secular,traditional",
    location_preference: "close",
    questionnaire_completed_at: QUESTIONNAIRE_AT,
    profile_updated_at: QUESTIONNAIRE_AT,
    is_active: 1,
    is_paid: 1,
    is_seed: 0,
    match_id: null,
    match_status: null,
    match_proposed_at: null,
    match_approval_expires_at: null,
    match_owner_approved_at: null,
    match_approval_token_a: null,
    match_approval_token_b: null,
    match_single_a_token: null,
    match_single_b_token: null,
    match_email_a_opened_at: null,
    match_email_b_opened_at: null,
    match_token_a_used_at: null,
    match_token_b_used_at: null,
    match_approved_by_a: 0,
    match_approved_by_b: 0,
    match_email_retried_at: null,
    match_wa_sent_at: null,
    match_notes: null,
    match_matched_at: null,
    match_contact_revealed_at: null,
    match_returned_to_pool_at: null,
    match_detail_status: null,
    delivered_at: null,
    ...overrides,
  };
}

describe("November bundle first-match queue", () => {
  it("checks real photo, questionnaire, and preference fields before starting the SLA", () => {
    const missing = novemberBundleProfileRequirements(completeRow({
      photo_url: null,
      min_age_preference: null,
      questionnaire_completed_at: null,
    }) as any);
    expect(missing).toContain("תמונה");
    expect(missing).toContain("טווח גילאים");
    expect(missing).toContain("שאלון מדעי");
  });

  it("keeps dueAt null until requirements exist, then uses the normal questionnaire completion timestamp", () => {
    const incomplete = buildNovemberBundleFirstMatchQueueRow([completeRow({ photo_url: null }) as any], QUESTIONNAIRE_AT + 1);
    expect(incomplete.state).toBe("awaiting_profile");
    expect(incomplete.readyAt).toBeNull();
    expect(incomplete.dueAt).toBeNull();

    const ready = buildNovemberBundleFirstMatchQueueRow([completeRow() as any], QUESTIONNAIRE_AT + 1);
    expect(ready.state).toBe("ready");
    expect(ready.readyAt).toBe(QUESTIONNAIRE_AT);
    expect(ready.dueAt).toBe(Date.parse("2026-11-06T00:00:00+02:00"));
  });

  it("requires manual readiness-time review when a currently complete profile was updated after questionnaire completion", () => {
    const latePhotoOrPreference = buildNovemberBundleFirstMatchQueueRow([completeRow({
      profile_updated_at: QUESTIONNAIRE_AT + 60_000,
    }) as any], QUESTIONNAIRE_AT + 60_001);
    expect(latePhotoOrPreference.state).toBe("needs_review");
    expect(latePhotoOrPreference.readyAt).toBeNull();
    expect(latePhotoOrPreference.dueAt).toBeNull();
    expect(latePhotoOrPreference.eligibilityIssues).toContain("readiness_time");
  });

  it("does not use a later ordinary profile edit to extend the deadline", () => {
    const afterOrdinaryEdit = buildNovemberBundleFirstMatchQueueRow([completeRow({
      profile_updated_at: QUESTIONNAIRE_AT + 24 * 60 * 60 * 1000,
    }) as any], QUESTIONNAIRE_AT + 24 * 60 * 60 * 1000 + 1);
    expect(afterOrdinaryEdit.readyAt).toBeNull();
    expect(afterOrdinaryEdit.dueAt).toBeNull();
    expect(afterOrdinaryEdit.state).toBe("needs_review");
  });

  it("requires accepted delivery after readiness before it marks an entitlement fulfilled", () => {
    const beforeReady = buildNovemberBundleFirstMatchQueueRow([completeRow({
      match_id: 11,
      match_status: "proposed",
      match_approval_token_a: "accepted-send-proof",
      delivered_at: QUESTIONNAIRE_AT - 1,
    }) as any], QUESTIONNAIRE_AT + 1);
    expect(beforeReady.firstProposalDeliveredAt).toBeNull();
    expect(beforeReady.state).toBe("ready");

    const fulfilled = buildNovemberBundleFirstMatchQueueRow([completeRow({
      match_id: 12,
      match_status: "proposed",
      match_approval_token_a: "accepted-send-proof",
      delivered_at: QUESTIONNAIRE_AT + 1,
    }) as any], QUESTIONNAIRE_AT + 2);
    expect(fulfilled.firstProposalDeliveredAt).toBe(QUESTIONNAIRE_AT + 1);
    expect(fulfilled.state).toBe("fulfilled");
  });
});

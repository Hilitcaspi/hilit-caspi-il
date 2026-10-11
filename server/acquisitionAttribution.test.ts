import { describe, expect, it } from "vitest";
import { captureAcquisitionIfMissing } from "../shared/acquisitionAttribution";

describe("capture acquisition separately from checkout", () => {
  it("does not replace an acquired paid campaign with an email checkout", () => {
    expect(captureAcquisitionIfMissing({utmSource:"meta",utmCampaign:"original_paid"}, {utmSource:"email",utmCampaign:"first_step"})).toEqual({});
  });
  it("captures the entire first available bundle without mixing later values", () => {
    expect(captureAcquisitionIfMissing({}, {utmSource:"meta",utmMedium:"paid",utmCampaign:"original_paid"})).toEqual({utmSource:"meta",utmMedium:"paid",utmCampaign:"original_paid"});
    expect(captureAcquisitionIfMissing({utmSource:"instagram"}, {utmCampaign:"unrelated_email"})).toEqual({});
  });
  it("preserves Meta acquisition identifiers and does not append unrelated identifiers", () => {
    expect(captureAcquisitionIfMissing({metaCampaignId:"local-test-campaign"}, {metaAdId:"later-test-ad"})).toEqual({});
  });
  it("ignores empty values", () => {
    expect(captureAcquisitionIfMissing({utmSource:" "}, {utmSource:" ",utmCampaign:null})).toEqual({});
  });
});

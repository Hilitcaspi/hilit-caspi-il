import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../client/src/lib/utils", () => ({ getUtmParams: vi.fn() }));

import {
  trackCompleteRegistration,
  trackInitiateCheckout,
  trackLead,
  trackPurchase,
  trackViewContent,
} from "../client/src/lib/metaPixel";
import { getUtmParams } from "../client/src/lib/utils";
import { ISRAEL_META_PIXEL_ID } from "../shared/metaPurchasePolicy";

const fbq = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getUtmParams).mockReturnValue({});
  vi.stubGlobal("window", { fbq });
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Live network forbidden in pixel tests"); }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Meta Lead currency", () => {
  it("sends exactly one Lead with ILS and no invented value when called without params", () => {
    trackLead();

    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).toHaveBeenCalledWith("track", "Lead", { currency: "ILS" });
    expect(fbq.mock.calls[0][2]).not.toHaveProperty("value");
  });

  it.each([undefined, ""])("defaults missing or empty currency (%s) to ILS", currency => {
    trackLead({ content_name: "synthetic-lead", currency });

    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).toHaveBeenCalledWith("track", "Lead", {
      content_name: "synthetic-lead",
      currency: "ILS",
    });
    expect(fbq.mock.calls[0][2]).not.toHaveProperty("value");
  });

  it("preserves explicit currency and supplied value without mutating caller params", () => {
    const params = Object.freeze({ content_name: "synthetic-lead", currency: "USD", value: 0 });

    trackLead(params);

    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).toHaveBeenCalledWith("track", "Lead", params);
    expect(params).toEqual({ content_name: "synthetic-lead", currency: "USD", value: 0 });
  });

  it("preserves all hidden UTM fields and existing additional payload fields", () => {
    vi.mocked(getUtmParams).mockReturnValue({
      utmSource: "synthetic-meta",
      utmMedium: "paid-social",
      utmCampaign: "synthetic-campaign",
      utmContent: "synthetic-creative",
      utmTerm: "synthetic-term",
    });
    const params = Object.freeze({
      content_name: "synthetic-lead",
      existing_hidden_field: "preserved",
      utm_source: "caller-source",
    });

    trackLead(params);

    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).toHaveBeenCalledWith("track", "Lead", {
      content_name: "synthetic-lead",
      existing_hidden_field: "preserved",
      currency: "ILS",
      utm_source: "synthetic-meta",
      utm_medium: "paid-social",
      utm_campaign: "synthetic-campaign",
      utm_content: "synthetic-creative",
      utm_term: "synthetic-term",
    });
    expect(params.utm_source).toBe("caller-source");
    expect(fbq.mock.calls[0][2]).not.toHaveProperty("value");
  });

  it.each([undefined, {}])("does not emit or read attribution when window/fbq is unavailable (%s)", browserWindow => {
    vi.stubGlobal("window", browserWindow);

    expect(() => trackLead({ content_name: "synthetic-lead" })).not.toThrow();
    expect(fbq).not.toHaveBeenCalled();
    expect(getUtmParams).not.toHaveBeenCalled();
  });
});

describe("existing Meta pixel behavior", () => {
  it("keeps verified Purchase on the Israeli pixel with its event ID, amount, currency and attribution", () => {
    vi.mocked(getUtmParams).mockReturnValue({ utmSource: "synthetic-meta" });

    trackPurchase({ value: 49.5, content_name: "synthetic-product", eventID: "synthetic-purchase" });

    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).toHaveBeenCalledWith("trackSingle", ISRAEL_META_PIXEL_ID, "Purchase", {
      value: 49.5,
      currency: "ILS",
      content_name: "synthetic-product",
      utm_source: "synthetic-meta",
    }, { eventID: "synthetic-purchase" });
  });

  it("keeps explicit Purchase currency unchanged", () => {
    trackPurchase({ value: 49.5, currency: "USD", eventID: "synthetic-purchase" });

    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).toHaveBeenCalledWith("trackSingle", ISRAEL_META_PIXEL_ID, "Purchase", {
      value: 49.5,
      currency: "USD",
      content_name: undefined,
    }, { eventID: "synthetic-purchase" });
  });

  it.each([0, -1, NaN, Infinity, -Infinity])("keeps invalid Purchase amount (%s) suppressed", value => {
    trackPurchase({ value, eventID: "synthetic-purchase" });

    expect(fbq).not.toHaveBeenCalled();
    expect(getUtmParams).not.toHaveBeenCalled();
  });

  it.each([undefined, ""])("keeps Purchase without a stable event ID (%s) suppressed", eventID => {
    trackPurchase({ value: 49.5, eventID });

    expect(fbq).not.toHaveBeenCalled();
    expect(getUtmParams).not.toHaveBeenCalled();
  });

  it.each([undefined, {}])("keeps Purchase suppressed without window/fbq (%s)", browserWindow => {
    vi.stubGlobal("window", browserWindow);

    expect(() => trackPurchase({ value: 49.5, eventID: "synthetic-purchase" })).not.toThrow();
    expect(fbq).not.toHaveBeenCalled();
    expect(getUtmParams).not.toHaveBeenCalled();
  });

  it("does not add Lead currency defaults to unrelated events", () => {
    trackViewContent({ content_name: "synthetic-content" });
    trackCompleteRegistration({ content_name: "synthetic-registration" });
    trackInitiateCheckout({ content_name: "synthetic-checkout" });

    expect(fbq.mock.calls).toEqual([
      ["track", "ViewContent", { content_name: "synthetic-content" }],
      ["track", "CompleteRegistration", { content_name: "synthetic-registration" }],
      ["track", "InitiateCheckout", { content_name: "synthetic-checkout" }],
    ]);
  });
});

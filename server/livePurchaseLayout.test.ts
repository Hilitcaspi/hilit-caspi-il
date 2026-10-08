import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  open: true,
  eligibility: { eligible: false, plus: false },
}));
vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    liveOctober: {
      salesStatus: { useQuery: () => ({ data: { open: state.open, databaseGiftOpen: true } }) },
      eligibility: { useQuery: () => ({ data: state.eligibility, isLoading: false, isSuccess: true }) },
    },
    singles: { sendDashboardLink: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) } },
  },
}));
vi.mock("../client/src/components/GrowWallet", () => ({
  default: (props: { product: string; prefillCoupon?: string; showCoupon?: boolean }) =>
    React.createElement("form", { "data-checkout": props.product, "data-coupon": props.prefillCoupon ?? "", "data-coupon-field": String(props.showCoupon) },
      React.createElement("input", { type: "email" }),
      React.createElement("button", { type: "submit" }, "להמשך לתשלום המאובטח")),
}));
vi.mock("wouter", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children),
}));
import LiveEvent from "../client/src/pages/LiveEvent";

function render(search = "") {
  vi.stubGlobal("window", { location: { search } });
  return renderToStaticMarkup(React.createElement(LiveEvent));
}

describe("live ticket purchase-first layout", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    state.open = true;
    state.eligibility = { eligible: false, plus: false };
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows the standalone checkout before every community promotion", () => {
    const html = render();
    expect(html.indexOf('id="ticket-purchase"')).toBeLessThan(html.indexOf('data-checkout="live_october"'));
    expect(html.indexOf('data-checkout="live_october"')).toBeLessThan(html.indexOf('id="live-benefits"'));
    expect(html.indexOf('id="live-benefits"')).toBeLessThan(html.indexOf('id="friend-link"'));
    expect(html).toContain("לרכישת כרטיס ב־149 ₪");
    expect(html).toContain("אפשר לרכוש כרטיס גם בלי להיות חברים במאגר");
    expect(html).toContain('data-coupon-field="true"');
    expect(html).toContain("בשווי 149 ₪");
  });

  it("keeps the verified FRIENDS checkout first with its existing 49 ILS coupon", () => {
    state.eligibility = { eligible: true, plus: false };
    const html = render("?email=fixture%40example.com&token=fixture-token");
    expect(html).toContain("לרכישת כרטיס ב־49 ₪");
    expect(html).toContain('data-coupon="FRIENDS"');
    expect(html.indexOf('data-coupon="FRIENDS"')).toBeLessThan(html.indexOf('id="live-benefits"'));
  });

  it("does not sell a duplicate ticket to a verified Plus member", () => {
    state.eligibility = { eligible: true, plus: true };
    const html = render("?email=fixture%40example.com&token=fixture-token");
    expect(html).toContain("לכרטיס Plus שלי");
    expect(html).toContain("אין צורך לרכוש כרטיס נוסף");
    expect(html).not.toContain('data-checkout="live_october"');
  });

  it("does not open checkout when standalone sales are closed", () => {
    state.open = false;
    const html = render();
    expect(html).toContain("ההרשמה ללייב תיפתח בקרוב");
    expect(html).not.toContain('data-checkout="live_october"');
  });
});

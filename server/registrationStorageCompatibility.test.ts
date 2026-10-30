import React from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const authState = vi.hoisted(() => ({ user: null as null | { id: number } }));
vi.mock("../client/src/const", () => ({ getLoginUrl: () => "/synthetic-login" }));
vi.mock("wouter", () => ({ useLocation: () => ["/join", vi.fn()] }));
vi.mock("../client/src/lib/trpc", () => ({ trpc: {
  useUtils: () => ({ auth: { me: { setData: vi.fn(), invalidate: vi.fn() } } }),
  auth: {
    me: { useQuery: () => ({ data: authState.user, isLoading: false, error: null, refetch: vi.fn() }) },
    logout: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }) },
  },
} }));
import { useAuth } from "../client/src/_core/hooks/useAuth";
import ContextualUpsell from "../client/src/components/ContextualUpsell";
import { gaBeginCheckout } from "../client/src/lib/ga";

function AuthProbe() {
  const state = useAuth();
  return React.createElement("span", null, state.isAuthenticated ? "authenticated" : "anonymous");
}

afterEach(() => { vi.unstubAllGlobals(); authState.user = null; });

describe("registration and auth storage compatibility", () => {
  it("keeps a public registration visitor renderable when storage writes are denied", () => {
    vi.stubGlobal("localStorage", { setItem: () => { throw new DOMException("Synthetic storage denial", "SecurityError"); } });
    expect(renderToString(React.createElement(AuthProbe))).toContain("anonymous");
  });

  it("does not treat an optional cache failure as a logout", () => {
    authState.user = { id: 42 };
    vi.stubGlobal("localStorage", { setItem: () => { throw new DOMException("Synthetic quota", "QuotaExceededError"); } });
    expect(renderToString(React.createElement(AuthProbe))).toContain("authenticated");
  });

  it("does not let optional upsell preferences crash the registration route", () => {
    vi.stubGlobal("localStorage", { getItem: () => { throw new DOMException("Synthetic storage denial", "SecurityError"); } });
    expect(() => renderToString(React.createElement(ContextualUpsell))).not.toThrow();
  });

  it("keeps checkout analytics non-blocking for every product and retains URL attribution without storage", () => {
    const dataLayer: Record<string, unknown>[] = [];
    vi.stubGlobal("window", { location: { search: "?utm_source=synthetic&utm_campaign=recovery" }, dataLayer });
    const denied = { getItem: () => { throw new DOMException("Synthetic storage denial", "SecurityError"); } };
    vi.stubGlobal("sessionStorage", denied);
    vi.stubGlobal("localStorage", denied);
    expect(() => { gaBeginCheckout("database"); gaBeginCheckout("guide"); }).not.toThrow();
    expect(dataLayer).toHaveLength(2);
    expect(dataLayer[0]).toMatchObject({ event: "begin_checkout", utm_source: "synthetic", utm_campaign: "recovery" });
  });

  it("flushes current registration drafts when leaving or hiding the page and keeps anonymous scopes stable", () => {
    const source = readFileSync(new URL("../client/src/pages/Register.tsx", import.meta.url), "utf8");
    expect(source).toContain("const registrationDraftScope = useMemo(");
    expect(source).toContain('freeToken: freeTokenFromUrl');
    expect(source).toContain('window.addEventListener("pagehide", persistSnapshot)');
    expect(source).toContain('document.addEventListener("visibilitychange", persistOnHide)');
    expect(source).toContain('window.removeEventListener("pagehide", persistSnapshot)');
    expect(source).toContain('onChangeCapture={() => setDraftSavedBeforePayment(false)}');
  });
});

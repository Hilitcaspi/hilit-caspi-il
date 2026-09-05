import { describe, expect, it } from "vitest";
import {
  isTransientNetworkError,
  shouldRetryTransientQuery,
  transientQueryRetryDelay,
} from "../client/src/lib/queryRetry";
import fs from "node:fs";
import path from "node:path";

describe("tRPC transient network retry", () => {
  it("recognizes browser and fetch network failures", () => {
    expect(isTransientNetworkError(new Error("Failed to fetch"))).toBe(true);
    expect(isTransientNetworkError(new Error("TypeError: fetch failed"))).toBe(true);
    expect(isTransientNetworkError("NetworkError when attempting to fetch resource")).toBe(true);
  });

  it("does not retry authorization, application, or aborted requests", () => {
    expect(isTransientNetworkError(new Error("UNAUTHORIZED"))).toBe(false);
    expect(isTransientNetworkError(new Error("Invalid profile"))).toBe(false);
    expect(isTransientNetworkError(new DOMException("Cancelled", "AbortError"))).toBe(false);
  });

  it("retries a transient query at most twice with a bounded delay", () => {
    const error = new Error("Failed to fetch");
    expect(shouldRetryTransientQuery(0, error)).toBe(true);
    expect(shouldRetryTransientQuery(1, error)).toBe(true);
    expect(shouldRetryTransientQuery(2, error)).toBe(false);
    expect(shouldRetryTransientQuery(0, new Error("FORBIDDEN"))).toBe(false);
    expect(transientQueryRetryDelay(0)).toBe(400);
    expect(transientQueryRetryDelay(1)).toBe(800);
    expect(transientQueryRetryDelay(5)).toBe(1_200);
  });

  it("applies the same retry policy globally and to auth.me", () => {
    const projectRoot = path.resolve(import.meta.dirname, "..");
    const mainSource = fs.readFileSync(
      path.join(projectRoot, "client/src/main.tsx"),
      "utf8"
    );
    const authSource = fs.readFileSync(
      path.join(projectRoot, "client/src/_core/hooks/useAuth.ts"),
      "utf8"
    );

    expect(mainSource).toContain("retry: shouldRetryTransientQuery");
    expect(mainSource).toContain("retryDelay: transientQueryRetryDelay");
    expect(authSource).toContain("retry: shouldRetryTransientQuery");
    expect(authSource).not.toContain("retry: false");
  });
});

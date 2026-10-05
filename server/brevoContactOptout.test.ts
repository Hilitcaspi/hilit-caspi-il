import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { blacklistBrevoContactEmail, resumeTransactionalEmail } from "./brevo";

const originalApiKey = process.env.BREVO_API_KEY;
const originalFetch = globalThis.fetch;

function reply(status: number, body: object = {}) {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as Response;
}

describe("Brevo CRM email opt-out", () => {
  beforeEach(() => {
    process.env.BREVO_API_KEY = "test-only-api-key";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = originalApiKey;
    vi.restoreAllMocks();
  });

  it("blacklists only email on an existing contact and verifies the result", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(reply(200, { emailBlacklisted: false }))
      .mockResolvedValueOnce(reply(204))
      .mockResolvedValueOnce(reply(200, { emailBlacklisted: true }));
    globalThis.fetch = fetchMock;

    expect(await blacklistBrevoContactEmail(" PERSON@Example.com ")).toBe("blacklisted");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/contacts\/person%40example\.com$/);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: "PUT",
      body: JSON.stringify({ emailBlacklisted: true }),
    });
  });

  it("does not create an address that Brevo does not have", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(404));
    globalThis.fetch = fetchMock;
    expect(await blacklistBrevoContactEmail("not-found@example.com")).toBe("not_found");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports provider errors rather than claiming synchronization", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(reply(503));
    expect(await blacklistBrevoContactEmail("person@example.com")).toBe("failed");
  });

  it("unblocks transactional email only, after the verified member has opted in", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(204));
    globalThis.fetch = fetchMock;
    expect(await resumeTransactionalEmail(" Person@Example.com ")).toBe("unblocked");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/smtp\/blockedContacts\/person%40example\.com$/);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "DELETE" });
    expect(fetchMock.mock.calls[0][0]).not.toContain("/contacts/");
  });

  it("is idempotent for an unblocked email and fails closed on provider errors", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(reply(404)).mockResolvedValueOnce(reply(503));
    expect(await resumeTransactionalEmail("person@example.com")).toBe("already_unblocked");
    expect(await resumeTransactionalEmail("person@example.com")).toBe("failed");
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  REGISTRATION_RESUME_LINK_COOLDOWN_MS,
  requestRegistrationResumeLink,
  type RegistrationResumeLinkDeps,
  type RegistrationResumeProfile,
} from "./registrationResumeLink";

const TOKEN = "a".repeat(64);
const EMAIL = "member@example.test";
const NOW = 1_700_000_000_000;

function profile(
  overrides: Partial<RegistrationResumeProfile> = {}
): RegistrationResumeProfile {
  return {
    email: EMAIL,
    firstName: "נועה",
    questionnaireToken: TOKEN,
    isPaid: false,
    isActive: false,
    isSeed: false,
    market: "il",
    ...overrides,
  };
}

function createDeps(profiles: RegistrationResumeProfile[] = [profile()]) {
  const claimedKeys = new Set<string>();
  const sendEmail = vi
    .fn()
    .mockResolvedValue({ success: true, messageId: "accepted" });
  const claim = vi.fn(
    async ({
      messageKey,
      keyPrefix,
      now,
      cooldownMs,
    }: {
      messageKey: string;
      keyPrefix: string;
      now: number;
      cooldownMs: number;
    }) => {
      const hasRecent = [...claimedKeys].some(key => key.startsWith(keyPrefix));
      if (hasRecent || claimedKeys.has(messageKey)) return false;
      claimedKeys.add(messageKey);
      return true;
    }
  );
  const deps: RegistrationResumeLinkDeps = {
    loadProfiles: vi.fn().mockResolvedValue(profiles),
    claim,
    sendEmail,
    isPermanentlyBlockedEmail: vi.fn().mockReturnValue(false),
    now: vi.fn().mockReturnValue(NOW),
  };
  return { deps, sendEmail, claim, claimedKeys };
}

async function request(
  deps: Partial<RegistrationResumeLinkDeps>,
  email = "  MEMBER@EXAMPLE.TEST  "
) {
  return requestRegistrationResumeLink({ email }, deps);
}

describe("requestRegistrationResumeLink", () => {
  it("does nothing on import and only sends after the explicit request function is called", async () => {
    const harness = createDeps();
    expect(harness.sendEmail).not.toHaveBeenCalled();

    await request(harness.deps);

    expect(harness.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("normalizes input and sends only to the exact normalized profile email", async () => {
    const harness = createDeps();

    await request(harness.deps);

    expect(harness.deps.loadProfiles).toHaveBeenCalledWith(EMAIL);
    expect(harness.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: { email: EMAIL },
      })
    );
    expect(harness.sendEmail.mock.calls[0][0].to).not.toHaveProperty("name");
  });

  it("returns the same generic response for unknown, ambiguous, US, seed, and paid-inactive records", async () => {
    const variants = [
      [] as RegistrationResumeProfile[],
      [profile(), profile({ email: "same@example.test" })],
      [profile({ market: "us" })],
      [profile({ isSeed: true })],
      [profile({ isPaid: true, isActive: false })],
    ];

    for (const profiles of variants) {
      const harness = createDeps(profiles);
      const result = await request(harness.deps);
      expect(result).toEqual({ success: true });
      expect(Object.keys(result)).toEqual(["success"]);
      expect(harness.sendEmail).not.toHaveBeenCalled();
      expect(harness.claim).not.toHaveBeenCalled();
    }
  });

  it("reuses the stored unpaid draft token without profile mutation or checkout URL", async () => {
    const storedProfile = profile({
      firstName: "נועה",
      questionnaireToken: TOKEN,
    });
    const before = structuredClone(storedProfile);
    const harness = createDeps([storedProfile]);

    const result = await request(harness.deps);

    expect(result).toEqual({ success: true });
    expect(storedProfile).toEqual(before);
    expect(harness.sendEmail).toHaveBeenCalledTimes(1);
    const mail = harness.sendEmail.mock.calls[0][0];
    expect(mail.htmlContent).toContain(
      `https://hilitcaspi.com/join?resume=${TOKEN}`
    );
    expect(mail.textContent).toContain(
      `https://hilitcaspi.com/join?resume=${TOKEN}`
    );
    expect(mail.htmlContent).not.toContain("checkout");
    expect(mail.htmlContent).not.toContain("questionnaireToken");
  });

  it("routes a paid active member to the existing personal area, never repeat checkout", async () => {
    const harness = createDeps([profile({ isPaid: true, isActive: true })]);

    const result = await request(harness.deps);

    expect(result).toEqual({ success: true });
    const mail = harness.sendEmail.mock.calls[0][0];
    const personalAreaUrl = `https://hilitcaspi.com/my-profile?email=${encodeURIComponent(EMAIL)}&token=${TOKEN}`;
    expect(mail.htmlContent).toContain(personalAreaUrl.replace("&", "&amp;"));
    expect(mail.textContent).toContain(personalAreaUrl);
    expect(mail.htmlContent).not.toContain("/join?resume=");
    expect(mail.htmlContent).not.toContain("checkout");
  });

  it("does not send when the stored token is missing or malformed, and never creates a replacement token", async () => {
    for (const questionnaireToken of [null, "not-a-registration-token"]) {
      const harness = createDeps([profile({ questionnaireToken })]);
      const result = await request(harness.deps);
      expect(result).toEqual({ success: true });
      expect(harness.sendEmail).not.toHaveBeenCalled();
      expect(harness.claim).not.toHaveBeenCalled();
    }
  });

  it("applies a ten-minute atomic claim cooldown to sequential and concurrent duplicate clicks", async () => {
    const harness = createDeps();

    const [first, second] = await Promise.all([
      request(harness.deps),
      request(harness.deps),
    ]);
    expect(first).toEqual({ success: true });
    expect(second).toEqual({ success: true });
    expect(harness.sendEmail).toHaveBeenCalledTimes(1);
    expect(harness.claim).toHaveBeenCalledTimes(2);
    const claimInput = harness.claim.mock.calls[0][0];
    expect(claimInput.cooldownMs).toBe(REGISTRATION_RESUME_LINK_COOLDOWN_MS);
    expect(claimInput.messageKey).not.toContain(EMAIL);
    expect(claimInput.messageKey).toMatch(
      /^registration-resume:v1:[a-f0-9]{64}:/
    );

    await request(harness.deps);
    expect(harness.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("does not reset an accepted claim or automatically retry after an uncertain provider failure", async () => {
    const harness = createDeps();
    harness.sendEmail.mockResolvedValueOnce({
      success: false,
      error: "timeout",
    });

    const first = await request(harness.deps);
    const second = await request(harness.deps);

    expect(first).toEqual({ success: true });
    expect(second).toEqual({ success: true });
    expect(harness.sendEmail).toHaveBeenCalledTimes(1);
    expect(harness.claim).toHaveBeenCalledTimes(2);
    await expect(harness.claim.mock.results[0].value).resolves.toBe(true);
    await expect(harness.claim.mock.results[1].value).resolves.toBe(false);
  });

  it("respects permanent and provider transactional blocks without changing unsubscribe state or releasing the claim", async () => {
    const permanentlyBlocked = createDeps();
    permanentlyBlocked.deps.isPermanentlyBlockedEmail = vi
      .fn()
      .mockReturnValue(true);
    await request(permanentlyBlocked.deps);
    expect(permanentlyBlocked.sendEmail).not.toHaveBeenCalled();
    expect(permanentlyBlocked.claim).not.toHaveBeenCalled();

    const providerBlocked = createDeps();
    providerBlocked.sendEmail.mockResolvedValueOnce({
      success: true,
      messageId: "blocked",
    });
    const first = await request(providerBlocked.deps);
    const second = await request(providerBlocked.deps);
    expect(first).toEqual({ success: true });
    expect(second).toEqual({ success: true });
    expect(providerBlocked.sendEmail).toHaveBeenCalledTimes(1);
    expect(providerBlocked.claim).toHaveBeenCalledTimes(2);
    await expect(providerBlocked.claim.mock.results[1].value).resolves.toBe(
      false
    );
  });

  it("escapes stored first names and URLs in HTML while keeping text content usable", async () => {
    const maliciousName = `נועה <img src=x onerror="alert('x')">`;
    const harness = createDeps([profile({ firstName: maliciousName })]);

    await request(harness.deps);

    const mail = harness.sendEmail.mock.calls[0][0];
    expect(mail.htmlContent).toContain(
      "נועה &lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;"
    );
    expect(mail.htmlContent).not.toContain("<img src=x");
    expect(mail.htmlContent).toContain(
      `href="https://hilitcaspi.com/join?resume=${TOKEN}"`
    );
    expect(mail.textContent).toContain(maliciousName);
  });

  it("does not expose a token, profile details, or distinct error fields in the public response", async () => {
    const harness = createDeps([
      profile({ firstName: "סודי", questionnaireToken: TOKEN }),
    ]);

    const result = await request(harness.deps);

    expect(result).toEqual({ success: true });
    expect(JSON.stringify(result)).not.toContain(TOKEN);
    expect(JSON.stringify(result)).not.toContain("סודי");
    expect(JSON.stringify(result)).not.toContain(EMAIL);
  });
});

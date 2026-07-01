import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Brevo email helper so no real email is sent during tests.
const sendEmailMock = vi.fn(async () => ({ success: true, messageId: "test" }));
vi.mock("../brevo", () => ({
  sendEmail: (...args: any[]) => sendEmailMock(...args),
}));

// Import after the mock is registered.
import { sendErrorAlert } from "./errorAlert";

describe("sendErrorAlert", () => {
  beforeEach(() => {
    sendEmailMock.mockClear();
  });

  it("sends an email for a new error", async () => {
    const ok = await sendErrorAlert({
      source: "tRPC",
      error: new Error("Boom unique-1 " + Math.random()),
      context: { path: "singles.doThing" },
    });
    expect(ok).toBe(true);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const arg = sendEmailMock.mock.calls[0][0];
    expect(arg.to.email).toBe("hilit@hilitcaspi.com");
    expect(arg.subject).toContain("שגיאת שרת");
  });

  it("throttles identical repeated errors (only first sends)", async () => {
    const uniquePath = "singles.repeat-" + Math.random();
    const makeErr = () => new Error("Repeated failure message");

    const first = await sendErrorAlert({ source: "tRPC", error: makeErr(), context: { path: uniquePath } });
    const second = await sendErrorAlert({ source: "tRPC", error: makeErr(), context: { path: uniquePath } });
    const third = await sendErrorAlert({ source: "tRPC", error: makeErr(), context: { path: uniquePath } });

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(third).toBe(false);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("treats different sources/paths as distinct errors", async () => {
    const msg = "Shared message text";
    await sendErrorAlert({ source: "tRPC", error: new Error(msg), context: { path: "a-" + Math.random() } });
    await sendErrorAlert({ source: "express", error: new Error(msg), context: { route: "b-" + Math.random() } });
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
  });

  it("never throws even if email sending rejects", async () => {
    sendEmailMock.mockRejectedValueOnce(new Error("brevo down"));
    const ok = await sendErrorAlert({
      source: "process:uncaughtException",
      error: new Error("catastrophe " + Math.random()),
    });
    // Should resolve to false rather than throwing.
    expect(ok).toBe(false);
  });
});

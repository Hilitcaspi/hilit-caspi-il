import { describe, expect, it } from "vitest";
import { getDb } from "./db";
import { getPlusCancellationRecipients } from "./plusCancellationNotifications";

describe("Plus cancellation private operational configuration", () => {
  it("has valid server-only recipients and configured delivery providers", async () => {
    const db = await getDb();
    expect(Boolean(db)).toBe(true);
    const recipients = await getPlusCancellationRecipients(db);
    expect(Boolean(recipients.email)).toBe(true);
    expect(Boolean(recipients.phone)).toBe(true);
    expect(Boolean(process.env.BREVO_API_KEY)).toBe(true);
    expect(Boolean(process.env.VIBRATE_API_KEY)).toBe(true);
  });
});

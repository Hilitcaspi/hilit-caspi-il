import { describe, expect, it } from "vitest";
import { isPermanentlyBlockedEmail } from "./brevo";

describe("Brevo permanent blocklist", () => {
  it("blocks the owner-approved full-removal address in normalized forms", () => {
    expect(isPermanentlyBlockedEmail("noy.linevitz31@gmail.com")).toBe(true);
    expect(isPermanentlyBlockedEmail("  NOY.LINEVITZ31@GMAIL.COM  ")).toBe(true);
    expect(isPermanentlyBlockedEmail("pazitvardi@walla.co.il")).toBe(true);
    expect(isPermanentlyBlockedEmail("  PAZITVARDI@WALLA.CO.IL  ")).toBe(true);
  });
});

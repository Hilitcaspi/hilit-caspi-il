import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";
import {
  applySmsMarketingUnsubscribe,
  buildSignedSmsUnsubscribeUrl,
  createSignedSmsUnsubscribeToken,
  verifySignedSmsUnsubscribeToken,
} from "./smsMarketingUnsubscribe";

const TOKEN_PREFIX = "sms_unsubscribe_v1_";

type Statement = { queryChunks?: Array<{ value?: unknown }> };

function signedTokenForRawPayload(payload: string): string {
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", process.env.JWT_SECRET!)
    .update(encoded)
    .digest("base64url");
  return `${TOKEN_PREFIX}${encoded}.${signature}`;
}

function statementText(statement: Statement): string {
  return (statement.queryChunks ?? [])
    .flatMap(chunk => Array.isArray(chunk.value) ? chunk.value : [])
    .filter((value): value is string => typeof value === "string")
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function createDbMock(options: { failAtExecute?: number } = {}) {
  const statements: Statement[] = [];
  let executions = 0;
  const execute = vi.fn(async (statement: Statement) => {
    executions += 1;
    statements.push(statement);
    if (executions === options.failAtExecute) throw new Error("write_failed");
    return [];
  });
  const transaction = vi.fn(async (callback: (tx: { execute: typeof execute }) => Promise<void>) => {
    await callback({ execute });
  });
  return {
    db: { transaction, execute, insert: vi.fn(), update: vi.fn() },
    execute,
    statements,
    transaction,
  };
}

describe("sms marketing unsubscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "unit-test-secret-that-is-not-production";
  });

  it("signs only a normalized Israeli mobile number and builds the canonical unsubscribe URL", () => {
    const token = createSignedSmsUnsubscribeToken({ phone: "+972 52-123-4567" });

    expect(verifySignedSmsUnsubscribeToken(token)).toEqual({ phone: "0521234567" });
    expect(buildSignedSmsUnsubscribeUrl({ phone: "0521234567" }))
      .toMatch(/^https:\/\/hilitcaspi\.com\/unsubscribe\?token=sms_unsubscribe_v1_/);
    expect(buildSignedSmsUnsubscribeUrl({ phone: "0521234567", baseUrl: "https://hilitcaspi.com/" }))
      .toMatch(/^https:\/\/hilitcaspi\.com\/unsubscribe\?token=/);
  });

  it("allows no alternate unsubscribe base URL", () => {
    expect(() => buildSignedSmsUnsubscribeUrl({ phone: "0521234567", baseUrl: "https://evil.example" }))
      .toThrow("canonical site base");
    expect(() => buildSignedSmsUnsubscribeUrl({ phone: "0521234567", baseUrl: "https://hilitcaspi.com/u" }))
      .toThrow("canonical site base");
    expect(() => buildSignedSmsUnsubscribeUrl({ phone: "0521234567", baseUrl: "http://hilitcaspi.com" }))
      .toThrow("canonical site base");
  });

  it("rejects a tampered token", () => {
    const token = createSignedSmsUnsubscribeToken({ phone: "0521234567" });
    const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;

    expect(verifySignedSmsUnsubscribeToken(tampered)).toBeNull();
  });

  it("rejects malformed tokens, noncanonical payloads, and signed payloads with additional fields", () => {
    const phone = "0521234567";

    expect(verifySignedSmsUnsubscribeToken("sms_unsubscribe_v1_bad")).toBeNull();
    expect(verifySignedSmsUnsubscribeToken(`${TOKEN_PREFIX}${"a".repeat(513)}`)).toBeNull();
    expect(verifySignedSmsUnsubscribeToken(signedTokenForRawPayload(`{"phone":"${phone}","email":"person@example.com"}`)))
      .toBeNull();
    expect(verifySignedSmsUnsubscribeToken(signedTokenForRawPayload(`{"phone":"${phone}" }`))).toBeNull();
    expect(verifySignedSmsUnsubscribeToken(signedTokenForRawPayload(`{"phone":"${phone}","phone":"0527654321"}`)))
      .toBeNull();
    expect(verifySignedSmsUnsubscribeToken(signedTokenForRawPayload(`{"phone":"+972521234567"}`))).toBeNull();
  });

  it("returns false without a database and never attempts a write for an invalid phone", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    await expect(applySmsMarketingUnsubscribe({ phone: "0521234567" })).resolves.toBe(false);

    const mock = createDbMock();
    vi.mocked(getDb).mockResolvedValue(mock.db as any);
    await expect(applySmsMarketingUnsubscribe({ phone: "not-a-phone" })).resolves.toBe(false);
    expect(mock.transaction).not.toHaveBeenCalled();
  });

  it("uses an atomic raw-SQL transaction and changes only eligible SMS recovery state", async () => {
    const mock = createDbMock();
    vi.mocked(getDb).mockResolvedValue(mock.db as any);

    await expect(applySmsMarketingUnsubscribe({ phone: "+972 52-123-4567" })).resolves.toBe(true);

    expect(mock.transaction).toHaveBeenCalledTimes(1);
    expect(mock.execute).toHaveBeenCalledTimes(2);

    const [optoutInsert, recoveryUpdate] = mock.statements.map(statementText);
    expect(optoutInsert).toContain("INSERT INTO sms_optouts (phone, source, created_at, updated_at)");
    expect(optoutInsert).toContain("'signed_sms_token'");
    expect(optoutInsert).toContain("ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at)");
    expect(recoveryUpdate).toContain("UPDATE purchase_recovery_recipients");
    expect(recoveryUpdate).toContain("sms_state = 'skipped'");
    expect(recoveryUpdate).toContain("sms_consent = false");
    expect(recoveryUpdate).not.toContain("suppression_reason");
    expect(recoveryUpdate).toContain("sms_state IN ('draft', 'held', 'queued')");
    expect(recoveryUpdate).not.toContain("email_state");
    expect(recoveryUpdate).not.toContain("email_consent");
    expect(recoveryUpdate).not.toContain("service");
    expect(mock.db.insert).not.toHaveBeenCalled();
    expect(mock.db.update).not.toHaveBeenCalled();
  });

  it("is idempotent for repeated clicks and returns false when either transactional write fails", async () => {
    const idempotent = createDbMock();
    vi.mocked(getDb).mockResolvedValue(idempotent.db as any);

    await expect(applySmsMarketingUnsubscribe({ phone: "0521234567" })).resolves.toBe(true);
    await expect(applySmsMarketingUnsubscribe({ phone: "0521234567" })).resolves.toBe(true);
    expect(idempotent.transaction).toHaveBeenCalledTimes(2);
    expect(idempotent.execute).toHaveBeenCalledTimes(4);
    expect(idempotent.statements.map(statementText).filter(text => text.includes("ON DUPLICATE KEY UPDATE")))
      .toHaveLength(2);

    const failed = createDbMock({ failAtExecute: 2 });
    vi.mocked(getDb).mockResolvedValue(failed.db as any);
    await expect(applySmsMarketingUnsubscribe({ phone: "0521234567" })).resolves.toBe(false);
    expect(failed.transaction).toHaveBeenCalledTimes(1);
    expect(failed.execute).toHaveBeenCalledTimes(2);
  });
});

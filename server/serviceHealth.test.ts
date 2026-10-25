import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createServiceHealthChecker,
  type FreshConnection,
  type FreshConnectionOptions,
} from "./serviceHealth";

function connection(overrides: Partial<FreshConnection> = {}) {
  return {
    query: vi.fn().mockResolvedValue(undefined),
    end: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
    ...overrides,
  } satisfies FreshConnection;
}

const expectedSafeResult = (database: "ok" | "unavailable", checkedAt: number) => ({
  schemaVersion: 1,
  database,
  checkedAt,
  observationMode: "fresh_connection",
});

afterEach(() => vi.useRealTimers());

describe("service health fresh database check", () => {
  it("opens a fresh strict-TLS connection, executes only SELECT 1, and always closes it", async () => {
    const fresh = connection();
    const createConnection = vi.fn<(options: FreshConnectionOptions) => Promise<FreshConnection>>().mockResolvedValue(fresh);
    const checker = createServiceHealthChecker({
      createConnection,
      readUri: () => "mysql://user:secret@private-db.example/production",
      now: () => 1_700_000_000_000,
    });

    await expect(checker()).resolves.toEqual(expectedSafeResult("ok", 1_700_000_000_000));
    expect(createConnection).toHaveBeenCalledTimes(1);
    expect(createConnection).toHaveBeenCalledWith({
      uri: "mysql://user:secret@private-db.example/production",
      ssl: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
      connectTimeout: 5_000,
    });
    expect(fresh.query).toHaveBeenCalledTimes(1);
    expect(fresh.query).toHaveBeenCalledWith({ sql: "SELECT 1", timeout: 5_000 });
    expect(fresh.end).toHaveBeenCalledTimes(1);
    expect(fresh.destroy).toHaveBeenCalledTimes(1);
  });

  it("does not fall back to DATABASE_URL when LEGACY_DATABASE_URL is missing", async () => {
    const savedLegacy = process.env.LEGACY_DATABASE_URL;
    const savedDatabase = process.env.DATABASE_URL;
    delete process.env.LEGACY_DATABASE_URL;
    process.env.DATABASE_URL = "mysql://would-be-a-secret@fallback.example/other";
    const createConnection = vi.fn<(options: FreshConnectionOptions) => Promise<FreshConnection>>();
    const checker = createServiceHealthChecker({ createConnection, now: () => 123 });

    try {
      await expect(checker()).resolves.toEqual(expectedSafeResult("unavailable", 123));
      expect(createConnection).not.toHaveBeenCalled();
    } finally {
      if (savedLegacy === undefined) delete process.env.LEGACY_DATABASE_URL;
      else process.env.LEGACY_DATABASE_URL = savedLegacy;
      if (savedDatabase === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = savedDatabase;
    }
  });

  it.each([
    ["connection", undefined, true],
    ["query", "query", false],
    ["end", "end", false],
  ] as const)("fails closed when %s throws without exposing connection details", async (_case, failure, rejectsBeforeConnection) => {
    const secretUri = "mysql://user:do-not-disclose@private-db.example/production";
    const fresh = connection({
      ...(failure === "query" ? { query: vi.fn().mockRejectedValue(new Error(secretUri)) } : {}),
      ...(failure === "end" ? { end: vi.fn().mockRejectedValue(new Error(secretUri)) } : {}),
    });
    const createConnection = vi.fn<(options: FreshConnectionOptions) => Promise<FreshConnection>>(
      rejectsBeforeConnection ? () => Promise.reject(new Error(secretUri)) : () => Promise.resolve(fresh),
    );
    const checker = createServiceHealthChecker({ createConnection, readUri: () => secretUri, now: () => 456 });

    const health = await checker();
    expect(health).toEqual(expectedSafeResult("unavailable", 456));
    expect(JSON.stringify(health)).not.toContain(secretUri);
    if (rejectsBeforeConnection) {
      expect(fresh.end).not.toHaveBeenCalled();
      expect(fresh.destroy).not.toHaveBeenCalled();
    } else {
      expect(fresh.end).toHaveBeenCalledTimes(1);
      expect(fresh.destroy).toHaveBeenCalledTimes(1);
    }
  });

  it("bounds a hung cleanup to one second, destroys the connection, and fails closed", async () => {
    vi.useFakeTimers();
    const fresh = connection({ end: vi.fn(() => new Promise<void>(() => {})) });
    const checker = createServiceHealthChecker({
      createConnection: vi.fn().mockResolvedValue(fresh),
      readUri: () => "mysql://user:secret@private-db.example/production",
      now: () => 789,
    });

    const health = checker();
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(health).resolves.toEqual(expectedSafeResult("unavailable", 789));
    expect(fresh.end).toHaveBeenCalledTimes(1);
    expect(fresh.destroy).toHaveBeenCalledTimes(1);
  });

  it("singleflights concurrent checks, caches for at most 60 seconds, and cleans every fresh connection", async () => {
    let now = 10_000;
    const connections: FreshConnection[] = [];
    const createConnection = vi.fn<(options: FreshConnectionOptions) => Promise<FreshConnection>>(() => {
      const fresh = connection();
      connections.push(fresh);
      return Promise.resolve(fresh);
    });
    const checker = createServiceHealthChecker({
      createConnection,
      readUri: () => "mysql://user:secret@private-db.example/production",
      now: () => now,
    });

    const [first, second, third] = await Promise.all([checker(), checker(), checker()]);
    expect(first).toEqual(second);
    expect(second).toEqual(third);
    expect(createConnection).toHaveBeenCalledTimes(1);

    now += 59_999;
    await checker();
    expect(createConnection).toHaveBeenCalledTimes(1);

    now += 1;
    await checker();
    expect(createConnection).toHaveBeenCalledTimes(2);
    expect(connections).toHaveLength(2);
    for (const fresh of connections) {
      expect(fresh.end).toHaveBeenCalledTimes(1);
      expect(fresh.destroy).toHaveBeenCalledTimes(1);
    }
  });
});

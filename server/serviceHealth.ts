import { createConnection as mysqlCreateConnection } from "mysql2/promise";

export type ServiceHealth = {
  schemaVersion: 1;
  database: "ok" | "unavailable";
  checkedAt: number;
  observationMode: "fresh_connection";
};

export type FreshConnectionOptions = {
  uri: string;
  ssl: { rejectUnauthorized: true; minVersion: "TLSv1.2" };
  connectTimeout: 5000;
};

export type FreshConnection = {
  query(command: { sql: string; timeout: number }): Promise<unknown>;
  end(): Promise<void>;
  destroy(): void;
};

type CreateConnection = (options: FreshConnectionOptions) => Promise<FreshConnection>;

export type ServiceHealthDependencies = {
  createConnection?: CreateConnection;
  readUri?: () => string | undefined;
  now?: () => number;
};

const CACHE_MS = 60_000;
const CLOSE_TIMEOUT_MS = 1_000;
const QUERY = { sql: "SELECT 1", timeout: 5_000 } as const;

function settleWithin<T>(operation: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(fallback), timeoutMs);
    operation.then(
      value => { clearTimeout(timer); resolve(value); },
      () => { clearTimeout(timer); resolve(fallback); },
    );
  });
}

async function closeFreshConnection(connection: FreshConnection): Promise<boolean> {
  const ended = await settleWithin(
    Promise.resolve().then(() => connection.end()).then(() => true, () => false),
    CLOSE_TIMEOUT_MS,
    false,
  );
  try {
    connection.destroy();
  } catch {
    return false;
  }
  return ended;
}

export function createServiceHealthChecker(dependencies: ServiceHealthDependencies = {}) {
  const createConnection: CreateConnection = dependencies.createConnection ??
    (options => mysqlCreateConnection(options) as unknown as Promise<FreshConnection>);
  const readUri = dependencies.readUri ?? (() => process.env.LEGACY_DATABASE_URL);
  const now = dependencies.now ?? Date.now;
  let cached: ServiceHealth | undefined;
  let inFlight: Promise<ServiceHealth> | undefined;

  const result = (database: ServiceHealth["database"]): ServiceHealth => ({
    schemaVersion: 1,
    database,
    checkedAt: now(),
    observationMode: "fresh_connection",
  });

  const check = async (): Promise<ServiceHealth> => {
    let connection: FreshConnection | undefined;
    let database: ServiceHealth["database"] = "unavailable";
    try {
      const uri = readUri();
      if (!uri) return result("unavailable");
      connection = await createConnection({
        uri,
        ssl: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
        connectTimeout: 5_000,
      });
      await connection.query(QUERY);
      database = "ok";
    } catch {
      database = "unavailable";
    }

    if (connection && !(await closeFreshConnection(connection))) database = "unavailable";
    return result(database);
  };

  return async function getServiceHealth(): Promise<ServiceHealth> {
    const currentTime = now();
    if (cached && currentTime >= cached.checkedAt && currentTime - cached.checkedAt < CACHE_MS) return cached;
    if (inFlight) return inFlight;

    let pending: Promise<ServiceHealth>;
    pending = check().then(health => {
      cached = health;
      return health;
    }).finally(() => {
      if (inFlight === pending) inFlight = undefined;
    });
    inFlight = pending;
    return pending;
  };
}

export const getServiceHealth = createServiceHealthChecker();

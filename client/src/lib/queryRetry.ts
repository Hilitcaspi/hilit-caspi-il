const TRANSIENT_NETWORK_MESSAGES = [
  "failed to fetch",
  "fetch failed",
  "networkerror",
  "network request failed",
  "load failed",
];

function readErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
}

export function isTransientNetworkError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return false;

  const message = readErrorMessage(error).toLowerCase();
  return TRANSIENT_NETWORK_MESSAGES.some(fragment => message.includes(fragment));
}

export function shouldRetryTransientQuery(
  failureCount: number,
  error: unknown
): boolean {
  return failureCount < 2 && isTransientNetworkError(error);
}

export function transientQueryRetryDelay(attemptIndex: number): number {
  return Math.min(400 * 2 ** attemptIndex, 1_200);
}

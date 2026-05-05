import { fetchHtml } from "./forumClient";
import { getRetryAfterMs, isRetryableError, summarizeError } from "./errorUtils";

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 2_000;
const MAX_RETRY_DELAY_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeBackoffDelayMs(attempt: number, error: unknown): number {
  const retryAfterMs = getRetryAfterMs(error);
  if (retryAfterMs !== null) return Math.min(retryAfterMs, MAX_RETRY_DELAY_MS);

  const expDelay = Math.min(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1), MAX_RETRY_DELAY_MS);
  const jitter = Math.floor(Math.random() * 1_000);
  return expDelay + jitter;
}

export async function fetchWithRetry(url: string): Promise<string> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await fetchHtml(url);
    } catch (error: unknown) {
      const retryable = isRetryableError(error);
      if (!retryable || attempt === MAX_RETRIES) {
        if (retryable && attempt === MAX_RETRIES) {
          throw new Error(
            `Retry limit reached for ${url} after ${MAX_RETRIES} attempts: ${summarizeError(error)}`
          );
        }
        throw error;
      }
      const delayMs = computeBackoffDelayMs(attempt, error);
      await sleep(delayMs);
    }
  }
  throw new Error("Fetch failed without captured error.");
}

export function describeRetryPolicy(): string {
  return `retryPolicy=max${MAX_RETRIES},baseMs=${BASE_RETRY_DELAY_MS},maxMs=${MAX_RETRY_DELAY_MS},strategy=exp-backoff+jitter`;
}

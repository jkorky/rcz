export function getErrorStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  if (!("response" in error) || typeof error.response !== "object" || error.response === null) {
    return null;
  }
  if (!("status" in error.response) || typeof error.response.status !== "number") {
    return null;
  }
  return error.response.status;
}

export function getErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  if (!("code" in error) || typeof error.code !== "string") return null;
  return error.code;
}

export function getRetryAfterMs(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  if (!("response" in error) || typeof error.response !== "object" || error.response === null) {
    return null;
  }
  if (
    !("headers" in error.response) ||
    typeof error.response.headers !== "object" ||
    error.response.headers === null
  ) {
    return null;
  }
  const headers = error.response.headers as Record<string, unknown>;
  const retryAfter = headers["retry-after"];
  if (typeof retryAfter !== "string" && typeof retryAfter !== "number") return null;

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;

  const dateMs = Date.parse(String(retryAfter));
  if (Number.isNaN(dateMs)) return null;
  const delta = dateMs - Date.now();
  return delta > 0 ? delta : null;
}

export function isRetryableError(error: unknown): boolean {
  const code = getErrorCode(error);
  if (code === "ECONNABORTED" || code === "ENOTFOUND" || code === "ECONNRESET") {
    return true;
  }
  const status = getErrorStatus(error);
  if (!status) return true;
  return status === 429 || status >= 500;
}

export function summarizeError(error: unknown): string {
  if (error instanceof Error) {
    const status = getErrorStatus(error);
    const codeValue = getErrorCode(error);
    const code = codeValue ? ` code=${codeValue}` : "";
    const statusPart = status ? ` status=${status}` : "";
    return `${error.message}${statusPart}${code}`;
  }
  return String(error);
}

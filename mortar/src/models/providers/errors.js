/**
 * Providers throw ProviderError with a `kind` the router understands:
 *   error           transport/server failure — counts toward the circuit breaker
 *   invalid_output  the model answered, but not in the required schema
 *   refusal         the model declined (frontier safety classifiers)
 */
export class ProviderError extends Error {
  constructor(message, { kind = "error", status = null } = {}) {
    super(message);
    this.name = "ProviderError";
    this.kind = kind;
    this.status = status;
  }
}

export async function fetchJson(url, { timeoutMs, ...init }) {
  let res;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    const reason = err.name === "TimeoutError" ? `timed out after ${timeoutMs} ms` : err.message;
    throw new ProviderError(`${new URL(url).host}: ${reason}`);
  }
  const text = await res.text();
  if (!res.ok) throw new ProviderError(`${new URL(url).host} HTTP ${res.status}: ${text.slice(0, 300)}`, { status: res.status });
  try {
    return JSON.parse(text);
  } catch {
    throw new ProviderError(`${new URL(url).host}: response was not JSON`);
  }
}

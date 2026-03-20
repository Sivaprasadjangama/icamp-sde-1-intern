import axios from 'axios';
import { createLogger } from './logger.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(err) {
  // Network errors (including timeouts) should retry.
  if (err && err.response && typeof err.response.status === 'number') {
    const status = err.response.status;
    if (status >= 500 && status <= 599) return true; // retry 5xx
    return false; // do not retry 4xx (or others)
  }
  // Axios uses err.code for network-level problems.
  return !!(err && (err.code || err.isAxiosError));
}

export async function withRetry(fn, maxRetries, isRetryableFn) {
  const retryable = isRetryableFn || isRetryable;
  const retries = Number.isFinite(maxRetries) ? maxRetries : 0;

  let attempt = 0;
  // Total attempts = retries + 1
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (!retryable(err) || attempt >= retries) throw err;
      attempt += 1;

      // Exponential backoff + jitter (simple, stable and test-friendly).
      const base = 200; // ms
      const exp = base * Math.pow(2, attempt - 1);
      const jitter = Math.floor(Math.random() * 250);
      const delayMs = exp + jitter;
      await sleep(delayMs);
    }
  }
}

async function fetchOne({ name, url }, config) {
  const logger = createLogger(config.logLevel);
  return withRetry(
    async () => {
      const res = await axios.get(url, {
        timeout: config.timeout,
        responseType: 'text',
        validateStatus: () => true, // handle non-2xx ourselves
      });

      if (res.status < 200 || res.status > 299) {
        const e = new Error(`Request failed with status ${res.status}`);
        e.response = { status: res.status };
        throw e;
      }
      return res.data;
    },
    config.retries,
    (err) => {
      const ok = isRetryable(err);
      if (ok) logger.debug(`DEBUG retrying feed "${name}"`);
      return ok;
    }
  ).then(
    (xml) => ({ name, status: 'ok', xml }),
    (error) => ({ name, status: 'failed', error: error instanceof Error ? error.message : String(error) })
  );
}

export async function fetchAll(feeds, config) {
  const list = Array.isArray(feeds) ? feeds : [];

  const results = await Promise.allSettled(
    list.map(async (feed) => {
      const r = await fetchOne(feed, config);
      return r;
    })
  );

  return results.map((r) => {
    if (r.status === 'fulfilled') return r.value;
    // Should be rare, because fetchOne catches, but keep contract.
    return { name: 'unknown', status: 'failed', error: String(r.reason) };
  });
}


/**
 * serverWake.js
 *
 * Utilities for handling Render free-tier cold starts gracefully.
 *
 * On Render's free plan the backend sleeps after ~15 minutes of inactivity.
 * When a user opens the site after a long idle period the first request will
 * hit a sleeping server and fail or return a 503.
 *
 * Strategy:
 *  1. Hit GET /api/health (tiny, no DB required on the backend).
 *  2. If the server responds with status "ok" AND db === "connected", we're ready.
 *  3. If it responds with db === "connecting", wait and retry.
 *  4. If it doesn't respond at all, the process might still be booting — retry.
 *  5. Use exponential backoff so we don't hammer the waking server.
 *  6. Give up after MAX_ATTEMPTS and surface a clear error to the user.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const INITIAL_DELAY_MS = 1500;  // wait 1.5 s before first retry
const MAX_DELAY_MS     = 8000;  // cap back-off at 8 s per attempt
const MAX_ATTEMPTS     = 10;    // ~60 s total before giving up
const HEALTH_TIMEOUT   = 6000;  // abort a single health probe after 6 s

/**
 * Check the /api/health endpoint once.
 * Returns { awake: true } when the server AND database are ready.
 * Returns { awake: false, sleeping: true } when the server is up but DB is still connecting.
 * Returns { awake: false, sleeping: false } on network error / timeout.
 */
async function checkHealth() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT);

  try {
    const res = await fetch(`${API_BASE}/health`, {
      signal: controller.signal,
      // Bypass any service-worker cache so we get a live response
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (!res.ok) return { awake: false, sleeping: true };

    const data = await res.json();
    // Server is awake only when the DB is also connected
    return {
      awake: data.status === 'ok' && data.db === 'connected',
      sleeping: data.db === 'connecting',
    };
  } catch {
    clearTimeout(timer);
    return { awake: false, sleeping: false };
  }
}

/**
 * Wait for the backend to be fully ready (server + DB).
 *
 * @param {function} onStatusChange  - called with a human-readable status string
 *                                     so the UI can show progress to the user.
 * @returns {Promise<boolean>}  true = server ready, false = gave up
 */
export async function waitForServer(onStatusChange = () => {}) {
  onStatusChange('Connecting to server…');

  // First probe — check if server is already awake (common case after < 15 min idle)
  const first = await checkHealth();
  if (first.awake) return true;

  // Server is sleeping or cold-starting
  onStatusChange('Waking up the server… this may take a few seconds.');

  let delay = INITIAL_DELAY_MS;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await sleep(delay);

    onStatusChange(`Waking up the server… (${attempt}/${MAX_ATTEMPTS})`);

    const { awake } = await checkHealth();
    if (awake) {
      onStatusChange('');
      return true;
    }

    // Exponential back-off with jitter to avoid thundering-herd on Render
    delay = Math.min(delay * 1.6 + Math.random() * 500, MAX_DELAY_MS);
  }

  // Gave up — let the caller decide what to show
  return false;
}

/**
 * A lighter probe: just checks that the server responds at all,
 * without waiting for the DB. Useful for the health-banner component.
 */
export async function isServerResponding() {
  const result = await checkHealth();
  return result.awake;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

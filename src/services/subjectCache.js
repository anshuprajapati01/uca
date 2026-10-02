// Shared cache for subject queries.
//
// The student portal reads subjects from more than one place: the Overview
// widget, the "My Subjects" tab, and the standalone /student/subjects route.
// Each of those used to fire its own Supabase request on mount, so switching
// tabs re-fetched the same rows and the page showed an empty state while it
// waited. This module keeps one entry per query key for a short window and
// collapses concurrent identical requests into a single in-flight promise, so
// a remount of the same query renders instantly instead of refetching.
//
// Results are intentionally short-lived: enrolment changes far less often than
// a student navigates, and a stale-while-revalidate window this small is
// invisible to the user while still avoiding a request storm.

const DEFAULT_TTL_MS = 5 * 60 * 1000;

const cache = new Map();
const inFlight = new Map();

/**
 * Run `fetcher` through the cache.
 *
 * The returned promise always settles naturally: a successful result is cached
 * for `ttl` ms, while a rejected query is not cached and remains retryable on
 * the next mount. Concurrent identical requests share the same in-flight
 * promise, so remounting the same query renders instantly instead of refetching.
 *
 * @param {string} key        Stable identity of the query (e.g. `grid:IT:Semester 4`).
 * @param {() => Promise<any>} fetcher Performs the actual Supabase query.
 * @param {{ ttl?: number, force?: boolean }} [options]
 * @returns {Promise<any>} The cached or freshly fetched value.
 */
export async function fetchCached(key, fetcher, options = {}) {
  const {
    ttl = DEFAULT_TTL_MS,
    force = false,
  } = options;
  const cached = cache.get(key);

  if (!force && cached && Date.now() - cached.storedAt < ttl) {
    return cached.value;
  }

  // A second component asking for the same key while the first is still
  // waiting gets the same promise, not a duplicate round trip.
  const pending = inFlight.get(key);
  if (!force && pending) return pending;

  const request = (async () => {
    try {
      const value = await fetcher();

      cache.set(key, { value, storedAt: Date.now() });
      return value;
    } catch (err) {
      cache.delete(key);
      throw err;
    }
  })();

  // Mark the rejection as handled on this intermediate promise so an abandoned
  // caller (unmounted component) cannot surface an unhandled rejection. Real
  // callers still receive the rejection through `tracked` below.
  request.catch(() => {});

  // Only clear the slot for this exact request, and never cache a failure: a
  // rejected query must stay retryable on the next mount.
  const tracked = request.finally(() => {
    if (inFlight.get(key) === tracked) inFlight.delete(key);
  });
  inFlight.set(key, tracked);
  return tracked;
}

/** Drops cached entries whose key starts with `prefix` (pass "" to clear all). */
export function invalidateSubjectCache(prefix = "") {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/** True when a fresh value for `key` is already cached, for cheap "still loading" checks. */
export function hasCachedSubjects(key, ttl = DEFAULT_TTL_MS) {
  const cached = cache.get(key);
  return Boolean(cached && Date.now() - cached.storedAt < ttl);
}

import { createClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './env.js';

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let client = null;

/**
 * Returns a singleton Supabase client.
 * Initialized lazily so the app builds before `.env.local` is configured.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabase() {
  if (!client) {
    const { url, publishableKey } = getSupabaseEnv();
    client = createClient(url, publishableKey);
  }

  return client;
}

/** Lazy singleton — safe to import; client is created on first use. */
export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const instance = getSupabase();
      const value = instance[prop];

      return typeof value === 'function' ? value.bind(instance) : value;
    },
  },
);

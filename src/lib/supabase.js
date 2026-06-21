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

      if (prop === 'supabaseUrl') return getSupabaseEnv().url;
      if (prop === 'supabaseKey') return getSupabaseEnv().publishableKey;

      return typeof value === 'function' ? value.bind(instance) : value;
    },
  },
);

/**
 * Creates a temporary Supabase client for auth operations without session persistence.
 * Use this when signing up users to avoid interfering with the main session.
 */
export function createTempClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

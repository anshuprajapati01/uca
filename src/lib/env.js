/**
 * Validates required Vite environment variables at runtime.
 * @param {string} key - `import.meta.env` key (must start with VITE_)
 * @returns {string}
 */
export function getRequiredEnv(key) {
  const value = import.meta.env[key];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        'Copy .env.example to .env.local and set your Supabase credentials.',
    );
  }

  return value.trim();
}

/**
 * @returns {{ url: string, publishableKey: string }}
 */
export function getSupabaseEnv() {
  return {
    url: getRequiredEnv('VITE_SUPABASE_URL'),
    publishableKey: getRequiredEnv('VITE_SUPABASE_PUBLISHABLE_KEY'),
  };
}

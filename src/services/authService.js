import { supabase } from '../lib/supabase.js';

/**
 * @param {string} email
 * @param {string} password
 */
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  try {
    localStorage.clear();
    sessionStorage.clear();

    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key);
      }
    }

    supabase.auth.signOut().catch((err) => console.log("Supabase background signout:", err));

    window.location.href = '/';
  } catch (error) {
    console.error("Sign out error:", error);
    window.location.href = '/';
  }
}

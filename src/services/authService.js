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
    // Rely strictly on the official Supabase API to terminate the session.
    await supabase.auth.signOut();

    // Generic cleanup AFTER a successful sign-out: wipes any remaining
    // auth tokens, user filters, and cached items. We deliberately do NOT
    // hardcode Supabase key names (e.g. `sb-...-auth-token`) — a broad clear
    // is forward-compatible with future SDK storage key changes.
    localStorage.clear();
    sessionStorage.clear();

    // Hard navigation resets the in-memory AuthContext state to its initial
    // (null) values and returns the user to a clean, unauthenticated route.
    window.location.href = '/';
  } catch (error) {
    console.error('Sign out error:', error);
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  }
}

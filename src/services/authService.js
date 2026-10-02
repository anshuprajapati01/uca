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
    await supabase.auth.signOut();
  } catch (error) {
    console.warn("Backend signout failed, forcing local cleanup:", error);
  } finally {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  }
}

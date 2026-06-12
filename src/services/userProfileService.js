import { supabase } from '../lib/supabase.js';

/**
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {string} role
 * @property {string | null} [full_name]
 */

/**
 * @param {string} userId - Auth user id (matches user_profiles.id)
 * @returns {Promise<UserProfile>}
 */
export async function fetchUserProfile(userId) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Profile fetch timeout')), 5000);
  });

  const fetchPromise = supabase
    .from('user_profiles')
    .select('id, role, full_name')
    .eq('id', userId)
    .maybeSingle();

  const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('User profile not found.');
  }

  return data;
}
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
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, role, full_name')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('User profile not found.');
  }

  return data;
}

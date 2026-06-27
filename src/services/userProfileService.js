import { supabase } from '../lib/supabase.js';
import { USER_ROLES } from '../config/constants.js';

/**
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {string} role
 * @property {string | null} [full_name]
 * @property {boolean} [can_view_faculty]
 * @property {boolean} [can_view_hod]
 * @property {boolean} inferred
 */

const PROFILES_TABLE = 'user_profiles';

/**
 * Returns a fallback profile inferred from the user's email domain.
 * This is a safe fallback only when no profile row exists in the database.
 * @param {string} userId
 * @param {string} email
 * @returns {UserProfile}
 */
function buildFallbackProfile(userId, email) {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  const lowerEmail = email.toLowerCase();

  let role = USER_ROLES.STUDENT;

  if (domain === 'bit.uca.com' || lowerEmail.startsWith('director@')) {
    role = USER_ROLES.DIRECTOR;
  } else if (lowerEmail.startsWith('hod@')) {
    role = USER_ROLES.HOD;
  } else if (domain === 'faculty.uca.com') {
    role = USER_ROLES.FACULTY;
  }

  return {
    id: userId,
    role,
    full_name: null,
    inferred: true,
  };
}

/**
 * @param {string} userId - Auth user id (matches user_profiles.id)
 * @param {string} [email] - Used as fallback when profile row is missing
 * @returns {Promise<UserProfile>}
 */
export async function fetchUserProfile(userId, email) {
  try {
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select('id, role, full_name, can_view_faculty, can_view_hod, branch_id')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return buildFallbackProfile(userId, email);
    }

    if (data) {
      return { ...data, inferred: false };
    }

    return buildFallbackProfile(userId, email);
  } catch {
    return buildFallbackProfile(userId, email);
  }
}

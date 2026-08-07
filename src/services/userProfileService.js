import { supabase } from '../lib/supabase.js';
import { USER_ROLES } from '../config/constants.js';

/**
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {string} role
 * @property {string | null} [full_name]
 * @property {string | null} [avatar_url]
 * @property {boolean} [can_view_faculty]
 * @property {boolean} [can_view_hod]
 * @property {boolean} inferred
 */

const PROFILES_TABLE = 'user_profiles';

/**
 * Returns a safe fallback profile when no row exists in the user_profiles
 * table. Elevated roles (faculty, hod, director) MUST be granted only via an
 * explicit database row; this fallback always defaults to 'student'.
 * @param {string} userId
 * @returns {UserProfile}
 */
function buildFallbackProfile(userId) {
  return {
    id: userId,
    role: USER_ROLES.STUDENT,
    full_name: null,
    avatar_url: null,
    inferred: true,
  };
}

/**
 * @param {string} userId - Auth user id (matches user_profiles.id)
 * @returns {Promise<UserProfile>}
 */
export async function fetchUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
       .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return buildFallbackProfile(userId);
    }

    if (data) {
      return { ...data, inferred: false };
    }

    return buildFallbackProfile(userId);
  } catch {
    return buildFallbackProfile(userId);
  }
}

/**
 * Lazily fetches only the (potentially large, Base64) avatar_url for a user.
 * Kept separate from fetchUserProfile so the blocking auth load stays lean.
 * @param {string} userId
 * @returns {Promise<string | null>}
 */
export async function fetchUserAvatarUrl(userId) {
  try {
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select('avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.avatar_url ?? null;
  } catch {
    return null;
  }
}

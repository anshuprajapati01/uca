import { createContext } from 'react';

/** @typedef {import('@supabase/supabase-js').Session | null} Session */
/** @typedef {import('@supabase/supabase-js').User | null} User */

/**
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {string} role
 * @property {string | null} [full_name]
 * @property {string | null} [avatar_url]
 * @property {boolean} [can_view_faculty]
 * @property {boolean} [can_view_hod]
 * @property {string | null} [branch_id]
 */

/**
 * @typedef {Object} AuthContextValue
 * @property {Session} session
 * @property {User} user
 * @property {UserProfile | null} profile
 * @property {string | null} role
 * @property {boolean} loading
 * @property {boolean} isAuthenticated
 * @property {string | null} profileError
 * @property {(updates: Partial<UserProfile>) => void} updateProfile
 */

/** @type {import('react').Context<AuthContextValue | null>} */
export const AuthContext = createContext(null);

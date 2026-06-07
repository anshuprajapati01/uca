import { createContext } from 'react';

/** @typedef {import('@supabase/supabase-js').Session | null} Session */
/** @typedef {import('@supabase/supabase-js').User | null} User */

/**
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {string} role
 * @property {string | null} [full_name]
 */

/**
 * @typedef {Object} AuthContextValue
 * @property {Session} session
 * @property {User} user
 * @property {UserProfile | null} profile
 * @property {string | null} role
 * @property {boolean} isLoading
 * @property {boolean} isAuthenticated
 * @property {string | null} profileError
 */

/** @type {import('react').Context<AuthContextValue | null>} */
export const AuthContext = createContext(null);

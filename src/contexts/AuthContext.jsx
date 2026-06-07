import { createContext } from 'react';

/** @typedef {import('@supabase/supabase-js').Session | null} Session */
/** @typedef {import('@supabase/supabase-js').User | null} User */

/**
 * @typedef {Object} AuthContextValue
 * @property {Session} session
 * @property {User} user
 * @property {boolean} isLoading
 * @property {boolean} isAuthenticated
 */

/** @type {import('react').Context<AuthContextValue | null>} */
export const AuthContext = createContext(null);

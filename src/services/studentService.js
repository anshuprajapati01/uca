import { supabase } from '../lib/supabase.js';

/**
 * @typedef {Object} StudentProfile
 * @property {string} id
 * @property {string} role
 * @property {string | null} [full_name]
 * @property {string | null} [roll_number]
 * @property {string | null} [phone]
 * @property {string | null} [college_id]
 * @property {string | null} [batch_id]
 */

/**
 * @param {string} userId
 * @returns {Promise<StudentProfile>}
 */
export async function fetchStudentProfile(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, role, full_name, roll_number, phone, college_id, batch_id')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Student profile not found.');
  }

  return data;
}

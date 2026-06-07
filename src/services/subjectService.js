import { supabase } from '../lib/supabase.js';

/**
 * @typedef {Object} Subject
 * @property {string} id
 * @property {string} batch_id
 * @property {string} name
 * @property {string} code
 * @property {number} credit_hours
 */

/**
 * @param {string} batchId
 * @returns {Promise<Subject[]>}
 */
export async function fetchSubjectsByBatch(batchId) {
  const { data, error } = await supabase
    .from('subjects')
    .select('id, batch_id, name, code, credit_hours')
    .eq('batch_id', batchId);

  if (error) {
    throw error;
  }

  return data || [];
}
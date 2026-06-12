import { supabase } from '../lib/supabase.js';

/**
 * @typedef {Object} Resource
 * @property {string} id
 * @property {string} title
 * @property {string | null} description
 * @property {string} type
 * @property {string | null} file_url
 * @property {string | null} external_url
 * @property {boolean} is_verified
 * @property {string} created_at
 */

export async function uploadNewResource(resourceData, file) {
  if (file) {
    const filePath = `uploads/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('resources')
      .upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('resources').getPublicUrl(filePath);
    resourceData.file_url = data.publicUrl;
  }

  const { data, error: insertError } = await supabase
    .from('resources')
    .insert([resourceData]);
  if (insertError) throw insertError;
  return data;
}

export async function deleteResource(id) {
  const { error } = await supabase
    .from('resources')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function fetchStudentResources() {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

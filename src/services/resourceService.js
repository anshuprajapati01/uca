import { supabase } from '../lib/supabase.js';

const ALLOWED_FILE_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
  'txt',
  'jpg',
  'jpeg',
  'png',
  'mp4',
  'webm',
  'ogg',
  'mov',
]);

const ALLOWED_VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
]);

const getFileExtension = (fileName) => {
  const name = String(fileName || '').trim();
  const lastDotIndex = name.lastIndexOf('.');

  if (lastDotIndex <= 0 || lastDotIndex === name.length - 1) {
    throw new Error('File extension is required.');
  }

  const extension = name.slice(lastDotIndex + 1).toLowerCase();
  if (!/^[a-z0-9]+$/.test(extension)) {
    throw new Error('Unsupported file type. Please upload PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, JPG, JPEG, PNG, MP4, WEBM, OGG, or MOV files.');
  }

  return extension;
};

export const validateAcademicFile = (file) => {
  if (!file?.name) {
    throw new Error('File name is required.');
  }

  const extension = getFileExtension(file.name);
  if (!ALLOWED_FILE_EXTENSIONS.has(extension)) {
    throw new Error('Unsupported file type. Please upload PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, JPG, JPEG, PNG, MP4, WEBM, OGG, or MOV files.');
  }

  if (file.type && ALLOWED_VIDEO_MIME_TYPES.has(file.type)) {
    return extension;
  }

  return extension;
};

export const sanitizeFileName = (fileName) => {
  const extension = validateAcademicFile({ name: fileName });
  const rawName = String(fileName || 'file');
  const nameWithoutExtension = rawName.slice(0, rawName.lastIndexOf('.'));
  const baseName = nameWithoutExtension
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'file';
  const uniqueId = globalThis.crypto?.randomUUID?.() || Date.now().toString(36);

  return `${Date.now()}-${uniqueId}-${baseName}.${extension}`;
};

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
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    resourceData.uploaded_by = user.id;
  }

  if (file) {
    validateAcademicFile(file);
    const filePath = `uploads/${sanitizeFileName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from('resources')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('resources').getPublicUrl(filePath);
    resourceData.file_url = data.publicUrl;
  }

  const { data, error: insertError } = await supabase
    .from('study_materials')
    .insert([resourceData]);
    
  if (insertError) throw insertError;
  
  return data;
}

export async function deleteResource(id) {
  const { error } = await supabase
    .from('study_materials')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
}

export async function fetchStudentResources() {
  const { data, error } = await supabase
    .from('study_materials')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}
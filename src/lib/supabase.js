import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const uploadClip = async (file, userId) => {
  const filename = `${userId}/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from(import.meta.env.VITE_STORAGE_BUCKET)
    .upload(filename, file);

  if (error) throw error;
  return data;
};
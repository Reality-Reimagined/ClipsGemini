import { supabase } from '../supabase';

export const createVideoResultsTable = async () => {
  const { error } = await supabase.rpc('create_video_results_table');

  if (error) {
    console.error('Error creating video_results table:', error);
    throw error;
  }
};
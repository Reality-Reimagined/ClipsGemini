import { supabase } from '../supabase';

export const createVideoResultsTable = async () => {
  const { error } = await supabase.rpc('create_video_results_table', {
    sql: `
      CREATE TABLE IF NOT EXISTS public.video_results (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        clips JSONB,
        highlights_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
      );

      CREATE INDEX IF NOT EXISTS idx_video_results_user_id ON public.video_results(user_id);
      
      ALTER TABLE public.video_results ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Users can only access their own video results"
        ON public.video_results
        FOR ALL
        USING (auth.uid() = user_id);
    `
  });

  if (error) {
    console.error('Error creating video_results table:', error);
    throw error;
  }
};
import { create } from 'zustand';
import { supabase } from './supabase';
import useAuthStore from '../stores/authStore';
import { createVideoResultsTable } from './migrations/createVideoResults';

const initializeDatabase = async () => {
  try {
    await createVideoResultsTable();
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

// Initialize database tables
initializeDatabase();

const useVideoStore = create((set, get) => ({
  clips: [],
  highlightsUrl: null,
  isLoading: false,
  error: null,
  
  setClips: (clips) => set({ clips }),
  setHighlightsUrl: (url) => set({ highlightsUrl: url }),
  
  // Save clips and highlights to Supabase
  saveVideoResults: async (clips, highlightsUrl) => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await supabase
        .from('video_results')
        .upsert({
          user_id: user.id,
          clips: clips,
          highlights_url: highlightsUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .single();

      if (error) {
        if (error.code === '42P01') { // Table doesn't exist
          await createVideoResultsTable();
          return await get().saveVideoResults(clips, highlightsUrl);
        }
        throw error;
      }
      
      set({ 
        clips: clips,
        highlightsUrl: highlightsUrl,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error saving video results:', error);
      set({ error: error.message, isLoading: false });
      // Keep the clips in state even if save fails
      set({ clips, highlightsUrl });
    }
  },

  // Load saved clips and highlights from Supabase
  loadVideoResults: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await supabase
        .from('video_results')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === '42P01') { // Table doesn't exist
          await createVideoResultsTable();
          return await get().loadVideoResults();
        }
        if (error.code !== 'PGRST116') throw error; // Ignore "no rows returned" error
      }
      
      if (data) {
        set({ 
          clips: data.clips || [],
          highlightsUrl: data.highlights_url,
          isLoading: false 
        });
      } else {
        set({ 
          clips: [],
          highlightsUrl: null,
          isLoading: false 
        });
      }
    } catch (error) {
      console.error('Error loading video results:', error);
      set({ error: error.message, isLoading: false });
    }
  },
  
  // Clear everything - both state and database
  clearContent: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      set({ isLoading: true, error: null });
      
      const { error } = await supabase
        .from('video_results')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        if (error.code === '42P01') { // Table doesn't exist
          await createVideoResultsTable();
        } else {
          throw error;
        }
      }
      
      set({ 
        clips: [], 
        highlightsUrl: null,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error clearing video results:', error);
      set({ error: error.message, isLoading: false });
    }
  }
}));

export default useVideoStore;
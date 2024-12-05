import { create } from 'zustand';

const useVideoStore = create((set) => ({
  clips: [],
  highlightsUrl: null,
  
  setClips: (clips) => set({ clips }),
  setHighlightsUrl: (url) => set({ highlightsUrl: url }),
  
  // Clear everything
  clearContent: () => set({ clips: [], highlightsUrl: null }),
}));

export default useVideoStore; 
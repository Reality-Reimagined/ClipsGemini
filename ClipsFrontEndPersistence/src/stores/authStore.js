import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { startOfMonth } from 'date-fns';

const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  subscription: {
    plan: 'free',
    clipLimit: 3,
    renewalDate: startOfMonth(new Date()),
    status: 'active'
  },
  clipCount: 0,
  
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setSubscription: (subscription) => set({ subscription }),
  setClipCount: (clipCount) => set({ clipCount }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ 
      user: null, 
      session: null, 
      subscription: {
        plan: 'free',
        clipLimit: 3,
        renewalDate: startOfMonth(new Date()),
        status: 'active'
      }, 
      clipCount: 0 
    });
  },

  incrementClipCount: () => set((state) => ({ clipCount: state.clipCount + 1 })),

  fetchSubscriptionDetails: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('subscription_tier, subscription_status')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const subscription = {
        plan: data.subscription_tier,
        status: data.subscription_status,
        clipLimit: data.subscription_tier === 'free' ? 3 : 
                  data.subscription_tier === 'basic' ? 30 : 100,
        renewalDate: startOfMonth(new Date())
      };

      set({ subscription });
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  }
}));

export default useAuthStore;
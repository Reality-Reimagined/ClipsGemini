import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { startOfMonth } from 'date-fns';

const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  subscription: {
    subscription_tier: 'free',
    subscription_status: 'active',
    stripe_customer_id: null
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
        subscription_tier: 'free',
        subscription_status: 'active',
        stripe_customer_id: null
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
        .select('email, subscription_tier, subscription_status, stripe_customer_id')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        // Use get().setSubscription instead of setSubscription directly
        get().setSubscription({
          subscription_tier: data.subscription_tier || 'free',
          subscription_status: data.subscription_status || 'active',
          stripe_customer_id: data.stripe_customer_id || null
        });
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      // Optionally set a default state on error
      get().setSubscription({
        subscription_tier: 'free',
        subscription_status: 'active',
        stripe_customer_id: null
      });
    }
  },

  // Add method to update subscription
  updateSubscription: async (subscriptionData) => {
    const { user } = get();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          subscription_tier: subscriptionData.subscription_tier,
          subscription_status: subscriptionData.subscription_status,
          stripe_customer_id: subscriptionData.stripe_customer_id
        })
        .eq('user_id', user.id);

      if (error) throw error;

      get().setSubscription(subscriptionData);
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }
}));

export default useAuthStore;

// import { create } from 'zustand';
// import { supabase } from '../lib/supabase';
// import { startOfMonth } from 'date-fns';

// const useAuthStore = create((set, get) => ({
//   user: null,
//   session: null,
//   subscription: {
//     plan: 'free',
//     clipLimit: 3,
//     renewalDate: startOfMonth(new Date()),
//     status: 'active'
//   },
//   clipCount: 0,
  
//   setUser: (user) => set({ user }),
//   setSession: (session) => set({ session }),
//   setSubscription: (subscription) => set({ subscription }),
//   setClipCount: (clipCount) => set({ clipCount }),

//   signOut: async () => {
//     await supabase.auth.signOut();
//     set({ 
//       user: null, 
//       session: null, 
//       subscription: {
//         plan: 'free',
//         clipLimit: 3,
//         renewalDate: startOfMonth(new Date()),
//         status: 'active'
//       }, 
//       clipCount: 0 
//     });
//   },

//   incrementClipCount: () => set((state) => ({ clipCount: state.clipCount + 1 })),

//   fetchSubscriptionDetails: async () => {
//     const { user } = get();
//     if (!user) return;

//     try {
//       const { data, error } = await supabase
//         .from('users')
//         .select('email, subscription_tier, subscription_status')
//         .eq('user_id', user.id)
//         .single();

//       if (error) throw error;

//       if (data) {
//         setSubscription({
//           subscription_tier: data.subscription_tier,
//           subscription_status: data.subscription_status
//         });
//       }
//     } catch (error) {
//       console.error('Error fetching subscription:', error);
//     }
//   }
// }));

// export default useAuthStore;
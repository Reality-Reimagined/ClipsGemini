import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { startOfMonth, endOfMonth } from 'date-fns';
import useAuthStore from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { subscriptionPlans } from '../lib/stripe';

export function useVideoLimits() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [monthlyUsage, setMonthlyUsage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);

  const fetchMonthlyUsage = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch user subscription status
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('subscription_tier, subscription_status')
        .eq('user_id', user.id)
        .single();

      if (userError) throw userError;

      // Fetch usage count
      const { data: usageData, error: usageError } = await supabase
        .from('user_usage')
        .select('monthly_count')
        .eq('user_id', user.id)
        .single();

      if (usageError && usageError.code !== 'PGRST116') {
        throw usageError;
      }

      setMonthlyUsage(usageData?.monthly_count || 0);
      setSubscription(userData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch usage data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyUsage();

    // Set up real-time subscription for usage updates
    const usageChannel = supabase
      .channel('user_usage_changes')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'user_usage',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          fetchMonthlyUsage();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(usageChannel);
    };
  }, [user]);

  const checkVideoLimit = async () => {
    await fetchMonthlyUsage(); // Refresh usage before checking

    const planLimit = subscriptionPlans[subscription?.subscription_tier || 'free']?.clipLimit || 3;
    
    if (monthlyUsage >= planLimit) {
      toast.error(`You have reached your monthly limit of ${planLimit} videos`);
      navigate('/subscription');
      return false;
    }
    return true;
  };

  const incrementUsage = async () => {
    try {
      // First check if a record exists
      const { data: existingRecord, error: checkError } = await supabase
        .from('user_usage')
        .select('monthly_count')
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingRecord) {
        // Update existing record
        const { data, error: updateError } = await supabase
          .from('user_usage')
          .update({
            monthly_count: existingRecord.monthly_count + 1,
            last_updated: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .select();

        if (updateError) throw updateError;
        
        if (data?.[0]) {
          setMonthlyUsage(data[0].monthly_count);
        }
      } else {
        // Insert new record
        const { data, error: insertError } = await supabase
          .from('user_usage')
          .insert({
            user_id: user.id,
            monthly_count: 1,
            last_updated: new Date().toISOString()
          })
          .select();

        if (insertError) throw insertError;
        
        if (data?.[0]) {
          setMonthlyUsage(data[0].monthly_count);
        }
      }
    } catch (error) {
      console.error('Error incrementing usage:', error);
      throw error;
    }
  };

  return {
    monthlyUsage,
    isLoading,
    checkVideoLimit,
    incrementUsage,
    subscription,
    refreshUsage: fetchMonthlyUsage
  };
}
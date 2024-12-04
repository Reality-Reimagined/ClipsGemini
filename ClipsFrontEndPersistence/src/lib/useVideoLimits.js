import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { startOfMonth, endOfMonth } from 'date-fns';
import useAuthStore from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export function useVideoLimits() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [monthlyUsage, setMonthlyUsage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchMonthlyUsage = async () => {
      setIsLoading(true);
      try {
        const startDate = startOfMonth(new Date());
        const endDate = endOfMonth(new Date());

        const { data: userData, error: userError } = await supabase
          .from('user_usage')
          .select('monthly_count')
          .eq('user_id', user.id)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          console.error('Error fetching user usage:', userError);
          toast.error('Failed to fetch usage data');
          return;
        }

        setMonthlyUsage(userData?.monthly_count || 0);
      } catch (error) {
        console.error('Error fetching monthly usage:', error);
        toast.error('Failed to fetch usage data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonthlyUsage();
  }, [user]);

  const checkVideoLimit = async () => {
    if (monthlyUsage >= 3) {
      toast.error('You have reached your monthly limit of 3 free videos');
      navigate('/subscription');
      return false;
    }
    return true;
  };

  const incrementUsage = async () => {
    try {
      const { data, error } = await supabase
        .from('user_usage')
        .upsert({
          user_id: user.id,
          monthly_count: monthlyUsage + 1,
          last_updated: new Date().toISOString()
        })
        .single();

      if (error) throw error;
      setMonthlyUsage(prev => prev + 1);
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  };

  return {
    monthlyUsage,
    isLoading,
    checkVideoLimit,
    incrementUsage
  };
}
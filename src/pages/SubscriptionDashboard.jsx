import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import useAuthStore from '../stores/authStore';
import { subscriptionPlans } from '../lib/stripe';
import SubscriptionPlans from '../components/SubscriptionPlans';
import { useVideoLimits } from '../lib/useVideoLimits';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import VideoHistory from '../components/VideoHistory';

function SubscriptionDashboard() {
  const { user, subscription, fetchSubscriptionDetails } = useAuthStore();
  const { monthlyUsage, isLoading, refreshUsage } = useVideoLimits();
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetchSubscriptionDetails();
  }, [fetchSubscriptionDetails]);

  // Get subscription details from the user's data
  const currentPlan = subscription?.subscription_tier || 'free';
  const subscriptionStatus = subscription?.subscription_status || 'inactive';
  const planDetails = subscriptionPlans[currentPlan];
  
  // Calculate next reset date
  const nextResetDate = new Date();
  nextResetDate.setMonth(nextResetDate.getMonth() + 1);
  nextResetDate.setDate(1);

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) {
      return;
    }

    setIsCancelling(true);
    try {
      console.log('Starting cancellation...'); // Debug log
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session found');
      }

      const response = await fetch('https://super-sloth-deep.ngrok-free.app/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });

      console.log('Response status:', response.status); // Debug log

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to cancel subscription');
      }

      toast.success('Subscription cancelled successfully');
      refreshUsage();
      fetchSubscriptionDetails(); // Refresh subscription details
      
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error(error.message || 'Failed to cancel subscription');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4">
      <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-emerald-500">
          Current Subscription
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-purple-800">Account Details</h3>
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-lg shadow-sm border border-purple-100">
                <p className="text-sm text-purple-400 uppercase tracking-wider">Email</p>
                <p className="text-lg text-purple-900">{user?.email || 'Not available'}</p>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm border border-purple-100">
                <p className="text-sm text-purple-400 uppercase tracking-wider">Current Plan</p>
                <p className="text-lg text-purple-900">{planDetails?.name || 'Free'}</p>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm border border-purple-100">
                <p className="text-sm text-purple-400 uppercase tracking-wider">Clips Used</p>
                <p className="text-lg text-purple-900">
                  {!isLoading ? monthlyUsage : '...'} / {planDetails?.clipLimit || 3}
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-purple-800">Billing Details</h3>
            {currentPlan !== 'free' ? (
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-lg shadow-sm border border-purple-100">
                  <p className="text-sm text-purple-400 uppercase tracking-wider">Next Billing Date</p>
                  <p className="text-lg text-purple-900">{format(nextResetDate, 'PPP')}</p>
                </div>
                {subscriptionStatus === 'active' && (
                  <div className="mt-6 text-right">
                    <button
                      onClick={handleCancelSubscription}
                      disabled={isCancelling}
                      className="px-4 py-2 text-sm text-purple-600 hover:text-purple-700
                               underline underline-offset-4 transition-colors duration-200"
                    >
                      {isCancelling ? 'Processing...' : 'Cancel Subscription'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg text-white">
                <p className="font-medium">Ready to unlock more features?</p>
                <p className="text-emerald-100 mt-1">Upgrade your plan today!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {currentPlan === 'free' && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Upgrade Your Plan</h2>
          <SubscriptionPlans showSubscribeButton={true} />
        </div>
      )}

      <VideoHistory />
    </div>
  );
}

export default SubscriptionDashboard;

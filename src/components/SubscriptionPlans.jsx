import React, { useState } from 'react';
import { subscriptionPlans } from '../lib/stripe';
import useAuthStore from '../stores/authStore';
import { loadStripe } from '@stripe/stripe-js';
import { useVideoLimits } from '../lib/useVideoLimits';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function SubscriptionPlans({ showSubscribeButton = true }) {
  const { subscription } = useAuthStore();
  const { monthlyUsage, isLoading, refreshUsage } = useVideoLimits();
  // const [isCancelling, setIsCancelling] = useState(false);
  const currentPlan = subscription?.subscription_tier || 'free';

  const handleSubscribe = async (priceId) => {
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        toast.error('Stripe failed to load. Please try again.');
        return;
      }

      const { user } = useAuthStore.getState();
      if (!user) {
        toast.error('Please log in to subscribe');
        return;
      }

      toast.loading('Preparing checkout...');

      const response = await fetch('https://super-sloth-deep.ngrok-free.app/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ 
          price_id: priceId,
          user_id: user.id
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create checkout session');
      }

      const { sessionId } = await response.json();
      if (!sessionId) {
        throw new Error('Invalid checkout session');
      }

      toast.dismiss(); // Remove loading toast
      
      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) {
        throw error;
      }
      
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error(error.message || 'Failed to start checkout process. Please try again.');
      toast.dismiss();
    }
  };

  // const handleCancelSubscription = async () => {
  //   if (!confirm('Are you sure you want to cancel your subscription?')) {
  //     return;
  //   }

  //   setIsCancelling(true);
  //   try {
  //     // Get the session properly
  //     const { data: { session } } = await supabase.auth.getSession();
  //     if (!session) {
  //       throw new Error('No active session found');
  //     }

  //     const response = await fetch('https://super-sloth-deep.ngrok-free.app/cancel-subscription', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${session.access_token}`,
  //         'ngrok-skip-browser-warning': 'true'
  //       }
  //     });

  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.detail || 'Failed to cancel subscription');
  //     }

  //     toast.success('Subscription cancelled successfully');
  //     refreshUsage(); // Refresh the usage data
      
  //     // Refresh the subscription status in auth store
  //     const { user } = useAuthStore.getState();
  //     if (user) {
  //       const { data: userData } = await supabase
  //         .from('users')
  //         .select('subscription_status, subscription_tier')
  //         .eq('user_id', user.id)
  //         .single();
          
  //       useAuthStore.setState({ subscription: userData });
  //     }
      
  //   } catch (error) {
  //     console.error('Error cancelling subscription:', error);
  //     toast.error(error.message || 'Failed to cancel subscription');
  //   } finally {
  //     setIsCancelling(false);
  //   }
  // };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Subscription Plans</h2>
      
      {/* Subscription Status */}
      {/* {showSubscribeButton && subscription && !isLoading && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          
          {subscription.subscription_status === 'active' && currentPlan !== 'free' && (
            <button 
              onClick={handleCancelSubscription}
              disabled={isCancelling}
              className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 
                       disabled:bg-red-300 disabled:cursor-not-allowed"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
            </button>
          )}
        </div>
      )} */}

      {/* Plan Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {Object.entries(subscriptionPlans).map(([key, plan]) => (
          <div 
            key={key} 
            className={`border rounded-lg p-6 flex flex-col ${
              currentPlan === key ? 'border-indigo-600 border-2' : ''
            }`}
          >
            <h3 className="text-xl font-semibold">{plan.name}</h3>
            <p className="text-3xl font-bold mt-4">
              ${plan.price}<span className="text-sm font-normal">/month</span>
            </p>
            <ul className="mt-6 space-y-4 flex-grow">
              <li>✓ {plan.clipLimit} clips per month</li>
              {key === 'free' && (
                <li>✓ {plan.clipDuration} seconds per clip</li>
              )}
              {key !== 'free' && (
                <>
                  <li>✓ Unlimited clip duration</li>
                  <li>✓ Priority processing</li>
                  <li>✓ Advanced analytics</li>
                </>
              )}
            </ul>
            {showSubscribeButton && (
              <button
                onClick={() => handleSubscribe(plan.priceId)}
                disabled={currentPlan === key}
                className={`mt-6 w-full py-2 px-4 rounded-md text-sm font-medium
                  ${currentPlan === key 
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              >
                {currentPlan === key ? 'Current Plan' : 'Subscribe'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SubscriptionPlans;
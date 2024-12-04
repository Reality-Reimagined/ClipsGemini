import React from 'react';
import { subscriptionPlans } from '../lib/stripe';
import useAuthStore from '../stores/authStore';
import { loadStripe } from '@stripe/stripe-js';
import { useVideoLimits } from '../lib/useVideoLimits';
import { toast } from 'react-hot-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function SubscriptionPlans({ showSubscribeButton = true }) {
  const { subscription } = useAuthStore();
  const { monthlyUsage, isLoading } = useVideoLimits();

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
          priceId,
          userId: user.id 
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
      toast.dismiss(); // Remove loading toast if it's still showing
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Subscription Plans</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {Object.entries(subscriptionPlans).map(([key, plan]) => (
          <div key={key} className="border rounded-lg p-6 flex flex-col">
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
                disabled={subscription?.plan === key}
                className={`mt-6 w-full py-2 px-4 rounded-md text-sm font-medium
                  ${subscription?.plan === key 
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              >
                {subscription?.plan === key ? 'Current Plan' : 'Subscribe'}
              </button>
            )}
          </div>
        ))}
      </div>
      {showSubscribeButton && subscription && !isLoading && (
        <div className="mt-6 text-center text-sm text-gray-600">
          Clips remaining this month: {3 - monthlyUsage}
          <div className="mt-2">
            Videos created this month: {monthlyUsage}
          </div>
        </div>
      )}
    </div>
  );
}

export default SubscriptionPlans;
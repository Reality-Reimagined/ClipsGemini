import React, { useEffect } from 'react';
import { format } from 'date-fns';
import useAuthStore from '../stores/authStore';
import { subscriptionPlans } from '../lib/stripe';
import SubscriptionPlans from '../components/SubscriptionPlans';
import { useVideoLimits } from '../lib/useVideoLimits';

function SubscriptionDashboard() {
  const { subscription, fetchSubscriptionDetails } = useAuthStore();
  const { monthlyUsage, isLoading } = useVideoLimits();

  useEffect(() => {
    fetchSubscriptionDetails();
  }, [fetchSubscriptionDetails]);

  const currentPlan = subscription?.plan || 'free';
  const planDetails = subscriptionPlans[currentPlan];
  const nextResetDate = new Date();
  nextResetDate.setMonth(nextResetDate.getMonth() + 1);
  nextResetDate.setDate(1);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Current Subscription</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-semibold">Plan Details</h3>
            <p className="text-gray-600">
              Current Plan: {planDetails?.name || 'Free'}
            </p>
            <p className="text-gray-600">
              Clips Used: {!isLoading ? monthlyUsage : '...'} / {planDetails?.clipLimit || 3}
            </p>
            <p className="text-gray-600">
              Next Reset: {format(nextResetDate, 'PPP')}
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Billing</h3>
            {currentPlan !== 'free' ? (
              <>
                <p className="text-gray-600">
                  Next billing date: {format(nextResetDate, 'PPP')}
                </p>
                <button
                  onClick={() => {/* Handle cancellation */}}
                  className="mt-2 text-red-600 hover:text-red-700"
                >
                  Cancel Subscription
                </button>
              </>
            ) : (
              <p className="text-gray-600">No active paid subscription</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Available Plans</h2>
        <SubscriptionPlans showSubscribeButton={true} />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Usage History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clips Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Usage history will be implemented later */}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionDashboard;
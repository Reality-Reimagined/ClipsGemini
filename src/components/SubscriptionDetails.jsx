import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../lib/api'; // Make sure this points to your backend URL

function SubscriptionDetails({ onSubscriptionChange }) {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.auth.getSession()?.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to cancel subscription');
      }

      toast.success('Subscription cancelled successfully');
      
      // Refresh the page or update the subscription state
      if (onSubscriptionChange) {
        onSubscriptionChange();
      }
      
      // Optionally redirect to subscription page
      navigate('/subscription');
      
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* ... other subscription details ... */}
      <button
        onClick={handleCancelSubscription}
        disabled={isLoading}
        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded
                   disabled:bg-red-300 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Cancelling...' : 'Cancel Subscription'}
      </button>
    </div>
  );
}

export default SubscriptionDetails; 
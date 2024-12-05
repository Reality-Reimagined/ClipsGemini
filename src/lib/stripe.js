import { loadStripe } from '@stripe/stripe-js';

export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export const subscriptionPlans = {
  free: {
    name: 'Free',
    clipLimit: parseInt(import.meta.env.FREE_PLAN_LIMIT || '3'),
    clipDuration: parseInt(import.meta.env.FREE_PLAN_DURATION || '120'),
    price: 0,
  },
  regular: {
    name: 'Regular Clipper',
    clipLimit: parseInt(import.meta.env.REGULAR_PLAN_LIMIT || '30'),
    price: 100,
    priceId: 'price_1QPI1eHJURPFbP5mk9y6XFZX',
  },
  pro: {
    name: 'Pro Clipper',
    clipLimit: parseInt(import.meta.env.PRO_PLAN_LIMIT || '100'),
    price: 200,
    priceId: 'price_1QPI5QHJURPFbP5mzpIrOW6M',
  },
};
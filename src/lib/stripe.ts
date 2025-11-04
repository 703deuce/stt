import Stripe from 'stripe';

// Initialize Stripe with secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
  typescript: true,
});

// Stripe Price IDs - all from environment variables
export const STRIPE_PRICES = {
  // Subscription Plans
  'transcription-only': process.env.STRIPE_PRICE_TRANSCRIPTION_ONLY || process.env.STRIPE_PRICE_SOLO || 'price_1MywhCKjM2RWgyrvmmJvdIYP',
  'creator': process.env.STRIPE_PRICE_CREATOR || process.env.STRIPE_PRICE_TEAM || 'price_1MywdsKjM2RWgyrvmPsAYWr1',
  
  // Legacy plans (keeping for backwards compatibility)
  solo: process.env.STRIPE_PRICE_SOLO || 'price_1MywhCKjM2RWgyrvmmJvdIYP',
  team: process.env.STRIPE_PRICE_TEAM || 'price_1MywdsKjM2RWgyrvmPsAYWr1',
};

// Price configuration for reference
export const PRICE_CONFIG = {
  'transcription-only': {
    priceId: STRIPE_PRICES['transcription-only'],
    name: 'Transcription Only',
    amount: 17.99,
    interval: 'month',
    type: 'subscription',
    features: {
      transcriptionMinutes: Infinity,
      contentWords: 0,
    },
  },
  'creator': {
    priceId: STRIPE_PRICES['creator'],
    name: 'Creator Plan',
    amount: 34.99,
    interval: 'month',
    type: 'subscription',
    features: {
      transcriptionMinutes: Infinity,
      contentWords: Infinity, // Unlimited
    },
  },
  // Legacy configurations
  solo: {
    priceId: STRIPE_PRICES.solo,
    name: 'Solo Unlimited',
    amount: 17.99,
    interval: 'month',
    type: 'subscription',
    minUsers: 1,
  },
  team: {
    priceId: STRIPE_PRICES.team,
    name: 'Team Unlimited',
    amount: 34.99,
    interval: 'month',
    type: 'subscription',
    minUsers: 1,
  },
};



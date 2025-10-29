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
  'pro': process.env.STRIPE_PRICE_PRO || process.env.STRIPE_PRICE_AGENCY || 'price_1MywspKjM2RWgyrvgAkbXZKc',
  'studio': process.env.STRIPE_PRICE_STUDIO || 'price_1MywZVKjM2RWgyrvMwM0zk2R',
  
  // One-Time Boosts
  'boost-5k': process.env.STRIPE_PRICE_BOOST_5K || 'price_1MywHsKjM2RWgyrvlOo4EsX7',
  'boost-10k': process.env.STRIPE_PRICE_BOOST_10K || 'price_1MywALKjM2RWgyrvhGdtjTKx',
  'boost-50k': process.env.STRIPE_PRICE_BOOST_50K || 'price_1Myx5yKjM2RWgyrvf5kU5CtV',
  
  // Legacy plans (keeping for backwards compatibility)
  solo: process.env.STRIPE_PRICE_SOLO || 'price_1MywhCKjM2RWgyrvmmJvdIYP',
  team: process.env.STRIPE_PRICE_TEAM || 'price_1MywdsKjM2RWgyrvmPsAYWr1',
  agency: process.env.STRIPE_PRICE_AGENCY || 'price_1MywspKjM2RWgyrvgAkbXZKc',
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
    amount: 24.99,
    interval: 'month',
    type: 'subscription',
    features: {
      transcriptionMinutes: Infinity,
      contentWords: 20000,
    },
  },
  'pro': {
    priceId: STRIPE_PRICES['pro'],
    name: 'Pro Plan',
    amount: 49.99,
    interval: 'month',
    type: 'subscription',
    features: {
      transcriptionMinutes: Infinity,
      contentWords: 100000,
    },
  },
  'studio': {
    priceId: STRIPE_PRICES['studio'],
    name: 'Studio Plan',
    amount: 89.99,
    interval: 'month',
    type: 'subscription',
    features: {
      transcriptionMinutes: Infinity,
      contentWords: 400000,
    },
  },
  'boost-5k': {
    priceId: STRIPE_PRICES['boost-5k'],
    name: 'Quick Boost - 5,000 Words',
    amount: 6.99,
    type: 'one-time',
    features: {
      contentWords: 5000,
    },
  },
  'boost-10k': {
    priceId: STRIPE_PRICES['boost-10k'],
    name: 'Standard Boost - 10,000 Words',
    amount: 11.99,
    type: 'one-time',
    features: {
      contentWords: 10000,
    },
  },
  'boost-50k': {
    priceId: STRIPE_PRICES['boost-50k'],
    name: 'Pro Boost - 50,000 Words',
    amount: 29.99,
    type: 'one-time',
    features: {
      contentWords: 50000,
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
    amount: 12.99,
    interval: 'month',
    type: 'subscription',
    minUsers: 3,
  },
  agency: {
    priceId: STRIPE_PRICES.agency,
    name: 'Agency Unlimited',
    amount: 10.99,
    interval: 'month',
    type: 'subscription',
    minUsers: 10,
  },
};


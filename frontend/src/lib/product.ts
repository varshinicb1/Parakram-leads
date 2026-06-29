export const PRODUCT = {
  companyName: 'Parakram',
  productName: 'Parakram Leads',
  tagline: 'Autonomous lead intelligence for every market',
  description: 'AI-powered discovery, scoring, outreach, and response intelligence for global B2B teams.',
  defaultCurrency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || 'USD',
  defaultLocale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'en-US',
};

export const PRICING_TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 3,
    leadLimit: 250,
    aiCredits: 50,
    audience: 'Solo operators and micro agencies',
  },
  {
    id: 'growth',
    name: 'Growth',
    priceMonthly: 19,
    leadLimit: 2500,
    aiCredits: 500,
    audience: 'Growing sales teams',
  },
  {
    id: 'business',
    name: 'Business',
    priceMonthly: 99,
    leadLimit: 15000,
    aiCredits: 3000,
    audience: 'Agencies and outbound teams',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: null,
    leadLimit: null,
    aiCredits: null,
    audience: 'Global teams needing custom controls',
  },
] as const;

export const CORE_STACK = [
  { name: 'Next.js', reason: 'production web app, routing, SSR, deployment portability' },
  { name: 'React', reason: 'interactive dashboard foundation and React Native reuse path' },
  { name: 'TanStack Query', reason: 'server-state caching, retries, mutations, optimistic UX' },
  { name: 'Tailwind CSS', reason: 'fast premium UI system with strict visual consistency' },
  { name: 'Framer Motion', reason: 'high-quality motion for premium product feel' },
  { name: 'Zod', reason: 'runtime validation for forms, API payloads, and imports' },
  { name: 'Recharts', reason: 'business analytics and revenue intelligence charts' },
] as const;

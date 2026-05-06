# Rover ATS Vercel Deployment

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local`.
3. Fill Clerk, Gemini, Stripe, and Razorpay keys.
4. Run:
   ```bash
   npm run dev
   ```

## Required Vercel environment variables

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PRICE_ID`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`

## Notes

- Payment status currently uses an in-memory mock store and resets on server restart.
- Replace `lib/payment-store.js` with Prisma, Supabase, Neon, or another persistent database before production launch.
- Rotate any API keys that were committed or shared during development.

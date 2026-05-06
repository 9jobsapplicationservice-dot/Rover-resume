import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getCurrentUserId } from "@/lib/auth";

export async function POST() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: userId,
      line_items: [
        process.env.STRIPE_PRICE_ID
          ? { price: process.env.STRIPE_PRICE_ID, quantity: 1 }
          : {
              price_data: {
                currency: "usd",
                product_data: { name: "Rover ATS Premium" },
                unit_amount: 999,
              },
              quantity: 1,
            },
      ],
      success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/payment/cancel`,
      metadata: { userId },
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Stripe checkout failed." }, { status: 500 });
  }
}

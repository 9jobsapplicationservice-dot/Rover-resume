import { NextResponse } from "next/server";
import { markUserPremium } from "@/lib/payment-store";
import { getStripe } from "@/lib/stripe";
import { getCurrentUserId } from "@/lib/auth";

export async function POST(request) {
  try {
    const userId = await getCurrentUserId();
    const { sessionId } = await request.json();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!sessionId) return NextResponse.json({ error: "Missing Stripe session." }, { status: 400 });

    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid" || (session.client_reference_id && session.client_reference_id !== userId)) {
      return NextResponse.json({ error: "Payment is not verified." }, { status: 400 });
    }
    markUserPremium(userId, "stripe", session.id);
    return NextResponse.json({ premium: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Stripe verification failed." }, { status: 500 });
  }
}

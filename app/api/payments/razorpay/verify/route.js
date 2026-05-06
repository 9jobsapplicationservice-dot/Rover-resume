import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { markUserPremium } from "@/lib/payment-store";
import { getCurrentUserId } from "@/lib/auth";

export async function POST(request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "").update(body).digest("hex");
    if (!razorpay_signature || expected !== razorpay_signature) {
      return NextResponse.json({ error: "Razorpay signature verification failed." }, { status: 400 });
    }
    markUserPremium(userId, "razorpay", razorpay_payment_id);
    return NextResponse.json({ premium: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Razorpay verification failed." }, { status: 500 });
  }
}

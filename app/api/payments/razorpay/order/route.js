import { NextResponse } from "next/server";
import { getRazorpay } from "@/lib/razorpay";
import { getCurrentUserId } from "@/lib/auth";

export async function POST() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const order = await getRazorpay().orders.create({
      amount: 99900,
      currency: "INR",
      receipt: `rover_${userId.slice(0, 20)}_${Date.now()}`,
      notes: { userId, plan: "premium" },
    });
    return NextResponse.json({ order, keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Razorpay order failed." }, { status: 500 });
  }
}

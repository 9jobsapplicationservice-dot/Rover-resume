import { NextResponse } from "next/server";
import { getPaymentStatus } from "@/lib/payment-store";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(getPaymentStatus(userId));
}

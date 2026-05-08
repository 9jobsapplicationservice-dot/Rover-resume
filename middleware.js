import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { validClerkPublishableKey, validClerkSecretKey } from "./lib/clerk-keys.js";

const isProtectedApi = createRouteMatcher([
  "/api/resume/optimize(.*)",
  "/api/resume/score(.*)",
  "/api/payments/status(.*)",
  "/api/payments/stripe/checkout(.*)",
  "/api/payments/stripe/verify(.*)",
  "/api/payments/razorpay/order(.*)",
  "/api/payments/razorpay/verify(.*)",
]);

function clerkReady() {
  return Boolean(
    validClerkPublishableKey(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
      validClerkSecretKey(process.env.CLERK_SECRET_KEY),
  );
}

const clerkAuthMiddleware = clerkMiddleware(async (auth, request) => {
  if (isProtectedApi(request)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

export default function middleware(request, event) {
  if (!isProtectedApi(request)) {
    return NextResponse.next();
  }

  if (!clerkReady()) {
    return NextResponse.json(
      { error: "Authentication is unavailable. Clerk keys are not configured." },
      { status: 401 },
    );
  }

  return clerkAuthMiddleware(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

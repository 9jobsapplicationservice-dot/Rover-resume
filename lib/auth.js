import { auth } from "@clerk/nextjs/server";
import { validClerkPublishableKey, validClerkSecretKey } from "@/lib/clerk-keys";

export function clerkConfigured() {
  return Boolean(validClerkPublishableKey(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) && validClerkSecretKey(process.env.CLERK_SECRET_KEY));
}

export async function getCurrentUserId() {
  if (!clerkConfigured()) return null;
  try {
    const { userId } = await auth();
    return userId;
  } catch {
    return null;
  }
}

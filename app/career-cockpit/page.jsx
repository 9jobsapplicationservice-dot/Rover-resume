import { ResumeBuilder } from "@/components/ResumeBuilder";
import { isPremiumUser } from "@/lib/payment-store";
import { getCurrentUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Resume Builder | Rover ATS",
  description: "Rover ATS resume builder workspace.",
};

export default async function CareerCockpitPage() {
  const userId = await getCurrentUserId();

  return <ResumeBuilder initialPremium={userId ? isPremiumUser(userId) : false} initialSignedIn={Boolean(userId)} />;
}

import { ResumeBuilder } from "@/components/ResumeBuilder";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Resume Builder | Rover ATS",
  description: "Rover ATS resume builder workspace.",
};

export default function CareerCockpitPage() {
  return <ResumeBuilder initialPremium={false} />;
}

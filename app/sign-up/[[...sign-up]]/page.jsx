import { SignUp } from "@clerk/nextjs";
import { clerkConfigured } from "@/lib/auth";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function SignUpPage() {
  if (!clerkConfigured()) return <AuthUnavailable />;
  return (
    <main className="section">
      <SignUp
        forceRedirectUrl="/career-cockpit"
        fallbackRedirectUrl="/career-cockpit"
        appearance={clerkAppearance}
      />
    </main>
  );
}

function AuthUnavailable() {
  return (
    <main className="section auth-shell">
      <article className="card auth-card">
        <p className="eyebrow">Authentication Required</p>
        <h1>Sign Up</h1>
        <p>
          Clerk is not configured yet. Add valid Clerk publishable and secret keys to enable real signup before
          opening Resume Builder.
        </p>
      </article>
    </main>
  );
}

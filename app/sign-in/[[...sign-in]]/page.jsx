import { SignIn } from "@clerk/nextjs";
import { clerkConfigured } from "@/lib/auth";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function SignInPage() {
  if (!clerkConfigured()) return <AuthUnavailable title="Login" />;
  return (
    <main className="section">
      <SignIn
        forceRedirectUrl="/career-cockpit"
        fallbackRedirectUrl="/career-cockpit"
        appearance={clerkAppearance}
      />
    </main>
  );
}

function AuthUnavailable({ title }) {
  return (
    <main className="section auth-shell">
      <article className="card auth-card">
        <p className="eyebrow">Authentication Required</p>
        <h1>{title}</h1>
        <p>
          Clerk is not configured yet. Add valid Clerk publishable and secret keys to enable real login before
          opening Resume Builder.
        </p>
      </article>
    </main>
  );
}

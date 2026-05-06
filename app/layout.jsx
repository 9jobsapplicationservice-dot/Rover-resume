import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { validClerkPublishableKey } from "@/lib/clerk-keys";
import { clerkConfigured } from "@/lib/auth";
import { clerkAppearance } from "@/lib/clerk-appearance";

export const metadata = {
  title: "Rover Resume ATS",
  description: "AI resume builder with ATS optimization, authentication, and premium downloads.",
};

export default function RootLayout({ children }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkEnabled = clerkConfigured();

  if (!validClerkPublishableKey(publishableKey)) {
    return (
      <html lang="en">
        <body>
          <Navbar clerkEnabled={false} />
          {children}
        </body>
      </html>
    );
  }
  return (
    <ClerkProvider publishableKey={publishableKey} appearance={clerkAppearance}>
      <html lang="en">
        <body>
          <Navbar clerkEnabled={clerkEnabled} />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

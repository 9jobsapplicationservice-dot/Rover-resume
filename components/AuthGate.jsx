"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { clerkAppearance } from "@/lib/clerk-appearance";

const defaultTitle = "Please sign up or login first";
const defaultMessage = "Create an account or login to open Rover ATS services.";

export function AuthGateLink({
  href,
  children,
  className,
  clerkEnabled = true,
  title = defaultTitle,
  message = defaultMessage,
  ...linkProps
}) {
  if (!clerkEnabled) {
    return (
      <UnavailableGateButton className={className} title={title} message={message}>
        {children}
      </UnavailableGateButton>
    );
  }

  return (
    <ClerkGateLink href={href} className={className} title={title} message={message} linkProps={linkProps}>
      {children}
    </ClerkGateLink>
  );
}

export function AuthRequiredPanel({
  clerkEnabled = true,
  target = "/career-cockpit",
  title = defaultTitle,
  message = defaultMessage,
}) {
  return (
    <main className="section auth-gate-page">
      <AuthCard
        clerkEnabled={clerkEnabled}
        target={target}
        title={clerkEnabled ? title : "Authentication is unavailable"}
        message={
          clerkEnabled
            ? message
            : "Add valid Clerk publishable and secret keys before opening protected Rover ATS services."
        }
      />
    </main>
  );
}

export function NavActions({ clerkEnabled = true }) {
  if (!clerkEnabled) {
    return (
      <nav className="actions">
        <Link className="ghost-btn" href="/sign-in">
          Login
        </Link>
        <Link className="primary-btn" href="/sign-up">
          Sign Up
        </Link>
        <Link className="ghost-btn" href="/career-cockpit">
          Resume Builder
        </Link>
      </nav>
    );
  }

  return <ClerkNavActions />;
}

function ClerkGateLink({ href, className, title, message, linkProps, children }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);

  if (isLoaded && isSignedIn) {
    return (
      <Link className={className} href={href} {...linkProps}>
        {children}
      </Link>
    );
  }

  return (
    <>
      <button className={className} type="button" disabled={!isLoaded} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open ? (
        <AuthGateModal title={title} message={message} target={href} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function ClerkNavActions() {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) {
    return (
      <nav className="actions">
        <Link className="ghost-btn" href="/career-cockpit">
          Resume Builder
        </Link>
        <div className="user-button-shell">
          <UserButton afterSignOutUrl="/" appearance={clerkAppearance} />
        </div>
      </nav>
    );
  }

  return (
    <nav className="actions">
      <SignInButton
        mode="modal"
        forceRedirectUrl="/career-cockpit"
        fallbackRedirectUrl="/career-cockpit"
        appearance={clerkAppearance}
      >
        <button className="ghost-btn" type="button" disabled={!isLoaded}>
          Login
        </button>
      </SignInButton>
      <SignUpButton
        mode="modal"
        forceRedirectUrl="/career-cockpit"
        fallbackRedirectUrl="/career-cockpit"
        appearance={clerkAppearance}
      >
        <button className="primary-btn" type="button" disabled={!isLoaded}>
          Sign Up
        </button>
      </SignUpButton>
      <Link className="ghost-btn" href="/career-cockpit">
        Resume Builder
      </Link>
    </nav>
  );
}

function UnavailableGateButton({ className, title, message, children }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={className} type="button" onClick={() => setOpen(true)}>
        {children}
      </button>
      {open ? (
        <AuthGateModal
          clerkEnabled={false}
          title="Authentication is unavailable"
          message="Add valid Clerk publishable and secret keys before opening protected Rover ATS services."
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function AuthGateModal({ clerkEnabled = true, title, message, target = "/career-cockpit", onClose }) {
  return (
    <div className="modal-backdrop auth-gate-backdrop" role="dialog" aria-modal="true">
      <AuthCard clerkEnabled={clerkEnabled} target={target} title={title} message={message} onClose={onClose} />
    </div>
  );
}

function AuthCard({ clerkEnabled = true, target = "/career-cockpit", title, message, onClose }) {
  return (
    <div className="popup-card auth-gate-card">
      {onClose ? (
        <button className="popup-close" type="button" onClick={onClose} aria-label="Close auth popup">
          x
        </button>
      ) : null}
      <span className="plan-pill">Login required</span>
      <h2>{title}</h2>
      <p>{message}</p>
      {clerkEnabled ? (
        <div className="popup-actions auth-gate-actions">
          <SignUpButton
            mode="modal"
            forceRedirectUrl={target}
            fallbackRedirectUrl={target}
            appearance={clerkAppearance}
          >
            <button className="primary-btn" type="button">
              Sign Up
            </button>
          </SignUpButton>
          <SignInButton
            mode="modal"
            forceRedirectUrl={target}
            fallbackRedirectUrl={target}
            appearance={clerkAppearance}
          >
            <button className="ghost-btn" type="button">
              Login
            </button>
          </SignInButton>
        </div>
      ) : (
        <p className="notice">Real login/signup is blocked until Clerk keys are configured.</p>
      )}
    </div>
  );
}

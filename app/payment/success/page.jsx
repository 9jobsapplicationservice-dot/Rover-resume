"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<SuccessShell message="Verifying payment..." />}>
      <PaymentSuccessVerifier />
    </Suspense>
  );
}

function PaymentSuccessVerifier() {
  const params = useSearchParams();
  const [message, setMessage] = useState("Verifying payment...");

  useEffect(() => {
    const sessionId = params.get("session_id");
    if (!sessionId) {
      setMessage("Payment success page opened without a Stripe session.");
      return;
    }
    fetch("/api/payments/stripe/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then((res) => res.json().then((payload) => ({ ok: res.ok, payload })))
      .then(({ ok, payload }) => {
        if (!ok) throw new Error(payload.error || "Payment verification failed.");
        setMessage("Premium unlocked successfully.");
      })
      .catch((error) => setMessage(error.message));
  }, [params]);

  return <SuccessShell message={message} />;
}

function SuccessShell({ message }) {
  return (
    <main className="section">
      <article className="card">
        <p className="eyebrow">Payment</p>
        <h1>Success</h1>
        <p className="notice success">{message}</p>
        <Link className="primary-btn" href="/career-cockpit">
          Back to Resume Builder
        </Link>
      </article>
    </main>
  );
}

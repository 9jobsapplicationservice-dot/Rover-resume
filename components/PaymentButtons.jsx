"use client";

import { useState } from "react";

export function PaymentButtons({ onPaid }) {
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");

  async function payWithStripe() {
    setLoading("stripe");
    setMessage("");
    try {
      const response = await fetch("/api/payments/stripe/checkout", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Stripe checkout failed.");
      window.location.href = payload.url;
    } catch (error) {
      setMessage(error.message);
      setLoading("");
    }
  }

  async function payWithRazorpay() {
    setLoading("razorpay");
    setMessage("");
    try {
      await loadRazorpayScript();
      const response = await fetch("/api/payments/razorpay/order", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Razorpay order failed.");

      const razorpay = new window.Razorpay({
        key: payload.keyId,
        amount: payload.order.amount,
        currency: payload.order.currency,
        name: "Rover ATS Premium",
        description: "Premium resume downloads",
        order_id: payload.order.id,
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
        },
        handler: async (payment) => {
          const verify = await fetch("/api/payments/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payment),
          });
          const verified = await verify.json();
          if (!verify.ok) throw new Error(verified.error || "Razorpay verification failed.");
          setMessage("Premium unlocked successfully.");
          onPaid?.();
        },
        modal: {
          ondismiss: () => setLoading(""),
        },
      });
      razorpay.open();
    } catch (error) {
      setMessage(error.message);
      setLoading("");
    }
  }

  return (
    <div className="payment-actions">
      <div className="actions payment-button-row">
        <button className="primary-btn" disabled={Boolean(loading)} onClick={payWithStripe}>
          {loading === "stripe" ? "Opening Stripe..." : "Pay with Card"}
        </button>
        <button className="ghost-btn" disabled={Boolean(loading)} onClick={payWithRazorpay}>
          {loading === "razorpay" ? "Opening Razorpay..." : "Pay with UPI / India"}
        </button>
      </div>
      {message ? <p className="notice">{message}</p> : null}
    </div>
  );
}

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load Razorpay Checkout."));
    document.body.appendChild(script);
  });
}

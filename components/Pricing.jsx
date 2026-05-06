"use client";

import { useState } from "react";
import { AuthGateLink } from "@/components/AuthGate";

const prices = {
  monthly: "$9.99 / Rs 999",
  annual: "$99 / Rs 9999",
};

export function Pricing({ variant = "home", clerkEnabled = true }) {
  const [billing, setBilling] = useState("monthly");
  const isPage = variant === "page";
  const freeHref = isPage ? "/career-cockpit" : "/pricing";
  const premiumHref = isPage ? "/career-cockpit#premium" : "/pricing";

  return (
    <section id="pricing" className={`section pricing-section ${isPage ? "pricing-page-section" : ""}`}>
      <div className="section-head pricing-head">
        <div>
          <p className="eyebrow">Pricing</p>
          <h2>{isPage ? "Choose your billing plan" : "Choose your Rover ATS plan"}</h2>
          <p>Start free, then unlock downloads only when you are ready.</p>
        </div>
        <BillingToggle billing={billing} onChange={setBilling} />
      </div>
      <div className="pricing-grid">
        <article className="card price-card">
          <span className="plan-pill">Preview</span>
          <h3>Free Plan</h3>
          <p className="price">$0</p>
          <p>Preview resumes, run AI optimization, and check ATS guidance.</p>
          <ul className="feature-list">
            <li>1 free resume preview</li>
            <li>AI resume optimization</li>
            <li>ATS score preview</li>
            <li>Download locked</li>
          </ul>
          <AuthGateLink className="ghost-btn wide-btn" href={freeHref} clerkEnabled={clerkEnabled}>
            Start Free
          </AuthGateLink>
        </article>
        <article className="card price-card featured-card">
          <div className="plan-row">
            <span className="plan-pill">Best value</span>
            {billing === "annual" ? <span className="save-pill">Save 17%</span> : null}
          </div>
          <h3>Premium Plan</h3>
          <p className="price">{prices[billing]}</p>
          <p>{billing === "annual" ? "Best for regular resume updates and unlimited download access." : "Unlock resume downloads after Stripe card or Razorpay India payment."}</p>
          <ul className="feature-list">
            <li>Everything in Free</li>
            <li>Resume download unlock</li>
            <li>Monthly and annual billing</li>
            <li>Stripe card + Razorpay UPI</li>
          </ul>
          <AuthGateLink className="primary-btn wide-btn" href={premiumHref} clerkEnabled={clerkEnabled}>
            {isPage ? "Continue to Premium" : "Upgrade to Premium"}
          </AuthGateLink>
        </article>
      </div>
    </section>
  );
}

function BillingToggle({ billing, onChange }) {
  return (
    <div className="billing-toggle" aria-label="Billing period">
      <button className={`billing-option ${billing === "monthly" ? "active" : ""}`} type="button" onClick={() => onChange("monthly")}>
        Monthly
      </button>
      <button className={`billing-option ${billing === "annual" ? "active" : ""}`} type="button" onClick={() => onChange("annual")}>
        Annual <span>Save 17%</span>
      </button>
    </div>
  );
}

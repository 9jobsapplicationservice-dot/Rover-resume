import Link from "next/link";

export default function PaymentCancelPage() {
  return (
    <main className="section">
      <article className="card">
        <p className="eyebrow">Payment</p>
        <h1>Payment cancelled</h1>
        <p className="notice">No charge was completed. Downloads are still locked.</p>
        <Link className="primary-btn" href="/career-cockpit">
          Back to Resume Builder
        </Link>
      </article>
    </main>
  );
}

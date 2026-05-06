import Link from "next/link";
import { NavActions } from "@/components/AuthGate";

export function Navbar({ clerkEnabled = true }) {
  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <span>Rx</span>
        <strong>Rover ATS</strong>
      </Link>
      <NavActions clerkEnabled={clerkEnabled} />
    </header>
  );
}

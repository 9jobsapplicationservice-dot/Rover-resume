import Link from "next/link";
import { ResumeShowcase } from "@/components/ResumeShowcase";

export default function HomePage() {
  return (
    <>
      <main className="hero">
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-mock hero-mock-editor">
            <i style={{ "--line-width": "38%" }} />
            <i style={{ "--line-width": "56%" }} />
            <i style={{ "--line-width": "74%" }} />
            <i style={{ "--line-width": "48%" }} />
            <i style={{ "--line-width": "66%" }} />
            <i style={{ "--line-width": "86%" }} />
            <i style={{ "--line-width": "55%" }} />
            <i style={{ "--line-width": "76%" }} />
            <i style={{ "--line-width": "47%" }} />
          </div>
          <div className="hero-mock hero-mock-resume">
            <b />
            <i style={{ "--line-width": "44%" }} />
            <i style={{ "--line-width": "66%" }} />
            <i style={{ "--line-width": "82%" }} />
            <hr />
            <i style={{ "--line-width": "44%" }} />
            <i style={{ "--line-width": "66%" }} />
            <i style={{ "--line-width": "82%" }} />
            <i style={{ "--line-width": "52%" }} />
            <hr />
            <i style={{ "--line-width": "44%" }} />
            <i style={{ "--line-width": "66%" }} />
            <i style={{ "--line-width": "82%" }} />
          </div>
          <div className="hero-mock hero-mock-score">
            <strong>100</strong>
            <span>ATS Score</span>
            <i style={{ "--line-width": "43%" }} />
            <i style={{ "--line-width": "64%" }} />
            <i style={{ "--line-width": "84%" }} />
            <i style={{ "--line-width": "54%" }} />
          </div>
        </div>
        <p className="eyebrow">AI-STYLE ATS RESUME CONVERTER</p>
        <h1>
          <span>Create a resume or upload one</span>
          <span>and convert it into a clean ATS format.</span>
        </h1>
        <p className="hero-copy">
          The builder rewrites imported content into Professional Summary,
          Professional Experience, Skills, Licences, and Education with an
          ATS-focused checklist.
        </p>
        <div className="hero-actions">
          <Link className="primary-btn" href="/career-cockpit">
            Open Resume Builder
          </Link>
        </div>
      </main>
      <ResumeShowcase />
    </>
  );
}

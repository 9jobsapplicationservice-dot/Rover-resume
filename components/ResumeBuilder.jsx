"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { PaymentButtons } from "@/components/PaymentButtons";
import { autoImproveResume, composeResumeText, localOptimizeResume, normalizeResume, sampleResume, scoreResume, shouldApplyEnhancedResume } from "@/lib/resume";

const blankExperience = { title: "", company: "", dates: "", bullets: "" };
const blankProject = { title: "", subtitle: "", dates: "", bullets: "" };
const blankEducation = { degree: "", school: "", dates: "" };
const blankCertification = { title: "", issuer: "", dates: "" };

const pendingAts = {
  score: null,
  grade: "",
  status: "Gemini checking",
  checks: [],
  notes: [],
  breakdown: [],
};

const PDF_BULLET = "__PDF_BULLET__";
const PDF_ACTION_VERBS = ["Developed", "Implemented", "Optimized", "Integrated", "Delivered", "Engineered", "Configured", "Enhanced", "Automated", "Designed", "Built", "Improved", "Managed", "Supported"];
const PDF_SOFT_SKILLS = "Soft Skills: Communication, Problem Solving, Teamwork, Time Management";
const PDF_KNOWN_HARD_SKILLS = ["HTML", "CSS", "JavaScript", "TypeScript", "Python", "Java", "SQL", "React.js", "Next.js", "Node.js", "Express.js", "REST APIs", "JWT Authentication", "MongoDB", "MySQL", "PostgreSQL", "Git", "GitHub", "VS Code", "Selenium", "ChromeDriver", "Power BI", "Tableau", "Excel", "Razorpay", "Stripe", "Gemini API", "n8n"];

export function ResumeBuilder({ initialPremium = false }) {
  const { isLoaded, isSignedIn: clerkSignedIn } = useAuth();
  const fileInputRef = useRef(null);
  const lastScoredText = useRef("");
  const [resume, setResume] = useState(sampleResume);
  const [premium, setPremium] = useState(initialPremium);
  const signedIn = isLoaded ? clerkSignedIn : false;
  const [importLoading, setImportLoading] = useState(false);
  const [enhanceLoading, setEnhanceLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [uploadInfo, setUploadInfo] = useState(null);
  const [importStatus, setImportStatus] = useState("");
  const [importError, setImportError] = useState("");
  const [targetRole, setTargetRole] = useState(sampleResume.targetRole || "");
  const [uploadTargetRole, setUploadTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [ats, setAts] = useState(pendingAts);
  const [atsLoading, setAtsLoading] = useState(true);
  const [atsError, setAtsError] = useState("");
  const [authGateOpen, setAuthGateOpen] = useState(false);

  const cleanResume = useMemo(() => autoImproveResume(resume, targetRole), [resume, targetRole]);
  const atsScore = typeof ats.score === "number" ? `${ats.score}%` : "--";
  const atsStatus = atsLoading ? "Gemini checking..." : [ats.grade, ats.status].filter(Boolean).join(" / ") || "AI score pending";
  const toastType = /success|optimized|created|uploaded|unlocked/i.test(message) ? "success" : "warning";

  useEffect(() => {
    if (!signedIn) return;
    fetch("/api/payments/status")
      .then((res) => res.json())
      .then((status) => setPremium(Boolean(status.premium)))
      .catch(() => {});
  }, [signedIn]);

  useEffect(() => {
    if (!message || importLoading || enhanceLoading) return;
    const timer = window.setTimeout(() => setMessage(""), 4600);
    return () => window.clearTimeout(timer);
  }, [message, importLoading, enhanceLoading]);

  useEffect(() => {
    if (!signedIn) return;
    const text = composeResumeText(cleanResume);
    if (!resumeReadyForAiScore(cleanResume)) {
      setAts({ ...pendingAts, status: "Add resume details" });
      setAtsLoading(false);
      setAtsError("");
      return;
    }
    if (text === lastScoredText.current) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setAtsLoading(true);
      setAtsError("");
      try {
        const response = await fetch("/api/resume/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          signal: controller.signal,
          body: JSON.stringify({ resume: cleanResume, targetRole, jobDescription }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Gemini ATS score failed.");
        setAts(normalizeClientAts(payload.ats));
        lastScoredText.current = text;
      } catch (error) {
        if (error.name === "AbortError") return;
        setAts((prev) => ({ ...prev, status: "AI score unavailable" }));
        setAtsError(error.message || "Gemini ATS score unavailable.");
      } finally {
        if (!controller.signal.aborted) setAtsLoading(false);
      }
    }, 2500);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cleanResume, jobDescription, signedIn, targetRole]);

  useEffect(() => {
    if (signedIn) return;
    const text = composeResumeText(cleanResume);
    if (!resumeReadyForAiScore(cleanResume)) {
      setAts({ ...pendingAts, status: "Add resume details" });
      setAtsLoading(false);
      setAtsError("");
      return;
    }
    if (text === lastScoredText.current) return;
    setAts(scoreResume(cleanResume));
    setAtsLoading(false);
    setAtsError("");
    lastScoredText.current = text;
  }, [cleanResume, signedIn]);

  function updateField(field, value) {
    setResume((current) => ({ ...current, [field]: value }));
    if (field === "targetRole") setTargetRole(value);
  }

  function updateList(type, index, field, value) {
    setResume((current) => ({
      ...current,
      [type]: current[type].map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  }

  function addItem(type) {
    const fallback = type === "experience" ? blankExperience : type === "projects" ? blankProject : type === "education" ? blankEducation : blankCertification;
    setResume((current) => ({ ...current, [type]: [...current[type], fallback] }));
  }

  function removeItem(type, index) {
    const fallback = type === "experience" ? blankExperience : type === "projects" ? blankProject : type === "education" ? blankEducation : blankCertification;
    setResume((current) => {
      const next = current[type].filter((_, itemIndex) => itemIndex !== index);
      return { ...current, [type]: next.length ? next : [fallback] };
    });
  }

  function startNewResume() {
    setResume({
      name: "",
      phone: "",
      email: "",
      location: "",
      linkedin: "",
      github: "",
      targetRole: "",
      summary: "",
      skills: "",
      achievements: "",
      certifications: [blankCertification],
      experience: [blankExperience],
      projects: [blankProject],
      education: [blankEducation],
    });
    setTargetRole("");
    setMessage("Blank resume ready. Fill the form or upload a resume for AI conversion.");
  }

  function openUpload() {
    setImportOpen(true);
    setImportError("");
    setImportStatus("");
    setUploadTargetRole("");
    setMessage("Upload a PDF/TXT resume or paste text, then click AI Convert Resume.");
  }

  async function enhanceResumeContent() {
    const text = composeResumeText(cleanResume);
    if (!text || text.length < 50) {
      setMessage("Please add some resume content first before enhancing.");
      return;
    }
    const currentAts = normalizeClientAts(ats);
    const beforeScore = typeof currentAts.score === "number" ? currentAts.score : null;
    const currentText = text;

    if (!signedIn) {
      setAuthGateOpen(true);
      return;
    }

    setEnhanceLoading(true);
    setMessage("Gemini AI is enhancing your resume to improve ATS score...");
    try {
      const response = await fetch("/api/resume/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ rawText: text, targetRole: targetRole || cleanResume.targetRole, jobDescription, mode: "enhance", baselineScore: beforeScore }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "AI enhancement failed.");
      const nextResume = normalizeResume(payload.resume);
      if (!resumeHasRealContent(nextResume)) throw new Error("AI returned incomplete content. Try again.");
      const nextAts = normalizeClientAts(payload.ats);
      const afterScore = typeof nextAts.score === "number" ? nextAts.score : payload.afterScore;
      const accepted = payload.accepted !== false && shouldApplyEnhancedResume(beforeScore, afterScore);
      if (!accepted) {
        setAts(currentAts);
        lastScoredText.current = currentText;
        setMessage(payload.message || "No safer ATS improvement found; current resume kept.");
        return;
      }
      setResume(nextResume);
      setTargetRole(nextResume.targetRole || targetRole);
      setAts(nextAts);
      lastScoredText.current = composeResumeText(nextResume);
      setMessage(payload.message || `ATS score improved${beforeScore !== null ? ` from ${beforeScore}%` : ""} to ${afterScore}%.`);
    } catch (error) {
      setMessage(error.message || "AI enhancement failed.");
    } finally {
      setEnhanceLoading(false);
    }
  }

  async function optimizeFromText(text = importText) {
    const sourceText = normalizeUploadedResumeText(text);
    if (!sourceText.trim()) {
      setMessage("Paste or upload resume text before AI conversion.");
      return;
    }
    const explicitTargetRole = String(uploadTargetRole || "").trim();

    if (!signedIn) {
      setAuthGateOpen(true);
      return;
    }

    setImportLoading(true);
    setImportError("");
    setImportStatus("AI is converting your resume...");
    setMessage("Gemini AI is optimizing your ATS resume...");
    try {
      const response = await fetch("/api/resume/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ rawText: sourceText, targetRole: explicitTargetRole, jobDescription, mode: "preserve" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "AI optimization failed.");
      const nextResume = normalizeResume(payload.resume);
      if (!resumeHasRealContent(nextResume)) throw new Error("AI conversion returned incomplete content. Paste clearer resume text and try again.");
      setResume(nextResume);
      setTargetRole(nextResume.targetRole || explicitTargetRole || "");
      if (payload.ats) {
        setAts(normalizeClientAts(payload.ats));
        lastScoredText.current = composeResumeText(nextResume);
      }
      setImportStatus(payload.provider === "gemini" ? "Gemini optimized your resume." : "Local ATS optimizer converted your resume.");
      setImportOpen(false);
      setMessage(payload.message || (payload.provider === "gemini" ? "Gemini optimized your ATS resume." : "Local ATS fallback used."));
      window.setTimeout(() => document.querySelector(".old-builder-grid")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (error) {
      const text = error.message || "AI optimization failed.";
      setImportError(text);
      setMessage(text);
    } finally {
      setImportLoading(false);
    }
  }

  async function handleFile(file) {
    if (!file) return;
    setUploadInfo({ name: file.name, status: "Reading file...", chars: 0 });
    const name = file.name.toLowerCase();
    if (name.endsWith(".pdf")) {
      try {
        const text = await readPdf(file);
        setImportText(text);
        setUploadInfo({ name: file.name, status: "PDF text extracted", chars: text.length });
        setImportError("");
        setImportStatus("PDF text extracted. Click AI Convert Resume.");
        setMessage("PDF text extracted. Click AI Convert Resume.");
      } catch {
        setUploadInfo({ name: file.name, status: "PDF extraction failed. Paste text manually.", chars: 0 });
        setImportError("PDF reader unavailable. Please paste PDF text manually.");
        setMessage("PDF reader unavailable. Please paste PDF text manually.");
      }
      return;
    }
    if (/\.(txt|md|csv)$/i.test(file.name) || file.type.startsWith("text/")) {
      const text = normalizeUploadedResumeText(await file.text());
      setImportText(text);
      setUploadInfo({ name: file.name, status: "Resume text loaded", chars: text.length });
      setImportError("");
      setImportStatus("Resume text loaded. Click AI Convert Resume.");
      setMessage("Resume uploaded. Click AI Convert Resume.");
      return;
    }
    setUploadInfo({ name: file.name, status: "Unsupported file type", chars: 0 });
    setImportError("Use TXT, MD, CSV, PDF, or paste resume text manually.");
    setMessage("Use TXT, MD, CSV, PDF, or paste resume text manually.");
  }

  async function readPdf(file) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) throw new Error("PDF.js unavailable");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      pages.push(rebuildPdfPageText(content.items));
    }
    return normalizeUploadedResumeText(pages.join("\n\n"));
  }

  function rebuildPdfPageText(items = []) {
    const words = items
      .map((item) => ({
        text: String(item.str || "").trim(),
        x: Number(item.transform?.[4] || 0),
        y: Number(item.transform?.[5] || 0),
      }))
      .filter((item) => item.text);
    const rows = [];
    words
      .sort((a, b) => (Math.abs(b.y - a.y) > 2.5 ? b.y - a.y : a.x - b.x))
      .forEach((word) => {
        const row = rows[rows.length - 1];
        if (!row || Math.abs(row.y - word.y) > 2.5) {
          rows.push({ y: word.y, items: [word] });
          return;
        }
        row.items.push(word);
      });
    return rows
      .map((row) => row.items.sort((a, b) => a.x - b.x).map((item) => item.text).join(" ").replace(/[ \t]{2,}/g, " ").trim())
      .filter(Boolean)
      .join("\n");
  }

  function normalizeUploadedResumeText(value) {
    const headings = [
      "Achievements and Certifications",
      "Licences and Certifications",
      "Licenses and Certifications",
      "Professional Experience",
      "Professional Summary",
      "Employment History",
      "Employment Histor",
      "Project Experience",
      "Technical Skills",
      "Work Experience",
      "Career History",
      "Work History",
      "Certifications",
      "Achievements",
      "Experience",
      "Education",
      "Projects",
      "Summary",
      "Licences",
      "Licenses",
      "Profile",
      "Skills",
    ];
    let text = String(value || "")
      .replace(/\r\n?/g, "\n")
      .replace(/\u00a0/g, " ")
      .replace(/[\u2022\u25cf\u25aa]/g, "\n- ")
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\s+-\s+(?=\b(?:Developed|Built|Created|Implemented|Optimized|Improved|Integrated|Managed|Led|Delivered|Configured|Designed|Supported|Maintained|Prepared|Assisted|Coordinated|Performed|Engineered|Enhanced)\b)/gi, "\n- ");
    const upperHeadingPattern = headings.map((heading) => heading.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    text = text.replace(new RegExp(`\\s+(${upperHeadingPattern})(?=\\s|:|$)`, "g"), "\n$1");
    headings.forEach((heading) => {
      const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const longerHeadingGuard = /^(Achievements|Licences|Licenses)$/i.test(heading) ? "(?!\\s+and\\s+certifications\\b)" : "";
      text = text.replace(new RegExp(`(^|\\n)(${escaped})${longerHeadingGuard}\\s*[:\\-]?\\s+`, "gi"), "$1$2\n");
    });
    const monthPattern = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";
    text = text.replace(new RegExp(`\\.\\s+(?=[A-Z][A-Za-z0-9&/ .'\\-]{2,90}(?:Website|App|Application|System|Platform|Estate|E-State|Portfolio|Full Stack)[^\\n]{0,160}\\b${monthPattern}?\\s*(?:19|20)\\d{2}\\s*(?:-|to))`, "g"), ".\n");
    text = text.replace(new RegExp(`(?<!Computer)(?<!Science)(?<!Engineering)(?<!Application)\\s+(?=[A-Z][A-Za-z.&'\\-]+(?:\\s+[A-Z][A-Za-z.&'\\-]+){0,3}\\s+(?:University|College|Institute|School)\\b\\s*\\(${monthPattern}?\\s*(?:19|20)\\d{2})`, "g"), "\n");
    return text
      .split("\n")
      .map((line) => line.replace(/[ \t]{2,}/g, " ").trim())
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  function requirePremium(action) {
    if (!premium) {
      setUpgradeOpen(true);
      setMessage("Upgrade to Premium to unlock resume downloads.");
      return false;
    }
    action();
    return true;
  }

  function downloadTxt() {
    requirePremium(() => downloadBlob(composeResumeText(cleanResume), "txt", "text/plain;charset=utf-8"));
  }

  function downloadDoc() {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(cleanResume.name || "Resume")}</title></head><body>${resumeHtml(cleanResume)}</body></html>`;
    downloadBlob(html, "doc", "application/msword;charset=utf-8");
  }

  function downloadPdf() {
    downloadBlob(createResumePdf(cleanResume), "pdf", "application/pdf");
    setMessage("PDF downloaded successfully.");
  }

  function downloadBlob(content, extension, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug(cleanResume.name || "resume")}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="rover-dashboard old-builder">
      <aside className="rover-sidebar">
        <Link className="brand side-brand" href="/">
          <span>Rx</span>
          <strong>Resume Builder</strong>
        </Link>
        <button className="side-link active" type="button">Resume Builder</button>
        <button className="side-link" type="button" onClick={startNewResume}>Create Resume</button>
        <button className="side-link" type="button" onClick={openUpload}>Upload Resume</button>
        <Link className="side-link" href="/">Home</Link>
        <p className="side-note">Create, upload, preview, and unlock downloads after payment.</p>
      </aside>

      <section className="rover-workspace">
        <header className="workspace-headline">
          <div>
            <p className="eyebrow">Current resume</p>
            <h1>Create or convert an ATS-friendly resume</h1>
          </div>
          <div className="actions">
            <button className="ghost-btn" type="button" onClick={openUpload}>Upload Resume</button>
            <button className="primary-btn" type="button" onClick={startNewResume}>Create Resume</button>
          </div>
        </header>

        <section className="choice-panel">
          <button className="choice-card" type="button" onClick={startNewResume}>
            <span>+</span>
            <strong>Create resume manually</strong>
            <small>Start from a clean ATS-ready form.</small>
          </button>
          <button className="choice-card accent-card" type="button" onClick={openUpload}>
            <span>AI</span>
            <strong>Upload and convert resume</strong>
            <small>Gemini AI optimizes for 95%+ ATS readiness.</small>
          </button>
          <article className="ats-hero-score">
            <span>ATS</span>
            <strong>{atsScore}</strong>
            <small>{atsStatus}</small>
          </article>
        </section>

        <section className="builder old-builder-grid">
          <form className="editor old-editor">
            <FormSection title="Profile">
              <label className="field">Name<input value={resume.name || ""} onChange={(e) => updateField("name", e.target.value)} /></label>
              <label className="field">Target Role<input value={resume.targetRole || ""} onChange={(e) => updateField("targetRole", e.target.value)} /></label>
              <div className="two-col">
                <label className="field">Phone<input value={resume.phone || ""} onChange={(e) => updateField("phone", e.target.value)} /></label>
                <label className="field">Email<input value={resume.email || ""} onChange={(e) => updateField("email", e.target.value)} /></label>
              </div>
              <label className="field">Location<input value={resume.location || ""} placeholder="Burwood VIC 3125" onChange={(e) => updateField("location", e.target.value)} /></label>
              <div className="two-col">
                <label className="field">LinkedIn URL<input value={resume.linkedin || ""} onChange={(e) => updateField("linkedin", e.target.value)} /></label>
                <label className="field">GitHub URL<input value={resume.github || ""} onChange={(e) => updateField("github", e.target.value)} /></label>
              </div>
            </FormSection>

            <FormSection title="Summary">
              <label className="field">Professional Summary<textarea rows={5} value={resume.summary || ""} onChange={(e) => updateField("summary", e.target.value)} /></label>
            </FormSection>

            <ListSection title="Experience" type="experience" items={resume.experience} addItem={addItem} removeItem={removeItem} updateList={updateList} />
            <ListSection title="Projects" type="projects" items={resume.projects} addItem={addItem} removeItem={removeItem} updateList={updateList} />

            <FormSection title="Skills">
              <label className="field">Skills<textarea rows={4} value={resume.skills || ""} onChange={(e) => updateField("skills", e.target.value)} /></label>
            </FormSection>

            <ListSection title="Education" type="education" items={resume.education} addItem={addItem} removeItem={removeItem} updateList={updateList} />
            <ListSection title="Licences and Certifications" type="certifications" items={resume.certifications} addItem={addItem} removeItem={removeItem} updateList={updateList} />
          </form>

          <aside className="preview-wrap">
            <div className="preview-head">
              <strong>ATS Resume Preview</strong>
              <div className="actions preview-actions">
                <button className="primary-btn small" type="button" onClick={enhanceResumeContent} disabled={enhanceLoading}>{enhanceLoading ? "Scanning..." : "Enhance ATS"}</button>
                <button className="ghost-btn small" type="button" onClick={downloadTxt}>{premium ? "Download TXT" : "TXT Locked"}</button>
                <button className="ghost-btn small" type="button" onClick={downloadDoc}>Download DOC</button>
                <button className="primary-btn small" type="button" onClick={downloadPdf}>Download PDF</button>
              </div>
            </div>
            <div className={`resume-preview-shell${enhanceLoading ? " scanning" : ""}`}>
              <ResumePreview resume={cleanResume} />
              {enhanceLoading ? <div className="scan-overlay" aria-live="polite"><span>Scanning ATS score</span></div> : null}
            </div>
            <div className="suggestions">
              <h3>ATS Score Breakdown: {atsScore} {ats.grade ? `- ${ats.grade}` : ""}</h3>
              {atsLoading ? <p className="notice">Gemini AI is checking resume quality...</p> : null}
              {atsError ? <p className="notice">Gemini AI score unavailable: {atsError}</p> : null}
              <div className="ats-breakdown">
                {(ats.breakdown || []).map((item) => (
                  <p key={item.label} className={item.percent >= 75 ? "success" : "notice"}>
                    <strong>{item.label}</strong>
                    <span>{item.percent}%</span>
                  </p>
                ))}
              </div>
              {(ats.notes || []).slice(0, 12).map((note) => <p className="notice" key={note}>Fix: {note}</p>)}
            </div>
            <div id="premium" className="premium-box">
              <div className="premium-copy">
                <span className="plan-pill">{premium ? "Premium active" : "Premium locked"}</span>
                <h3>Download Unlock</h3>
                <p className={premium ? "success" : "notice"}>{premium ? "Downloads are unlocked." : "Pay once to unlock PDF, DOC, and TXT downloads."}</p>
              </div>
              {!premium ? <PaymentButtons onPaid={() => { setPremium(true); setMessage("Premium unlocked successfully."); }} /> : null}
            </div>
          </aside>
        </section>
      </section>

      {importOpen ? (
        <UploadModal
          loading={importLoading}
          importText={importText}
          uploadInfo={uploadInfo}
          importStatus={importStatus}
          importError={importError}
          targetRole={uploadTargetRole}
          jobDescription={jobDescription}
          setImportText={setImportText}
          setUploadInfo={setUploadInfo}
          setTargetRole={setUploadTargetRole}
          setJobDescription={setJobDescription}
          onFile={handleFile}
          onClose={() => { if (!importLoading) setImportOpen(false); }}
          onConvert={() => optimizeFromText()}
        />
      ) : null}
      {upgradeOpen && <UpgradeModal onClose={() => setUpgradeOpen(false)} onBuyNow={() => (window.location.href = "/pricing")} />}
      {authGateOpen && <LoginPromptModal onClose={() => setAuthGateOpen(false)} />}
      {message && <Toast type={toastType} message={message} onClose={() => setMessage("")} />}
      <input ref={fileInputRef} className="sr-only" type="file" accept=".txt,.md,.csv,.pdf,text/plain,text/markdown,text/csv,application/pdf" onChange={(e) => handleFile(e.target.files?.[0])} />
    </main>
  );
}

function FormSection({ title, children }) {
  return <section className="form-section"><div className="section-title"><h3>{title}</h3></div>{children}</section>;
}

function ListSection({ title, type, items, addItem, removeItem, updateList }) {
  return (
    <section className="form-section">
      <div className="section-title">
        <h3>{title}</h3>
        <button className="mini-btn" type="button" onClick={() => addItem(type)}>Add</button>
      </div>
      {items.map((item, index) => (
        <div className="item-box" key={index}>
          <button className="remove" type="button" onClick={() => removeItem(type, index)}>x</button>
          {type === "experience" ? (
            <>
              <div className="two-col">
                <label className="field">Role<input value={item.title || ""} onChange={(e) => updateList(type, index, "title", e.target.value)} /></label>
                <label className="field">Dates<input value={item.dates || ""} onChange={(e) => updateList(type, index, "dates", e.target.value)} /></label>
              </div>
              <label className="field">Company / Location<input value={item.company || ""} onChange={(e) => updateList(type, index, "company", e.target.value)} /></label>
              <label className="field">Bullets<textarea rows={4} value={item.bullets || ""} onChange={(e) => updateList(type, index, "bullets", e.target.value)} /></label>
            </>
          ) : null}
          {type === "projects" ? (
            <>
              <div className="two-col">
                <label className="field">Project<input value={item.title || ""} onChange={(e) => updateList(type, index, "title", e.target.value)} /></label>
                <label className="field">Dates<input value={item.dates || ""} onChange={(e) => updateList(type, index, "dates", e.target.value)} /></label>
              </div>
              <label className="field">Tech / Link<input value={item.subtitle || ""} onChange={(e) => updateList(type, index, "subtitle", e.target.value)} /></label>
              <label className="field">Bullets<textarea rows={4} value={item.bullets || ""} onChange={(e) => updateList(type, index, "bullets", e.target.value)} /></label>
            </>
          ) : null}
          {type === "education" ? (
            <>
              <label className="field">Degree<input value={item.degree || ""} onChange={(e) => updateList(type, index, "degree", e.target.value)} /></label>
              <div className="two-col">
                <label className="field">School<input value={item.school || ""} onChange={(e) => updateList(type, index, "school", e.target.value)} /></label>
                <label className="field">Dates<input value={item.dates || ""} onChange={(e) => updateList(type, index, "dates", e.target.value)} /></label>
              </div>
            </>
          ) : null}
          {type === "certifications" ? (
            <>
              <label className="field">Certification / Licence<input value={item.title || ""} onChange={(e) => updateList(type, index, "title", e.target.value)} /></label>
              <div className="two-col">
                <label className="field">Issuer<input value={item.issuer || ""} onChange={(e) => updateList(type, index, "issuer", e.target.value)} /></label>
                <label className="field">Dates<input value={item.dates || ""} onChange={(e) => updateList(type, index, "dates", e.target.value)} /></label>
              </div>
            </>
          ) : null}
        </div>
      ))}
    </section>
  );
}

function UploadModal({ loading, importText, uploadInfo, importStatus, importError, targetRole, jobDescription, setImportText, setUploadInfo, setTargetRole, setJobDescription, onFile, onClose, onConvert }) {
  const hasText = Boolean(String(importText || "").trim());
  const canConvert = hasText && !loading;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card upload-modal old-upload-modal">
        <button className="popup-close" type="button" onClick={onClose}>x</button>
        <p className="eyebrow">AI resume converter</p>
        <h2>Upload resume for ATS conversion</h2>
        <p className="muted-small">Upload TXT/PDF or paste content. AI will convert it into Professional Summary, Professional Experience, Skills, Licences and Certifications, and Education.</p>
        <label className="drop">
          <span>Choose PDF or TXT</span>
          <input type="file" accept=".txt,.md,.csv,.pdf,text/plain,application/pdf" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {uploadInfo ? (
          <div className="upload-status">
            <strong>{uploadInfo.name}</strong>
            <span>{uploadInfo.status}{uploadInfo.chars ? ` - ${uploadInfo.chars} characters` : ""}</span>
          </div>
        ) : null}
        <label className="field">Target role<input value={targetRole} placeholder="Construction Labourer" onChange={(e) => setTargetRole(e.target.value)} /></label>
        <label className="field">Job description or keywords<textarea rows={2} value={jobDescription} placeholder="Paste job description, required skills, or ATS keywords" onChange={(e) => setJobDescription(e.target.value)} /></label>
        <label className="field">Paste resume text<textarea rows={4} value={importText} placeholder="Paste resume content here" onChange={(e) => { setImportText(e.target.value); setUploadInfo(null); }} /></label>
        {importStatus || loading ? <div className="convert-status"><strong>{loading ? "AI is converting your resume..." : importStatus}</strong><span>{loading ? "Please wait. Gemini tries first; local ATS fallback runs automatically if needed." : hasText ? `${importText.length} characters ready.` : "Upload or paste resume text."}</span></div> : null}
        {importError ? <div className="convert-status error"><strong>Conversion issue</strong><span>{importError}</span></div> : null}
        <div className="modal-actions">
          <button className="ghost-btn" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-btn" type="button" disabled={!canConvert} onClick={canConvert ? onConvert : undefined}>{loading ? "Converting..." : "AI Convert Resume"}</button>
        </div>
      </div>
    </div>
  );
}

function resumeHasRealContent(resume) {
  const text = composeResumeText(resume);
  return Boolean((resume.name || resume.email || resume.phone) && resume.experience?.length && text.length > 100);
}

function resumeReadyForAiScore(resume) {
  const text = composeResumeText(resume);
  return Boolean(text.replace(/Summary|Experience|Projects|Skills|Licences and Certifications|Education/g, "").trim().length > 60);
}

function normalizeClientAts(value) {
  if (!value || typeof value !== "object") return { ...pendingAts, status: "AI score unavailable" };
  return {
    score: typeof value.score === "number" ? value.score : null,
    grade: value.grade || "",
    status: value.status || "",
    checks: Array.isArray(value.checks) ? value.checks : [],
    notes: Array.isArray(value.notes) ? value.notes : [],
    breakdown: Array.isArray(value.breakdown) ? value.breakdown : [],
  };
}

function ResumePreview({ resume }) {
  return (
    <article className="paper resume-paper">
      <h1>{resume.name || "Your Name"}</h1>
      <ContactLine resume={resume} />
      <Section title="Summary"><p>{resume.summary}</p></Section>
      <Section title="Experience">{resume.experience.map((item, index) => <Entry key={index} item={item} company />)}</Section>
      <Section title="Projects">{resume.projects.map((item, index) => <Entry key={index} item={item} />)}</Section>
      <Section title="Skills"><ul className="resume-skills">{resume.skills.split("\n").filter(Boolean).map((line) => <li key={line}>{line}</li>)}</ul></Section>
      <Section title="Licences and Certifications">
        <ul className="resume-skills">
          {resume.achievements ? resume.achievements.split("\n").filter(Boolean).map((item) => <li key={item}>{item}</li>) : null}
          {(resume.certifications || []).map((item, index) => {
            const text = [item.title, item.issuer, item.dates].filter(Boolean).join(", ");
            return text ? <li key={index}>{text}</li> : null;
          })}
        </ul>
      </Section>
      <Section title="Education">{resume.education.map((item, index) => <EducationEntry key={index} item={item} />)}</Section>
    </article>
  );
}

function ContactLine({ resume }) {
  const items = contactItems(resume);
  if (!items.length) return null;

  return (
    <div className="contact contact-row">
      {items.map((item) => (
        <span className="contact-item" key={item.key}>
          <ContactIcon type={item.key} />
          {item.href ? (
            <a href={item.href} {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}>
              {item.value}
            </a>
          ) : (
            <span>{item.value}</span>
          )}
        </span>
      ))}
    </div>
  );
}

function ContactIcon({ type }) {
  const icons = {
    phone: (
      <>
        <path d="M6.7 4.8 8.4 8c.3.5.2 1.1-.2 1.5l-.9.9a12 12 0 0 0 6.3 6.3l.9-.9c.4-.4 1-.5 1.5-.2l3.2 1.7c.6.3.9 1 .7 1.6l-.7 2c-.2.6-.8 1-1.4 1A15.7 15.7 0 0 1 2.1 6.2c0-.6.4-1.2 1-1.4l2-.7c.6-.2 1.3.1 1.6.7Z" />
      </>
    ),
    email: (
      <>
        <rect x="3.5" y="5.8" width="17" height="12.4" rx="1.8" />
        <path d="m4.5 7 7.5 5.5L19.5 7" />
      </>
    ),
    location: (
      <>
        <path d="M12 21s6-6.2 6-11.2A6 6 0 0 0 6 9.8C6 14.8 12 21 12 21Z" />
        <circle cx="12" cy="9.8" r="2.1" />
      </>
    ),
    linkedin: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="2.2" />
        <path d="M8 10v6.2" />
        <path d="M8 7.8v.1" />
        <path d="M11.3 16.2v-3.5c0-1.6.9-2.7 2.4-2.7s2.3 1 2.3 2.7v3.5" />
        <path d="M11.3 10.2v6" />
      </>
    ),
    github: (
      <>
        <path d="M12 3.5a8.5 8.5 0 0 0-2.7 16.6c.4.1.5-.2.5-.4v-1.5c-2.2.5-2.7-.9-2.7-.9-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.2 1.9.9 2.3.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-4 0-.9.3-1.6.8-2.2-.1-.2-.4-1.1.1-2.2 0 0 .7-.2 2.3.8.7-.2 1.4-.3 2.1-.3s1.4.1 2.1.3c1.6-1 2.3-.8 2.3-.8.5 1.1.2 2 .1 2.2.5.6.8 1.3.8 2.2 0 3.1-1.9 3.8-3.7 4 .3.3.6.8.6 1.6v2.3c0 .2.1.5.5.4A8.5 8.5 0 0 0 12 3.5Z" />
      </>
    ),
  };

  return (
    <svg className="contact-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {icons[type]}
    </svg>
  );
}

function Section({ title, children }) {
  return <><h2>{title}</h2>{children}</>;
}

function Entry({ item, company = false }) {
  return (
    <div>
      <div className="resume-row"><strong>{item.title}</strong><strong>{item.dates}</strong></div>
      <p>{company ? item.company : item.subtitle}</p>
      {item.bullets ? <ul>{item.bullets.split("\n").filter(Boolean).map((line) => <li key={line}>{line}</li>)}</ul> : null}
    </div>
  );
}

function EducationEntry({ item }) {
  return <div className="resume-row education-row"><strong>{[item.school, item.dates ? `(${item.dates})` : ""].filter(Boolean).join(" ")}</strong><strong>{item.degree}</strong></div>;
}

function LoginPromptModal({ onClose }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="popup-card">
        <span className="plan-pill">Login Required</span>
        <h2>AI features locked</h2>
        <p>Please login or sign up to use Gemini AI for resume conversion and ATS optimization.</p>
        <div className="popup-actions">
          <Link href="/sign-up" className="primary-btn">Sign Up</Link>
          <button className="ghost-btn" type="button" onClick={onClose}>Maybe Later</button>
        </div>
      </div>
    </div>
  );
}

function UpgradeModal({ onClose, onBuyNow }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="popup-card">
        <span className="plan-pill">Premium required</span>
        <h2>Unlock downloads</h2>
        <p>Preview is free. Pay once to unlock PDF, DOC, and TXT downloads.</p>
        <div className="popup-actions">
          <button className="primary-btn" type="button" onClick={onBuyNow}>Buy Now</button>
          <button className="ghost-btn" type="button" onClick={onClose}>Not Now</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ type, message, onClose }) {
  return <div className={`toast ${type}`} role="status"><span>{type === "success" ? "Success" : "Notice"}</span><p>{message}</p><button type="button" onClick={onClose}>x</button></div>;
}

function resumeHtml(resume) {
  return `<main class="paper">${documentLikeResume(resume)}</main>`;
}

function documentLikeResume(resume) {
  const bullets = (value) => value ? `<ul>${value.split("\n").filter(Boolean).map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : "";
  return `
    <h1>${escapeHtml(resume.name || "Your Name")}</h1>
    ${contactHtml(resume)}
    <h2>Summary</h2><p>${escapeHtml(resume.summary)}</p>
    <h2>Experience</h2>${resume.experience.map((item) => `<div class="resume-row"><strong>${escapeHtml(item.title)}</strong><strong>${escapeHtml(item.dates)}</strong></div><p>${escapeHtml(item.company)}</p>${bullets(item.bullets)}`).join("")}
    <h2>Projects</h2>${resume.projects.map((item) => `<div class="resume-row"><strong>${escapeHtml(item.title)}</strong><strong>${escapeHtml(item.dates)}</strong></div><p>${escapeHtml(item.subtitle)}</p>${bullets(item.bullets)}`).join("")}
    <h2>Skills</h2>${bullets(resume.skills)}
    <h2>Licences and Certifications</h2><ul>${resume.achievements ? resume.achievements.split("\n").filter(Boolean).map((line) => `<li>${escapeHtml(line)}</li>`).join("") : ""}${(resume.certifications || []).map((item) => { const text = [item.title, item.issuer, item.dates].filter(Boolean).join(", "); return text ? `<li>${escapeHtml(text)}</li>` : ""; }).join("")}</ul>
    <h2>Education</h2>${resume.education.map((item) => `<div class="resume-row"><strong>${escapeHtml(item.school)}</strong><strong>${escapeHtml(item.degree)}</strong></div><p>${escapeHtml(item.dates)}</p>`).join("")}
  `;
}

function printStyles() {
  return "body{margin:0;background:#fff}.paper{padding:42px;color:#111;font-family:Georgia,'Times New Roman',serif;line-height:1.25}.paper p,.paper li{text-align:justify}.paper h1{text-align:center;margin:0}.contact{display:flex;align-items:center;justify-content:center;gap:8px 12px;flex-wrap:wrap;text-align:center;font-size:12px;margin:7px 0 16px}.contact-item{display:inline-flex;align-items:center;gap:3px;white-space:nowrap}.contact-icon{width:12px;height:12px;display:inline-block;fill:none;stroke:#111;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:0 0 auto}.contact a{color:#111;text-decoration:none}.paper h2{font-size:15px;text-transform:uppercase;border-bottom:1px solid #111;margin:16px 0 5px}.resume-row{display:flex;justify-content:space-between;gap:18px;font-weight:700}ul{margin:4px 0 10px 20px}";
}

function createResumePdf(resume) {
  const exportResume = preparePdfResume(resume);
  const page = { width: 595.28, height: 841.89, marginX: 42, marginTop: 42, marginBottom: 34 };
  page.contentWidth = page.width - page.marginX * 2;
  const render = (scale, draw = false) => {
    const commands = draw ? ["q", "0 G", `${fmt(0.8 * scale)} w`] : [];
    const size = (value) => value * scale;
    let y = page.height - page.marginTop;

    const drawLine = (x1, y1, x2, y2) => {
      if (draw) commands.push(`${fmt(x1)} ${fmt(y1)} m ${fmt(x2)} ${fmt(y2)} l S`);
    };
    const drawCurve = (x1, y1, x2, y2, x3, y3, x4, y4) => {
      if (draw) commands.push(`${fmt(x1)} ${fmt(y1)} m ${fmt(x2)} ${fmt(y2)} ${fmt(x3)} ${fmt(y3)} ${fmt(x4)} ${fmt(y4)} c S`);
    };
    const drawRect = (x, rectY, width, height) => {
      if (draw) commands.push(`${fmt(x)} ${fmt(rectY)} ${fmt(width)} ${fmt(height)} re S`);
    };
    const drawCircle = (cx, cy, radius, fill = false) => {
      if (!draw) return;
      const k = radius * 0.5522847498;
      commands.push([
        `${fmt(cx + radius)} ${fmt(cy)} m`,
        `${fmt(cx + radius)} ${fmt(cy + k)} ${fmt(cx + k)} ${fmt(cy + radius)} ${fmt(cx)} ${fmt(cy + radius)} c`,
        `${fmt(cx - k)} ${fmt(cy + radius)} ${fmt(cx - radius)} ${fmt(cy + k)} ${fmt(cx - radius)} ${fmt(cy)} c`,
        `${fmt(cx - radius)} ${fmt(cy - k)} ${fmt(cx - k)} ${fmt(cy - radius)} ${fmt(cx)} ${fmt(cy - radius)} c`,
        `${fmt(cx + k)} ${fmt(cy - radius)} ${fmt(cx + radius)} ${fmt(cy - k)} ${fmt(cx + radius)} ${fmt(cy)} c`,
        fill ? "f" : "S",
      ].join(" "));
    };
    const drawContactIcon = (type, x, baseline, iconSize) => {
      const s = iconSize;
      const y0 = baseline - s * 0.18;
      const ix = (value) => x + (value / 24) * s;
      const iy = (value) => y0 + ((24 - value) / 24) * s;
      const line = (x1, y1, x2, y2) => drawLine(ix(x1), iy(y1), ix(x2), iy(y2));
      const curve = (x1, y1, x2, y2, x3, y3, x4, y4) => drawCurve(ix(x1), iy(y1), ix(x2), iy(y2), ix(x3), iy(y3), ix(x4), iy(y4));
      const rect = (rectX, rectY, width, height) => drawRect(ix(rectX), iy(rectY + height), (width / 24) * s, (height / 24) * s);
      const circle = (cx, cy, radius, fill = false) => drawCircle(ix(cx), iy(cy), (radius / 24) * s, fill);
      if (draw) commands.push(`q 1 J 1 j ${fmt(Math.max(0.9, 1.05 * scale))} w`);
      if (type === "phone") {
        curve(7, 4.5, 5.2, 7.2, 8.2, 14.8, 15.8, 19.5);
        line(7, 4.5, 5, 6.7);
        line(5, 6.7, 7.3, 10.2);
        line(15.8, 19.5, 19, 17.2);
        line(19, 17.2, 15.7, 14.2);
        if (draw) commands.push("Q");
        return;
      }
      if (type === "email") {
        rect(3, 6, 18, 12);
        line(4, 7, 12, 13.2);
        line(20, 7, 12, 13.2);
        line(4, 18, 10.2, 12);
        line(20, 18, 13.8, 12);
        if (draw) commands.push("Q");
        return;
      }
      if (type === "location") {
        circle(12, 9.5, 4.2);
        circle(12, 9.5, 1.3, true);
        line(12, 21, 8.6, 13.8);
        line(12, 21, 15.4, 13.8);
        if (draw) commands.push("Q");
        return;
      }
      if (type === "linkedin") {
        rect(3.5, 3.5, 17, 17);
        if (draw) commands.push("Q");
        drawText("in", x + s * 0.22, y0 + s * 0.24, { bold: true, size: 5.8 });
        return;
      }
      if (type === "github") {
        circle(12, 11, 6.2);
        line(7.5, 7.4, 8.4, 3.8);
        line(8.4, 3.8, 11, 6.3);
        line(13, 6.3, 15.6, 3.8);
        line(15.6, 3.8, 16.5, 7.4);
        line(10, 17, 10, 20);
        line(14, 17, 14, 20);
        if (draw) commands.push("Q");
        return;
      }
      line(7, 4.5, 5, 6.7);
      curve(7, 4.5, 5.2, 7.2, 8.2, 14.8, 15.8, 19.5);
      line(15.8, 19.5, 19, 17.2);
      if (draw) commands.push("Q");
    };
    const drawText = (text, x, textY, options = {}) => {
      if (!draw) return;
      const fontSize = size(options.size || 10);
      const font = options.bold ? "F2" : "F1";
      let drawX = x;
      if (options.align === "center") drawX = x - estimateTextWidth(text, fontSize, options.bold) / 2;
      if (options.align === "right") drawX = x - estimateTextWidth(text, fontSize, options.bold);
      commands.push(`BT /${font} ${fmt(fontSize)} Tf 1 0 0 1 ${fmt(drawX)} ${fmt(textY)} Tm (${escapePdfText(text)}) Tj ET`);
    };
    const addWrappedText = (text, options = {}) => {
      const sourceLines = String(text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
      const fontSize = size(options.size || 10);
      const lineHeight = size(options.lineHeight || (options.size || 10) * 1.28);
      const indent = size(options.indent || 0);
      const maxWidth = page.contentWidth - indent;
      sourceLines.forEach((sourceLine) => {
        wrapPdfLine(sourceLine, maxWidth, fontSize, options.bold).forEach((line) => {
          drawText(line, page.marginX + indent, y, options);
          y -= lineHeight;
        });
        y -= size(options.after || 0);
      });
    };
    const addSection = (title) => {
      y -= size(8);
      drawText(title.toUpperCase(), page.marginX, y, { bold: true, size: 11.5 });
      y -= size(4.6);
      drawLine(page.marginX, y, page.width - page.marginX, y);
      y -= size(9.5);
    };
    const addPair = (left, right = "") => {
      const cleanLeft = pdfText(left);
      const cleanRight = pdfText(right);
      if (!cleanLeft && !cleanRight) return;
      const pairSize = size(9.7);
      const rightWidth = estimateTextWidth(cleanRight, pairSize, true);
      const rightFits = cleanRight && rightWidth < page.contentWidth * 0.42;
      const leftWidth = rightFits ? page.contentWidth - rightWidth - size(20) : page.contentWidth;
      wrapPdfLine(cleanLeft, leftWidth, pairSize, true).forEach((line, index) => {
        drawText(line, page.marginX, y, { bold: true, size: 9.7 });
        if (index === 0 && rightFits) drawText(cleanRight, page.width - page.marginX, y, { bold: true, size: 9.7, align: "right" });
        y -= size(12.2);
      });
      if (cleanRight && !rightFits) addWrappedText(cleanRight, { size: 9.1, lineHeight: 11.2, after: 0.5 });
    };
    const addBullets = (value, options = {}) => {
      splitPdfLines(value).forEach((line) => {
        const fontSize = size(options.size || 9.1);
        const lineHeight = size(options.lineHeight || 11.4);
        const bulletX = page.marginX + size(options.bulletIndent || 7);
        const textX = page.marginX + size(options.textIndent || 18);
        const maxWidth = page.contentWidth - size(options.textIndent || 18);
        wrapPdfLine(line, maxWidth, fontSize, options.bold).forEach((wrappedLine, index) => {
          if (index === 0) drawText(PDF_BULLET, bulletX, y, { size: options.size || 9.1 });
          drawText(wrappedLine, textX, y, options);
          y -= lineHeight;
        });
        y -= size(options.after || 0.6);
      });
    };
    const addContactRows = () => {
      const items = contactPdfItems(exportResume);
      if (!items.length) return;
      const fontSize = size(8.8);
      const iconSize = size(8.4);
      const iconGap = size(3.8);
      const itemGap = size(12);
      const rows = [[]];
      items.forEach((item) => {
        const width = iconSize + iconGap + estimateTextWidth(item.value, fontSize, false);
        const current = rows[rows.length - 1];
        const currentWidth = current.reduce((sum, entry) => sum + entry.width, 0) + Math.max(0, current.length - 1) * itemGap;
        if (current.length && currentWidth + itemGap + width > page.contentWidth && rows.length < 2) {
          rows.push([{ ...item, width }]);
        } else {
          current.push({ ...item, width });
        }
      });
      rows.forEach((row) => {
        if (!row.length) return;
        const rowWidth = row.reduce((sum, item) => sum + item.width, 0) + Math.max(0, row.length - 1) * itemGap;
        let x = page.marginX + Math.max(0, (page.contentWidth - rowWidth) / 2);
        row.forEach((item) => {
          drawContactIcon(item.key, x, y, iconSize);
          drawText(item.value, x + iconSize + iconGap, y, { size: 8.8 });
          x += item.width + itemGap;
        });
        y -= size(11.6);
      });
    };

    drawText(pdfText(exportResume.name || "Your Name"), page.width / 2, y, { bold: true, size: 21, align: "center" });
    y -= size(15);

    if (exportResume.targetRole) {
      drawText(pdfText(exportResume.targetRole), page.width / 2, y, { bold: true, size: 9.2, align: "center" });
      y -= size(11);
    }
    addContactRows();
    y -= size(4);

    addSection("Summary");
    addWrappedText(exportResume.summary, { size: 9.2, lineHeight: 11.6, after: 1.4 });

    addSection("Experience");
    (exportResume.experience || []).forEach((item) => {
      addPair(item.title || "Role", item.dates);
      addWrappedText(item.company, { bold: true, size: 9.1, lineHeight: 11.2, after: 0.7 });
      addBullets(item.bullets);
      y -= size(2);
    });

    addSection("Projects");
    (exportResume.projects || []).forEach((item) => {
      addPair(item.title || "Project", item.dates);
      addWrappedText(item.subtitle, { size: 9, lineHeight: 11.1, after: 0.7 });
      addBullets(item.bullets);
      y -= size(2);
    });

    addSection("Skills");
    addBullets(exportResume.skills);

    addSection("Licences and Certifications");
    addBullets(exportResume.achievements);
    (exportResume.certifications || []).forEach((item) => {
      const text = [item.title, item.issuer, item.dates].filter(Boolean).join(", ");
      addBullets(text, { bold: true });
    });

    addSection("Education");
    (exportResume.education || []).forEach((item) => {
      addPair(item.school || "Institution", item.degree || "");
      addWrappedText(item.dates, { size: 9, lineHeight: 11, after: 1 });
    });

    if (draw) commands.push("Q");
    return { bottomY: y, stream: commands.join("\n") };
  };

  let low = 0.62;
  let high = 1.45;
  let best = low;
  for (let index = 0; index < 18; index += 1) {
    const mid = (low + high) / 2;
    if (render(mid).bottomY >= page.marginBottom) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  const output = render(Math.max(0.45, Math.min(1.45, best * 0.995)), true);
  return buildPdfBytes([output.stream], page);
}

function preparePdfResume(resume) {
  const prepared = hardenPdfResume(normalizeResume(resume));
  return {
    ...prepared,
    targetRole: compactPdfText(prepared.targetRole, 20),
    summary: compactPdfText(ensurePdfSummaryRole(prepared.summary, prepared.targetRole, prepared.skills), 150),
    experience: compactPdfItems(prepared.experience, 8, 10),
    projects: compactPdfItems(prepared.projects, 8, 8),
    skills: compactPdfSkills(prepared.skills, prepared),
    achievements: compactPdfBullets(prepared.achievements, 10),
    certifications: uniquePdfCertifications(prepared.certifications).slice(0, 10),
    education: (prepared.education || []).filter((item) => item.school || item.degree).slice(0, 5),
  };
}

function hardenPdfResume(resume) {
  const usedStarts = new Set();
  const acceptedBullets = [];
  const targetRole = compactPdfText(resume.targetRole || inferPdfTargetRole(resume), 10);
  return {
    ...resume,
    targetRole,
    summary: hardenPdfText(resume.summary),
    achievements: compactPdfBullets(resume.achievements, 4),
    experience: hardenPdfItems(resume.experience, usedStarts, acceptedBullets),
    projects: hardenPdfItems(resume.projects, usedStarts, acceptedBullets),
  };
}

function hardenPdfItems(items = [], usedStarts, acceptedBullets) {
  return (items || []).map((item) => ({
    ...item,
    title: hardenPdfText(item.title),
    company: hardenPdfText(item.company),
    subtitle: hardenPdfText(item.subtitle),
    bullets: hardenPdfBulletBlock(item.bullets, usedStarts, acceptedBullets),
  }));
}

function compactPdfItems(items, itemLimit, bulletLimit) {
  return (items || [])
    .filter((item) => item.title || item.company || item.subtitle || item.bullets)
    .slice(0, itemLimit)
    .map((item, index) => ({
      ...item,
      title: compactPdfText(item.title, 15),
      company: compactPdfText(item.company, 15),
      subtitle: compactPdfText(item.subtitle, 15),
      bullets: compactPdfBullets(item.bullets, bulletLimit),
    }));
}

function compactPdfBullets(value, limit = 4) {
  return splitPdfLines(value)
    .map((line) => compactPdfText(hardenPdfText(line), 24))
    .filter(Boolean)
    .slice(0, limit)
    .join("\n");
}

function compactPdfSkills(value, resume = {}) {
  const rawLines = splitPdfLines(value);
  const hardSkills = [];
  const extraLines = [];
  rawLines.forEach((line) => {
    const cleaned = compactPdfText(hardenPdfText(line), 25);
    if (!cleaned) return;
    if (/^soft skills\s*:/i.test(cleaned)) return;
    if (/^(languages|frontend|backend|database|tools|domain skills|hard skills)\s*:/i.test(cleaned)) {
      hardSkills.push(cleaned.replace(/^(hard skills|languages|frontend|backend|database|tools|domain skills)\s*:\s*/i, ""));
    } else {
      extraLines.push(cleaned);
    }
  });
  const inferredHard = inferPdfHardSkills(resume);
  const hardLine = uniquePdfSkillItems([...hardSkills, ...extraLines, inferredHard].join(", "))
    .slice(0, 30)
    .join(", ");
  const lines = [
    hardLine ? `Hard Skills: ${hardLine}` : "",
    PDF_SOFT_SKILLS,
    ...rawLines
      .map((line) => compactPdfText(hardenPdfText(line), 25))
      .filter((line) => /^(languages|frontend|backend|database|tools|domain skills)\s*:/i.test(line))
      .slice(0, 6),
  ].filter(Boolean);
  return uniquePdfLines(lines).slice(0, 10).join("\n");
}

function hardenPdfBulletBlock(value, usedStarts, acceptedBullets) {
  const local = [];
  return splitPdfLines(value)
    .map((line) => ensurePdfActionVerb(line, usedStarts))
    .filter((line) => {
      if (!line) return false;
      if (local.some((item) => pdfSimilarity(item, line) >= 0.72)) return false;
      if (acceptedBullets.some((item) => pdfSimilarity(item, line) >= 0.72)) return false;
      local.push(line);
      acceptedBullets.push(line);
      return true;
    })
    .slice(0, 8)
    .join("\n");
}

function ensurePdfActionVerb(value, usedStarts) {
  const cleanLine = hardenPdfText(value).replace(/[.!?]+$/g, "");
  if (!cleanLine) return "";
  const match = cleanLine.match(/^([A-Z][a-z]+)\b(.*)$/);
  const currentVerb = match?.[1] || "";
  const hasAction = hasPdfActionVerb(cleanLine);
  const shouldReplace = !hasAction || usedStarts.has(currentVerb.toLowerCase());
  const verb = shouldReplace ? nextPdfActionVerb(usedStarts) : currentVerb;
  usedStarts.add(verb.toLowerCase());
  const body = shouldReplace && hasAction ? (match?.[2] || "").trim() : cleanLine;
  const sentence = shouldReplace ? `${verb} ${lowerFirstPdf(body)}` : cleanLine;
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function nextPdfActionVerb(usedStarts) {
  return PDF_ACTION_VERBS.find((verb) => !usedStarts.has(verb.toLowerCase())) || PDF_ACTION_VERBS[usedStarts.size % PDF_ACTION_VERBS.length];
}

function hasPdfActionVerb(value) {
  return new RegExp(`^(${PDF_ACTION_VERBS.join("|")})\\b`, "i").test(String(value || "").trim());
}

function hardenPdfText(value) {
  return pdfText(value)
    .replace(/\s+/g, " ")
    .replace(/([a-z0-9])\.([A-Z])/g, "$1. $2")
    .replace(/([a-z0-9]),([A-Z])/g, "$1, $2")
    .replace(/([a-z0-9]);([A-Z])/g, "$1; $2")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\b(\w+)\s+\1\b/gi, "$1")
    .replace(/\b(Developed|Built|Created|Implemented|Optimized|Improved|Integrated|Managed|Led|Delivered|Configured|Designed|Supported|Maintained|Prepared|Assisted|Coordinated|Performed|Engineered|Enhanced|Reduced|Increased|Launched|Analyzed|Automated)\s+and\s+(deploy|integrate|design|develop|optimize|enhance|configure|deliver|engineer|implement|build|create|manage|support|maintain|prepare|assist|coordinate|perform|reduce|increase|launch|analyze|automate)\b/gi, (_, first, second) => `${first} and ${pdfPastTense(second)}`)
    .replace(/\bto\s+extracts\b/gi, "to extract")
    .replace(/\bto\s+sends\b/gi, "to send")
    .replace(/\bto\s+optimizes\b/gi, "to optimize")
    .replace(/\bachieve\s+(\d+\+?)\s+ATS score\b/gi, "achieve an $1 ATS score")
    .replace(/\breact\.?\s*js\b/gi, "React.js")
    .replace(/\bnode\.?\s*js\b/gi, "Node.js")
    .replace(/\bexpress\.?\s*js\b/gi, "Express.js")
    .replace(/\bnext\.?\s*js\b/gi, "Next.js")
    .replace(/\bjavascript\b/gi, "JavaScript")
    .replace(/\btypescript\b/gi, "TypeScript")
    .replace(/\bmongodb\b/gi, "MongoDB")
    .replace(/\bgithub\b/gi, "GitHub")
    .replace(/\bchrome\s*driver\b/gi, "ChromeDriver")
    .replace(/\bchromedriver\b/gi, "ChromeDriver")
    .replace(/\brestful api\b/gi, "REST API")
    .replace(/\brest api\b/gi, "REST API")
    .replace(/\brest apis\b/gi, "REST APIs")
    .replace(/\bhtml\b/gi, "HTML")
    .replace(/\bcss\b/gi, "CSS")
    .replace(/\bsql\b/gi, "SQL")
    .replace(/\bmern\b/gi, "MERN")
    .replace(/\bapi\b/gi, "API")
    .replace(/\bapis\b/gi, "APIs")
    .replace(/\bexperiance\b/gi, "experience")
    .replace(/\bexprience\b/gi, "experience")
    .replace(/\bdevelopement\b/gi, "development")
    .replace(/\bmanagment\b/gi, "management")
    .replace(/\bteh\b/gi, "the")
    .replace(/\brecieve\b/gi, "receive")
    .replace(/\bseperate\b/gi, "separate")
    .replace(/\bdefinately\b/gi, "definitely")
    .trim();
}

function ensurePdfSummaryRole(summary, targetRole, skills) {
  const cleanSummary = hardenPdfText(summary);
  const role = hardenPdfText(targetRole);
  if (!role || roleAppearsInPdfText(role, cleanSummary)) return cleanSummary;
  const skillText = uniquePdfSkillItems(skills).slice(0, 4).join(", ");
  const suffix = skillText ? ` with experience in ${skillText}` : "";
  return `${role}${suffix}. ${lowerFirstPdf(cleanSummary)}`.trim();
}

function inferPdfTargetRole(resume) {
  const candidates = [
    resume.targetRole,
    ...(resume.experience || []).map((item) => item.title),
    ...(resume.projects || []).map((item) => item.title),
  ];
  return candidates.map(hardenPdfText).find((item) => item && !/\b(project|platform|system|website)\b/i.test(item)) || "";
}

function inferPdfHardSkills(resume = {}) {
  const text = hardenPdfText([
    resume.skills,
    resume.summary,
    ...(resume.experience || []).flatMap((item) => [item.title, item.bullets]),
    ...(resume.projects || []).flatMap((item) => [item.title, item.subtitle, item.bullets]),
  ].join(" "));
  const lower = text.toLowerCase();
  return PDF_KNOWN_HARD_SKILLS.filter((skill) => lower.includes(skill.toLowerCase().replace(".js", ""))).join(", ");
}

function uniquePdfSkillItems(value) {
  const seen = new Set();
  return hardenPdfText(value)
    .replace(/^(hard skills|soft skills|languages|frontend|backend|database|tools|domain skills)\s*:/i, "")
    .split(/,|\n|;/)
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLowerCase().replace(/[^a-z0-9+#.]/g, "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function uniquePdfLines(lines) {
  const seen = new Set();
  return lines.filter((line) => {
    const key = hardenPdfText(line).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function roleAppearsInPdfText(role, text) {
  const cleanRole = pdfClean(role).replace(/\blabourer\b/g, "laborer");
  const cleanText = pdfClean(text).replace(/\blabourer\b/g, "laborer");
  return cleanRole && cleanText.includes(cleanRole);
}

function pdfSimilarity(a, b) {
  const left = pdfKeywordSet(a);
  const right = pdfKeywordSet(b);
  if (!left.size || !right.size) return 0;
  return [...left].filter((word) => right.has(word)).length / Math.min(left.size, right.size);
}

function pdfKeywordSet(value) {
  return new Set(pdfClean(value).split(" ").filter((word) => word.length > 3 && !["with", "using", "through", "including", "application", "applications", "project"].includes(word)));
}

function pdfClean(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").replace(/\s+/g, " ").trim();
}

function lowerFirstPdf(value) {
  const text = String(value || "").trim();
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : "";
}

function pdfPastTense(value) {
  const verbs = {
    deploy: "deployed",
    integrate: "integrated",
    design: "designed",
    develop: "developed",
    optimize: "optimized",
    enhance: "enhanced",
    configure: "configured",
    deliver: "delivered",
    engineer: "engineered",
    implement: "implemented",
    build: "built",
    create: "created",
    manage: "managed",
    support: "supported",
    maintain: "maintained",
    prepare: "prepared",
    assist: "assisted",
    coordinate: "coordinated",
    perform: "performed",
    reduce: "reduced",
    increase: "increased",
    launch: "launched",
    analyze: "analyzed",
    automate: "automated",
  };
  return verbs[String(value || "").toLowerCase()] || value;
}

function uniquePdfCertifications(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = pdfText([item.title, item.issuer].filter(Boolean).join(" "));
    if (!key || seen.has(key.toLowerCase())) return false;
    seen.add(key.toLowerCase());
    return true;
  });
}

function compactPdfText(value, maxWords) {
  const text = pdfText(value);
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(" ").replace(/[.,;:]+$/, "")}.`;
}

function buildPdfBytes(pageStreams, page) {
  const encoder = new TextEncoder();
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];
  const pageIds = [];

  pageStreams.forEach((stream) => {
    const contentId = objects.length + 1;
    const pageId = objects.length + 2;
    pageIds.push(pageId);
    objects.push(`<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(page.width)} ${fmt(page.height)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);
  });

  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n% Rover Resume PDF\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = encoder.encode(pdf).length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return encoder.encode(pdf);
}

function wrapPdfLine(value, maxWidth, fontSize, bold = false) {
  const text = pdfText(value);
  if (!text) return [];
  const lines = [];
  let line = "";
  text.split(/\s+/).forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (estimateTextWidth(candidate, fontSize, bold) <= maxWidth) {
      line = candidate;
      return;
    }
    if (line) lines.push(line);
    line = word;
    while (estimateTextWidth(line, fontSize, bold) > maxWidth && line.length > 8) {
      let cut = Math.floor(line.length * (maxWidth / estimateTextWidth(line, fontSize, bold)));
      cut = Math.max(8, Math.min(line.length - 1, cut));
      lines.push(line.slice(0, cut));
      line = line.slice(cut);
    }
  });
  if (line) lines.push(line);
  return lines;
}

function estimateTextWidth(value, fontSize, bold = false) {
  if (value === PDF_BULLET) return fontSize * 0.36;
  const factor = bold ? 0.56 : 0.52;
  return pdfText(value).split("").reduce((width, char) => {
    if (char === " ") return width + fontSize * 0.28;
    if (/[ilI.,'|]/.test(char)) return width + fontSize * 0.24;
    if (/[mwMW@#%&]/.test(char)) return width + fontSize * 0.78;
    if (/[A-Z]/.test(char)) return width + fontSize * 0.6;
    return width + fontSize * factor;
  }, 0);
}

function escapePdfText(value) {
  if (value === PDF_BULLET) return "\\225";
  return pdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\u2022/g, "\\225");
}

function pdfText(value) {
  return String(value || "")
    .replace(/[\u2022\u25cf\u25aa]/g, PDF_BULLET)
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

function splitPdfLines(value) {
  return String(value || "")
    .split(/\n|;/)
    .map((line) => line.replace(/^[\s*\-\u2022\u25cf\u25aa]+/, "").trim())
    .map(pdfText)
    .filter(Boolean);
}

function fmt(value) {
  return Number(value).toFixed(2).replace(/\.?0+$/, "");
}

function contactPdfItems(resume) {
  return contactItems(resume)
    .map((item) => ({
      key: item.key,
      value: item.external ? normalizeExternalUrl(item.value) : item.value,
    }))
    .map((item) => ({ ...item, value: pdfText(item.value) }))
    .filter((item) => item.value);
}

function contactItems(resume) {
  return [
    resume.phone ? { key: "phone", value: resume.phone, href: `tel:${String(resume.phone).replace(/[^\d+]/g, "")}` } : null,
    resume.email ? { key: "email", value: resume.email, href: `mailto:${resume.email}` } : null,
    resume.location ? { key: "location", value: resume.location } : null,
    resume.linkedin ? { key: "linkedin", value: resume.linkedin, href: normalizeExternalUrl(resume.linkedin), external: true } : null,
    resume.github ? { key: "github", value: resume.github, href: normalizeExternalUrl(resume.github), external: true } : null,
  ].filter(Boolean);
}

function contactHtml(resume) {
  const items = contactItems(resume);
  if (!items.length) return "";
  return `<div class="contact">${items.map((item) => {
    const content = `${contactSvg(item.key)}${item.href ? `<a href="${escapeHtml(item.href)}">${escapeHtml(item.value)}</a>` : `<span>${escapeHtml(item.value)}</span>`}`;
    return `<span class="contact-item">${content}</span>`;
  }).join("")}</div>`;
}

function contactSvg(type) {
  const icons = {
    phone: '<path d="M6.7 4.8 8.4 8c.3.5.2 1.1-.2 1.5l-.9.9a12 12 0 0 0 6.3 6.3l.9-.9c.4-.4 1-.5 1.5-.2l3.2 1.7c.6.3.9 1 .7 1.6l-.7 2c-.2.6-.8 1-1.4 1A15.7 15.7 0 0 1 2.1 6.2c0-.6.4-1.2 1-1.4l2-.7c.6-.2 1.3.1 1.6.7Z"/>',
    email: '<rect x="3.5" y="5.8" width="17" height="12.4" rx="1.8"/><path d="m4.5 7 7.5 5.5L19.5 7"/>',
    location: '<path d="M12 21s6-6.2 6-11.2A6 6 0 0 0 6 9.8C6 14.8 12 21 12 21Z"/><circle cx="12" cy="9.8" r="2.1"/>',
    linkedin: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.2"/><path d="M8 10v6.2"/><path d="M8 7.8v.1"/><path d="M11.3 16.2v-3.5c0-1.6.9-2.7 2.4-2.7s2.3 1 2.3 2.7v3.5"/><path d="M11.3 10.2v6"/>',
    github: '<path d="M12 3.5a8.5 8.5 0 0 0-2.7 16.6c.4.1.5-.2.5-.4v-1.5c-2.2.5-2.7-.9-2.7-.9-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.2 1.9.9 2.3.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-4 0-.9.3-1.6.8-2.2-.1-.2-.4-1.1.1-2.2 0 0 .7-.2 2.3.8.7-.2 1.4-.3 2.1-.3s1.4.1 2.1.3c1.6-1 2.3-.8 2.3-.8.5 1.1.2 2 .1 2.2.5.6.8 1.3.8 2.2 0 3.1-1.9 3.8-3.7 4 .3.3.6.8.6 1.6v2.3c0 .2.1.5.5.4A8.5 8.5 0 0 0 12 3.5Z"/>',
  };
  return `<svg class="contact-icon" viewBox="0 0 24 24" aria-hidden="true">${icons[type] || ""}</svg>`;
}

function normalizeExternalUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function escapeHtml(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function slug(value) {
  return String(value || "resume").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "resume";
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

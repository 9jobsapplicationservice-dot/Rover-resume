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
    downloadBlob(composeResumeText(cleanResume), "txt", "text/plain;charset=utf-8");
  }

  function downloadDoc() {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(cleanResume.name || "Resume")}</title></head><body>${resumeHtml(cleanResume)}</body></html>`;
    downloadBlob(html, "doc", "application/msword;charset=utf-8");
  }

  async function downloadPdf() {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 36;
      const pageWidth = doc.internal.pageSize.getWidth();
      const contentWidth = pageWidth - margin * 2;
      let y = 45;

      const SIZES = {
        NAME: 24,
        CONTACT: 9,
        SECTION: 12.2,
        ENTRY_TITLE: 10.8,
        TEXT: 9.4,
        LINE_HEIGHT: 1.24,
      };

      const setFont = (style = "normal", size = SIZES.TEXT, color = "#111111") => {
        doc.setFont("times", style);
        doc.setFontSize(size);
        doc.setTextColor(color);
      };

      const addText = (text, size = SIZES.TEXT, style = "normal", align = "left", color = "#111111") => {
        if (!String(text || "").trim()) return;
        setFont(style, size, color);
        const lines = doc.splitTextToSize(String(text || ""), contentWidth);
        if (align === "center") {
          doc.text(lines, pageWidth / 2, y, { align: "center" });
        } else if (align === "right") {
          doc.text(lines, pageWidth - margin, y, { align: "right" });
        } else {
          doc.text(lines, margin, y);
        }
        y += lines.length * size * SIZES.LINE_HEIGHT + size * 0.16;
      };

      const addRow = (left, right = "", options = {}) => {
        const leftText = String(left || "").trim();
        const rightText = String(right || "").trim();
        if (!leftText && !rightText) return;
        const size = options.size || SIZES.ENTRY_TITLE;
        const leftStyle = options.leftStyle || "bold";
        const rightStyle = options.rightStyle || "normal";
        setFont(rightStyle, size);
        const rightWidth = rightText ? doc.getTextWidth(rightText) : 0;
        const leftMaxWidth = rightText ? contentWidth - rightWidth - 18 : contentWidth;
        const lines = doc.splitTextToSize(leftText || " ", Math.max(190, leftMaxWidth));
        lines.forEach((line, index) => {
          setFont(leftStyle, size);
          doc.text(line, margin, y);
          if (index === 0 && rightText) {
            setFont(rightStyle, Math.max(8.8, size - 0.2), "#222222");
            doc.text(rightText, pageWidth - margin, y, { align: "right" });
          }
          y += size * (options.lineHeight || 1.15);
        });
        y += options.after || 0;
      };

      const addSection = (title) => {
        y += 15;
        setFont("bold", SIZES.SECTION);
        doc.text(title.toUpperCase(), margin, y);
        y += 3.8;
        doc.setDrawColor(34, 34, 34);
        doc.setLineWidth(0.35);
        doc.line(margin, y, pageWidth - margin, y);
        y += 14;
      };

      const drawContactIcon = (type, x, baselineY, iconSize = 8.2) => {
        const top = baselineY - iconSize + 1.1;
        const unit = iconSize / 24;
        const px = (value) => x + value * unit;
        const py = (value) => top + value * unit;
        doc.setDrawColor(17, 17, 17);
        doc.setLineWidth(0.8);

        if (type === "phone") {
          doc.line(px(7), py(5), px(10), py(8));
          doc.line(px(10), py(8), px(8.4), py(10.2));
          doc.line(px(8.4), py(10.2), px(13.8), py(15.6));
          doc.line(px(13.8), py(15.6), px(16), py(14));
          doc.line(px(16), py(14), px(19), py(17));
          doc.line(px(19), py(17), px(17.2), py(20));
          doc.line(px(17.2), py(20), px(14.2), py(19));
          doc.line(px(14.2), py(19), px(5), py(9.8));
          doc.line(px(5), py(9.8), px(4), py(6.8));
          doc.line(px(4), py(6.8), px(7), py(5));
          return;
        }

        if (type === "email") {
          doc.rect(px(3.8), py(6.2), 16.4 * unit, 11.6 * unit);
          doc.line(px(4.7), py(7.2), px(12), py(12.4));
          doc.line(px(19.3), py(7.2), px(12), py(12.4));
          doc.line(px(4.8), py(16.8), px(10), py(12.7));
          doc.line(px(19.2), py(16.8), px(14), py(12.7));
          return;
        }

        if (type === "location") {
          doc.circle(px(12), py(9.4), 2.1 * unit);
          doc.line(px(12), py(21), px(7.4), py(13.6));
          doc.line(px(12), py(21), px(16.6), py(13.6));
          doc.line(px(7.4), py(13.6), px(6.1), py(9.6));
          doc.line(px(16.6), py(13.6), px(17.9), py(9.6));
          return;
        }

        if (type === "linkedin") {
          doc.rect(px(4), py(4), 16 * unit, 16 * unit);
          doc.line(px(8), py(10), px(8), py(17));
          doc.line(px(11.2), py(10), px(11.2), py(17));
          doc.line(px(11.2), py(12), px(14.2), py(10));
          doc.line(px(14.2), py(10), px(16.6), py(12.4));
          doc.line(px(16.6), py(12.4), px(16.6), py(17));
          return;
        }

        doc.circle(px(12), py(12), 7.2 * unit);
        doc.line(px(8), py(12), px(16), py(12));
        doc.line(px(12), py(8), px(12), py(16));
      };

      const addContactRow = () => {
        const iconSize = 8.2;
        const iconGap = 3.8;
        const itemGap = 12;
        setFont("normal", SIZES.CONTACT, "#333333");
        const entries = contactItems(cleanResume)
          .map((item) => ({ ...item, value: String(item.value || "").trim() }))
          .filter((item) => item.value)
          .map((item) => ({
            ...item,
            width: iconSize + iconGap + doc.getTextWidth(item.value),
          }));
        if (!entries.length) return;

        const rows = [];
        let current = [];
        let currentWidth = 0;
        entries.forEach((entry) => {
          const nextWidth = currentWidth + (current.length ? itemGap : 0) + entry.width;
          if (current.length && nextWidth > contentWidth) {
            rows.push({ items: current, width: currentWidth });
            current = [entry];
            currentWidth = entry.width;
          } else {
            current.push(entry);
            currentWidth = nextWidth;
          }
        });
        if (current.length) rows.push({ items: current, width: currentWidth });

        rows.slice(0, 2).forEach((row) => {
          let x = margin + Math.max(0, (contentWidth - row.width) / 2);
          row.items.forEach((item, index) => {
            if (index > 0) x += itemGap;
            drawContactIcon(item.key, x, y, iconSize);
            setFont("normal", SIZES.CONTACT, "#333333");
            doc.text(item.value, x + iconSize + iconGap, y);
            x += item.width;
          });
          y += SIZES.CONTACT * 1.35;
        });
      };

      const addBullets = (value) => {
        String(value || "").split("\n").filter(Boolean).forEach((bullet) => {
          const bLines = doc.splitTextToSize("\u2022 " + bullet.trim(), contentWidth - 12);
          setFont("normal", SIZES.TEXT);
          doc.text(bLines, margin + 9, y);
          y += bLines.length * SIZES.TEXT * SIZES.LINE_HEIGHT;
        });
      };

      addText(cleanResume.name || "Your Name", SIZES.NAME, "bold", "center");
      y -= 4;
      addContactRow();
      y += 6;

      if (cleanResume.summary) {
        addSection("Summary");
        addText(cleanResume.summary);
      }

      if (cleanResume.experience?.length) {
        addSection("Experience");
        cleanResume.experience.forEach((exp) => {
          if (!exp.title && !exp.company) return;
          addRow(exp.title || "Role", exp.dates, { after: 0.5 });
          addText(exp.company || "", SIZES.TEXT, "bold");
          addBullets(exp.bullets);
          y += 4;
        });
      }

      if (cleanResume.projects?.length) {
        addSection("Projects");
        cleanResume.projects.forEach((proj) => {
          if (!proj.title) return;
          addRow(proj.title || "Project", proj.dates, { after: 0.5 });
          addText(proj.subtitle || "");
          addBullets(proj.bullets);
          y += 4;
        });
      }

      if (cleanResume.skills) {
        addSection("Skills");
        addText(cleanResume.skills);
      }

      const certs = [
        ...(cleanResume.achievements ? cleanResume.achievements.split("\n") : []),
        ...(cleanResume.certifications || []).map((cert) => [cert.title, cert.issuer, cert.dates].filter(Boolean).join(", ")),
      ].filter(Boolean);

      if (certs.length) {
        addSection("Certifications");
        certs.forEach((cert) => {
          const lines = doc.splitTextToSize("\u2022 " + cert, contentWidth - 12);
          setFont("normal", SIZES.TEXT);
          doc.text(lines, margin + 9, y);
          y += lines.length * SIZES.TEXT * SIZES.LINE_HEIGHT;
        });
      }

      if (cleanResume.education?.length) {
        addSection("Education");
        cleanResume.education.forEach((edu) => {
          const schoolText = [edu.school, edu.dates ? "(" + edu.dates + ")" : ""].filter(Boolean).join(" ");
          addRow(schoolText, edu.degree || "", { lineHeight: 1.18, rightStyle: "normal" });
          y += 2;
        });
      }

      doc.save(slug(cleanResume.name || "resume") + ".pdf");
      setMessage("Resume PDF downloaded successfully.");
    } catch (err) {
      console.error(err);
      setMessage("PDF generation failed. Please try again.");
    }
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
                <button className="ghost-btn small" type="button" onClick={downloadTxt}>Download TXT</button>
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


function contactItems(resume) {
  return [
    resume.phone ? { key: "phone", value: resume.phone, href: `tel:${String(resume.phone).replace(/[^\d+]/g, "")}` } : null,
    resume.email ? { key: "email", value: resume.email, href: `mailto:${resume.email}` } : null,
    resume.location ? { key: "location", value: resume.location } : null,
    resume.linkedin ? { key: "linkedin", value: "LinkedIn", href: normalizeExternalUrl(resume.linkedin), external: true } : null,
    resume.github ? { key: "github", value: "GitHub", href: normalizeExternalUrl(resume.github), external: true } : null,
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

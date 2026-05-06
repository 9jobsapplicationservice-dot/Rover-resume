import { composeResumeText, normalizeResume } from "@/lib/resume";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const SCORE_CATEGORIES = [
  ["Contact/Profile", 15],
  ["ATS Structure", 15],
  ["Parse Safety", 10],
  ["Skills/Keywords", 15],
  ["Bullet Quality", 20],
  ["Dates/Education", 10],
  ["Grammar/Readability", 15],
];

export async function optimizeWithGemini(rawText, targetRole, jobDescription, mode = "preserve") {
  const preserveMode = mode !== "enhance";
  const prompt = [
    "You are a senior ATS resume optimizer and resume parser.",
    "Return strict JSON only. Do not wrap it in markdown.",
    "Use this exact JSON shape as a template. Replace ALL example values with the actual data extracted from the candidate's resume:",
    JSON.stringify({
      resume: {
        name: "John Doe",
        phone: "+1 234 567 8900",
        email: "john@example.com",
        location: "New York, NY",
        linkedin: "linkedin.com/in/johndoe",
        github: "github.com/johndoe",
        targetRole: "Software Engineer",
        summary: "Highly skilled professional with experience in...",
        skills: "Languages: JavaScript, Python\nFrontend: React, HTML\nBackend: Node.js",
        achievements: "Awarded Employee of the Month 2023",
        certifications: [{ title: "AWS Solutions Architect", issuer: "Amazon", dates: "2023" }],
        experience: [{ title: "Senior Developer", company: "Tech Corp", dates: "2020 - Present", bullets: "Engineered scalable applications...\nLed a team of 5..." }],
        projects: [{ title: "E-commerce Platform", subtitle: "MERN Stack", dates: "2022", bullets: "Built a full-stack platform...\nIntegrated Stripe..." }],
        education: [{ school: "State University", degree: "B.S. Computer Science", dates: "2016 - 2020" }],
      },
    }),
    "CRITICAL WARNING: The JSON above is ONLY an example of the expected structure. You MUST completely replace 'John Doe' and all other example data with the actual, real data extracted from the resume text below.",
    "Rules:",
    "1. STRICT EXTRACTION: Fill the JSON fields with the candidate's actual data. The 'name', 'phone', and 'email' MUST be correctly extracted from the top of the resume.",
    "2. STRICT PARSING: You MUST accurately extract and separate EVERY single job, project, and education entry. Treat Employment History, Work History, and Career History as Experience. Return ALL array items. DO NOT merge different jobs together. DO NOT move bullets from one job to another.",
    "3. NO HALLUCINATION: Use ONLY the facts, metrics, and details present in the source text. DO NOT invent or infer metrics, percentages, tools, or achievements.",
    preserveMode
      ? "4. PRESERVE MODE: Preserve the candidate's original role/domain, section boundaries, titles, companies, dates, project names, skills, certifications, education, and contact data. Do not rewrite into a different profession. Do not add target-role content unless it appears in the uploaded resume."
      "4. BULLET OPTIMIZATION: Improve the phrasing of existing bullets to be world-class ATS-friendly statements. YOU MUST aim for a 95+ ATS score by: starting EVERY bullet with a powerful action verb (e.g., Engineered, Orchestrated, Optimized, Spearedheaded), adding specific measurable metrics (e.g., percentages, dollar amounts, time saved, volume) where possible, and aligning with the target role keywords. Fix grammar and spelling while retaining original facts.",
    "5. COMPLETE CONTENT: Never truncate content. Extract the FULL summary and ALL experience bullets. Extract only the Professional Summary/Profile text into resume.summary. Never include Experience, Projects, or Skills inside resume.summary.",
    "6. ATS SCORE TARGET: Write content that will achieve a 95%+ ATS score. This means: no weak phrases (e.g., 'responsible for'), no generic summaries, 8-20 rich skills, and clean, consistent dates.",
    `Conversion mode: ${preserveMode ? "preserve uploaded resume data" : "enhance ATS wording to 95+ score quality"}`,
    `Target role: ${targetRole || "Infer strictly from the uploaded resume"}`,
    `Job description or keywords: ${jobDescription || "Not provided"}`,
    "Resume text:",
    rawText,
  ].join("\n\n");

  const parsed = await geminiJson(prompt, 60000);
  return normalizeResume(parsed.resume || parsed);
}

export async function scoreWithGemini(resume, targetRole = "", jobDescription = "") {
  const cleanResume = normalizeResume(resume);
  const resumeText = composeResumeText(cleanResume);
  const prompt = [
    "You are a senior ATS resume checker.",
    "Score generic ATS resume quality only. Do not score private job-match compatibility unless job keywords are explicitly provided.",
    "Return strict JSON only. Do not wrap it in markdown.",
    "Use this exact JSON shape:",
    JSON.stringify({
      score: 0,
      grade: "Excellent | Good | Fair | Weak",
      status: "ATS Ready | Improve Content | Needs Work | Major Fixes Needed",
      checks: [{ label: "Contact/Profile: 0%", pass: false, category: "Contact/Profile", points: 0, max: 15 }],
      notes: ["Specific fix written as a short sentence."],
      breakdown: [{ label: "Contact/Profile", points: 0, max: 15, percent: 0, status: "Strong | Good | Needs work | Weak", note: "Specific category feedback." }],
    }),
    "Use these weighted categories and maximum points exactly:",
    SCORE_CATEGORIES.map(([label, max]) => `${label}: ${max}`).join("\n"),
    "Rubric:",
    "1. Contact/Profile rewards complete name, phone, email, location, LinkedIn/portfolio links, and target role.",
    "2. ATS Structure requires Summary, Experience, Skills, Education, and relevant projects/certifications where available.",
    "3. Parse Safety penalizes table-like formatting, long URLs, unusual symbols, missing standard headings, and overly long resumes.",
    "4. Skills/Keywords rewards focused role keywords, 8-20 useful skills, category diversity, and low duplication.",
    "5. Bullet Quality heavily rewards action verbs, concise bullets, measurable impact, role relevance, and unique bullets.",
    "6. Dates/Education checks real employer/institution names, dates, education, licences, and certification consistency.",
    "7. Grammar/Readability penalizes typos, repeated words, weak phrases like responsible for/worked on, duplicate bullets, and repeated openings.",
    "Score rules:",
    "100 = Perfect ATS Ready. Use this score if the resume has all core sections, clean bullets, and proper formatting.",
    "90-99 = Excellent / ATS Ready. Use when contact, core sections, skills, dates, and quantified bullets are strong but have minor missing details.",
    "75-89 = Good / Improve Content.",
    "60-74 = Fair / Needs Work.",
    "Below 60 = Weak / Major Fixes Needed.",
    "Do not reward placeholders such as Your Name, Company, Institution, Project, empty dates, or empty links.",
    "Return exactly seven breakdown items using the category labels above.",
    `Target role: ${targetRole || cleanResume.targetRole || "Generic ATS quality"}`,
    `Job keywords: ${jobDescription || "Not provided"}`,
    "Resume JSON:",
    JSON.stringify(cleanResume),
    "Resume plain text:",
    resumeText,
  ].join("\n\n");

  return normalizeGeminiAts(await geminiJson(prompt, 45000));
}

async function geminiJson(prompt, timeoutMs) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is missing.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        }),
      },
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error?.message || "Gemini request failed.");
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!text) throw new Error("Gemini returned an empty response.");
    
    const cleanText = text.replace(/^```(json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(cleanText);
  } catch (error) {
    if (error.name === "AbortError") throw new Error(`Gemini timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeGeminiAts(raw) {
  if (!raw || typeof raw !== "object") throw new Error("Gemini ATS score was invalid.");
  const score = clampScore(raw.score);
  const breakdown = SCORE_CATEGORIES.map(([label, max]) => {
    const item = Array.isArray(raw.breakdown) ? raw.breakdown.find((entry) => entry?.label === label) : null;
    const points = clampNumber(item?.points ?? Math.round(((item?.percent ?? score) / 100) * max), 0, max);
    const percent = clampScore(item?.percent ?? Math.round((points / max) * 100));
    return {
      label,
      points: roundOne(points),
      max,
      percent,
      status: item?.status || categoryStatus(percent),
      note: String(item?.note || "AI review completed.").trim(),
    };
  });
  return {
    score,
    grade: gradeFromScore(score),
    status: statusFromScore(score),
    checks: breakdown.map((item) => ({
      label: `${item.label}: ${item.percent}%`,
      pass: item.percent >= 75,
      category: item.label,
      points: item.points,
      max: item.max,
    })),
    notes: normalizeNotes(raw.notes, breakdown),
    breakdown,
  };
}

function normalizeNotes(notes, breakdown) {
  const list = Array.isArray(notes) ? notes : [];
  const normalized = list.map((note) => String(note || "").trim()).filter(Boolean);
  const fallback = breakdown.filter((item) => item.percent < 85).map((item) => item.note);
  return [...new Set([...normalized, ...fallback])].slice(0, 12);
}

function clampScore(value) {
  return Math.round(clampNumber(value, 0, 100));
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function roundOne(value) {
  return Math.round(Number(value) * 10) / 10;
}

function gradeFromScore(score) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  return "Weak";
}

function statusFromScore(score) {
  if (score >= 90) return "ATS Ready";
  if (score >= 75) return "Improve Content";
  if (score >= 60) return "Needs Work";
  return "Major Fixes Needed";
}

function categoryStatus(percent) {
  if (percent >= 85) return "Strong";
  if (percent >= 70) return "Good";
  if (percent >= 55) return "Needs work";
  return "Weak";
}

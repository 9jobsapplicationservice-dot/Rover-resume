import "dotenv/config";
import express from "express";
import { randomUUID } from "node:crypto";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = http.createServer(app);
const preferredPort = Number(process.env.PORT || 3000);
const aiProvider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const useFreeMode = /^true$/i.test(process.env.OPENAI_FREE_MODE || "");
const isPreview = process.env.NODE_ENV === "production" || process.env.npm_lifecycle_event === "preview";

app.use(express.json({ limit: "1mb" }));

app.post("/api/resume/optimize", async (req, res) => {
  try {
    const rawText = String(req.body?.rawText || "").trim();
    const targetRole = String(req.body?.targetRole || "").trim();
    const jobDescription = String(req.body?.jobDescription || "").trim();

    if (!rawText) {
      return res.status(400).json({ error: "Please upload or paste resume text before converting." });
    }
    if (rawText.length > 45000) {
      return res.status(400).json({ error: "Resume text is too long. Please upload a shorter resume or paste the most relevant content." });
    }

    if (useFreeMode && aiProvider === "openai") {
      return res.json({
        useLocalFallback: true,
        message: "Free mode is enabled, so OpenAI billing is not used. The app will optimize this resume locally.",
      });
    }

    if (aiProvider === "gemini") {
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes("your_gemini")) {
        return res.status(400).json({
          error: "Gemini API key missing. Add GEMINI_API_KEY to your .env file from Google AI Studio, then restart the server.",
        });
      }

      const parsed = await generateGeminiResume(rawText, targetRole, jobDescription);
      const resume = normalizeResume(parsed.resume || {}, rawText, targetRole);
      const notes = Array.isArray(parsed.ats?.notes) ? parsed.ats.notes.filter(Boolean).slice(0, 6) : [];

      return res.json({
        resume,
        ats: {
          targetScore: 95,
          notes,
        },
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({
        error: "OpenAI API key missing. Add OPENAI_API_KEY to your .env file, then restart the server.",
      });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model,
      instructions: resumeInstructions(),
      input: resumeInput(rawText, targetRole, jobDescription),
      text: {
        format: {
          type: "json_schema",
          name: "ats_resume_optimization",
          strict: true,
          schema: resumeResponseSchema(),
        },
      },
    });

    const parsed = JSON.parse(response.output_text || "{}");
    const resume = normalizeResume(parsed.resume || {}, rawText, targetRole);
    const notes = Array.isArray(parsed.ats?.notes) ? parsed.ats.notes.filter(Boolean).slice(0, 6) : [];

    return res.json({
      resume,
      ats: {
        targetScore: 95,
        notes,
      },
    });
  } catch (error) {
    console.error("AI resume optimization failed:", error);
    const apiError = aiProvider === "gemini" ? normalizeGeminiError(error) : normalizeOpenAIError(error);
    if (apiError.useLocalFallback) {
      return res.json({
        useLocalFallback: true,
        message: apiError.error || "AI provider is unavailable right now. The app will optimize this resume locally.",
        detail: apiError.detail || "",
      });
    }
    return res.status(apiError.status).json(apiError);
  }
});

if (isPreview) {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true, hmr: { server: httpServer } },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

const availablePort = await findAvailablePort(preferredPort);

if (availablePort !== preferredPort) {
  console.warn(`Port ${preferredPort} is already in use. Using ${availablePort} instead.`);
}

httpServer.listen(availablePort, "0.0.0.0", () => {
  console.log(`Rover Resume ATS running at http://localhost:${availablePort}`);
  console.log(`AI provider: ${aiProvider}${aiProvider === "gemini" ? ` (${geminiModel})` : ` (${model})`}`);
});

function findAvailablePort(startPort, attemptsLeft = 10) {
  return new Promise((resolve, reject) => {
    const tester = net.createServer();
    tester.once("error", (error) => {
      if (error.code === "EADDRINUSE" && attemptsLeft > 0) {
        resolve(findAvailablePort(startPort + 1, attemptsLeft - 1));
        return;
      }
      reject(error);
    });
    tester.once("listening", () => {
      tester.close(() => resolve(startPort));
    });
    tester.listen(startPort, "0.0.0.0");
  });
}

function resumeInstructions() {
  return [
    "You are an ATS resume optimizer.",
    "Return only data that fits the supplied JSON schema.",
    "Preserve real candidate facts from the uploaded resume.",
    "Rewrite the summary and experience bullets into concise ATS-friendly language.",
    "Use action verbs, role-relevant keywords, and measurable language when the source supports it.",
    "Use the target role and job description to prioritize keywords, but do not invent employers, dates, degrees, licences, certifications, or tools.",
    "Do not invent metrics, percentages, team sizes, revenue, user counts, timelines, or scale. If a source bullet has no real measurable fact, keep it factual and add an ats note that a real metric is needed.",
    "Aim for 80% or more experience/project bullets containing real numbers, percentages, currency, counts, scale, or duration only when those details are present in the uploaded resume or job content.",
    "Avoid repeated sentence starts and repeated keywords across bullets. Each bullet must describe a distinct responsibility, technology, impact, or result.",
    "Proofread spelling and grammar. Use consistent professional casing such as JavaScript, React.js, Node.js, Express.js, MongoDB, RESTful API, GitHub, and Power BI.",
    "Before returning JSON, run a strict final self-check: no spelling errors, no grammar errors, no missing spaces after punctuation, no repeated words, no duplicated bullet meaning, no duplicate skills, no duplicate certifications, and no repeated action verb starts.",
    "If two bullets say the same thing, keep the stronger one and rewrite or remove the weaker one.",
    "Every bullet must be one clean sentence in active voice and must end with a period.",
    "Use a clean single-column ATS structure with exactly these exported section names and order: Summary, Experience, Projects, Skills, Achievements and Certifications, Education.",
    "Avoid tables, icons, decorative symbols, text boxes, multi-column wording, and complex formatting.",
    "Tailor the summary and the first two bullets to the target role or job description when supported by the resume.",
    "For MERN Stack Developer or Web Developer resumes, include supported keywords such as frontend development, backend development, responsive design, RESTful APIs, authentication, database management, Git, deployment, performance optimization, and cross-browser compatibility.",
    "Where the source supports it, quantify impact with numbers, scale, time saved, performance, users, projects, dashboards, reports, or quality outcomes.",
    "If a required fact is missing from the resume, leave that field blank.",
    "Keep bullets factual, one sentence each, 14-26 words, and avoid tables, columns, icons, or decorative formatting.",
    "Do not use weak repeated filler phrases such as aligned with business requirements, user-friendly, optimized performance, or secure payment processing unless the source specifically supports that distinct detail.",
    "Put only phone, email, LinkedIn, and GitHub in contact/profile fields. Do not put portfolio, live demo, website, or project URLs in resume.links for the header.",
    "Place portfolio, live demo, website, and project URLs inside relevant projects as project subtitle or bullets. If no matching project is clear, create a concise Portfolio / Project Links project.",
    "Preserve the candidate's actual skills and tools. Do not add frameworks, databases, cloud tools, automation tools, or programming languages unless they are supported by the uploaded resume or job description.",
    "Return resume.skills as category lines, one category per line, using only relevant categories from: Languages, Frontend, Backend, Database, Tools.",
    "Format resume.skills exactly like: Languages: HTML, CSS, JavaScript\nFrontend: React.js, Responsive Design\nBackend: Node.js, Express.js, REST APIs\nDatabase: MongoDB, SQL\nTools: Git, GitHub, Agile, Debugging.",
    "Remove duplicate skills across categories.",
    "Aim for strict ATS gates: parse-safe headings, 80%+ real metric bullets, zero repeated bullet starts or near-duplicate bullets, clean grammar, role keywords, categorized skills, education, and ATS-safe text.",
  ].join("\n");
}

function resumeInput(rawText, targetRole, jobDescription) {
  return [
    `Target role: ${targetRole || "Infer from resume"}`,
    `Job description or keywords: ${jobDescription || "Not provided"}`,
    "Uploaded resume text:",
    rawText,
  ].join("\n\n");
}

async function generateGeminiResume(rawText, targetRole, jobDescription) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${resumeInstructions()}\n\n${resumeInput(rawText, targetRole, jobDescription)}` }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: geminiResumeResponseSchema(),
          temperature: 0.2,
        },
      }),
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error?.message || `Gemini API request failed with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    error.code = payload.error?.status || payload.error?.code || "";
    error.detail = message;
    throw error;
  }

  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!text) throw new Error("Gemini returned an empty response.");
  return JSON.parse(text);
}

function resumeResponseSchema() {
  const experienceItem = {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      company: { type: "string" },
      dates: { type: "string" },
      startDate: { type: "string" },
      endDate: { type: "string" },
      current: { type: "boolean" },
      bullets: { type: "string" },
    },
    required: ["title", "company", "dates", "startDate", "endDate", "current", "bullets"],
  };
  const projectItem = {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      subtitle: { type: "string" },
      dates: { type: "string" },
      startDate: { type: "string" },
      endDate: { type: "string" },
      current: { type: "boolean" },
      bullets: { type: "string" },
    },
    required: ["title", "subtitle", "dates", "startDate", "endDate", "current", "bullets"],
  };
  const educationItem = {
    type: "object",
    additionalProperties: false,
    properties: {
      degree: { type: "string" },
      school: { type: "string" },
      dates: { type: "string" },
      startDate: { type: "string" },
      endDate: { type: "string" },
      current: { type: "boolean" },
    },
    required: ["degree", "school", "dates", "startDate", "endDate", "current"],
  };
  const certificationItem = {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      issuer: { type: "string" },
      dates: { type: "string" },
      startDate: { type: "string" },
      endDate: { type: "string" },
      current: { type: "boolean" },
    },
    required: ["title", "issuer", "dates", "startDate", "endDate", "current"],
  };

  return {
    type: "object",
    additionalProperties: false,
    properties: {
      resume: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          linkedin: { type: "string" },
          github: { type: "string" },
          links: { type: "string" },
          targetRole: { type: "string" },
          summary: { type: "string" },
          skills: { type: "string" },
          achievements: { type: "string" },
          certifications: { type: "array", items: certificationItem },
          experience: { type: "array", items: experienceItem },
          projects: { type: "array", items: projectItem },
          education: { type: "array", items: educationItem },
          rawText: { type: "string" },
        },
        required: [
          "name",
          "phone",
          "email",
          "linkedin",
          "github",
          "links",
          "targetRole",
          "summary",
          "skills",
          "achievements",
          "certifications",
          "experience",
          "projects",
          "education",
          "rawText",
        ],
      },
      ats: {
        type: "object",
        additionalProperties: false,
        properties: {
          targetScore: { type: "number" },
          notes: { type: "array", items: { type: "string" } },
        },
        required: ["targetScore", "notes"],
      },
    },
    required: ["resume", "ats"],
  };
}

function geminiResumeResponseSchema() {
  const experienceItem = {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      company: { type: "STRING" },
      dates: { type: "STRING" },
      startDate: { type: "STRING" },
      endDate: { type: "STRING" },
      current: { type: "BOOLEAN" },
      bullets: { type: "STRING" },
    },
    required: ["title", "company", "dates", "startDate", "endDate", "current", "bullets"],
    propertyOrdering: ["title", "company", "dates", "startDate", "endDate", "current", "bullets"],
  };
  const projectItem = {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      subtitle: { type: "STRING" },
      dates: { type: "STRING" },
      startDate: { type: "STRING" },
      endDate: { type: "STRING" },
      current: { type: "BOOLEAN" },
      bullets: { type: "STRING" },
    },
    required: ["title", "subtitle", "dates", "startDate", "endDate", "current", "bullets"],
    propertyOrdering: ["title", "subtitle", "dates", "startDate", "endDate", "current", "bullets"],
  };
  const educationItem = {
    type: "OBJECT",
    properties: {
      degree: { type: "STRING" },
      school: { type: "STRING" },
      dates: { type: "STRING" },
      startDate: { type: "STRING" },
      endDate: { type: "STRING" },
      current: { type: "BOOLEAN" },
    },
    required: ["degree", "school", "dates", "startDate", "endDate", "current"],
    propertyOrdering: ["degree", "school", "dates", "startDate", "endDate", "current"],
  };
  const certificationItem = {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      issuer: { type: "STRING" },
      dates: { type: "STRING" },
      startDate: { type: "STRING" },
      endDate: { type: "STRING" },
      current: { type: "BOOLEAN" },
    },
    required: ["title", "issuer", "dates", "startDate", "endDate", "current"],
    propertyOrdering: ["title", "issuer", "dates", "startDate", "endDate", "current"],
  };

  return {
    type: "OBJECT",
    properties: {
      resume: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          phone: { type: "STRING" },
          email: { type: "STRING" },
          linkedin: { type: "STRING" },
          github: { type: "STRING" },
          links: { type: "STRING" },
          targetRole: { type: "STRING" },
          summary: { type: "STRING" },
          skills: { type: "STRING" },
          achievements: { type: "STRING" },
          certifications: { type: "ARRAY", items: certificationItem },
          experience: { type: "ARRAY", items: experienceItem },
          projects: { type: "ARRAY", items: projectItem },
          education: { type: "ARRAY", items: educationItem },
          rawText: { type: "STRING" },
        },
        required: [
          "name",
          "phone",
          "email",
          "linkedin",
          "github",
          "links",
          "targetRole",
          "summary",
          "skills",
          "achievements",
          "certifications",
          "experience",
          "projects",
          "education",
          "rawText",
        ],
        propertyOrdering: [
          "name",
          "phone",
          "email",
          "linkedin",
          "github",
          "links",
          "targetRole",
          "summary",
          "skills",
          "achievements",
          "certifications",
          "experience",
          "projects",
          "education",
          "rawText",
        ],
      },
      ats: {
        type: "OBJECT",
        properties: {
          targetScore: { type: "NUMBER" },
          notes: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["targetScore", "notes"],
        propertyOrdering: ["targetScore", "notes"],
      },
    },
    required: ["resume", "ats"],
    propertyOrdering: ["resume", "ats"],
  };
}

function normalizeGeminiError(error) {
  const status = Number(error?.status || 500);
  const code = String(error?.code || "");
  const safeMessage = redactSecret(String(error?.detail || error?.message || "").trim());
  const lower = `${code} ${safeMessage}`.toLowerCase();

  if (status === 400 && (lower.includes("api key") || lower.includes("key not valid"))) {
    return {
      status: 400,
      code: code || "invalid_gemini_api_key",
      error: "Gemini API key is missing, invalid, or not enabled. Create a key in Google AI Studio, add GEMINI_API_KEY to .env, then restart.",
      detail: safeMessage,
    };
  }

  if (status === 404 || lower.includes("model") || lower.includes("not found")) {
    return {
      status: 200,
      code: code || "gemini_model_not_available",
      error: `Gemini model "${geminiModel}" is unavailable right now. Using local ATS optimizer instead.`,
      detail: safeMessage,
      useLocalFallback: true,
    };
  }

  if (status === 429 || lower.includes("quota") || lower.includes("rate limit")) {
    return {
      status: 200,
      code: code || "gemini_quota_or_rate_limit",
      error: "Gemini quota or rate limit is reached. Using local ATS optimizer instead.",
      detail: safeMessage,
      useLocalFallback: true,
    };
  }

  return {
    status: status >= 400 && status < 600 ? status : 500,
    code: code || "gemini_request_failed",
    error: "Gemini AI conversion failed. See details below and try again.",
    detail: safeMessage || "No additional Gemini error details were returned.",
  };
}

function normalizeOpenAIError(error) {
  const status = Number(error?.status || error?.response?.status || 500);
  const code = String(error?.code || error?.error?.code || "");
  const rawMessage = String(error?.message || error?.error?.message || "").trim();
  const safeMessage = redactSecret(rawMessage);
  const lower = `${code} ${safeMessage}`.toLowerCase();

  if (status === 401 || lower.includes("api key")) {
    return {
      status: 401,
      code: code || "invalid_api_key",
      error: "OpenAI API key is invalid or expired. Please add a fresh key in .env and restart the server.",
      detail: safeMessage,
    };
  }

  if (status === 404 || lower.includes("model") || lower.includes("does not exist")) {
    return {
      status: 400,
      code: code || "model_not_available",
      error: `OpenAI model "${model}" is not available for this key. Set OPENAI_MODEL=gpt-4.1-mini or gpt-4o-mini in .env, then restart the server.`,
      detail: safeMessage,
    };
  }

  if (status === 429 || lower.includes("quota") || lower.includes("billing") || lower.includes("rate limit")) {
    return {
      status: 429,
      code: code || "quota_or_rate_limit",
      error: "OpenAI quota, billing, or rate limit blocked the request. Check billing/usage, then try again.",
      detail: safeMessage,
      useLocalFallback: true,
    };
  }

  if (lower.includes("schema") || lower.includes("json")) {
    return {
      status: 500,
      code: code || "structured_output_error",
      error: "OpenAI returned a structured-output/schema error. The server prompt or schema needs adjustment.",
      detail: safeMessage,
    };
  }

  return {
    status: status >= 400 && status < 600 ? status : 500,
    code: code || "openai_request_failed",
    error: "AI conversion failed. See details below and try again.",
    detail: safeMessage || "No additional OpenAI error details were returned.",
  };
}

function redactSecret(value) {
  return String(value || "").replace(/sk-[A-Za-z0-9_-]+/g, "sk-***");
}

function normalizeResume(resume, rawText, targetRole) {
  return {
    id: randomUUID(),
    name: text(resume.name),
    phone: text(resume.phone),
    email: text(resume.email),
    linkedin: text(resume.linkedin),
    github: text(resume.github),
    links: text(resume.links),
    targetRole: text(resume.targetRole || targetRole),
    summary: blockText(resume.summary),
    skills: blockText(resume.skills),
    achievements: blockText(resume.achievements),
    certifications: normalizeItems(resume.certifications, "certification"),
    experience: normalizeItems(resume.experience, "experience"),
    projects: normalizeItems(resume.projects, "project"),
    education: normalizeItems(resume.education, "education"),
    rawText,
    updatedAt: Date.now(),
  };
}

function normalizeItems(items, type) {
  const list = Array.isArray(items) ? items : [];
  return list.map((item) => {
    if (type === "education") {
      return {
        degree: text(item.degree),
        school: text(item.school),
        dates: text(item.dates),
        startDate: text(item.startDate),
        endDate: text(item.endDate),
        current: Boolean(item.current),
      };
    }
    if (type === "certification") {
      return {
        title: text(item.title),
        issuer: text(item.issuer),
        dates: text(item.dates),
        startDate: text(item.startDate),
        endDate: text(item.endDate),
        current: Boolean(item.current),
      };
    }
    if (type === "project") {
      return {
        title: text(item.title),
        subtitle: text(item.subtitle || item.company),
        dates: text(item.dates),
        startDate: text(item.startDate),
        endDate: text(item.endDate),
        current: Boolean(item.current),
        bullets: blockText(item.bullets),
      };
    }
    return {
      title: text(item.title),
      company: text(item.company || item.subtitle),
      dates: text(item.dates),
      startDate: text(item.startDate),
      endDate: text(item.endDate),
      current: Boolean(item.current),
      bullets: blockText(item.bullets),
    };
  });
}

function text(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function blockText(value) {
  return String(value || "")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

import { NextResponse } from "next/server";
import { autoImproveResume, composeResumeText, localOptimizeResume, normalizeResume, scoreResume, shouldApplyEnhancedResume } from "@/lib/resume";
import { optimizeWithGemini, scoreWithGemini } from "@/lib/gemini";
import { getCurrentUserId } from "@/lib/auth";

export async function POST(request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { rawText = "", targetRole = "", jobDescription = "", mode = "preserve", baselineScore = null } = await request.json();
    if (!String(rawText).trim()) {
      return NextResponse.json({ error: "Please upload or paste resume text before converting." }, { status: 400 });
    }

    const conversionMode = mode === "enhance" ? "enhance" : "preserve";
    const effectiveTargetRole = conversionMode === "preserve" ? preserveModeTargetRole(targetRole, rawText) : targetRole;

    try {
      const resume = autoImproveResume(await optimizeWithGemini(rawText, effectiveTargetRole, jobDescription, conversionMode), effectiveTargetRole);
      console.log("GEMINI RESUME:", JSON.stringify(resume, null, 2));
      const faithfulnessIssue = conversionMode === "preserve" ? sourceFaithfulnessIssue(resume, rawText) : "";
      if (!isStructuredResume(resume) || faithfulnessIssue) {
        const fallback = autoImproveResume(localOptimizeResume(rawText, effectiveTargetRole), effectiveTargetRole);
        if (conversionMode === "enhance") {
          const ats = await optionalGeminiScore(fallback, effectiveTargetRole, jobDescription);
          return NextResponse.json(enhanceResponse({
            resume: fallback,
            ats,
            beforeScore: baselineScore,
            provider: "local",
            message: "AI enhancement was incomplete, so the current resume should be kept unless this fallback improves ATS score.",
          }));
        }
        return NextResponse.json({
          ok: true,
          resume: fallback,
          ats: await optionalGeminiScore(fallback, effectiveTargetRole, jobDescription),
          provider: "local",
          message: faithfulnessIssue
            ? `Gemini changed source data (${faithfulnessIssue}), so local parser preserved the uploaded resume.`
            : "Gemini response was incomplete, used local parser. ATS score is still checked by Gemini when available.",
        });
      }
      const ats = await optionalGeminiScore(resume, effectiveTargetRole, jobDescription);
      if (conversionMode === "enhance") {
        return NextResponse.json(enhanceResponse({
          resume,
          ats,
          beforeScore: baselineScore,
          provider: "gemini",
          message: "Gemini enhanced and checked your ATS resume.",
        }));
      }
      return NextResponse.json({
        ok: true,
        resume,
        ats,
        provider: "gemini",
        message: conversionMode === "preserve" ? "Gemini converted your resume while preserving source data." : "Gemini optimized and checked your ATS resume.",
      });
    } catch (error) {
      const resume = autoImproveResume(localOptimizeResume(rawText, effectiveTargetRole), effectiveTargetRole);
      if (conversionMode === "enhance") {
        const ats = scoreResume(resume);
        return NextResponse.json(enhanceResponse({
          resume,
          ats,
          beforeScore: baselineScore,
          provider: "local",
          message: `Gemini unavailable, local enhancement checked instead. ${error.message}`,
        }));
      }
      return NextResponse.json({
        ok: true,
        resume,
        ats: null,
        provider: "local",
        message: `Gemini unavailable, used local optimizer. AI ATS score will run when Gemini is available. ${error.message}`,
      });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message || "Resume optimization failed." }, { status: 500 });
  }
}

function enhanceResponse({ resume, ats, beforeScore, provider, message }) {
  const afterScore = typeof ats?.score === "number" ? ats.score : null;
  const accepted = shouldApplyEnhancedResume(beforeScore, afterScore);
  return {
    ok: true,
    resume,
    ats,
    provider,
    accepted,
    beforeScore: Number.isFinite(Number(beforeScore)) ? Number(beforeScore) : null,
    afterScore,
    message: accepted
      ? `${message} ATS score improved from ${scoreLabel(beforeScore)} to ${scoreLabel(afterScore)}.`
      : `No safer ATS improvement found; current resume should be kept. Score stayed at ${scoreLabel(beforeScore)}${afterScore !== null ? ` or would become ${scoreLabel(afterScore)}` : ""}.`,
  };
}

function scoreLabel(value) {
  const score = Number(value);
  return Number.isFinite(score) ? `${Math.round(score)}%` : "unknown";
}

function isStructuredResume(resume) {
  const hasProfile = Boolean(resume.name && (resume.email || resume.phone));
  const hasContent = [...(resume.experience || []), ...(resume.projects || [])].some((item) => item.title && item.bullets);
  return hasProfile && hasContent;
}

async function optionalGeminiScore(resume, targetRole, jobDescription) {
  try {
    return await scoreWithGemini(resume, targetRole, jobDescription);
  } catch (error) {
    console.warn("optionalGeminiScore failed, using local scoreResume fallback:", error.message);
    return scoreResume(resume);
  }
}

function preserveModeTargetRole(targetRole, rawText) {
  const role = String(targetRole || "").trim();
  if (!role) return "";
  const source = cleanForGuard(rawText);
  if (cleanForGuard(role) === "construction labourer" && !source.includes("construction labourer")) return "";
  return role;
}

function sourceFaithfulnessIssue(resume, rawText) {
  const source = cleanForGuard(rawText);
  const rendered = cleanForGuard(composeResumeText(resume));
  const unsupported = [
    "construction labourer",
    "white card",
    "driver licence",
    "site preparation",
    "demolition support",
    "manual handling",
    "whs compliance",
  ].find((phrase) => rendered.includes(phrase) && !source.includes(phrase));
  if (unsupported) return `introduced "${unsupported}"`;

  const sourceEmail = (String(rawText || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [""])[0].toLowerCase();
  if (sourceEmail && String(resume.email || "").trim().toLowerCase() !== sourceEmail) return "changed email";

  const sourcePhone = phoneDigits((String(rawText || "").match(/(?:\+\d{1,3}\s*)?(?:\(?\d{2,4}\)?[\s-]*)?\d{3}[\s-]?\d{3}[\s-]?\d{3,4}/) || [""])[0]);
  const resumePhone = phoneDigits(resume.phone);
  if (sourcePhone && resumePhone && !sourcePhone.endsWith(resumePhone) && !resumePhone.endsWith(sourcePhone)) return "changed phone";

  const sourceLinkedIn = urlKey((String(rawText || "").match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s)]+/i) || [""])[0]);
  if (sourceLinkedIn && urlKey(resume.linkedin) !== sourceLinkedIn) return "changed linkedin";

  const sourceGitHub = urlKey((String(rawText || "").match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s)]+/i) || [""])[0]);
  if (sourceGitHub && urlKey(resume.github) !== sourceGitHub) return "changed github";

  if (sourceSection(rawText, ["projects", "project experience"]) && !(resume.projects || []).some(hasRealProject)) return "dropped projects";
  if (sourceSection(rawText, ["education"]) && !(resume.education || []).some(hasRealEducation)) return "dropped education";

  const experienceText = cleanForGuard((resume.experience || []).map((item) => [item.title, item.company, item.bullets].filter(Boolean).join(" ")).join(" "));
  const projectText = cleanForGuard((resume.projects || []).map((item) => [item.title, item.subtitle, item.bullets].filter(Boolean).join(" ")).join(" "));
  const movedProject = sourceProjectTitles(rawText).find((title) => {
    const key = cleanForGuard(title);
    return key.length > 4 && experienceText.includes(key) && !projectText.includes(key);
  });
  if (movedProject) return `moved project "${movedProject}" into experience`;

  return "";
}

function sourceProjectTitles(rawText) {
  return sourceSection(rawText, ["projects", "project experience"])
    .split("\n")
    .map((line) => line.replace(/^[*-]\s*/, "").trim())
    .filter((line) => line && !/^(developed|built|created|implemented|optimized|improved|integrated|delivered|configured|designed|supported|maintained)\b/i.test(line))
    .map((line) => line.replace(/\([^)]*\)/g, "").replace(extractDatePattern(), "").replace(/\s{2,}/g, " ").trim())
    .filter((line) => /website|app|application|system|platform|ecommerce|estate|portfolio|software|project|full stack/i.test(line))
    .slice(0, 6);
}

function sourceSection(rawText, starts) {
  const lines = guardLines(rawText);
  const index = lines.findIndex((line) => starts.some((heading) => sectionStarts(line, heading)));
  if (index < 0) return "";
  const first = stripHeading(lines[index], starts);
  const collected = [first];
  for (let i = index + 1; i < lines.length; i += 1) {
    if (ALL_GUARD_HEADINGS.some((heading) => sectionStarts(lines[i], heading))) break;
    collected.push(lines[i]);
  }
  return collected.filter(Boolean).join("\n").trim();
}

const ALL_GUARD_HEADINGS = [
  "summary",
  "professional summary",
  "profile",
  "experience",
  "professional experience",
  "work experience",
  "employment history",
  "employment histor",
  "career history",
  "work history",
  "projects",
  "project experience",
  "skills",
  "technical skills",
  "achievements and certifications",
  "licences and certifications",
  "licenses and certifications",
  "achievements",
  "certifications",
  "licenses",
  "licences",
  "education",
];

function guardLines(rawText) {
  const headings = [...ALL_GUARD_HEADINGS].sort((a, b) => b.length - a.length);
  let text = String(rawText || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\u2022\u25cf\u25aa]/g, "\n- ")
    .replace(/[\u2013\u2014]/g, "-");
  const upperHeadingPattern = headings.map((heading) => heading.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  text = text.replace(new RegExp(`\\s+(${upperHeadingPattern})(?=\\s|:|$)`, "g"), "\n$1");
  headings.forEach((heading) => {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const longerHeadingGuard = /^(achievements|licences|licenses)$/i.test(heading) ? "(?!\\s+and\\s+certifications\\b)" : "";
    text = text.replace(new RegExp(`(^|\\n)(${escaped})${longerHeadingGuard}\\s*[:\\-]?\\s+`, "gi"), "$1$2\n");
  });
  return text.split(/\n+/).map((line) => line.replace(/[ \t]{2,}/g, " ").trim()).filter(Boolean);
}

function sectionStarts(line, heading) {
  const left = cleanForGuard(line);
  const right = cleanForGuard(heading);
  return left === right || left.startsWith(`${right} `);
}

function stripHeading(line, headings) {
  const matched = headings.find((heading) => sectionStarts(line, heading));
  if (!matched) return line;
  return String(line || "").replace(new RegExp(`^${matched.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b[:\\s-]*`, "i"), "").trim();
}

function hasRealProject(item) {
  return Boolean(String(item?.title || "").trim() && !/\bproject\b/i.test(String(item?.title || "").trim()));
}

function hasRealEducation(item) {
  return Boolean(String(item?.school || item?.degree || "").trim() && !/\b(institution|degree \/ course)\b/i.test(`${item?.school || ""} ${item?.degree || ""}`));
}

function phoneDigits(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function urlKey(value) {
  return String(value || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}

function cleanForGuard(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9+#/.-]+/g, " ").replace(/\s+/g, " ").trim();
}

function extractDatePattern() {
  return /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*(?:19|20)\d{2}\s*(?:-|to)\s*(?:Present|Current|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*(?:19|20)\d{2})/gi;
}

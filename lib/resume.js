export const sampleResume = {
  name: "Vikash Mishra",
  phone: "+61 485 686 867",
  email: "Vikash123@gmail.com",
  location: "Melbourne VIC",
  linkedin: "https://www.linkedin.com",
  github: "https://www.git.com",
  targetRole: "Construction Labourer",
  summary:
    "Reliable and hardworking Construction Labourer with hands-on experience across residential and commercial construction sites in Melbourne. Skilled in site preparation, material handling, and assisting trades. Strong focus on safety, teamwork, and high-quality workmanship. Available for immediate start.",
  skills:
    "Soft Skills: Teamwork & Time Management\nDomain Skills: Construction Labouring, Site Preparation & Clean-up, Demolition Support, Assisting Carpentry & Concreting, Material & Manual Handling, Basic Power Tools, WHS Compliance & Safety, Hazard Awareness, Physical Stamina, Site Safety Procedures",
  achievements: "",
  certifications: [
    { title: "White Card", issuer: "Australia", dates: "" },
    { title: "Driver Licence", issuer: "", dates: "" },
  ],
  experience: [
    {
      title: "Construction Labourer",
      company: "BRC Construction, Melbourne VIC",
      dates: "Present",
      bullets:
        "Prepared sites, handled materials, and assisted trades across residential and commercial projects\nCoordinated with supervisors to maintain workflow and meet project deadlines\nSupported demolition activities while maintaining a safe and compliant work environment",
    },
    {
      title: "Construction Labourer",
      company: "Rendine Construction, Melbourne VIC",
      dates: "Mar 2024 - Jan 2025",
      bullets:
        "Performed labouring tasks across construction stages including groundwork and finishing prep\nAssisted carpentry and concreting trades with materials and tools\nMaintained WHS compliance, hazard awareness, and site cleanliness",
    },
  ],
  projects: [
    {
      title: "Residential Site Preparation",
      subtitle: "Labouring, safety, materials",
      dates: "2025",
      bullets:
        "Built daily site setup, tool movement, and clean-up for multi-stage builds\nImproved access and material flow by keeping work areas organised",
    },
  ],
  education: [{ degree: "Bachelor of Software Engineering (Honours)", school: "Deakin University", dates: "2023 - 2026" }],
};

const SECTION_HEADINGS = [
  "Summary",
  "Experience",
  "Employment History",
  "Projects",
  "Skills",
  "Licences and Certifications",
  "Education",
];

const KNOWN_SKILLS = ["JavaScript", "TypeScript", "HTML", "CSS", "React.js", "Next.js", "Node.js", "Express.js", "REST APIs", "JWT Authentication", "MongoDB", "SQL", "Git", "GitHub", "VS Code", "Agile", "Debugging", "Razorpay", "Stripe", "Gemini API", "n8n", "Netlify"];

export function normalizeResume(input = {}) {
  const resume = { ...input };
  if (resume.name === "Full Name") resume.name = "";
  if (resume.email === "Email Address") resume.email = "";
  if (resume.phone === "Phone Number") resume.phone = "";
  if (resume.location === "City, State") resume.location = "";
  if (resume.linkedin === "LinkedIn URL") resume.linkedin = "";
  if (resume.github === "Portfolio URL") resume.github = "";
  resume.location = String(resume.location || "").trim();
  resume.experience = normalizeItems(resume.experience, [{ title: "", company: "", dates: "", bullets: "" }]);
  resume.projects = normalizeItems(resume.projects, [{ title: "", subtitle: "", dates: "", bullets: "" }]);
  resume.education = normalizeItems(resume.education, [{ degree: "", school: "", dates: "" }]);
  resume.certifications = normalizeItems(resume.certifications, []);
  resume.summary = polishSentence(sanitizeSummary(resume.summary));
  resume.skills = normalizeSkills(resume.skills);
  resume.achievements = uniqueLines(splitLines(resume.achievements).map(polishSentence)).join("\n");
  resume.experience = resume.experience.map((item) => ({
    ...item,
    bullets: sanitizeBullets(item.bullets),
  }));
  resume.projects = resume.projects.map((item) => ({
    ...item,
    bullets: sanitizeBullets(item.bullets),
  }));
  return removeGlobalBulletRepeats(resume);
}

export function autoImproveResume(input = {}, targetRole = "") {
  const resume = normalizeResume({ ...input, targetRole: input.targetRole || targetRole });
  const text = composeResumeText(resume);
  const role = resume.targetRole || targetRole || inferRole(text) || "";
  if (role) resume.targetRole = role;

  resume.summary = improveSummaryForAts(resume.summary, role, resume.skills);
  resume.skills = normalizeSkills([resume.skills, inferSkills(text)].filter(Boolean).join("\n"));
  resume.experience = resume.experience.map((item) => ({
    ...item,
    bullets: improveBulletBlock(item.bullets),
  }));
  resume.projects = resume.projects.map((item) => ({
    ...item,
    bullets: improveBulletBlock(item.bullets),
  }));
  return normalizeResume(resume);
}

export function localOptimizeResume(rawText, targetRole = "") {
  const text = normalizeExtractedText(rawText);
  const lines = logicalLines(text);
  const email = (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [""])[0];
  const phone = (text.match(/(?:\+\d{1,3}\s*)?(?:\(?\d{2,4}\)?[\s-]*)?\d{3}[\s-]?\d{3}[\s-]?\d{3,4}/) || [""])[0];
  const name = extractName(text, lines, email, phone);
  const inferredRole = targetRole || inferRole(text) || "Professional";
  const resume = normalizeResume({
    name,
    email,
    phone,
    location: extractLocation(text, lines, email, phone),
    linkedin: (text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s]{2,60}/i) || [""])[0],
    github: (text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s]{2,60}/i) || [""])[0],
    targetRole: inferredRole,
    summary:
      sectionText(text, ["summary", "professional summary", "profile"]) ||
      `${inferredRole} with practical experience across delivery, collaboration, and quality-focused execution.`,
    skills: sectionText(text, ["skills", "technical skills"]) || inferSkills(text),
    achievements: sectionText(text, ["achievements and certifications", "licences and certifications", "licenses and certifications", "achievements", "certifications", "licenses", "licences"]),
    certifications: certificationsFromText(text),
    experience: parseEntries(sectionText(text, ["experience", "professional experience", "work experience", "employment history", "employment histor", "work history", "career history"]) || text, false, inferredRole),
    projects: parseEntries(sectionText(text, ["projects", "project experience"]), true, "Project"),
    education: parseEducation(sectionText(text, ["education"])),
  });
  if (!resume.experience.some((item) => item.bullets)) {
    const experienceText = sectionText(text, ["experience", "professional experience", "work experience", "employment history", "employment histor", "work history", "career history"]);
    const actionBullets = extractActionBullets(experienceText).length ? extractActionBullets(experienceText) : extractActionBullets(text);
    resume.experience = [{
      ...resume.experience[0],
      title: inferredRole,
      company: extractCompany(text) || resume.experience[0]?.company || "Company",
      dates: resume.experience[0]?.dates || extractDates(text),
      bullets: actionBullets.slice(0, 3).join("\n"),
    }];
  }
  return autoImproveResume(resume, inferredRole);
}

export function scoreResume(resume) {
  const rawBullets = rawMeasurableBullets(resume);
  const cleanResume = normalizeResume(resume);
  const text = composeResumeText(cleanResume);
  const bullets = measurableBullets(cleanResume);
  const skillList = splitSkills(cleanResume.skills);
  const repetition = uniqueLines([...repetitionIssues(rawBullets), ...repetitionIssues(bullets)]);
  const grammar = grammarIssues(text);
  const context = { resume: cleanResume, text, bullets, skillList, repetition, grammar };
  const categories = [
    scoreContactProfile(context),
    scoreAtsStructure(context),
    scoreParseSafety(context),
    scoreSkillsKeywords(context),
    scoreBulletQuality(context),
    scoreDatesEducationCerts(context),
    scoreGrammarReadability(context),
  ];
  const rawScore = categories.reduce((sum, category) => sum + category.points, 0);
  const score = clamp(Math.round(rawScore), 0, 100);
  const checks = categories.map((category) => ({
    label: `${category.label}: ${Math.round(category.percent)}%`,
    pass: category.percent >= 75,
    category: category.label,
    points: roundOne(category.points),
    max: category.max,
  }));
  const notes = uniqueLines(categories.flatMap((category) => category.notes)).slice(0, 12);
  return {
    score,
    grade: atsGrade(score),
    status: atsStatus(score),
    checks,
    notes,
    breakdown: categories.map(({ label, points, max, percent, notes }) => ({
      label,
      points: roundOne(points),
      max,
      percent: Math.round(percent),
      status: percent >= 85 ? "Strong" : percent >= 70 ? "Good" : percent >= 55 ? "Needs work" : "Weak",
      note: notes[0] || "Looks good.",
    })),
  };
}

export function shouldApplyEnhancedResume(beforeScore, afterScore) {
  const before = Number(beforeScore);
  const after = Number(afterScore);
  if (!Number.isFinite(after)) return false;
  if (!Number.isFinite(before)) return true;
  return after >= before + 1;
}

export function composeResumeText(resume) {
  const certs = (resume.certifications || []).map((item) => [item.title, item.issuer, item.dates].filter(Boolean).join(", "));
  return [
    resume.name,
    [resume.phone, resume.email, resume.location, resume.linkedin, resume.github].filter(Boolean).join(" | "),
    "Summary",
    resume.summary,
    "Experience",
    ...resume.experience.flatMap((item) => [item.title, item.company, item.dates, item.bullets]),
    "Projects",
    ...resume.projects.flatMap((item) => [item.title, item.subtitle, item.dates, item.bullets]),
    "Skills",
    resume.skills,
    "Licences and Certifications",
    resume.achievements,
    ...certs,
    "Education",
    ...resume.education.flatMap((item) => [item.school, item.degree, item.dates]),
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeItems(items, fallback) {
  return Array.isArray(items) && items.length ? items.filter(Boolean) : fallback;
}

function sanitizeSummary(value) {
  const lines = String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return "";

  const accepted = [];
  for (const line of lines) {
    const split = splitAtEmbeddedSection(line);
    if (split.before) accepted.push(split.before);
    if (split.hit) break;
  }
  return (accepted.length ? accepted : lines).join("\n").trim();
}

function splitAtEmbeddedSection(line) {
  const headings = [
    "Employment History",
    "Employment Histor",
    "Professional Experience",
    "Work Experience",
    "Career History",
    "Work History",
    "Projects",
    "Project Experience",
    "Skills",
    "Technical Skills",
    "Achievements and Certifications",
    "Licences and Certifications",
    "Licenses and Certifications",
    "Certifications",
    "Education",
  ];
  const source = String(line || "");
  for (const heading of headings) {
    const regex = new RegExp(`(^|\\s)${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    const match = source.match(regex);
    if (match) return { before: source.slice(0, match.index).trim(), hit: true };
  }
  return { before: source, hit: false };
}

function normalizeExtractedText(value) {
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
    .replace(/\s+-\s+(?=\b(?:Developed|Built|Created|Implemented|Optimized|Improved|Integrated|Managed|Led|Delivered|Configured|Designed|Supported|Maintained|Prepared|Assisted|Coordinated|Performed|Engineered|Enhanced|Reduced|Increased|Launched|Analyzed|Automated)\b)/gi, "\n- ");
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
  return String(value || "")
    .replace(/\r/g, "\n")
    .replace(/[•●▪]/g, "\n- ")
    .replace(/\s+(PROFESSIONAL SUMMARY|SUMMARY|PROFILE|PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|EXPERIENCE|PROJECTS|PROJECT EXPERIENCE|TECHNICAL SKILLS|SKILLS|ACHIEVEMENTS AND CERTIFICATIONS|ACHIEVEMENTS|CERTIFICATIONS|LICENSES|LICENCES|EDUCATION)\b/gi, "\n$1")
    .replace(/\s+-\s+(?=[A-Z][A-Za-z])(?!(?:Present|Current|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b)/g, "\n- ")
    .replace(/\s{2,}/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function extractName(text, lines, email, phone) {
  const firstUseful = lines.find((line) => !isSection(line) && !line.includes("@") && !/^https?:/i.test(line)) || "";
  const beforeEmail = email ? text.split(email)[0] : firstUseful;
  const beforePhone = phone && beforeEmail.includes(phone) ? beforeEmail.split(phone)[0] : beforeEmail;
  const candidate = beforePhone
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\b\d[\d\s+-]{6,}\b/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(" ");
  if (/^[A-Za-z][A-Za-z .'-]{2,60}$/.test(candidate) && candidate.length <= 40) return candidate;
  const fallback = lines.find((line) => /^[A-Za-z][A-Za-z .'-]{2,60}$/.test(line) && !isSection(line) && !line.includes("@"));
  return (fallback && fallback.length <= 40) ? fallback : "Your Name";
}

function logicalLines(value) {
  return normalizeExtractedText(value)
    .replace(/\r/g, "\n")
    .replace(/[•●▪]/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !/^[.\-–—]+$/.test(line));
}

function sectionText(text, starts) {
  const lines = logicalLines(text);
  const index = lines.findIndex((line) => starts.some((heading) => sectionStartsLine(line, heading)));
  if (index < 0) return "";
  const firstLine = stripSectionHeading(lines[index], starts);
  let end = lines.length;
  for (let i = index + 1; i < lines.length; i += 1) {
    if (isSection(lines[i])) {
      end = i;
      break;
    }
  }
  return [firstLine, ...lines.slice(index + 1, end)].filter(Boolean).join("\n");
}

function parseEntries(text, project = false, fallbackTitle = "") {
  const lines = logicalLines(text).filter((line) => !isSection(line));
  const chunks = chunkResumeEntries(lines, project);
  return chunks.length ? chunks
    .filter((chunk) => chunk.length)
    .slice(0, project ? 3 : 4)
    .map((chunk) =>
      project
        ? projectEntryFromChunk(chunk)
        : experienceEntryFromChunk(chunk),
    ) : [fallbackEntry(text, project, fallbackTitle)];
}

function fallbackEntry(text, project, fallbackTitle) {
  const lines = logicalLines(text).filter((line) => !isSection(line));
  const bullets = lines.filter(looksLikeBullet).slice(0, 4).join("\n") || lines.slice(1, 4).join("\n");
  if (project) return { title: fallbackTitle || "Project", subtitle: inferSkills(text).split("\n")[0] || "", dates: extractDates(text), bullets };
  return { title: fallbackTitle || inferRole(text) || "Professional Experience", company: lines.find((line) => /company|services|solutions|pvt|ltd|inc|llc|university/i.test(line)) || "Company", dates: extractDates(text), bullets };
}

function chunkResumeEntries(lines, project) {
  const cleanLines = lines
    .map((line) => line.replace(/^-+\s*/, "").trim())
    .filter(Boolean);
  if (!cleanLines.length) return [];
  const chunks = [];
  let current = [];
  cleanLines.forEach((line, index) => {
    const startsNew =
      index > 0 &&
      !looksLikeBullet(line) &&
      (hasDate(line) || looksLikeTitle(line, project)) &&
      current.length >= (project ? 2 : 3);
    if (startsNew) {
      chunks.push(current);
      current = [];
    }
    current.push(line);
  });
  if (current.length) chunks.push(current);
  if (chunks.length === 1 && cleanLines.length > 7) {
    const rebuilt = [];
    for (let i = 0; i < cleanLines.length; i += project ? 4 : 5) rebuilt.push(cleanLines.slice(i, i + (project ? 4 : 5)));
    return rebuilt;
  }
  return chunks;
}

function experienceEntryFromChunk(chunk) {
  const joined = chunk.join(" ");
  const dates = extractDates(joined);
  let first = removeDates(chunk[0]);
  let second = looksLikeBullet(chunk[1] || "") ? "" : removeDates(chunk[1] || "");
  if (!second && dates && chunk[0]?.includes(dates)) {
    const dateIndex = chunk[0].indexOf(dates);
    const afterDate = chunk[0].slice(dateIndex + dates.length).trim();
    first = removeDates(chunk[0].slice(0, dateIndex)).trim();
    if (afterDate && !looksLikeBullet(afterDate)) second = afterDate;
  }
  const title = first || inferRole(joined) || "Professional Experience";
  const company = second || "Company";
  const bulletLines = chunk.slice(second && chunk[1] === second ? 2 : 1).filter((line) => clean(line) !== clean(dates) && clean(line) !== clean(company));
  const bullets = bulletLines.length ? bulletLines.join("\n") : extractActionBullets(joined).join("\n");
  const cleanTitle = title.length > 80 ? inferRole(joined) || "Professional Experience" : title;
  return { title: cleanTitle, company, dates, bullets };
}

function projectEntryFromChunk(chunk) {
  const joined = chunk.join(" ");
  const dates = extractDates(joined);
  const title = removeDates(chunk[0]) || "Project";
  const second = removeDates(chunk[1] || "");
  const hasSubtitle = second && !looksLikeBullet(chunk[1] || "");
  const subtitle = hasSubtitle ? second : "";
  const bulletLines = chunk.slice(hasSubtitle ? 2 : 1).filter((line) => clean(line) !== clean(dates));
  const bullets = bulletLines.length ? bulletLines.join("\n") : extractActionBullets(joined).join("\n");
  return { title, subtitle, dates, bullets };
}

function extractActionBullets(text) {
  const matches = String(text || "").match(/\b(?:Developed|Built|Created|Implemented|Optimized|Improved|Integrated|Managed|Led|Delivered|Configured|Designed|Supported|Maintained|Prepared|Assisted|Coordinated|Performed|Engineered|Enhanced|Reduced|Increased|Launched|Analyzed|Automated)\b.*?(?=\s+-\s+\b(?:Developed|Built|Created|Implemented|Optimized|Improved|Integrated|Managed|Led|Delivered|Configured|Designed|Supported|Maintained|Prepared|Assisted|Coordinated|Performed|Engineered|Enhanced|Reduced|Increased|Launched|Analyzed|Automated)\b|\s+(?:PROJECTS|SKILLS|EDUCATION|CERTIFICATIONS)\b|$)/gi) || [];
  return matches.map((line) => line.trim()).filter(Boolean).slice(0, 4);
}

function extractCompany(text) {
  const match = String(text || "").match(/\b([A-Z0-9][A-Za-z0-9&. ]{2,60}(?:Services|Solutions|Technologies|Pvt Ltd|Ltd|Inc|LLC|Company))\b/);
  return match ? match[1].trim() : "";
}

function extractLocation(text, lines, email, phone) {
  const explicit = String(text || "").match(/\b(?:location|address)\s*[:|-]\s*([A-Za-z][A-Za-z0-9, .'-]{3,80})/i)?.[1];
  if (explicit) return cleanLocation(explicit);
  const statePostcode = lines.find((line) => /\b(?:ACT|NSW|NT|QLD|SA|TAS|VIC|WA)\s+\d{4}\b/i.test(line));
  if (statePostcode) return cleanLocation(stripContactNoise(afterContactDetails(statePostcode, email, phone), email, phone));
  const cityState = lines.find((line) => /\b[A-Z][A-Za-z .'-]+,\s*[A-Z]{2,3}\b/.test(line));
  return cityState ? cleanLocation(stripContactNoise(cityState, email, phone)) : "";
}

function afterContactDetails(value, email, phone) {
  let line = String(value || "");
  [email, phone].filter(Boolean).forEach((item) => {
    const index = line.indexOf(item);
    if (index >= 0) line = line.slice(index + item.length);
  });
  return line || value;
}

function stripContactNoise(value, email, phone) {
  return String(value || "")
    .replace(email || "", "")
    .replace(phone || "", "")
    .replace(/(?:https?:\/\/|www\.)\S+/gi, "")
    .replace(/[|•]/g, " ")
    .trim();
}

function cleanLocation(value) {
  const loc = String(value || "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,|:\-\s]+|[,|:\-\s]+$/g, "")
    .split(/\n/)[0]
    .trim();
  return loc.length > 40 ? "" : loc;
}

function looksLikeBullet(line) {
  return /^[-*]\s+/.test(line) || /^(developed|built|created|implemented|optimized|improved|integrated|managed|led|delivered|configured|designed|supported|maintained|prepared|assisted|coordinated|performed|engineered|enhanced|reduced|increased|launched|analyzed|automated)\b/i.test(line);
}

function looksLikeTitle(line, project) {
  const words = clean(line).split(" ").filter(Boolean).length;
  if (words > 9) return false;
  return project ? /project|website|app|application|system|platform|ecommerce|estate|portfolio/i.test(line) : /developer|engineer|manager|analyst|designer|labourer|intern|consultant|specialist/i.test(line);
}

function hasDate(line) {
  return Boolean(extractDates(line)) || /\b(?:present|current|20\d{2}|19\d{2})\b/i.test(line);
}

function removeDates(value) {
  return String(value || "").replace(extractDates(value), "").replace(/\b(?:Present|Current)\b$/i, "").replace(/\s{2,}/g, " ").trim();
}

function parseEducation(text) {
  const lines = logicalLines(text).filter((line) => !isSection(line));
  if (!lines.length) return [{ school: "Institution", degree: "Degree / Course", dates: "" }];
  const entries = [];
  let current = null;
  lines.map((line) => line.replace(/^[*-]\s*/, "").trim()).filter(Boolean).forEach((line) => {
    const parsed = parseEducationLine(line);
    const startsEntry = parsed.school || (parsed.dates && !current);
    if (startsEntry) {
      if (current && parsed.prefixDegree) current.degree = [current.degree.replace(/[-\s]+$/g, ""), parsed.prefixDegree].filter(Boolean).join(" - ");
      if (current && (current.school || current.degree || current.dates)) entries.push(current);
      current = {
        school: parsed.school || "",
        degree: parsed.degree || "",
        dates: parsed.dates || "",
      };
      return;
    }
    if (!current) current = { school: "", degree: "", dates: "" };
    if (parsed.degree || looksLikeDegree(line)) {
      current.degree = [current.degree, parsed.degree || removeDates(line)].filter(Boolean).join(" - ");
    } else if (!current.school) {
      current.school = removeDates(line);
    }
    if (!current.dates && parsed.dates) current.dates = parsed.dates;
  });
  if (current && (current.school || current.degree || current.dates)) entries.push(current);
  return entries.length ? entries : [{ school: lines[0] || "Institution", degree: lines[1] || "Degree / Course", dates: extractDates(text) }];
}

function parseEducationLine(line) {
  const dates = extractDates(line);
  const withoutDates = removeDates(line).replace(/[()]/g, " ").replace(/\s{2,}/g, " ").trim();
  const degreeIndex = degreeStartIndex(withoutDates);
  if (degreeIndex > 0 && looksLikeSchool(withoutDates.slice(0, degreeIndex))) {
    const rawSchool = withoutDates.slice(0, degreeIndex).trim();
    const school = cleanSchoolName(rawSchool);
    const prefixDegree = rawSchool.slice(0, Math.max(0, rawSchool.toLowerCase().lastIndexOf(school.toLowerCase()))).trim().replace(/[-\s]+$/g, "");
    return {
      school,
      degree: withoutDates.slice(degreeIndex).trim(),
      dates,
      prefixDegree: looksLikeDegree(prefixDegree) ? prefixDegree : "",
    };
  }
  if (looksLikeSchool(withoutDates)) return { school: cleanSchoolName(withoutDates), degree: "", dates };
  if (looksLikeDegree(withoutDates)) return { school: "", degree: withoutDates, dates };
  return { school: dates ? withoutDates : "", degree: dates ? "" : withoutDates, dates };
}

function looksLikeSchool(line) {
  return /\b(university|college|school|institute|institution|academy)\b/i.test(String(line || ""));
}

function looksLikeDegree(line) {
  return /\b(bachelor|master|degree|diploma|bca|mca|b\.?tech|m\.?tech|b\.?s\.?|m\.?s\.?|computer science|engineering)\b/i.test(String(line || ""));
}

function cleanSchoolName(value) {
  const match = String(value || "").match(/\b([A-Z][A-Za-z.&'-]+(?:\s+[A-Z][A-Za-z.&'-]+){0,1}\s+(?:University|College|Institute|School))\b/i);
  const school = (match?.[1] || value || "").trim();
  const words = school.split(/\s+/).filter(Boolean);
  if (words.length > 2 && /^(computer|science|engineering|application)$/i.test(words[0])) return words.slice(-2).join(" ");
  return school;
}

function degreeStartIndex(line) {
  const match = String(line || "").match(/\b(Bachelor|Master|BCA|MCA|B\.?Tech|M\.?Tech|B\.?S\.?|M\.?S\.?|Diploma|Degree)\b/i);
  return match ? match.index : -1;
}

function inferRole(text) {
  const source = String(text || "");
  const lower = source.toLowerCase();
  const knownRoles = [
    "MERN Stack Developer",
    "Full Stack Developer",
    "Web Developer",
    "Frontend Developer",
    "Backend Developer",
    "Automation Engineer",
    "Software Engineer",
    "Construction Labourer",
    "Construction Laborer",
    "Civil Engineer",
    "Site Engineer",
    "Data Analyst",
    "Business Analyst",
  ];
  const known = knownRoles.find((role) => lower.includes(role.toLowerCase()));
  if (known) return known;
  const dynamic = source.match(/\b([A-Z][A-Za-z0-9 +#./&'-]{2,70}\s(?:Developer|Engineer|Manager|Analyst|Designer|Labou?rer|Intern|Consultant|Specialist|Technician|Coordinator|Assistant|Operator))\b/);
  return dynamic?.[1]?.trim() || "";
}

function inferSkills(text) {
  return normalizeSkills(KNOWN_SKILLS.filter((skill) => text.toLowerCase().includes(skill.toLowerCase().replace(".js", ""))).join(", "));
}

function certificationsFromText(text) {
  return ["Microsoft Azure", "AWS", "PMP", "White Card", "Driver Licence"].filter((cert) => text.toLowerCase().includes(cert.toLowerCase())).map((title) => ({ title, issuer: "", dates: "" }));
}

function extractDates(value) {
  const match = String(value || "").match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*(?:19|20)\d{2}\s*(?:-|to|\u2013|\u2014)\s*(?:Present|Current|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*(?:19|20)\d{2})/i);
  return (match?.[0] || "").trim();
  return (String(value || "").match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*(?:19|20)\d{2}\s*(?:-|to|–|—)\s*(?:Present|Current|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*(?:19|20)\d{2})/i) || [""])[0];
}

function normalizeSkills(value) {
  const groups = { Languages: [], Frontend: [], Backend: [], Database: [], "Soft Skills": [], "Domain Skills": [], Tools: [] };
  splitSkills(value).forEach((skill) => {
    const key = skill.toLowerCase();
    const label =
      /html|css|javascript|typescript|python|java|sql/.test(key) ? "Languages" :
      /react|next|frontend|responsive|ui|tailwind|bootstrap/.test(key) ? "Frontend" :
      /node|express|api|backend|auth|scalable/.test(key) ? "Backend" :
      /mongodb|mysql|postgres|database/.test(key) ? "Database" :
      /teamwork|time management|communication|reliability|leadership|problem solving/.test(key) ? "Soft Skills" :
      /construction|labouring|site|demolition|carpentry|concreting|material|manual handling|power tools|whs|safety|hazard|stamina/.test(key) ? "Domain Skills" :
      "Tools";
    if (!groups[label].some((item) => skillKey(item) === skillKey(skill))) groups[label].push(polishTech(skill));
  });
  return Object.entries(groups)
    .filter(([, items]) => items.length)
    .map(([label, items]) => `${label}: ${items.join(", ")}`)
    .join("\n");
}

function splitSkills(value) {
  const raw = String(value || "");
  const found = KNOWN_SKILLS.filter((skill) => raw.toLowerCase().includes(skill.toLowerCase().replace(".js", "")));
  const split = raw
    .replace(/(Languages|Frontend|Backend|Database|Tools|Technology|Technical|Soft Skills|Domain Skills)\s*:/gi, "\n")
    .split(/\n|,|;/)
    .map((item) => item.replace(/^[*-]\s*/, "").trim())
    .filter(Boolean);
  return found.length > split.length ? found : split;
}

function improveSummaryForAts(summary, role, skills) {
  const cleanSummary = sanitizeSummary(summary);
  const count = wordCount(cleanSummary);
  if (count >= 18 && (!role || roleAppearsInText(role, cleanSummary))) return cleanSummary;
  const skillList = splitSkills(skills).slice(0, 6).join(", ");
  const roleText = role && role !== "Professional" ? role : "Professional";
  if (!cleanSummary) {
    return `${roleText} with practical experience in ${skillList || "role-relevant operations"}, quality-focused delivery, collaboration, and safe, efficient execution.`;
  }
  if (role && !roleAppearsInText(role, cleanSummary)) return `${roleText} with ${lowerFirst(cleanSummary)}`;
  return cleanSummary;
}

function roleAppearsInText(role, text) {
  const normalize = (value) => clean(value).replace(/\blabourer\b/g, "laborer");
  return normalize(text).includes(normalize(role));
}

function improveBulletBlock(value) {
  return splitLines(value)
    .map((line, index) => improveBulletForAts(line, index))
    .join("\n");
}

function improveBulletForAts(value, index) {
  const line = polishSentence(value);
  if (!line) return "";
  if (hasActionVerb(line)) return line;
  const weak = line
    .replace(/^responsible for\b/i, "Managed")
    .replace(/^worked on\b/i, "Delivered")
    .replace(/^helped with\b/i, "Supported")
    .replace(/^involved in\b/i, "Supported");
  if (hasActionVerb(weak)) return weak;
  const verbs = ["Delivered", "Supported", "Managed", "Improved"];
  return `${verbs[index % verbs.length]} ${lowerFirst(weak)}`;
}

function lowerFirst(value) {
  const text = String(value || "").trim();
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : "";
}

function sanitizeBullets(value) {
  return uniqueLines(splitLines(value).map(polishSentence)).slice(0, 8).join("\n");
}

function removeGlobalBulletRepeats(resume) {
  const seen = [];
  const starts = new Set();
  const cleanBlock = (value) =>
    splitLines(value)
      .filter((line) => {
        if (seen.some((item) => similarity(item, line) >= 0.72)) return false;
        seen.push(line);
        return true;
      })
      .map((line, index) => uniqueStart(line, starts, index))
      .join("\n");
  resume.experience = resume.experience.map((item) => ({ ...item, bullets: cleanBlock(item.bullets) }));
  resume.projects = resume.projects.map((item) => ({ ...item, bullets: cleanBlock(item.bullets) }));
  return resume;
}

function uniqueStart(line, starts, index) {
  const verbs = ["Developed", "Implemented", "Optimized", "Integrated", "Delivered", "Engineered", "Configured", "Enhanced"];
  const match = line.match(/^([A-Z][a-z]+)\b(.*)$/);
  if (!match) return line;
  const key = match[1].toLowerCase();
  if (!starts.has(key)) {
    starts.add(key);
    return line;
  }
  const next = verbs.find((verb) => !starts.has(verb.toLowerCase())) || verbs[index % verbs.length];
  starts.add(next.toLowerCase());
  return `${next}${match[2]}`;
}

function splitLines(value) {
  return String(value || "")
    .replace(/([a-z0-9])\.([A-Z])/g, "$1. $2")
    .split(/\n|;/)
    .map((line) => line.replace(/^[*-]\s*/, "").trim())
    .filter(Boolean);
}

function uniqueLines(lines) {
  const accepted = [];
  return lines.filter((line) => {
    const key = clean(line);
    if (!key || accepted.some((item) => similarity(item, line) >= 0.72)) return false;
    accepted.push(line);
    return true;
  });
}

function measurableBullets(resume) {
  return [...resume.experience, ...resume.projects].flatMap((item) => splitLines(item.bullets));
}

function rawMeasurableBullets(resume = {}) {
  return [...(resume.experience || []), ...(resume.projects || [])].flatMap((item) => splitLines(item?.bullets));
}

function scoreContactProfile({ resume }) {
  const checks = [
    [hasRealText(resume.name) && !isPlaceholder(resume.name), 3, "Add full name."],
    [validPhone(resume.phone), 3, "Add phone number."],
    [validEmail(resume.email), 3, "Add email address."],
    [hasRealText(resume.location), 2, "Add location."],
    [hasRealText(resume.linkedin) && validUrlish(resume.linkedin), 2, "Add LinkedIn URL."],
    [hasRealText(resume.github) && validUrlish(resume.github), 1, "Add portfolio/GitHub URL."],
    [hasRealText(resume.targetRole), 1, "Add target role."],
  ];
  return categoryScore("Contact/Profile", 15, checks);
}

function scoreAtsStructure({ resume }) {
  const hasExperience = resume.experience.some((item) => hasRealText(item.title) && splitLines(item.bullets).length);
  const hasProjects = resume.projects.some((item) => hasRealText(item.title) && splitLines(item.bullets).length);
  const hasEducation = resume.education.some((item) => hasRealText(item.degree) || hasRealText(item.school));
  const checks = [
    [wordCount(resume.summary) >= 15 && wordCount(resume.summary) <= 120, 3, "Profile summary should be 15-120 words with role-specific impact."],
    [hasExperience, 4, "Add detailed professional experience with bullet points."],
    [hasProjects, 2, "Include projects to demonstrate practical application."],
    [splitSkills(resume.skills).length >= 8, 3, "Include at least 8 specialized skills."],
    [hasEducation, 2, "List academic credentials and institution names."],
    [(resume.certifications || []).length > 0 || hasRealText(resume.achievements), 1, "Add certifications or key professional achievements."],
  ];
  return categoryScore("ATS Structure", 15, checks);
}

function scoreParseSafety({ resume, text }) {
  const longUrlCount = [resume.linkedin, resume.github].filter((url) => String(url || "").length > 90).length;
  const hasCoreContent =
    wordCount(resume.summary) >= 12 &&
    (resume.experience || []).some((item) => splitLines(item.bullets).length) &&
    splitSkills(resume.skills).length >= 6 &&
    (resume.education || []).some((item) => hasRealText(item.degree) || hasRealText(item.school));
  const checks = [
    [hasCoreContent && SECTION_HEADINGS.every((heading) => text.includes(heading)), 3, "Use standard ATS headings: Summary, Experience, Skills, Education."],
    [longUrlCount === 0, 2, "Shorten very long profile or portfolio URLs."],
    [text.length < 6500, 2, "Keep resume concise enough for parser-friendly scanning."],
    [!/(?:\t{2,}| {6,})/.test(text), 1.5, "Avoid table-like spacing and excessive alignment spaces."],
    [!/[◆■●◦]/.test(text), 1.5, "Use simple bullets and text-only formatting."],
  ];
  return categoryScore("Parse Safety", 10, checks);
}

function scoreSkillsKeywords({ resume, skillList }) {
  const categories = skillCategoryCount(resume.skills);
  const targetTokens = clean(resume.targetRole).split(" ").filter((word) => word.length > 3);
  const body = clean(`${resume.summary} ${resume.skills} ${resume.experience.map((item) => `${item.title} ${item.bullets}`).join(" ")}`);
  const targetCoverage = targetTokens.length > 0 && targetTokens.some((token) => body.includes(token));
  const checks = [
    [skillList.length >= 8, 4, "Add more ATS keywords and role-relevant skills."],
    [skillList.length >= 12, 3, "Aim for 12-20 focused skills for stronger keyword coverage."],
    [categories >= 2, 3, "Group skills across at least two categories."],
    [targetCoverage, 3, "Mirror the target role keywords naturally in summary, skills, and experience."],
    [uniqueRatio(skillList) >= 0.82, 2, "Remove duplicate or near-duplicate skills."],
  ];
  return categoryScore("Skills/Keywords", 15, checks);
}

function scoreBulletQuality({ bullets }) {
  const metricCount = bullets.filter(hasMetric).length;
  const metricPercent = bullets.length ? metricCount / bullets.length : 0;
  const actionCount = bullets.filter(hasActionVerb).length;
  const actionPercent = bullets.length ? actionCount / bullets.length : 0;
  const lengthGood = bullets.filter((bullet) => {
    const count = wordCount(bullet);
    return count >= 8 && count <= 32;
  }).length;
  const lengthPercent = bullets.length ? lengthGood / bullets.length : 0;
  const checks = [
    [bullets.length >= 5, 4, "Add 5+ strong experience/project bullets."],
    [bullets.length >= 8, 3, "Add enough bullets to show depth across roles or projects."],
    [actionPercent >= 0.8, 4, "Start most bullets with strong action verbs."],
    [metricPercent >= 0.35, 5, "Add measurable outcomes, scale, time saved, volume, or frequency to more bullets."],
    [lengthPercent >= 0.65, 2, "Keep bullets concise: usually 8-36 words."],
    [bullets.length > 0 && bullets.every((bullet) => !isPlaceholder(bullet)), 2, "Replace placeholder bullets with real achievements."],
  ];
  return categoryScore("Bullet Quality", 20, checks);
}

function scoreDatesEducationCerts({ resume }) {
  const experience = resume.experience || [];
  const education = resume.education || [];
  const datedExperience = experience.filter((item) => hasRealText(item.dates)).length;
  const completeCompanies = experience.filter((item) => hasRealText(item.company) && !isPlaceholder(item.company)).length;
  const checks = [
    [experience.length > 0 && datedExperience / Math.max(experience.length, 1) >= 0.7, 3, "Add dates to each experience entry."],
    [experience.length > 0 && completeCompanies / Math.max(experience.length, 1) >= 0.7, 2, "Add real company or organization names."],
    [education.some((item) => hasRealText(item.degree) && !isPlaceholder(item.degree)), 2, "Add a real degree, course, or education credential."],
    [education.some((item) => hasRealText(item.school) && !isPlaceholder(item.school)), 1.5, "Add institution/school name."],
    [(resume.certifications || []).every((item) => hasRealText(item.title)), 1.5, "Remove empty certification rows or add certification names."],
  ];
  return categoryScore("Dates/Education", 10, checks);
}

function scoreGrammarReadability({ text, bullets, repetition, grammar }) {
  const enoughContent = wordCount(text) >= 120 && bullets.length >= 4;
  const readable = bullets.length > 0 && bullets.every((bullet) => wordCount(bullet) <= 36);
  const checks = [
    [enoughContent && grammar.length === 0, 5, grammar[0] || "Add enough clean resume content and fix spelling, repeated words, or punctuation spacing."],
    [bullets.length >= 4 && repetition.length === 0, 4, repetition[0] || "Remove duplicate bullets and repeated opening phrases."],
    [readable, 2, "Shorten overly long bullets for better readability."],
    [enoughContent && text.split("\n").filter((line) => line.length > 150).length === 0, 2, "Break long lines into cleaner resume bullets."],
    [enoughContent && !/\b(responsible for|worked on|helped with)\b/i.test(text), 2, "Replace weak phrases like responsible for/worked on with impact-focused action verbs."],
  ];
  return categoryScore("Grammar/Readability", 15, checks);
}

function categoryScore(label, max, checks) {
  const points = checks.reduce((sum, [pass, weight]) => sum + (pass ? weight : 0), 0);
  const capped = clamp(points, 0, max);
  return {
    label,
    max,
    points: capped,
    percent: max ? (capped / max) * 100 : 0,
    notes: checks.filter(([pass]) => !pass).map(([, , note]) => note),
  };
}

function atsGrade(score) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  return "Weak";
}

function atsStatus(score) {
  if (score >= 90) return "ATS Ready";
  if (score >= 75) return "Improve Content";
  if (score >= 60) return "Needs Work";
  return "Major Fixes Needed";
}

function hasRealText(value) {
  return Boolean(String(value || "").trim());
}

function isPlaceholder(value) {
  return /\b(your name|company|institution|degree \/ course|imported candidate|professional experience|project)\b/i.test(String(value || ""));
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function validPhone(value) {
  return String(value || "").replace(/[^\d]/g, "").length >= 8;
}

function validUrlish(value) {
  const text = String(value || "").trim();
  return !text || /^(https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/\S*)?$/i.test(text);
}

function wordCount(value) {
  return clean(value).split(" ").filter(Boolean).length;
}

function skillCategoryCount(value) {
  return String(value || "").split("\n").filter((line) => /:/.test(line) && line.split(":")[1]?.trim()).length;
}

function uniqueRatio(items) {
  if (!items.length) return 0;
  const unique = new Set(items.map(skillKey));
  return unique.size / items.length;
}

function hasActionVerb(value) {
  return /^(developed|built|created|implemented|optimized|improved|integrated|managed|led|delivered|configured|designed|supported|maintained|prepared|assisted|coordinated|performed|engineered|enhanced|reduced|increased|launched|analyzed|automated)\b/i.test(String(value || "").trim());
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundOne(value) {
  return Math.round(value * 10) / 10;
}

function hasMetric(value) {
  return /(?:\d+|\d+%|\$|₹|daily|weekly|monthly|annual|multi[- ](?:page|stage|user|year)|[0-9]+x)/i.test(value);
}

function repetitionIssues(bullets) {
  const issues = [];
  const starts = new Map();
  bullets.forEach((line, index) => {
    const start = line.split(/\s+/).slice(0, 2).join(" ").toLowerCase();
    if (starts.has(start)) issues.push(`Rewrite bullet ${index + 1}; repeated opening phrase.`);
    starts.set(start, index);
    bullets.slice(0, index).forEach((previous) => {
      if (similarity(previous, line) >= 0.72) issues.push(`Rewrite bullet ${index + 1}; duplicate meaning.`);
    });
  });
  return issues;
}

function grammarIssues(text) {
  const issues = [];
  if (/\b(teh|recieve|seperate|definately|experiance|developement|managment)\b/i.test(text)) issues.push("Fix spelling mistakes.");
  if (/[a-z0-9][.!?][A-Z]/.test(text)) issues.push("Add spaces after punctuation.");
  if (/\b([A-Za-z]+)\s+\1\b/i.test(text)) issues.push("Remove repeated words.");
  return issues;
}

function polishSentence(value) {
  const text = polishTech(value)
    .replace(/\s+/g, " ")
    .replace(/([a-z0-9])\.([A-Z])/g, "$1. $2")
    .replace(/([a-z0-9]),([A-Z])/g, "$1, $2")
    .replace(/([a-z0-9]);([A-Z])/g, "$1; $2")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\b(\w+)\s+\1\b/gi, "$1")
    .replace(
      /\b(Developed|Built|Created|Implemented|Optimized|Improved|Integrated|Managed|Led|Delivered|Configured|Designed|Supported|Maintained|Prepared|Assisted|Coordinated|Performed|Engineered|Enhanced|Reduced|Increased|Launched|Analyzed|Automated)\s+and\s+(deploy|integrate|design|develop|optimize|enhance|configure|deliver|engineer|implement|build|create|manage|support|maintain|prepare|assist|coordinate|perform|reduce|increase|launch|analyze|automate)\b/gi,
      (_, first, second) => `${first} and ${pastTenseVerb(second)}`,
    )
    .replace(/\bto\s+extracts\b/gi, "to extract")
    .replace(/\bto\s+sends\b/gi, "to send")
    .replace(/\bto\s+optimizes\b/gi, "to optimize")
    .replace(/\bachieve\s+(\d+\+?)\s+ATS score\b/gi, "achieve an $1 ATS score")
    .replace(/\bexperiance\b/gi, "experience")
    .replace(/\bexprience\b/gi, "experience")
    .replace(/\bdevelopement\b/gi, "development")
    .replace(/\bmanagment\b/gi, "management")
    .replace(/\bteh\b/gi, "the")
    .replace(/\brecieve\b/gi, "receive")
    .replace(/\bseperate\b/gi, "separate")
    .replace(/\bdefinately\b/gi, "definitely")
    .trim();
  if (!text) return "";
  const sentence = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function polishTech(value) {
  return String(value || "")
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
    .replace(/\bapis\b/gi, "APIs");
}

function pastTenseVerb(value) {
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

function similarity(a, b) {
  const left = new Set(clean(a).split(" ").filter((word) => word.length > 3));
  const right = new Set(clean(b).split(" ").filter((word) => word.length > 3));
  if (!left.size || !right.size) return 0;
  return [...left].filter((word) => right.has(word)).length / Math.min(left.size, right.size);
}

function clean(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9+# ]/g, " ").replace(/\s+/g, " ").trim();
}

function isSection(line) {
  return SECTION_HEADINGS.concat([
    "Professional Summary",
    "Profile",
    "Professional Experience",
    "Work Experience",
    "Employment History",
    "Employment Histor",
    "Career History",
    "Work History",
    "Project Experience",
    "Technical Skills",
    "Licences and Certifications",
    "Licenses and Certifications",
    "Achievements and Certifications",
    "Achievements",
    "Certifications",
    "Licenses",
  ]).some((heading) => sectionStartsLine(line, heading));
}

function sectionStartsLine(line, heading) {
  const left = clean(line);
  const right = clean(heading);
  if (left === right) return true;
  if (!left.startsWith(`${right} `)) return false;
  const headingWords = right.split(" ").length;
  const prefix = String(line || "").trim().split(/\s+/).slice(0, headingWords).join(" ");
  return prefix === prefix.toUpperCase() || /^[A-Za-z ]+[:\-]/.test(String(line || "").trim());
}

function stripSectionHeading(line, headings) {
  const original = String(line || "").trim();
  const match = headings
    .map((heading) => new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b[:\\s-]*`, "i"))
    .find((regex) => regex.test(original));
  return match ? original.replace(match, "").trim() : "";
}

function skillKey(value) {
  return clean(value).replace(/[^a-z0-9+#]+/g, "").replace(/reactjs/g, "react").replace(/nodejs/g, "node").replace(/expressjs/g, "express").replace(/restfulapi/g, "restapi");
}

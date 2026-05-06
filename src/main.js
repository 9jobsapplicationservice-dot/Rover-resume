import "./styles.css";

const STORAGE_KEY = "rover_current_resume_v3";

window.addEventListener("error", (event) => showStartupError(event.error || event.message));
window.addEventListener("unhandledrejection", (event) => showStartupError(event.reason));

const sampleResume = {
  id: createId(),
  name: "Gurnoor Kaushal",
  phone: "+61 485 686 902",
  email: "gurnoorskk@gmail.com",
  linkedin: "",
  github: "",
  links: "",
  targetRole: "Construction Labourer",
  summary:
    "Reliable and hardworking Construction Labourer with hands-on experience across residential and commercial construction sites in Melbourne. Skilled in site preparation, material handling, and assisting trades. Strong focus on safety, teamwork, and high-quality workmanship. Available for immediate start.",
  skills:
    "Construction Labouring, Site Preparation & Clean-up, Demolition Support, Assisting Carpentry & Concreting, Material & Manual Handling, Basic Power Tools, WHS Compliance & Safety, Teamwork & Time Management, Hazard Awareness, Physical Stamina, Site Safety Procedures",
  achievements: "White Card, Full Working Rights (Australia), Driver Licence",
  certifications: [
    { title: "White Card", issuer: "Australia", startDate: "", endDate: "", dates: "" },
    { title: "Driver Licence", issuer: "", startDate: "", endDate: "", dates: "" },
  ],
  experience: [
    {
      title: "Construction Labourer",
      company: "BRC Construction, Melbourne VIC",
      dates: "Feb 2025 -- Present",
      startDate: "",
      endDate: "",
      current: true,
      bullets:
        "Prepared sites, handled materials, and assisted trades across residential and commercial projects\nCoordinated with supervisors to maintain workflow and meet project deadlines\nSupported demolition activities while maintaining a safe and compliant work environment",
    },
    {
      title: "Construction Labourer",
      company: "Rendine Construction, Melbourne VIC",
      dates: "Mar 2024 -- Jan 2025",
      startDate: "",
      endDate: "",
      current: false,
      bullets:
        "Performed labouring tasks across construction stages including groundwork and finishing prep\nAssisted carpentry and concreting trades with materials and tools\nMaintained WHS compliance, hazard awareness, and site cleanliness",
    },
  ],
  projects: [
    {
      title: "Residential Site Preparation",
      subtitle: "Labouring, safety, materials",
      dates: "2025",
      startDate: "",
      endDate: "",
      current: false,
      bullets:
        "Supported daily site setup, tool movement, and clean-up for multi-stage builds\nImproved access and material flow by keeping work areas organised",
    },
  ],
  education: [
    {
      degree: "Bachelor of Software Engineering (Honours)",
      school: "Deakin University",
      dates: "2023 -- 2026",
      startDate: "",
      endDate: "",
      current: false,
    },
  ],
  achievementsList: [],
  rawText: "",
  updatedAt: Date.now(),
};

let state = {
  view: "landing",
  resume: clone(sampleResume),
  importText: "",
  rawScore: null,
  converting: false,
};

const app = document.getElementById("app");
render();
loadSavedResumeAfterBoot();

function render() {
  try {
    if (!app) return;
    state.resume = hydrateResume(state.resume || clone(sampleResume));
    app.innerHTML = `
      <div class="shell">
        ${state.view === "landing" ? landingTemplate() : builderTemplate()}
        ${importModalTemplate()}
      </div>
    `;
    bindEvents();
  } catch (error) {
    console.error("Rover render failed:", error);
    clearSavedResume();
    state = {
      view: "landing",
      resume: clone(sampleResume),
      importText: "",
      rawScore: null,
      converting: false,
    };
    app.innerHTML = `
      <div class="shell">
        ${landingTemplate()}
        ${importModalTemplate()}
      </div>
    `;
    bindEvents();
  }
}

function landingTemplate() {
  return `
    <section class="landing">
      <header class="topbar">
        <div class="brand"><span>Rx</span><strong>Rover ATS</strong></div>
        <nav>
          <button class="text-btn" data-action="builder">Builder</button>
          <button class="text-btn" data-action="open-import">Upload Resume</button>
        </nav>
      </header>
      <main class="hero">
        <div class="hero-visual" aria-hidden="true">
          <div class="mock editor">${lineSet(9)}</div>
          <div class="mock resume">${resumeSkeleton()}</div>
          <div class="mock score"><strong>100</strong><span>ATS Score</span>${lineSet(4)}</div>
        </div>
        <p class="eyebrow fade-up">AI-style ATS resume converter</p>
        <h1 class="fade-up delay-1">
          <span>Create a resume or upload one</span>
          <span>and convert it into a clean ATS format.</span>
        </h1>
        <p class="hero-copy fade-up delay-2">
          The builder rewrites imported content into Summary, Experience, Projects, Skills, Achievements and Certifications, and Education with a strict ATS-focused checklist.
        </p>
        <div class="hero-actions fade-up delay-3">
          <button class="primary-btn" data-action="builder">Get Started</button>
          <button class="ghost-btn" data-action="open-import">Upload Resume</button>
        </div>
      </main>
      <section class="feature-band">
        ${[
          "Single resume",
          "AI-style convert",
          "ATS checklist",
          "PDF/TXT import",
          "Live preview",
          "Download",
        ].map((item) => `<article><strong>${item}</strong><span>Ready</span></article>`).join("")}
      </section>
    </section>
  `;
}

function builderTemplate() {
  const ats = scoreGeneratedResume(state.resume);
  return `
    <section class="app-layout">
      <aside class="sidebar">
        <div class="brand side"><span>Rx</span><strong>ATS Builder</strong></div>
        <button class="side-link active" data-action="builder">Resume Builder</button>
        <button class="side-link" data-action="new-resume">Create Resume</button>
        <button class="side-link" data-action="open-import">Upload Resume</button>
        <button class="side-link" data-action="home">Home</button>
        <p class="side-note">One active resume is saved locally in this browser.</p>
      </aside>
      <main class="workspace">
        <header class="workspace-head">
          <div>
            <p class="eyebrow">Current resume</p>
            <h2>Create or convert an ATS-friendly resume</h2>
          </div>
          <div class="actions">
            <button class="ghost-btn" data-action="open-import">Upload Resume</button>
            <button class="primary-btn" data-action="new-resume">Create Resume</button>
          </div>
        </header>

        <section class="choice-panel">
          <button class="choice-card" data-action="new-resume">
            <span>+</span>
            <strong>Create resume manually</strong>
            <small>Start from a clean ATS-ready form.</small>
          </button>
          <button class="choice-card accent-card" data-action="open-import">
            <span>AI</span>
            <strong>Upload and convert resume</strong>
            <small>Convert any client resume into the required format.</small>
          </button>
          <article class="ats-hero-score">
            <span>ATS</span>
            <strong>${ats.score}%</strong>
            <small>${ats.rating}</small>
          </article>
        </section>

        <section class="builder">
          <form class="editor" id="resumeForm">
            ${profileFields(state.resume)}
            ${sectionEditor("Summary", "summary", `<label>Summary<textarea name="summary" rows="5">${safe(state.resume.summary)}</textarea></label>`)}
            ${listEditor("Experience", "experience", state.resume.experience)}
            ${listEditor("Projects", "projects", state.resume.projects)}
            ${sectionEditor("Skills", "skills", `<label>Skills<textarea name="skills" rows="4">${safe(state.resume.skills)}</textarea></label>`)}
            ${listEditor("Education", "education", state.resume.education)}
            ${listEditor("Licences and Certifications", "certifications", state.resume.certifications)}
          </form>

          <aside class="preview-wrap">
            <div class="preview-head">
              <strong>ATS Resume Preview</strong>
              <div>
                <button class="ghost-btn small" data-action="download-tex">Download LaTeX</button>
                <button class="ghost-btn small" data-action="download-doc">Download DOC</button>
                <button class="primary-btn small" data-action="download-pdf">Download PDF</button>
              </div>
            </div>
            <article class="paper" id="resumePreview">${previewTemplate(state.resume)}</article>
            <div class="suggestions">${suggestionsTemplate(ats)}</div>
          </aside>
        </section>
      </main>
    </section>
  `;
}

function profileFields(resume) {
  return sectionEditor(
    "Profile",
    "profile",
    `
      <label>Name<input name="name" value="${attr(resume.name)}"></label>
      <label>Target Role<input name="targetRole" value="${attr(resume.targetRole)}" placeholder="Software Engineer, Construction Labourer..."></label>
      <div class="two-col">
        <label>Phone<input name="phone" value="${attr(resume.phone)}"></label>
        <label>Email<input name="email" value="${attr(resume.email)}"></label>
      </div>
      <div class="two-col">
        <label>LinkedIn URL<input name="linkedin" value="${attr(resume.linkedin || linkByType(resume.links, "linkedin"))}" placeholder="https://www.linkedin.com/in/username"></label>
        <label>GitHub URL<input name="github" value="${attr(resume.github || linkByType(resume.links, "github"))}" placeholder="https://github.com/username"></label>
      </div>
      <label>Portfolio / Other Link<input name="links" value="${attr(otherLinks(resume))}" placeholder="Portfolio or other URL"></label>
    `,
  );
}

function sectionEditor(title, id, body) {
  return `
    <section class="form-section" id="${id}">
      <div class="section-title"><h3>${title}</h3></div>
      ${body}
    </section>
  `;
}

function listEditor(title, type, items) {
  const rows = ensureList(items, blankByType(type)).map((item, index) => {
    if (type === "certifications") {
      return `
        <div class="item-box">
          <button class="remove" type="button" data-action="remove-item" data-type="${type}" data-index="${index}">x</button>
          <label>Certification / Licence<input data-list="${type}" data-index="${index}" data-key="title" value="${attr(item.title)}"></label>
          <div class="two-col">
            <label>Issuer / Authority<input data-list="${type}" data-index="${index}" data-key="issuer" value="${attr(item.issuer)}"></label>
            <label>Start Date<input type="date" data-list="${type}" data-index="${index}" data-key="startDate" value="${attr(item.startDate)}"></label>
            <label>End Date<input type="date" data-list="${type}" data-index="${index}" data-key="endDate" value="${attr(item.endDate)}"></label>
          </div>
        </div>`;
    }
    if (type === "education") {
      return `
        <div class="item-box">
          <button class="remove" type="button" data-action="remove-item" data-type="${type}" data-index="${index}">x</button>
          <label>Degree<input data-list="${type}" data-index="${index}" data-key="degree" value="${attr(item.degree)}"></label>
          <div class="two-col">
            <label>School<input data-list="${type}" data-index="${index}" data-key="school" value="${attr(item.school)}"></label>
            <label>Start Date<input type="date" data-list="${type}" data-index="${index}" data-key="startDate" value="${attr(item.startDate)}"></label>
            <label>End Date<input type="date" data-list="${type}" data-index="${index}" data-key="endDate" value="${attr(item.endDate)}"></label>
          </div>
        </div>`;
    }
    const secondKey = type === "projects" ? "subtitle" : "company";
    const secondLabel = type === "projects" ? "Tech / Link" : "Company / Location";
    return `
      <div class="item-box">
        <button class="remove" type="button" data-action="remove-item" data-type="${type}" data-index="${index}">x</button>
        <div class="two-col">
          <label>${type === "projects" ? "Project" : "Role"}<input data-list="${type}" data-index="${index}" data-key="title" value="${attr(item.title)}"></label>
          <label>Start Date<input type="date" data-list="${type}" data-index="${index}" data-key="startDate" value="${attr(item.startDate)}"></label>
          <label>End Date<input type="date" data-list="${type}" data-index="${index}" data-key="endDate" value="${attr(item.endDate)}"></label>
        </div>
        ${type === "experience" ? `<label class="check-row"><input type="checkbox" data-list="${type}" data-index="${index}" data-key="current" ${item.current ? "checked" : ""}> Currently working here</label>` : ""}
        <label>${secondLabel}<input data-list="${type}" data-index="${index}" data-key="${secondKey}" value="${attr(item[secondKey])}"></label>
        <label>Bullets<textarea rows="4" data-list="${type}" data-index="${index}" data-key="bullets">${safe(item.bullets)}</textarea></label>
      </div>`;
  }).join("");

  return `
    <section class="form-section" id="${type}">
      <div class="section-title">
        <h3>${title}</h3>
        <button class="mini-btn" type="button" data-action="add-item" data-type="${type}">Add</button>
      </div>
      ${rows}
    </section>
  `;
}

function previewTemplate(resume) {
  const previewResume = polishResumeContent(clone(resume));
  const projects = projectItemsWithLinks(previewResume);
  return `
    <h1>${safe(displayName(previewResume.name || "Your Name"))}</h1>
    <p class="contact">${contactLinks(previewResume).map(safe).join(" | ")}</p>
    ${paperSection("Summary", `<p>${safe(previewResume.summary)}</p>`)}
    ${paperSection("Experience", previewResume.experience.map(previewExperience).join(""))}
    ${paperSection("Projects", projects.map(previewProject).join(""))}
    ${paperSection("Skills", skillList(previewResume.skills))}
    ${paperSection("Achievements and Certifications", achievementsCertificationPreview(previewResume))}
    ${paperSection("Education", educationPreview(previewResume))}
  `;
}

function previewExperience(item) {
  return `<div class="resume-row"><strong>${safe(item.title)}</strong><strong>${safe(dateRange(item))}</strong></div><p><strong>${safe(item.company)}</strong></p>${bulletList(item.bullets)}`;
}

function previewProject(item) {
  if (!item.title && !item.subtitle && !item.bullets) return `<p></p>`;
  const title = item.link ? `${item.title} (${item.link})` : item.title;
  return `<div class="resume-row"><strong>${safe(title)}</strong><strong>${safe(dateRange(item))}</strong></div><p>${safe(item.subtitle)}</p>${bulletList(item.bullets)}`;
}

function previewEducation(item) {
  return `
    <div class="education-row">
      <div>
        <p><strong>• ${safe(item.school || "Institution")}</strong></p>
        <p><em>${safe(dateRange(item))}</em></p>
      </div>
      <p>${safe(item.degree || "Degree / Course")}</p>
    </div>
  `;
}

function previewCertification(item) {
  return `<div class="resume-row"><strong>${safe(hasMeaningfulText(item.title) ? item.title : "")}</strong><strong>${safe(dateRange(item))}</strong></div><p>${safe(hasMeaningfulText(item.issuer) ? item.issuer : "")}</p>`;
}

function achievementsCertificationPreview(resume) {
  const certifications = certificationList(resume);
  const achievements = splitLines(resume.achievements)
    .filter((line) => !certificationText(resume).some((cert) => clean(cert).includes(clean(line)) || clean(line).includes(clean(cert))))
    .map((line) => `<p>${safe(line)}</p>`)
    .join("");
  return [achievements, certifications].filter(Boolean).join("");
}

function educationPreview(resume) {
  return resume.education.map(previewEducation).join("");
}

function paperSection(title, body) {
  return `<h2>${title}</h2>${body || "<p></p>"}`;
}

function hasRealProjects(resume) {
  return Boolean(projectItemsWithLinks(resume).some((item) => {
    const text = `${item.title || ""} ${item.subtitle || ""} ${item.bullets || ""}`;
    return text.trim() && !/professional delivery project|relevant tools, teamwork/i.test(text);
  }));
}

function contactLinks(resume) {
  return [
    resume.phone,
    resume.email,
    resume.linkedin || linkByType(resume.links, "linkedin"),
    resume.github || linkByType(resume.links, "github"),
  ].filter(Boolean);
}

function linkByType(value, type) {
  return String(value || "").split("|").map((item) => item.trim()).find((item) => item.toLowerCase().includes(type)) || "";
}

function otherLinks(resume) {
  const linkedin = resume.linkedin || linkByType(resume.links, "linkedin");
  const github = resume.github || linkByType(resume.links, "github");
  return String(resume.links || "")
    .split("|")
    .map((item) => item.trim())
    .filter((item) => item && item !== linkedin && item !== github && !/linkedin|github/i.test(item))
    .join(" | ");
}

function projectItemsWithLinks(resume) {
  const projects = ensureList(resume.projects, blankProject())
    .filter((item) => item.title || item.subtitle || item.bullets)
    .map((item) => ({ ...item }));
  const extractedLinks = [];

  projects.forEach((project) => {
    const fromSubtitle = extractUrls(project.subtitle);
    const fromBullets = extractUrls(project.bullets);
    const allProjectLinks = uniqueLinks([...fromSubtitle, ...fromBullets]);
    project.subtitle = removeProjectLinkText(project.subtitle);
    project.bullets = removeProjectLinkText(project.bullets);
    extractedLinks.push(...allProjectLinks);
  });

  const allLinks = uniqueLinks([...extractedLinks, ...extractUrls(otherLinks(resume))]);
  if (!allLinks.length) return projects;

  const assigned = new Set();
  projects.forEach((project, index) => {
    const matched = allLinks.find((link) => !assigned.has(link) && linkMatchesProject(link, project));
    const fallback = allLinks.find((link) => !assigned.has(link) && index < allLinks.length);
    const link = matched || fallback;
    if (!link) return;
    project.link = link;
    assigned.add(link);
  });

  const unassigned = allLinks.filter((link) => !assigned.has(link));
  if (unassigned.length) {
    projects.push({
      ...blankProject(),
      title: "Portfolio / Project Links",
      subtitle: "",
      link: unassigned.join(" | "),
      bullets: "Additional project, portfolio, or live demo links provided by the candidate",
    });
  }

  return projects;
}

function extractUrls(value) {
  return Array.from(String(value || "").matchAll(/(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s,|)]*)?/gi))
    .map((match) => match[0].replace(/[.,;]+$/g, ""))
    .filter((url) => isProjectUrl(url) && !/linkedin|github/i.test(url));
}

function isProjectUrl(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  if (/^(node|react|express|next|vue|angular|three|chart|d3|jspdf|pdf|html|css|tailwind|bootstrap)\.js$/i.test(text)) return false;
  if (/^(html|css|js|jsx|ts|tsx|json|xml|sql|dax)$/i.test(text.split(".").pop())) return false;
  return /^https?:\/\//i.test(text) || /^www\./i.test(text) || /\.(com|co|net|org|io|dev|app|in|au|co\.in|com\.au)(?:\/|$)/i.test(text);
}

function uniqueLinks(links) {
  const seen = new Set();
  return links.filter((link) => {
    const key = link.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function removeProjectLinkText(value) {
  return String(value || "")
    .replace(/\b(Project\s+Links?|Live\s+Demo|Link|URL)\s*:\s*/gi, "")
    .replace(/(?:https?:\/\/|www\.)[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s,|)]*)?/gi, "")
    .replace(/\b[a-z0-9-]+\.(?:com|co|net|org|io|dev|app|in|au|co\.in|com\.au)(?:\/[^\s,|)]*)?/gi, "")
    .replace(/\b\d{1,2}\/\d{4}\s*(?:-|to|--)\s*\d{1,2}\/\d{4}\b/gi, "")
    .replace(/\b\d{4}-\d{1,2}(?:-\d{1,2})?\s*(?:-|to|--)\s*\d{4}-\d{1,2}(?:-\d{1,2})?\b/gi, "")
    .replace(/\b\d{4}-\d{1,2}-\d{1,2}\b/g, "")
    .replace(/\s*\|\s*/g, " | ")
    .replace(/(?:^\s*\|\s*|\s*\|\s*$)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function linkMatchesProject(link, project) {
  const domain = String(link || "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/.]/)
    .filter((part) => part.length >= 4);
  const text = `${project.title || ""} ${project.subtitle || ""} ${project.bullets || ""}`.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  return domain.some((part) => text.includes(part));
}

function skillList(value) {
  const groups = skillGroups(value);
  return groups.length
    ? `<ul class="skill-summary">${groups.map((group) => `<li><strong>${safe(group.label)}:</strong> ${safe(group.items.join(", "))}</li>`).join("")}</ul>`
    : "<p></p>";
}

function certificationList(resume) {
  const certs = ensureList(resume.certifications, blankCertification()).filter((item) => hasMeaningfulText(item.title) || hasMeaningfulText(item.issuer));
  if (certs.length) return certs.map(previewCertification).join("");
  return `<p>${safe(resume.achievements)}</p>`;
}

function certificationText(resume) {
  const certs = ensureList(resume.certifications, blankCertification())
    .filter((item) => hasMeaningfulText(item.title) || hasMeaningfulText(item.issuer));
  if (!certs.length) return parseSkillItems(resume.achievements);
  return certs.map((item) => [item.title, item.issuer, dateRange(item)].filter(hasMeaningfulText).join(" | "));
}

function splitSkills(value) {
  return skillGroups(value).flatMap((group) => group.items);
}

const SKILL_CATEGORY_ORDER = [
  "Languages",
  "Frontend",
  "Backend",
  "Database",
  "Tools",
];

const SKILL_CATEGORY_KEYWORDS = {
  Languages: ["javascript", "typescript", "python", "java", "c++", "c#", "php", "ruby", "go", "html", "css", "sql", "dax"],
  Frontend: ["react", "next", "vue", "angular", "frontend", "responsive", "tailwind", "bootstrap", "html", "css", "redux", "ui", "cross-browser"],
  Backend: ["node", "express", "api", "rest", "restful", "backend", "mern", "authentication", "server", "scalable", "debugging"],
  Database: ["mongodb", "mongo db", "mysql", "postgresql", "postgres", "sql server", "database"],
  Tools: ["git", "github", "visual studio", "vs code", "power bi", "excel", "jira", "confluence", "servicenow", "sharepoint", "agile", "scrum", "sdlc", "kanban", "deployment", "testing", "debugging"],
};

function skillGroups(value) {
  const explicitGroups = parseExplicitSkillGroups(value);
  const sourceGroups = explicitGroups.length ? explicitGroups : autoGroupSkills(parseSkillItems(value));
  const seen = new Set();

  return SKILL_CATEGORY_ORDER
    .map((label) => {
      const items = sourceGroups
        .filter((group) => group.label === label)
        .flatMap((group) => group.items)
        .map(cleanSkill)
        .filter(Boolean)
        .filter((item) => {
          const key = skillKey(item);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      return { label, items };
    })
    .filter((group) => group.items.length);
}

function parseExplicitSkillGroups(value) {
  const lines = normalizeSkillCategoryBoundaries(value)
    .replace(/[â€¢â—â–ª]/g, "\n")
    .split(/\n|;/)
    .map((line) => line.replace(/^[*-]\s*/, "").trim())
    .filter(Boolean);

  return lines.flatMap((line) => {
    const match = line.match(/^([^:]{2,35}):\s*(.+)$/);
    if (!match) return [];
    if (isAggregateSkillCategory(match[1])) return autoGroupSkills(parseSkillItems(match[2])).filter((group) => group.items.length);
    const label = canonicalSkillCategory(match[1]);
    return label ? [{ label, items: parseSkillItems(match[2]) }] : [];
  });
}

function isAggregateSkillCategory(value) {
  const cleaned = String(value || "").toLowerCase().replace(/[^a-z]/g, "");
  return ["technology", "technologies", "technical", "technicalskills"].includes(cleaned);
}

function parseSkillItems(value) {
  return normalizeSkillCategoryBoundaries(value)
    .replace(/[â€¢â—â–ª]/g, "\n")
    .split(/\n|;|,(?=\s*[\w#+])/)
    .map((item) => item.replace(/^(Languages|Frontend|Backend|Database|Tools)\s*:\s*/i, ""))
    .map((item) => cleanSkill(item.replace(/^[*-]\s*/, "")))
    .filter(Boolean);
}

function normalizeSkillCategoryBoundaries(value) {
  return String(value || "")
    .replace(/(Languages|Frontend|Backend|Database|Tools|Technology|Technologies|Technical|Methodologies|Methods)\s*:/gi, (match, label, offset) => `${offset > 0 ? "\n" : ""}${label}:`);
}

function autoGroupSkills(items) {
  const groups = SKILL_CATEGORY_ORDER.map((label) => ({ label, items: [] }));
  items.forEach((item) => {
    const label = inferSkillCategory(item);
    if (label) groups.find((group) => group.label === label).items.push(item);
  });
  return groups;
}

function inferSkillCategory(item) {
  const key = item.toLowerCase();
  return SKILL_CATEGORY_ORDER.find((label) => (SKILL_CATEGORY_KEYWORDS[label] || []).some((word) => key.includes(word))) || "";
}

function canonicalSkillCategory(value) {
  const cleaned = String(value || "").toLowerCase().replace(/[^a-z]/g, "");
  const aliases = {
    language: "Languages",
    languages: "Languages",
    technology: "Backend",
    technologies: "Backend",
    technical: "Backend",
    frontend: "Frontend",
    frontendskills: "Frontend",
    backend: "Backend",
    backendskills: "Backend",
    tools: "Tools",
    tool: "Tools",
    database: "Database",
    databases: "Database",
    db: "Database",
    methodologies: "Tools",
    methodology: "Tools",
    methods: "Tools",
  };
  return aliases[cleaned] || SKILL_CATEGORY_ORDER.find((label) => label.toLowerCase().replace(/[^a-z]/g, "") === cleaned) || "";
}

function cleanSkill(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^[,:|-]+|[,:|-]+$/g, "")
    .trim();
}

function skillKey(value) {
  const key = cleanSkill(value).toLowerCase().replace(/[^a-z0-9+#]+/g, "");
  const aliases = {
    reactjs: "react",
    nodejs: "node",
    expressjs: "express",
    nextjs: "next",
    mongodb: "mongodb",
    mongodatabase: "mongodb",
    restapi: "restapi",
    restfulapi: "restapi",
    restapis: "restapi",
    restfulapis: "restapi",
    github: "github",
  };
  return aliases[key] || key;
}

function skillCategoryLines(value) {
  return skillGroups(value).map((group) => `${group.label}: ${group.items.join(", ")}`);
}

function dateRange(item) {
  if (item.startDate || item.endDate || item.current) {
    return [formatDate(item.startDate), item.current ? "Present" : formatDate(item.endDate)].filter(Boolean).join(" - ");
  }
  return formatDateRange(item.dates);
}

function formatDate(value) {
  if (!value) return "";
  const text = String(value).trim();
  if (!hasMeaningfulText(text)) return "";
  if (/present|current/i.test(text)) return "Present";
  const monthYear = parseLooseDate(text);
  if (monthYear) return monthYear;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatDateRange(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!hasMeaningfulText(text)) return "";
  const range = text.match(/^(.+?)\s+(?:--|–|—|-|to)\s+(.+)$/i);
  if (range) {
    return [formatDate(range[1]), formatDate(range[2])].filter(Boolean).join(" - ");
  }
  return formatDate(text);
}

function hasMeaningfulText(value) {
  return Boolean(String(value || "").trim() && !/^(n\/?a|none|null|undefined|not applicable|not available|-+)$/i.test(String(value || "").trim()));
}

function parseLooseDate(value) {
  const text = String(value || "").trim();
  const iso = text.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);
  if (iso) return monthYearName(Number(iso[2]), iso[1]);
  const slash = text.match(/^(\d{1,2})\/(\d{4})$/);
  if (slash) return monthYearName(Number(slash[1]), slash[2]);
  const monthName = text.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})$/i);
  if (monthName) return `${normalizeMonthName(monthName[1])} ${monthName[2]}`;
  const yearOnly = text.match(/^(19|20)\d{2}$/);
  return yearOnly ? text : "";
}

function monthYearName(month, year) {
  if (month < 1 || month > 12) return "";
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1]} ${year}`;
}

function normalizeMonthName(value) {
  const key = String(value || "").slice(0, 3).toLowerCase();
  const map = { jan: "Jan", feb: "Feb", mar: "Mar", apr: "Apr", may: "May", jun: "Jun", jul: "Jul", aug: "Aug", sep: "Sep", oct: "Oct", nov: "Nov", dec: "Dec" };
  return map[key] || value;
}

function suggestionsTemplate(ats) {
  return `
    <h3>Strict ATS checklist: ${ats.score}%</h3>
    <p class="${ats.score >= 95 ? "pass" : "warn"}">${ats.rating}</p>
    ${ats.checks.map((check) => `<p class="${check.pass ? "pass" : "warn"}">${check.pass ? "OK" : "Fix"}: ${check.label}</p>`).join("")}
    ${(ats.notes || []).map((note) => `<p class="warn">${safe(note)}</p>`).join("")}
  `;
}

function importModalTemplate() {
  return `
    <dialog id="importModal" class="modal">
      <div class="modal-card">
        <button class="close" data-action="close-import">x</button>
        <p class="eyebrow">AI resume converter</p>
        <h2>Upload resume for ATS conversion</h2>
        <p class="muted">Upload TXT/PDF or paste content. AI will convert it into Summary, Experience, Projects, Skills, Achievements and Certifications, and Education.</p>
        <label class="drop">Choose PDF or TXT<input id="resumeFile" type="file" accept=".pdf,.txt"></label>
        <label>Target role<input id="targetRoleInput" value="${attr(state.resume.targetRole)}" placeholder="Construction Labourer, Software Engineer..."></label>
        <label>Job description or keywords<textarea id="jobDescriptionInput" rows="4" placeholder="Paste job description, required skills, or ATS keywords"></textarea></label>
        <label>Paste resume text<textarea id="resumePaste" rows="10" placeholder="Paste resume content here"></textarea></label>
        <p id="importStatus" class="muted">${state.converting ? "AI is converting your resume..." : ""}</p>
        <div class="modal-actions">
          <button class="ghost-btn" data-action="close-import">Cancel</button>
          <button class="primary-btn" data-action="apply-import" ${state.converting ? "disabled" : ""}>AI Convert Resume</button>
        </div>
      </div>
    </dialog>
  `;
}

function bindEvents() {
  app.querySelectorAll("[data-action]").forEach((el) => el.addEventListener("click", handleAction));
  document.getElementById("resumeForm")?.addEventListener("input", handleInput);
  document.getElementById("resumeFile")?.addEventListener("change", handleFile);
}

function handleAction(event) {
  const action = event.currentTarget.dataset.action;
  const type = event.currentTarget.dataset.type;
  const index = Number(event.currentTarget.dataset.index);

  if (action === "builder") {
    state.view = "app";
    render();
  }
  if (action === "home") {
    state.view = "landing";
    render();
  }
  if (action === "new-resume") {
    state.resume = blankResume();
    persist();
    state.view = "app";
    render();
  }
  if (action === "add-item") {
    state.resume[type].push(blankByType(type));
    touch();
    persist();
    render();
  }
  if (action === "remove-item") {
    state.resume[type].splice(index, 1);
    if (!state.resume[type].length) state.resume[type].push(blankByType(type));
    touch();
    persist();
    render();
  }
  if (action === "open-import") openImport();
  if (action === "close-import") closeImport();
  if (action === "apply-import") applyImport();
  if (action === "download-tex") downloadLatex();
  if (action === "download-doc") downloadDoc();
  if (action === "download-pdf") downloadPdf(event.currentTarget);
}

function handleInput(event) {
  const input = event.target;
  if (input.dataset.list) {
    state.resume[input.dataset.list][Number(input.dataset.index)][input.dataset.key] = input.type === "checkbox" ? input.checked : input.value;
  } else if (input.name) {
    state.resume[input.name] = input.value;
  }
  touch();
  persist();
  refreshPreview();
}

function refreshPreview() {
  const preview = document.getElementById("resumePreview");
  if (preview) preview.innerHTML = previewTemplate(state.resume);
  const score = scoreGeneratedResume(state.resume);
  const scoreCard = document.querySelector(".ats-hero-score");
  if (scoreCard) {
    scoreCard.innerHTML = `<span>ATS</span><strong>${score.score}%</strong><small>${score.rating}</small>`;
  }
  const suggestions = document.querySelector(".suggestions");
  if (suggestions) suggestions.innerHTML = suggestionsTemplate(score);
}

async function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  setImportStatus(`Reading ${file.name}...`);
  try {
    const text = file.name.toLowerCase().endsWith(".pdf") ? await readPdf(file) : await file.text();
    state.importText = text.trim();
    document.getElementById("resumePaste").value = state.importText;
    const rawScore = scoreRawText(state.importText);
    setImportStatus(`Raw resume loaded. Current ATS readiness: ${rawScore.score}%. Click AI Convert Resume.`);
  } catch {
    setImportStatus("Could not read this file. Paste resume text instead.");
  }
}

async function applyImport() {
  const text = (document.getElementById("resumePaste").value || state.importText).trim();
  const targetRole = document.getElementById("targetRoleInput")?.value.trim() || state.resume.targetRole || "";
  const jobDescription = document.getElementById("jobDescriptionInput")?.value.trim() || "";
  if (!text) {
    setImportStatus("Please upload a file or paste resume text.");
    return;
  }

  state.converting = true;
  setImportStatus("AI is converting your resume...");
  setConvertButtonState(true);
  try {
    const response = await fetch("/api/resume/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText: text, targetRole, jobDescription }),
    });
    const payload = await response.json().catch(() => ({}));
    if (payload.useLocalFallback) {
      setImportStatus(payload.message || "AI provider unavailable. Optimizing resume locally...");
      state.resume = polishResumeContent(aiConvertResume(text));
      if (targetRole) state.resume.targetRole = targetRole;
      state.view = "app";
      persist();
      closeImport();
      render();
      return;
    }
    if (!response.ok) {
      const detail = payload.detail ? ` Details: ${payload.detail}` : "";
      throw new Error(`${payload.error || "AI conversion failed. Please try again."}${detail}`);
    }

    state.resume = polishResumeContent(hydrateResume({
      ...payload.resume,
      rawText: text,
      updatedAt: Date.now(),
    }));
    state.view = "app";
    persist();
    closeImport();
    render();
  } catch (error) {
    setImportStatus(error.message || "AI conversion failed. Please try again.");
  } finally {
    state.converting = false;
    setConvertButtonState(false);
  }
}

function openImport() {
  state.importText = "";
  const modal = document.getElementById("importModal");
  modal.showModal();
}

function closeImport() {
  document.getElementById("importModal")?.close();
}

function setImportStatus(message) {
  const status = document.getElementById("importStatus");
  if (status) status.textContent = message;
}

function setConvertButtonState(disabled) {
  const button = document.querySelector('[data-action="apply-import"]');
  if (button) button.disabled = disabled;
}

async function readPdf(file) {
  if (!window.pdfjsLib) throw new Error("PDF.js unavailable");
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const doc = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  return pages.join("\n");
}

function aiConvertResume(raw) {
  const parsed = parseResumeText(raw);
  const construction = isConstructionResume(raw);
  parsed.summary = construction ? constructionSummary(parsed, raw) : aiSummary(parsed, raw);
  parsed.experience = ensureList(parsed.experience, inferredExperience(parsed, raw)).map((item) => ({
    ...item,
    bullets: construction ? constructionBullets(item) : aiBullets(item.bullets, parsed.targetRole, raw),
  }));
  parsed.projects = hasRealProjects(parsed) ? parsed.projects.map((item) => ({
    ...item,
    bullets: aiBullets(item.bullets, parsed.targetRole, raw),
  })) : [blankProject()];
  parsed.education = ensureList(parsed.education, inferredEducation(raw));
  parsed.skills = construction ? inferSkills(raw) : (parsed.skills || inferSkills(raw) || defaultSkills(parsed.targetRole));
  parsed.achievements = parsed.achievements || inferAchievements(raw, parsed.targetRole);
  parsed.certifications = certificationsFromText(parsed.achievements);
  parsed.rawText = raw;
  parsed.updatedAt = Date.now();
  return parsed;
}

function parseResumeText(raw) {
  const text = normalizeText(raw);
  const lines = logicalResumeLines(text);
  const email = (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [""])[0];
  const phone = (text.match(/(?:\+\d{1,3}\s*)?(?:\(?\d{2,4}\)?[\s-]*)?\d{3}[\s-]?\d{3}[\s-]?\d{3,4}/) || [""])[0];
  const inlineName = (text.match(/^([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3})\s+(?:\+?\d|[A-Z0-9._%+-]+@)/) || ["", ""])[1];
  const name = inlineName || lines.slice(0, 10).find((line) => !isSectionHeading(line) && !isContactLine(line) && /^[A-Za-z][A-Za-z .'-]{2,55}$/.test(line) && !line.endsWith(".")) || "Imported Candidate";
  const links = Array.from(text.matchAll(/(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com|github\.com|[a-z0-9-]+\.[a-z]{2,})(?:\/[^\s,]*)?/gi))
    .map((match) => match[0])
    .filter((value) => !value.includes("@") && !/^gmail\.com$/i.test(value))
    .slice(0, 3)
    .join(" | ");
  const linkedin = linkByType(links, "linkedin");
  const github = linkByType(links, "github");

  return {
    ...blankResume(),
    name: titleCase(name),
    phone,
    email,
    linkedin,
    github,
    links: otherLinks({ links, linkedin, github }),
    targetRole: inferRole(text),
    summary: sectionText(text, ["summary", "professional summary", "profile"], ["experience", "professional experience", "work experience", "employment", "projects", "skills", "licences and certifications", "licenses and certifications", "education", "achievements"]) || lines.slice(1, 5).filter((line) => !isContactLine(line)).join(" "),
    skills: sectionText(text, ["skills", "technical skills", "core skills"], ["experience", "professional experience", "work experience", "projects", "licences and certifications", "licenses and certifications", "education", "achievements"]) || inferSkills(text),
    achievements: sectionText(text, ["achievements", "awards", "certifications", "licences", "licenses", "licences and certifications", "licenses and certifications"], ["experience", "professional experience", "work experience", "projects", "skills", "education"]),
    certifications: certificationsFromText(sectionText(text, ["achievements", "awards", "certifications", "licences", "licenses", "licences and certifications", "licenses and certifications"], ["experience", "professional experience", "work experience", "projects", "skills", "education"])),
    experience: parseEntries(sectionText(text, ["experience", "professional experience", "work experience", "employment", "construction experience"], ["projects", "skills", "licences and certifications", "licenses and certifications", "education", "achievements"]) || text, "experience"),
    projects: parseEntries(sectionText(text, ["projects", "project experience"], ["experience", "professional experience", "work experience", "skills", "education", "achievements"]), "projects"),
    education: parseEducation(sectionText(text, ["education"], ["experience", "professional experience", "work experience", "projects", "skills", "licences and certifications", "licenses and certifications", "achievements"])),
  };
}

function isConstructionResume(raw) {
  return /construction|labou?r|site|whs|forklift|concrete|carpentry|dogging|telehandler|ewp|white card|ppe|subcontractor|trades/i.test(raw);
}

function constructionSummary(resume, raw) {
  const location = /melbourne|victoria|vic/i.test(raw) ? " across Melbourne" : "";
  const licences = inferAchievements(raw, resume.targetRole);
  return `Construction professional with proven experience delivering residential and commercial construction projects${location}. Equipped with ${licences || "site safety licences and construction certifications"}, with strong expertise in WHS compliance and safe site operations. Demonstrated ability to supervise site activities, coordinate subcontractors, manage site logistics, and maintain construction quality in line with drawings and specifications.`;
}

function constructionBullets(item) {
  const title = `${item.title || ""} ${item.company || ""}`;
  if (/concrete|plant|boral/i.test(title)) {
    return [
      "Oversaw batching operations and daily concrete production requirements",
      "Monitored plant performance and maintained high operational standards",
      "Planned and scheduled production to meet delivery timelines and business targets",
      "Coordinated quality control, safety procedures, and site reporting",
    ].join("\n");
  }
  if (/supervisor|lead/i.test(title)) {
    return [
      "Supervised site teams and coordinated daily construction activities across active work areas",
      "Managed materials, tools, equipment, and site logistics to maintain productive workflow",
      "Conducted site inspections, proactively identifying hazards and supporting risk reduction initiatives",
      "Maintained WHS compliance and collaborated with subcontractors to ensure safety, deadlines, and quality outcomes",
    ].join("\n");
  }
  return [
    "Performed general labouring duties across residential and commercial construction sites",
    "Assisted with site preparation, setup, clean-up, and safe work environment daily",
    "Supported skilled trades including carpentry, concreting, and electrical work on-site",
    "Handled loading, unloading, and movement of materials, tools, and equipment safely",
    "Followed WHS regulations, PPE requirements, and safe hand and power tool operation",
  ].join("\n");
}

function aiSummary(resume, raw) {
  const role = resume.targetRole || "professional";
  const skillList = (resume.skills || inferSkills(raw) || defaultSkills(role)).split(",").slice(0, 5).join(", ");
  const base = resume.summary || `${titleCase(role)} with practical experience across operations, delivery, teamwork, and quality-focused execution.`;
  return polishSentence(`${base.replace(/\s+/g, " ").split(".").slice(0, 2).join(". ").trim()}. Skilled in ${skillList}. Strong record of reliable delivery, clear communication, and ATS-ready results.`);
}

function aiBullets(value, role, raw) {
  const source = splitLines(value);
  const fallback = [
    `Delivered ${role || "role"} responsibilities with accuracy, ownership, and consistent quality`,
    `Coordinated with team members and stakeholders to maintain workflow and meet deadlines`,
    `Applied relevant tools, safety standards, and process knowledge to support measurable outcomes`,
  ];
  const starters = ["Delivered", "Built", "Improved", "Integrated", "Optimized", "Supported", "Coordinated", "Created"];
  const bullets = uniqueLines(source.length ? source : fallback).slice(0, 5);
  return bullets.map((line, index) => {
    const cleaned = line.replace(/^(responsible for|worked on|helped with|assisted with)\s+/i, "").trim();
    const action = /^[A-Z]/.test(cleaned) ? cleaned : `${starters[index % starters.length]} ${cleaned}`;
    const hasMetric = /\d+|%|deadline|quality|safety|workflow|customer|project/i.test(action);
    return polishSentence(hasMetric ? action : `${action} while improving workflow, quality, and team delivery`);
  }).join("\n");
}

function legacyScoreGeneratedResume(resume) {
  const text = composeResumeText(resume);
  const checks = [
    { label: "Contact details include email", pass: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text), points: 10 },
    { label: "Contact details include phone", pass: /\d{3}[\s-]?\d{3}[\s-]?\d{3,4}/.test(text), points: 10 },
    { label: "All required sections are present", pass: requiredSectionsPresent(text), points: 15 },
    { label: "Experience has ATS-friendly bullets", pass: resume.experience.some((item) => splitLines(item.bullets).length >= 3), points: 14 },
    { label: "Projects are included", pass: resume.projects.some((item) => item.title || item.bullets), points: 10 },
    { label: "Skills include searchable keywords", pass: keywordCount(text) >= 8 || splitSkills(resume.skills).length >= 8, points: 12 },
    { label: "Education is included", pass: resume.education.some((item) => item.degree || item.school), points: 10 },
    { label: "Dates or measurable details are included", pass: /\d{4}|present|current|\d+%/i.test(text), points: 9 },
    { label: "Formatting is ATS safe", pass: !/[â”‚â”Œâ”â””â”˜]/.test(text), points: 10 },
  ];
  const earned = checks.reduce((sum, check) => sum + (check.pass ? check.points : 0), 0);
  const complete = checks.every((check) => check.pass);
  const score = complete ? 99 : Math.min(98, earned);
  return {
    score,
    rating: score >= 99 ? "Excellent. This resume is optimized for the internal ATS checklist." : score >= 85 ? "Strong. Fix the remaining checklist items to reach 99%." : "Needs more content for ATS strength.",
    checks,
  };
}

function scoreRawText(text) {
  const checks = [
    { label: "Email found", pass: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text), points: 15 },
    { label: "Phone found", pass: /\d{3}[\s-]?\d{3}[\s-]?\d{3,4}/.test(text), points: 15 },
    { label: "Has key sections", pass: /summary|experience|skills|education/i.test(text), points: 30 },
    { label: "Has bullet content", pass: splitLines(text).length >= 8, points: 20 },
    { label: "Has searchable keywords", pass: keywordCount(text) >= 5, points: 20 },
  ];
  return {
    score: checks.reduce((sum, check) => sum + (check.pass ? check.points : 0), 0),
    checks,
  };
}

function legacyRequiredSectionsPresent(text) {
  return ["Summary", "Experience", "Projects", "Skills", "Education", "Achievements"].every((section) => text.includes(section));
}

function scoreGeneratedResume(resume) {
  const exportResume = preparePreviewPdfResume(resume);
  const text = composeResumeText(exportResume);
  const metric = metricCoverage(exportResume);
  const repetition = repetitionIssues(exportResume);
  const parsePass = atsParseSafe(exportResume, text);
  const keywordPass = keywordOptimizationPass(exportResume);
  const grammar = grammarIssues(text);
  const checks = [
    { label: "ATS parse rate is 100% with exact single-column headings", pass: parsePass, points: 25 },
    { label: `At least 80% of experience/project bullets include real metrics (${metric.percent}%)`, pass: metric.pass, points: 25 },
    { label: "No repeated bullet starts or near-duplicate bullet meaning", pass: repetition.pass, points: 15 },
    { label: "Spelling, grammar, and technology casing are 100% clean", pass: grammar.pass, points: 15 },
    { label: "Role keywords and categorized skills are present without duplicates", pass: keywordPass, points: 20 },
  ];
  const total = checks.reduce((sum, check) => sum + check.points, 0);
  const earned = checks.reduce((sum, check) => sum + (check.pass ? check.points : 0), 0);
  const strictPass = checks.every((check) => check.pass);
  const rawScore = Math.round((earned / total) * 100);
  const cap = strictPass ? 100 : strictScoreCap({ parsePass, metricPass: metric.pass, repetitionPass: repetition.pass, grammarPass: grammar.pass, keywordPass });
  const score = strictPass ? 100 : Math.min(cap, rawScore);
  const notes = [
    ...metric.missing.slice(0, 5).map((item) => `Add a real measurable result to ${item}.`),
    ...repetition.issues.slice(0, 5),
    ...grammar.issues.slice(0, 5),
  ];
  return {
    score,
    rating: score >= 95
      ? "Strict ATS gates pass. External checker scores can still vary by job description and parser."
      : "Score capped until parse safety, real metrics, repetition, grammar, and keyword gates all pass.",
    checks,
    notes,
  };
}

function requiredSectionsPresent(text) {
  return ["Summary", "Experience", "Projects", "Skills", "Achievements and Certifications", "Education"].every((section) => text.includes(section));
}

function atsParseSafe(resume, text) {
  const sectionOrder = ["Summary", "Experience", "Projects", "Skills", "Achievements and Certifications", "Education"];
  const sectionIndexes = sectionOrder.map((section) => text.indexOf(section));
  return Boolean(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)
      && /\d{3}[\s-]?\d{3}[\s-]?\d{3,4}/.test(text)
      && parseableProfileLinks(resume)
      && sectionIndexes.every((index) => index >= 0)
      && sectionIndexes.every((index, itemIndex) => itemIndex === 0 || index > sectionIndexes[itemIndex - 1])
      && resume.experience.length >= 1
      && resume.experience.some((item) => item.title && item.company && splitLines(item.bullets).length >= 3)
      && resume.education.some((item) => item.degree || item.school)
      && !/[|│┌┐└┘┬┴┼]/.test(text.replace(/\s\|\s/g, " "))
  );
}

function metricCoverage(resume) {
  const items = measurableBulletItems(resume);
  const measured = items.filter((item) => metricBearingBullet(item.text));
  const percent = items.length ? Math.round((measured.length / items.length) * 100) : 0;
  return {
    pass: items.length > 0 && percent >= 80,
    percent,
    missing: items.filter((item) => !metricBearingBullet(item.text)).map((item) => item.label),
  };
}

function measurableBulletItems(resume) {
  const entries = [];
  ensureList(resume.experience, blankExperience()).forEach((item, itemIndex) => {
    splitLines(item.bullets).forEach((line, bulletIndex) => {
      entries.push({ label: `Experience ${itemIndex + 1}, bullet ${bulletIndex + 1}`, text: line });
    });
  });
  if (hasRealProjects(resume)) {
    projectItemsWithLinks(resume).forEach((item, itemIndex) => {
      splitLines(item.bullets).forEach((line, bulletIndex) => {
        entries.push({ label: `Projects ${itemIndex + 1}, bullet ${bulletIndex + 1}`, text: line });
      });
    });
  }
  return entries;
}

function metricBearingBullet(value) {
  return /(?:\b\d+(?:\.\d+)?\+?\b|\d+%|\$|AUD|USD|INR|daily|weekly|monthly|annual|quarterly|multi[- ](?:stage|site|page|user|team|year)|[0-9]+x)/i.test(value);
}

function repetitionIssues(resume) {
  const bullets = measurableBulletItems(resume);
  const starts = new Map();
  const issues = [];
  bullets.forEach((bullet, index) => {
    const start = bullet.text.trim().split(/\s+/).slice(0, 2).join(" ").toLowerCase();
    if (start) {
      if (starts.has(start)) issues.push(`Rewrite ${bullet.label}; it repeats the opening phrase from ${starts.get(start)}.`);
      else starts.set(start, bullet.label);
    }
    bullets.slice(0, index).forEach((previous) => {
      if (textSimilarity(previous.text, bullet.text) >= 0.72) {
        issues.push(`Rewrite ${bullet.label}; it is too similar to ${previous.label}.`);
      }
    });
  });
  return { pass: issues.length === 0, issues };
}

function keywordOptimizationPass(resume) {
  const skills = splitSkills(resume.skills);
  const skillKeys = skills.map(skillKey);
  return Boolean(
    skills.length >= 8
      && skillKeys.length === new Set(skillKeys).size
      && skillGroups(resume.skills).every((group) => SKILL_CATEGORY_ORDER.includes(group.label))
      && (keywordCount(composeResumeText(resume)) >= 8 || roleTailoringScore(resume) >= 5)
  );
}

function strictScoreCap(gates) {
  if (!gates.parsePass) return 79;
  if (!gates.metricPass) return 89;
  if (!gates.repetitionPass || !gates.grammarPass) return 94;
  if (!gates.keywordPass) return 94;
  return 94;
}

function parseableProfileLinks(resume) {
  const linkedin = resume.linkedin || linkByType(resume.links, "linkedin");
  const github = resume.github || linkByType(resume.links, "github");
  return Boolean(!linkedin || /linkedin\.com\/in\//i.test(linkedin)) && Boolean(!github || /github\.com\//i.test(github));
}

function roleTailoringScore(resume) {
  const text = composeResumeText(resume).toLowerCase();
  const webTerms = [
    "frontend",
    "backend",
    "responsive",
    "restful",
    "authentication",
    "database",
    "deployment",
    "git",
    "performance",
    "cross-browser",
    "mern",
  ];
  return webTerms.filter((term) => text.includes(term)).length;
}

function sectionText(text, starts, ends) {
  const lines = text.split("\n");
  const startIndex = lines.findIndex((line) => starts.includes(clean(line)));
  if (startIndex < 0) return "";
  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    if (ends.includes(clean(lines[i]))) {
      endIndex = i;
      break;
    }
  }
  return lines.slice(startIndex + 1, endIndex).join("\n").trim();
}

function parseEntries(text, type) {
  if (!text) return [];
  const lines = logicalResumeLines(text);
  const parsed = [];
  let current = null;

  lines.forEach((line) => {
    const entry = parseEntryHeader(line);
    if (entry) {
      if (current) parsed.push(current);
      current = type === "projects"
        ? { title: entry.title, subtitle: entry.company, dates: entry.dates, bullets: "" }
        : { title: entry.title, company: entry.company, dates: entry.dates, bullets: "" };
      return;
    }

    if (!current || isSectionHeading(line) || isContactLine(line) || isGarbageLine(line)) return;
    const cleaned = cleanBulletLine(line);
    if (!cleaned) return;
    current.bullets = splitLines(`${current.bullets}\n${cleaned}`).slice(0, 5).join("\n");
  });

  if (current) parsed.push(current);
  const useful = parsed.filter((item) => item.title && item.dates && splitLines(item.bullets).length);
  if (useful.length) return useful.slice(0, 6);

  const chunks = [];
  let chunk = [];

  lines.forEach((line) => {
    const heading = /^[A-Z][A-Za-z0-9 /&().-]{3,}$/.test(line) && !line.endsWith(".");
    if (heading && chunk.length >= 3) {
      chunks.push(chunk);
      chunk = [line];
    } else {
      chunk.push(line);
    }
  });
  if (chunk.length) chunks.push(chunk);

  return chunks.slice(0, 5).map((chunk) => {
    const dates = (chunk.join(" ").match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*(?:19|20)\d{2}\s*(?:--|-|to)?\s*(?:Present|Current|(?:19|20)\d{2})?/i) || [""])[0];
    const bullets = chunk.slice(2).filter((line) => line !== dates).map(cleanBulletLine).filter(Boolean).slice(0, 5).join("\n");
    return type === "projects"
      ? { title: chunk[0] || "Project", subtitle: chunk[1] || "Relevant tools and delivery", dates, bullets }
      : { title: chunk[0] || "Role", company: chunk[1] || "Company / Location", dates, bullets };
  });
}

function logicalResumeLines(value) {
  let text = String(value || "")
    .replace(/\r/g, "\n")
    .replace(/[â€“â€”]/g, " - ")
    .replace(/[â€¢â—â–ª]/g, "\n")
    .replace(/\s+/g, " ")
    .replace(/\s+(PROFESSIONAL SUMMARY|PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|CONSTRUCTION EXPERIENCE|SKILLS|LICENCES AND CERTIFICATIONS|LICENSES AND CERTIFICATIONS|EDUCATION|ACHIEVEMENTS|PROJECTS)\s+/g, "\n$1\n")
    .replace(/\s+((?:Construction|Concrete|Site|General|Project|Data|Software|Frontend|Customer|Business|Administrative|Warehouse|Retail)[A-Za-z /&()-]{2,70}\s*\|\s*[^|\n]{2,90}\s*\|\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*\d{4}\s*(?:-|to)\s*(?:Present|Current|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*\d{4}))\s+/gi, "\n$1\n")
    .replace(/\s+((?:Construction|Concrete|Site|General|Project|Data|Software|Frontend|Customer|Business|Administrative|Warehouse|Retail)[A-Za-z /&()-]{2,70}\s*\|\s*[^|\n]{2,90}\s*\|\s*(?:19|20)\d{2})\s+/gi, "\n$1\n");

  return text
    .split(/\n+/)
    .map((line) => line.replace(/\s{2,}/g, " ").trim())
    .flatMap((line) => splitDenseResumeLine(line))
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitDenseResumeLine(line) {
  if (line.length < 180) return [line];
  return line
    .replace(/\s+(?=(?:Performed|Assisted|Supported|Handled|Followed|Managed|Maintained|Conducted|Monitored|Planned|Oversaw|Coordinated|Supervised|Ensured|Delivered|Developed)\b)/g, "\n")
    .split("\n")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseEntryHeader(line) {
  const match = line.match(/^(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)$/);
  if (!match) return null;
  const dates = cleanDateRange(match[3]);
  if (!/\d{4}|present|current/i.test(dates)) return null;
  if (!/labou?r|construction|supervisor|manager|engineer|analyst|developer|assistant|service|operator|driver|coordinator|specialist/i.test(match[1])) return null;
  return {
    title: titleCase(match[1].trim()),
    company: match[2].trim(),
    dates,
  };
}

function cleanDateRange(value) {
  return String(value || "")
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s+/g, " ")
    .replace(/\bcurrent\b/i, "Present")
    .trim();
}

function cleanBulletLine(line) {
  const cleaned = String(line || "")
    .replace(/^[*-]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.length < 18 || cleaned.length > 190) return "";
  if (isContactLine(cleaned) || isSectionHeading(cleaned) || isGarbageLine(cleaned)) return "";
  return cleaned.replace(/[â–¡ï¿½]/g, "").trim();
}

function isContactLine(line) {
  return /@|\+?\d[\d\s()-]{7,}|linkedin|github|gmail\.com|melbourne vic,\s*\d{4}/i.test(line);
}

function isSectionHeading(line) {
  return /^(professional summary|summary|professional experience|experience|work experience|construction experience|skills|education|licences and certifications|licenses and certifications|achievements|projects)$/i.test(line.trim());
}

function isGarbageLine(line) {
  return /^(client resume|professional summary|professional experience)$/i.test(line.trim()) || /^[|,\s]+$/.test(line);
}

function parseEducation(text) {
  if (!text) return [];
  const lines = logicalResumeLines(text).filter((line) => !isSectionHeading(line) && !isContactLine(line));
  const dates = (text.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*(?:19|20)\d{2}\s*(?:-|to)?\s*(?:Present|Current|(?:19|20)\d{2})?/i) || [""])[0];
  return [{ degree: lines[0] || "", school: lines[1] || "", dates: cleanDateRange(dates) }];
}

function inferredExperience(resume, raw) {
  return {
    title: resume.targetRole || "Experience",
    company: "Client Resume",
    dates: (raw.match(/(19|20)\d{2}\s*(--|-|to)?\s*((19|20)\d{2}|present)?/i) || ["2024 -- Present"])[0],
    bullets: splitLines(raw).slice(0, 4).join("\n"),
  };
}

function inferredProject(resume, raw) {
  return {
    title: `${resume.targetRole || "Professional"} Delivery Project`,
    subtitle: "Relevant tools, teamwork, and measurable outcomes",
    dates: "Recent",
    bullets: splitLines(raw).slice(4, 7).join("\n") || "Delivered structured work with quality, communication, and measurable progress",
  };
}

function inferredEducation(raw) {
  return {
    degree: /degree|bachelor|master|diploma|university/i.test(raw) ? "Education listed in uploaded resume" : "Education / Certification",
    school: "Institution from uploaded resume",
    dates: (raw.match(/(19|20)\d{2}\s*(--|-|to)?\s*((19|20)\d{2}|present)?/i) || [""])[0],
  };
}

function inferAchievements(raw, role) {
  const certifications = [
    "White Card",
    "Forklift Licence",
    "Elevated Work Platform",
    "EWP",
    "High Risk Licence",
    "Dogging Licence",
    "Telehandler",
    "Traffic Control",
    "Traffic Management",
    "Order Picker Licence",
    "Boom Lift Licence",
    "First Aid",
    "CPR",
    "Driver Licence",
    "AWS",
    "Azure",
    "PMP",
  ].filter((item) => raw.toLowerCase().includes(item.toLowerCase()));
  return certifications.length
    ? Array.from(new Set(certifications.map((item) => item === "EWP" ? "Elevated Work Platform (EWP)" : item))).join(", ")
    : `Recognised for reliable ${role || "professional"} delivery, teamwork, safety, and quality-focused results`;
}

function certificationsFromText(value) {
  return parseSkillItems(value)
    .filter(Boolean)
    .map((title) => ({ ...blankCertification(), title }));
}

function inferRole(text) {
  const roles = ["Software Engineer", "Construction Labourer", "Project Manager", "Data Analyst", "Frontend Developer", "Customer Service", "Business Analyst", "Administrative Assistant"];
  return roles.find((role) => text.toLowerCase().includes(role.toLowerCase())) || "";
}

function inferSkills(text) {
  if (isConstructionResume(text)) {
    return [
      "Site Supervision and Daily Operations",
      "WHS Compliance and Safety Inspections",
      "Construction Labouring",
      "Site Preparation and Clean-up",
      "Material Handling",
      "Hand and Power Tools",
      "Subcontractor Coordination",
      "Construction Scheduling and Progress Tracking",
      "Risk Identification and Hazard Management",
      "Site Documentation and Reporting",
      "Leadership and Team Management",
      "Strong Communication and Stakeholder Management",
      "Quality Outcomes",
    ].join(", ");
  }
  const words = ["Leadership", "Communication", "Project Management", "JavaScript", "React", "Python", "SQL", "Safety", "WHS", "Teamwork", "Time Management", "Problem Solving", "Material Handling", "Data Analysis", "Customer Service", "Quality Assurance", "Microsoft Office"];
  return words.filter((word) => text.toLowerCase().includes(word.toLowerCase())).join(", ");
}

function defaultSkills(role) {
  if (/construction|labour/i.test(role)) return "Construction Labouring, Site Preparation, Safety Compliance, Material Handling, Teamwork, Time Management, Hazard Awareness, Tools";
  if (/software|developer|engineer/i.test(role)) return "Languages: JavaScript, HTML, CSS, SQL\nFrontend: React.js, Responsive Design\nBackend: Node.js, Express.js, REST APIs, Debugging\nDatabase: MongoDB\nTools: Git, GitHub, Agile, Testing, Deployment";
  return "Communication, Teamwork, Problem Solving, Time Management, Quality, Documentation, Stakeholder Support, Delivery";
}

function keywordCount(text) {
  const words = ["managed", "created", "built", "improved", "delivered", "supported", "coordinated", "developed", "implemented", "full stack developer", "mern", "rest api", "agile", "debugging", "scalable systems", "frontend", "backend", "safety", "customer", "project", "team", "tools", "analysis", "quality", "workflow", "deadline"];
  return words.filter((word) => text.toLowerCase().includes(word)).length;
}

function legacyComposeResumeText(resume) {
  return [
    resume.name,
    resume.phone,
    resume.email,
    "Summary",
    resume.summary,
    "Experience",
    ...resume.experience.flatMap((item) => [item.title, item.company, item.dates, item.bullets]),
    "Projects",
    ...resume.projects.flatMap((item) => [item.title, item.subtitle, item.dates, item.bullets]),
    "Skills",
    resume.skills,
    "Education",
    ...resume.education.flatMap((item) => [item.degree, item.school, item.dates]),
    "Achievements",
    resume.achievements,
  ].filter(Boolean).join("\n");
}

function composeResumeText(resume) {
  const projects = projectItemsWithLinks(resume);
  const parts = [
    resume.name,
    ...contactLinks(resume),
    "Summary",
    resume.summary,
    "Experience",
    ...resume.experience.flatMap((item) => [item.title, item.company, dateRange(item), item.bullets]),
    "Projects",
    ...projects.flatMap((item) => [item.title, item.link, item.subtitle, dateRange(item), item.bullets]),
    "Skills",
    ...skillCategoryLines(resume.skills),
    "Achievements and Certifications",
    resume.achievements,
    ...certificationText(resume),
    "Education",
    ...resume.education.flatMap((item) => [item.degree, item.school, dateRange(item)]),
  ];
  return parts.filter(Boolean).join("\n");
}

function downloadLatex() {
  const blob = new Blob([generateLatex(state.resume)], { type: "application/x-tex;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${slug(state.resume.name || "resume")}.tex`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function downloadDoc() {
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${safe(state.resume.name || "Resume")}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #111; line-height: 1.25; }
    h1 { text-align: center; font-size: 22pt; margin: 0 0 2pt; }
    .contact { text-align: center; font-size: 10pt; margin: 0 0 14pt; }
    h2 { font-size: 12pt; text-transform: uppercase; border-bottom: 1px solid #111; margin: 12pt 0 5pt; }
    p { margin: 0 0 6pt; }
    .row { display: flex; justify-content: space-between; font-weight: bold; }
    ul { margin: 2pt 0 8pt 18pt; padding: 0; }
  </style>
</head>
<body>${previewTemplate(state.resume)}</body>
</html>`;
  downloadBlob(html, `${slug(state.resume.name || "resume")}.doc`, "application/msword;charset=utf-8");
}

async function downloadPdf(button) {
  const jsPDF = window.jspdf?.jsPDF;

  if (!jsPDF) {
    downloadDoc();
    return;
  }

  const originalText = button?.textContent;
  if (button) {
    button.disabled = true;
    button.textContent = "Preparing PDF...";
  }

  try {
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    writeTextResumePdf(doc, state.resume);
    doc.save(`${slug(state.resume.name || "resume")}.pdf`);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText || "Download PDF";
    }
  }
}

function writeTextResumePdf(doc, resume) {
  const baseResume = preparePreviewPdfResume(resume);
  const heightLimit = doc.internal.pageSize.getHeight() - 34;
  let renderResume = baseResume;
  let scale = bestOnePageScale(doc, renderResume, heightLimit);
  let measured = renderTextResumePdf(doc, renderResume, scale, true);
  if (measured > heightLimit) {
    renderResume = squeezeOnePageResume(renderResume);
    scale = bestOnePageScale(doc, renderResume, heightLimit);
  }

  renderTextResumePdf(doc, renderResume, scale, false);
}

function bestOnePageScale(doc, resume, heightLimit) {
  let low = 0.72;
  let high = 1.65;
  let best = low;

  for (let index = 0; index < 18; index += 1) {
    const mid = (low + high) / 2;
    const measured = renderTextResumePdf(doc, resume, mid, true);
    if (measured <= heightLimit) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  return Math.max(0.72, Math.min(1.65, best * 0.985));
}

function renderTextResumePdf(doc, resume, scale = 1, dryRun = false) {
  const page = {
    width: doc.internal.pageSize.getWidth(),
    height: doc.internal.pageSize.getHeight(),
    marginX: 42,
    marginTop: 42,
    marginBottom: 34,
  };
  page.contentWidth = page.width - page.marginX * 2;

  const cursor = { y: page.marginTop };
  const size = (value) => value * scale;
  const setFont = (style = "normal", fontSize = 9) => {
    doc.setFont("times", style);
    doc.setFontSize(size(fontSize));
  };
  const drawText = (text, x, y, options) => {
    if (!dryRun) doc.text(text, x, y, options);
  };
  const drawLine = (x1, y1, x2, y2) => {
    if (!dryRun) doc.line(x1, y1, x2, y2);
  };
  const addText = (text, options = {}) => {
    if (!hasMeaningfulText(text)) return;
    const fontSize = options.size || 9.2;
    const lineHeight = size(options.lineHeight || fontSize * 1.18);
    const indent = size(options.indent || 0);
    const x = page.marginX + indent;
    const maxWidth = page.contentWidth - indent;
    setFont(options.style || "normal", fontSize);
    doc.splitTextToSize(pdfText(text), maxWidth).forEach((line) => {
      drawText(line, x, cursor.y);
      cursor.y += lineHeight;
    });
    cursor.y += size(options.after || 0);
  };
  const addPair = (left, right = "", options = {}) => {
    if (!hasMeaningfulText(left) && !hasMeaningfulText(right)) return;
    const fontSize = options.size || 9.2;
    const lineHeight = size(options.lineHeight || fontSize * 1.15);
    const rightText = pdfText(right);
    setFont(options.style || "bold", fontSize);
    const rightWidth = rightText ? doc.getTextWidth(rightText) : 0;
    const rightIsShortDate = Boolean(rightText && /^(?:[A-Z][a-z]{2}\s+)?\d{4}(?:\s*-\s*(?:Present|(?:[A-Z][a-z]{2}\s+)?\d{4}))?$/.test(rightText) && rightWidth <= size(122));
    const rightFitsColumn = Boolean(options.allowRightColumn && rightText && rightWidth <= page.contentWidth * 0.52);
    const useRightColumn = rightIsShortDate || rightFitsColumn;
    const leftMax = useRightColumn ? page.contentWidth - rightWidth - size(18) : page.contentWidth;
    doc.splitTextToSize(pdfText(left), Math.max(size(210), leftMax)).forEach((line, index) => {
      drawText(line, page.marginX, cursor.y);
      if (index === 0 && useRightColumn) drawText(rightText, page.width - page.marginX, cursor.y, { align: "right" });
      cursor.y += lineHeight;
    });
    if (rightText && !useRightColumn) {
      addText(rightText, { style: "normal", size: fontSize - 0.4, lineHeight: fontSize * 1.12, after: 1 });
    }
    cursor.y += size(options.after || 0);
  };
  const addSection = (title) => {
    cursor.y += size(10);
    setFont("bold", 12);
    drawText(pdfText(title).toUpperCase(), page.marginX, cursor.y);
    cursor.y += size(4.2);
    doc.setLineWidth(size(0.65));
    drawLine(page.marginX, cursor.y, page.width - page.marginX, cursor.y);
    cursor.y += size(9);
  };
  const addBullets = (value, max = 4) => {
    splitLines(value).slice(0, max).forEach((line) => addText(`• ${line}`, { indent: 14, size: 9.1, lineHeight: 10.7, after: 1 }));
  };

  setFont("bold", 22);
  drawText(pdfText(displayName(resume.name || "Your Name")), page.width / 2, cursor.y, { align: "center" });
  cursor.y += size(12.5);
  const contact = contactLinks(resume).map(pdfText).join("  ");
  if (contact) {
    setFont("normal", 8.1);
    doc.splitTextToSize(contact, page.contentWidth).slice(0, 2).forEach((line) => {
      drawText(line, page.width / 2, cursor.y, { align: "center" });
      cursor.y += size(8.7);
    });
  }
  cursor.y += size(5);

  addSection("Summary");
  addText(resume.summary, { size: 9.2, lineHeight: 10.7, after: 2 });

  addSection("Experience");
  ensureList(resume.experience, blankExperience()).filter((item) => item.title || item.company || item.bullets).forEach((item, index) => {
    addPair(item.title || "Role", dateRange(item), { size: 9.25 });
    if (item.company) addText(item.company, { style: "bold", size: 9.1, lineHeight: 10.3, after: 1 });
    addBullets(item.bullets, index === 0 ? 4 : 3);
    cursor.y += size(3.5);
  });

  const projects = projectItemsWithLinks(resume);
  addSection("Projects");
  projects.forEach((item) => {
    const title = item.link ? `${item.title} (${item.link})` : item.title;
    addPair(title || "Project", dateRange(item), { size: 9.15 });
    if (item.subtitle) addText(item.subtitle, { size: 9, lineHeight: 10.2, after: 1 });
    addBullets(item.bullets, 2);
    cursor.y += size(3);
  });

  addSection("Skills");
  skillCategoryLines(resume.skills).slice(0, 6).forEach((line) => addText(`• ${line}`, { size: 9, lineHeight: 10.5, indent: 14, after: 0.8 }));

  addSection("Achievements and Certifications");
  splitLines(resume.achievements).slice(0, 4).forEach((line) => addText(`• ${line}`, { size: 9, lineHeight: 10.5, indent: 14, after: 0.8 }));
  certificationText(resume).slice(0, 4).forEach((line) => addText(`• ${pdfText(line).replace(/\s+\|\s+/g, ", ")}`, { style: "bold", size: 9.1, lineHeight: 10.4, indent: 14, after: 1 }));

  addSection("Education");
  ensureList(resume.education, blankEducation()).filter((item) => item.degree || item.school).slice(0, 3).forEach((item) => {
    const left = `${item.school || "Institution"}${dateRange(item) ? ` (${dateRange(item)})` : ""}`;
    addPair(left, item.degree || "Degree / Course", { size: 9.1, lineHeight: 10.4, allowRightColumn: true });
    cursor.y += size(1.5);
  });

  return cursor.y;
}

function preparePreviewPdfResume(resume) {
  const prepared = polishResumeContent(clone(resume));
  const usedStarts = new Map();
  prepared.summary = compactText(prepared.summary, 52);
  prepared.experience = ensureList(prepared.experience, blankExperience())
    .filter((item) => item.title || item.company || item.bullets)
    .slice(0, 2)
    .map((item) => ({
      ...item,
      bullets: compactBulletBlock(item.bullets, 4, usedStarts),
    }));
  prepared.projects = projectItemsWithLinks(prepared)
    .filter((item) => item.title || item.subtitle || item.bullets)
    .slice(0, 3)
    .map((item) => ({
      ...item,
      subtitle: removeProjectLinkText(item.subtitle),
      bullets: compactBulletBlock(item.bullets, 2, usedStarts),
    }));
  prepared.skills = compactPreviewSkills(prepared.skills);
  prepared.certifications = compactCertifications(prepared);
  prepared.education = ensureList(prepared.education, blankEducation())
    .filter((item) => item.degree || item.school)
    .slice(0, 2);
  return prepared;
}

function squeezeOnePageResume(resume) {
  const squeezed = clone(resume);
  squeezed.summary = compactText(squeezed.summary, 34);
  squeezed.experience = ensureList(squeezed.experience, blankExperience()).slice(0, 1).map((item) => ({
    ...item,
    bullets: compactBulletBlock(item.bullets, 3, new Map()),
  }));
  squeezed.projects = ensureList(squeezed.projects, blankProject()).slice(0, 3).map((item) => ({
    ...item,
    subtitle: compactText(item.subtitle, 7),
    bullets: compactBulletBlock(item.bullets, 1, new Map()),
  }));
  squeezed.skills = skillGroups(squeezed.skills)
    .slice(0, 5)
    .map((group) => `${group.label}: ${group.items.slice(0, 6).join(", ")}`)
    .join("\n");
  squeezed.certifications = ensureList(squeezed.certifications, blankCertification()).slice(0, 2);
  squeezed.education = ensureList(squeezed.education, blankEducation()).slice(0, 2);
  return squeezed;
}

function pdfText(value) {
  return String(value || "")
    .replace(/[•●▪]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .trim();
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function legacyGenerateLatex(resume) {
  return `\\documentclass[a4paper,10pt]{article}
\\usepackage[margin=0.6in]{geometry}
\\usepackage{titlesec}
\\usepackage[hidelinks]{hyperref}
\\usepackage{parskip}

\\titleformat{\\section}{\\bfseries\\large}{}{0em}{}[\\titlerule]

\\begin{document}

\\begin{center}
    {\\LARGE \\textbf{${tex(displayName(exportResume.name))}}} \\\\
    ${tex([resume.phone, resume.email, resume.links].filter(Boolean).join(" | "))}
\\end{center}

\\section*{Summary}
${tex(resume.summary)}

\\section*{Experience}
${resume.experience.map((item) => `\\textbf{${tex(item.title)}} \\hfill ${tex(item.dates)} \\\\
${tex(item.company)}
${latexBullets(item.bullets)}`).join("\n\n")}

\\section*{Projects}
${resume.projects.map((item) => `\\textbf{${tex(item.title)}} \\hfill ${tex(item.dates)} \\\\
${tex(item.subtitle)}
${latexBullets(item.bullets)}`).join("\n\n")}

\\section*{Skills}
${tex(resume.skills)}

\\section*{Education}
${resume.education.map((item) => `${tex(item.degree)} \\\\
${tex(item.school)} \\hfill ${tex(item.dates)}`).join("\n\n")}

\\section*{Achievements}
${tex(resume.achievements)}

\\end{document}
`;
}

function generateLatex(resume) {
  const exportResume = polishResumeContent(clone(resume));
  const projects = projectItemsWithLinks(exportResume);
  const achievementLines = [
    ...splitLines(exportResume.achievements),
    ...certificationText(exportResume).map((item) => item.replace(/\s+\|\s+/g, ", ")),
  ].join("\n");
  const educationLines = exportResume.education.map((item) => `\\textbf{${tex(item.school || "Institution")}} \\hfill ${tex(item.degree || "Degree / Course")} \\\\\n\\textit{${tex(dateRange(item))}}`).join("\n\n");

  return `\\documentclass[a4paper,10pt]{article}
\\usepackage[margin=0.6in]{geometry}
\\usepackage{titlesec}
\\usepackage[hidelinks]{hyperref}
\\usepackage{parskip}

\\titleformat{\\section}{\\bfseries\\large}{}{0em}{}[\\titlerule]

\\begin{document}

\\begin{center}
    {\\LARGE \\textbf{${tex(displayName(resume.name))}}} \\\\
    ${tex(contactLinks(exportResume).join(" | "))}
\\end{center}

\\section*{Summary}
${tex(exportResume.summary)}

\\section*{Experience}
${exportResume.experience.map((item) => `\\textbf{${tex(item.title)}} \\hfill ${tex(dateRange(item))} \\\\\n${tex(item.company)}\n${latexBullets(item.bullets)}`).join("\n\n")}

\\section*{Projects}
${projects.map((item) => `\\textbf{${tex(item.link ? `${item.title} (${item.link})` : item.title)}} \\hfill ${tex(dateRange(item))} \\\\\n${tex(item.subtitle)}\n${latexBullets(item.bullets)}`).join("\n\n")}

\\section*{Skills}
${latexBullets(skillCategoryLines(exportResume.skills).join("\n"))}

\\section*{Achievements and Certifications}
${latexBullets(achievementLines)}

\\section*{Education}
${educationLines}

\\end{document}
`;
}

function latexBullets(value) {
  const bullets = splitLines(value);
  if (!bullets.length) return "";
  return `\\begin{itemize}\n${bullets.map((item) => `    \\item ${tex(item)}`).join("\n")}\n\\end{itemize}`;
}

function bulletList(value) {
  const bullets = splitLines(value);
  return bullets.length ? `<ul>${bullets.map((item) => `<li>${safe(item)}</li>`).join("")}</ul>` : "";
}

function splitLines(value) {
  return String(value || "").split(/\n|;/).map((line) => line.replace(/^[*-]\s*/, "").trim()).filter(Boolean);
}

function legacyNormalizeText(value) {
  return value.replace(/\r/g, "").replace(/[â€¢â—]/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\r/g, "\n")
    .replace(/[â€¢â—â–ª]/g, "\n")
    .replace(/[â€“â€”]/g, " - ")
    .replace(/^(PROFESSIONAL SUMMARY|PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|CONSTRUCTION EXPERIENCE|SKILLS|LICENCES AND CERTIFICATIONS|LICENSES AND CERTIFICATIONS|EDUCATION|ACHIEVEMENTS|PROJECTS)\s+/i, "$1\n")
    .replace(/\s+(PROFESSIONAL SUMMARY|PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|CONSTRUCTION EXPERIENCE|SKILLS|LICENCES AND CERTIFICATIONS|LICENSES AND CERTIFICATIONS|EDUCATION|ACHIEVEMENTS|PROJECTS)\s+/g, "\n$1\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function clean(value) {
  return value.toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
}

function lineSet(count) {
  return Array.from({ length: count }, (_, index) => `<i style="--w:${42 + ((index * 19) % 48)}%"></i>`).join("");
}

function resumeSkeleton() {
  return `<b></b>${lineSet(3)}<hr>${lineSet(4)}<hr>${lineSet(3)}`;
}

function blankResume() {
  return {
    id: createId(),
    name: "",
    phone: "",
    email: "",
    linkedin: "",
    github: "",
    links: "",
    targetRole: "",
    summary: "",
    skills: "",
    achievements: "",
    certifications: [blankCertification()],
    experience: [blankExperience()],
    projects: [blankProject()],
    education: [blankEducation()],
    rawText: "",
    updatedAt: Date.now(),
  };
}

function blankByType(type) {
  if (type === "experience") return blankExperience();
  if (type === "projects") return blankProject();
  if (type === "certifications") return blankCertification();
  return blankEducation();
}

function blankExperience() {
  return { title: "", company: "", dates: "", startDate: "", endDate: "", current: false, bullets: "" };
}

function blankProject() {
  return { title: "", subtitle: "", dates: "", startDate: "", endDate: "", current: false, bullets: "" };
}

function blankEducation() {
  return { degree: "", school: "", dates: "", startDate: "", endDate: "", current: false };
}

function blankCertification() {
  return { title: "", issuer: "", dates: "", startDate: "", endDate: "", current: false };
}

function loadResume() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || clone(sampleResume);
    return hydrateResume(stored);
  } catch {
    clearSavedResume();
    return hydrateResume(clone(sampleResume));
  }
}

function hydrateResume(resume) {
  resume = resume && typeof resume === "object" && !Array.isArray(resume) ? resume : clone(sampleResume);
  resume.linkedin = resume.linkedin || linkByType(resume.links, "linkedin");
  resume.github = resume.github || linkByType(resume.links, "github");
  resume.links = otherLinks(resume);
  resume.experience = ensureList(resume.experience, blankExperience()).map(hydrateDateItem);
  resume.projects = ensureList(resume.projects, blankProject()).map(hydrateDateItem);
  resume.education = ensureList(resume.education, blankEducation()).map(hydrateDateItem);
  resume.certifications = ensureList(resume.certifications || certificationsFromText(resume.achievements), blankCertification()).map(hydrateDateItem);
  return polishResumeContent(resume);
}

function polishResumeContent(resume) {
  resume.summary = tailorSummary(polishSentence(resume.summary), resume);
  resume.skills = ensureRoleSkills(polishTechText(resume.skills), resume);
  resume.achievements = polishLineBlock(resume.achievements);
  const usedStarts = new Map();
  resume.experience = ensureList(resume.experience, blankExperience()).map((item) => ({
    ...item,
    title: polishTechText(item.title),
    company: polishTechText(item.company),
    bullets: polishBulletBlock(item.bullets, usedStarts),
  }));
  resume.projects = ensureList(resume.projects, blankProject()).map((item) => ({
    ...item,
    title: polishTechText(item.title),
    subtitle: polishTechText(item.subtitle),
    bullets: polishBulletBlock(item.bullets, usedStarts),
  }));
  resume.certifications = ensureList(resume.certifications, blankCertification()).map((item) => ({
    ...item,
    title: polishTechText(item.title),
    issuer: polishTechText(item.issuer),
  }));
  resume.education = ensureList(resume.education, blankEducation()).map((item) => ({
    ...item,
    degree: polishTechText(item.degree),
    school: polishTechText(item.school),
  }));
  return enforceResumeQuality(resume);
}

function polishBulletBlock(value, usedStarts = new Map()) {
  const bullets = uniqueLines(splitBulletCandidates(value).map(polishSentence))
    .slice(0, 5)
    .map((line) => diversifyBulletStart(line, usedStarts));
  return enforceUniqueBulletStarts(bullets).join("\n");
}

function polishLineBlock(value) {
  return uniqueLines(splitLines(value).map(polishSentence))
    .join("\n");
}

function uniqueLines(lines) {
  const accepted = [];
  const seen = new Set();
  return lines.map((line) => String(line || "").trim()).filter((line) => {
    if (!line) return false;
    const key = line.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ").filter((word) => word.length > 3).slice(0, 9).join(" ");
    if (seen.has(key)) return false;
    if (accepted.some((item) => textSimilarity(item, line) >= 0.72)) return false;
    seen.add(key);
    accepted.push(line);
    return true;
  });
}

function splitBulletCandidates(value) {
  return splitLines(value)
    .flatMap((line) => String(line || "")
      .replace(/([a-z0-9])\.([A-Z])/g, "$1. $2")
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .map((item) => item.replace(/^[*-]\s*/, "").trim()))
    .filter(Boolean);
}

function enforceResumeQuality(resume) {
  const globalStarts = new Map();
  const globalBullets = [];
  resume.experience = ensureList(resume.experience, blankExperience()).map((item) => ({
    ...item,
    bullets: sanitizeBulletBlock(item.bullets, globalStarts, globalBullets),
  }));
  resume.projects = ensureList(resume.projects, blankProject()).map((item) => ({
    ...item,
    bullets: sanitizeBulletBlock(item.bullets, globalStarts, globalBullets),
  }));
  resume.skills = uniqueSkillLines(resume.skills);
  resume.achievements = polishLineBlock(resume.achievements);
  resume.certifications = uniqueCertifications(ensureList(resume.certifications, blankCertification()));
  return resume;
}

function sanitizeBulletBlock(value, usedStarts, acceptedBullets) {
  const lines = splitBulletCandidates(value)
    .map(polishSentence)
    .filter((line) => !acceptedBullets.some((existing) => textSimilarity(existing, line) >= 0.72));
  const unique = uniqueLines(lines)
    .slice(0, 5)
    .map((line) => diversifyBulletStart(line, usedStarts));
  const finalLines = enforceUniqueBulletStarts(unique);
  acceptedBullets.push(...finalLines);
  return finalLines.join("\n");
}

function enforceUniqueBulletStarts(lines) {
  const starts = new Set();
  const replacements = ["Engineered", "Implemented", "Optimized", "Delivered", "Developed", "Integrated", "Enhanced", "Configured", "Launched", "Streamlined", "Resolved", "Automated"];
  return lines.map((line, index) => {
    const match = String(line || "").match(/^([A-Z][a-z]+)\b(.*)$/);
    if (!match) return line;
    const start = match[1].toLowerCase();
    if (!starts.has(start)) {
      starts.add(start);
      return line;
    }
    const replacement = replacements.find((word) => !starts.has(word.toLowerCase())) || `${match[1]}-${index + 1}`;
    starts.add(replacement.toLowerCase());
    return `${replacement}${match[2]}`;
  });
}

function uniqueCertifications(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = clean([item.title, item.issuer].filter(Boolean).join(" "));
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function prepareOnePageResume(resume) {
  const prepared = polishResumeContent(clone(resume));
  prepared.summary = compactText(prepared.summary, 44);

  const usedStarts = new Map();
  prepared.experience = ensureList(prepared.experience, blankExperience())
    .filter((item) => item.title || item.company || item.bullets)
    .slice(0, 2)
    .map((item, index) => ({
      ...item,
      bullets: compactBulletBlock(item.bullets, index === 0 ? 4 : 2, usedStarts),
    }));

  prepared.projects = projectItemsWithLinks(prepared)
    .filter((item) => item.title || item.subtitle || item.bullets)
    .slice(0, 3)
    .map((item) => ({
      ...item,
      subtitle: compactText(removeProjectLinkText(item.subtitle), 10),
      bullets: compactBulletBlock(item.bullets, 1, usedStarts),
    }));

  prepared.skills = compactSkills(prepared.skills);
  prepared.certifications = compactCertifications(prepared);
  prepared.education = ensureList(prepared.education, blankEducation())
    .filter((item) => item.degree || item.school)
    .slice(0, 2);
  return prepared;
}

function compactText(value, maxWords = 40) {
  const words = polishSentence(value).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ").replace(/[.,;:]+$/, "")}.`;
}

function compactBulletBlock(value, limit = 4, usedStarts = new Map()) {
  return uniqueLines(splitBulletCandidates(value).map((line) => compactText(line, 24)))
    .slice(0, limit)
    .map((line) => diversifyBulletStart(line, usedStarts))
    .join("\n");
}

function compactSkills(value) {
  const allowed = new Set(SKILL_CATEGORY_ORDER);
  return skillGroups(value)
    .filter((group) => allowed.has(group.label))
    .map((group) => `${group.label}: ${group.items.slice(0, 8).join(", ")}`)
    .slice(0, 5)
    .join("\n");
}

function compactPreviewSkills(value) {
  return skillGroups(value)
    .map((group) => `${group.label}: ${group.items.slice(0, 10).join(", ")}`)
    .slice(0, 5)
    .join("\n");
}

function compactCertifications(resume) {
  const certs = certificationText(resume)
    .map((line) => pdfText(line).replace(/\s+\|\s+/g, ", "))
    .filter(Boolean);
  const unique = uniqueLines(certs).slice(0, 3);
  resume.certifications = unique.map((title) => ({ ...blankCertification(), title }));
  resume.achievements = unique.join("\n");
  return resume.certifications;
}

function textSimilarity(a, b) {
  const left = keywordSet(a);
  const right = keywordSet(b);
  if (!left.size || !right.size) return 0;
  const overlap = Array.from(left).filter((word) => right.has(word)).length;
  return overlap / Math.min(left.size, right.size);
}

function keywordSet(value) {
  return new Set(String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9+# ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !["with", "using", "through", "including", "applications", "website"].includes(word)));
}

function polishSentence(value) {
  const text = polishTechText(value)
    .replace(/\s+/g, " ")
    .replace(/([a-z0-9])\.([A-Z])/g, "$1. $2")
    .replace(/([a-z0-9]),([A-Z])/g, "$1, $2")
    .replace(/([a-z0-9]);([A-Z])/g, "$1; $2")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\b(\w+)\s+\1\b/gi, "$1")
    .replace(/\bover\s+1\s+year\s+of\s+expertise\b/gi, "1+ year of experience")
    .replace(/\bover\s+1\s+year\s+of\s+experience\b/gi, "1+ year of experience")
    .replace(/\bwith\s+over\s+1\s+year\b/gi, "with 1+ year")
    .replace(/\b(\d+)\s*\+\s*years?\b/gi, "$1+ years")
    .replace(/\bexperiance\b/gi, "experience")
    .replace(/\bexprience\b/gi, "experience")
    .replace(/\bdevelopement\b/gi, "development")
    .replace(/\bmanagment\b/gi, "management")
    .replace(/\bauthetication\b/gi, "authentication")
    .replace(/\bauthentification\b/gi, "authentication")
    .replace(/\bscalable\s+system\b/gi, "scalable systems")
    .replace(/\buser[- ]friendly websites\b/gi, "responsive web applications")
    .replace(/\bsecure payment processing features\b/gi, "payment processing features")
    .replace(/\s*aligned with business requirements\.?$/gi, "")
    .replace(/\bdelivering scalable web solutions aligned with business requirements\b/gi, "delivering scalable web applications")
    .replace(/\bperformance optimization, and\b/gi, "performance optimization and")
    .replace(/\butiliz(?:e|ing|ed)\b/gi, (match) => ({ utilize: "use", utilizing: "using", utilized: "used" }[match.toLowerCase()] || match))
    .replace(/\bteh\b/gi, "the")
    .replace(/\brecieve\b/gi, "receive")
    .replace(/\bseperate\b/gi, "separate")
    .replace(/\bdefinately\b/gi, "definitely")
    .replace(/\bJavascript\b/g, "JavaScript")
    .trim();
  if (!text) return "";
  const sentence = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function polishTechText(value) {
  return String(value || "")
    .replace(/\breact\.?js\b/gi, "React.js")
    .replace(/\bnode\.?js\b/gi, "Node.js")
    .replace(/\bexpress\.?js\b/gi, "Express.js")
    .replace(/\breact\s*js\b/gi, "React.js")
    .replace(/\bnode\s*js\b/gi, "Node.js")
    .replace(/\bexpress\s*js\b/gi, "Express.js")
    .replace(/\bnext\s*js\b/gi, "Next.js")
    .replace(/\bjavascript\b/gi, "JavaScript")
    .replace(/\btypescript\b/gi, "TypeScript")
    .replace(/\bmongodb\b/gi, "MongoDB")
    .replace(/\bgithub\b/gi, "GitHub")
    .replace(/\brestful api\b/gi, "RESTful API")
    .replace(/\brest api\b/gi, "REST API")
    .replace(/\brest apis\b/gi, "REST APIs")
    .replace(/\bpower bi\b/gi, "Power BI")
    .replace(/\bhtml\b/gi, "HTML")
    .replace(/\bcss\b/gi, "CSS")
    .replace(/\bsql\b/gi, "SQL")
    .replace(/\bmern\b/gi, "MERN")
    .replace(/\bapi\b/gi, "API")
    .replace(/\bapis\b/gi, "APIs");
}

function tailorSummary(summary, resume) {
  return summary;
}

function ensureRoleSkills(skills, resume) {
  const lines = skillCategoryLines(skills);
  return lines.length ? lines.join("\n") : skills;
}

function uniqueSkillLines(value) {
  const groups = skillGroups(value);
  return groups.map((group) => `${group.label}: ${group.items.join(", ")}`).join("\n");
}

function isWebDeveloperResume(resume) {
  const text = `${resume.targetRole || ""} ${resume.summary || ""} ${resume.skills || ""} ${resume.experience?.map((item) => `${item.title} ${item.bullets}`).join(" ") || ""}`.toLowerCase();
  return /mern|web developer|frontend|backend|react|node|javascript|mongodb|express/.test(text);
}

function diversifyBulletStart(line, usedStarts) {
  const alternatives = ["Built", "Improved", "Integrated", "Optimized", "Delivered", "Created", "Supported", "Enhanced", "Configured", "Deployed"];
  const match = String(line || "").match(/^([A-Z][a-z]+)\b(.*)$/);
  if (!match) return line;
  const current = match[1];
  const key = current.toLowerCase();
  const count = usedStarts.get(key) || 0;
  usedStarts.set(key, count + 1);
  if (count === 0) return line;
  const replacement = alternatives.find((word) => !usedStarts.has(word.toLowerCase()) && word.toLowerCase() !== key) || alternatives[count % alternatives.length];
  usedStarts.set(replacement.toLowerCase(), 1);
  return `${replacement}${match[2]}`;
}

function repetitionScore(resume) {
  const starts = ensureList(resume.experience, blankExperience())
    .concat(ensureList(resume.projects, blankProject()))
    .flatMap((item) => splitLines(item.bullets))
    .map((line) => line.trim().split(/\s+/).slice(0, 2).join(" ").toLowerCase())
    .filter(Boolean);
  const counts = starts.reduce((map, start) => map.set(start, (map.get(start) || 0) + 1), new Map());
  return Math.max(0, ...Array.from(counts.values())) - 1;
}

function spellingGrammarSafe(text) {
  return grammarIssues(text).pass;
}

function grammarIssues(text) {
  const issues = [];
  const typoPattern = /\b(teh|recieve|seperate|definately|jsvascript|mangodb|mongo db|react js|node js|express js|api's)\b/i;
  const casingPattern = /\b(rest api|rest apis|javascript|typescript|mongodb|github|node\.?js|react\.?js|express\.?js)\b/;
  const spacingPattern = /[a-z0-9][.!?][A-Z]/;
  const repeatedWordPattern = /\b([A-Za-z]+)\s+\1\b/i;
  const doubleSpacePattern = / {2,}/;
  if (typoPattern.test(text)) issues.push("Fix spelling mistakes before export.");
  if (casingPattern.test(text)) issues.push("Fix technology casing such as JavaScript, React.js, Node.js, Express.js, MongoDB, GitHub, and REST APIs.");
  if (spacingPattern.test(text)) issues.push("Add spaces after sentence punctuation.");
  if (repeatedWordPattern.test(text)) issues.push("Remove repeated words.");
  if (doubleSpacePattern.test(text)) issues.push("Remove extra spaces.");
  return { pass: issues.length === 0, issues };
}

function hydrateDateItem(item) {
  const cleaned = Object.fromEntries(Object.entries(item || {}).map(([key, value]) => [
    key,
    typeof value === "string" && !hasMeaningfulText(value) ? "" : value,
  ]));
  return { startDate: "", endDate: "", current: /present|current/i.test(cleaned.dates || ""), ...cleaned };
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.resume));
  } catch (error) {
    console.warn("Could not save resume locally:", error);
  }
}

function touch() {
  state.resume.updatedAt = Date.now();
}

function ensureList(list, fallback) {
  if (Array.isArray(list)) {
    const filtered = list.filter(Boolean);
    return filtered.length ? filtered : [fallback];
  }
  if (list && typeof list === "object") return [list];
  return [fallback];
}

function createId() {
  return globalThis.crypto?.randomUUID?.() || `resume-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clearSavedResume() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures so the app can still render.
  }
}

function showStartupError(error) {
  console.error("Rover startup error:", error);
  const root = document.getElementById("app");
  clearSavedResume();
  if (!root || root.children.length) return;
  try {
    state = {
      view: "landing",
      resume: hydrateResume(clone(sampleResume)),
      importText: "",
      rawScore: null,
      converting: false,
    };
    render();
  } catch {
    root.innerHTML = `<div class="shell"><section class="landing"><header class="topbar"><div class="brand"><span>Rx</span><strong>Rover ATS</strong></div></header><main class="hero"><h1><span>Rover ATS</span></h1><p class="hero-copy">Startup data was reset. Refresh once.</p></main></section></div>`;
  }
}

function loadSavedResumeAfterBoot() {
  setTimeout(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!stored) return;
      state.resume = hydrateResume(stored);
      persist();
      if (state.view === "app") render();
    } catch (error) {
      console.warn("Ignoring bad saved resume:", error);
      clearSavedResume();
    }
  }, 0);
}

function titleCase(value) {
  return value.replace(/\s+/g, " ").trim().split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function displayName(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text === text.toUpperCase()) return titleCase(text.toLowerCase());
  return text.split(" ").map((word) => {
    if (/^[A-Z]{2,}$/.test(word)) return titleCase(word.toLowerCase());
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(" ");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "resume";
}

function attr(value) {
  return safe(value).replace(/"/g, "&quot;");
}

function safe(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function tex(value) {
  return String(value || "")
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}


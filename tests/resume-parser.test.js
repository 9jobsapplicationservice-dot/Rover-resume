import test from "node:test";
import assert from "node:assert/strict";
import { autoImproveResume, composeResumeText, localOptimizeResume, normalizeResume, scoreResume, shouldApplyEnhancedResume } from "../lib/resume.js";

const vijayResumeText = `Vijay Bhooshan Shukla
8052869880 as7612399@gmail.com https://www.linkedin.com/in/vijay-bhooshan-shukla/
https://github.com/as7212399/

SUMMARY
MERN Stack Developer and Automation Engineer with 2+ years of experience in full-stack application development. Proficient in MongoDB, Express.js, React.js, and Node.js for building scalable web solutions. Experienced in developing MERN-based projects and automation systems using n8n, APIs, and AI tools, including job automation and email workflows. Skilled in REST APIs, JWT.

EXPERIENCE
MERN Stack Developer and Web Developer 2023 - Present
9 JOBS Application Services
- Developed and deployed full-stack MERN applications, supporting over 500 users.
- Integrated RESTful APIs with JWT authentication, enhancing system security and performance.
- Designed responsive user interfaces using React.js, improving user experience by 25%.
- Optimized backend queries and MongoDB database, reducing application load time by 30%.

PROJECTS
Ecommerce Website (https://site.veloxn.com/) Feb 2025 - Aug 2025
- Enhanced a full-stack e-commerce platform with authentication, cart, and product management features.
- Built REST APIs and MongoDB database, supporting over 1000 records.
Software Company Website (https://getstore.com/) Aug 2024 - Feb 2025
- Improved a responsive business website featuring modern UI/UX design.
- Delivered website performance and user engagement by 20%.
Full Stack - E-State (https://modernproperties.co/) Feb 2025 - Dec 2025
- Created a property listing platform with advanced search, filter, and management capabilities.
- Configured data handling processes to improve listing efficiency.

SKILLS
- Languages: HTML, CSS, JavaScript
- Frontend: React.js, Responsive Design
- Backend: Node.js, Express.js, RESTful APIs, JWT Authentication
- Database: MongoDB, SQL
- Tools: Git, GitHub, VS Code, n8n, Netlify, DigitalOcean, Antigravity, Workflow Automation, API Integration, Web Automation

ACHIEVEMENTS AND CERTIFICATIONS
- Microsoft Azure, Microsoft
- Microsoft Web development with MERN Stack & Generate AI, Microsoft

EDUCATION
Galgotia University (Jul 2022 - Jun 2024)
Master of Computer Application - Computer Science Engineering
Integral University (Jul 2019 - Jun 2022) Bachelor of Computer Application`;

test("local parser preserves Vijay-style MERN resume structure", () => {
  const resume = localOptimizeResume(vijayResumeText, "");
  const rendered = composeResumeText(resume);

  assert.equal(resume.name, "Vijay Bhooshan Shukla");
  assert.equal(resume.email, "as7612399@gmail.com");
  assert.equal(resume.phone, "8052869880");
  assert.equal(resume.linkedin, "https://www.linkedin.com/in/vijay-bhooshan-shukla/");
  assert.equal(resume.github, "https://github.com/as7212399/");

  assert.match(resume.summary, /MERN Stack Developer and Automation Engineer/i);
  assert.equal(resume.experience[0].title, "MERN Stack Developer and Web Developer");
  assert.equal(resume.experience[0].company, "9 JOBS Application Services");

  assert.equal(resume.projects.length, 3);
  assert.deepEqual(
    resume.projects.map((project) => project.dates),
    ["Feb 2025 - Aug 2025", "Aug 2024 - Feb 2025", "Feb 2025 - Dec 2025"],
  );
  assert.match(resume.projects[0].title, /Ecommerce Website/);
  assert.match(resume.projects[1].title, /Software Company Website/);
  assert.match(resume.projects[2].title, /Full Stack - E-State/);

  assert.match(resume.skills, /Languages: HTML, CSS, JavaScript/);
  assert.equal(resume.education.length, 2);
  assert.equal(resume.education[0].school, "Galgotia University");
  assert.equal(resume.education[1].school, "Integral University");
  assert.doesNotMatch(rendered, /Construction Labourer/i);
});

test("local parser keeps project and education boundaries from flattened text", () => {
  const flattened = vijayResumeText.replace(/\n+/g, " ");
  const resume = localOptimizeResume(flattened, "");

  assert.equal(resume.experience[0].title, "MERN Stack Developer and Web Developer");
  assert.equal(resume.experience[0].company, "9 JOBS Application Services");
  assert.equal(resume.projects.length, 3);
  assert.equal(resume.education.length, 2);
  assert.equal(resume.education[0].degree, "Master of Computer Application - Computer Science Engineering");
  assert.doesNotMatch(composeResumeText(resume), /Construction Labourer/i);
});

test("enhance guard rejects lower or unchanged ATS scores", () => {
  assert.equal(shouldApplyEnhancedResume(79, 78), false);
  assert.equal(shouldApplyEnhancedResume(79, 79), false);
  assert.equal(shouldApplyEnhancedResume(79, 79.5), false);
});

test("enhance guard accepts only a real score increase", () => {
  assert.equal(shouldApplyEnhancedResume(79, 80), true);
  assert.equal(shouldApplyEnhancedResume(null, 76), true);
  assert.equal(shouldApplyEnhancedResume(79, null), false);
});

test("auto improvement lifts ATS quality for create and upload flows without changing domain", () => {
  const weakResume = normalizeResume({
    name: "Asha Sharma",
    phone: "8052869880",
    email: "asha@example.com",
    location: "Delhi, IN",
    linkedin: "https://linkedin.com/in/asha",
    github: "https://github.com/asha",
    targetRole: "Frontend Developer",
    summary: "Built pages for ecommerce and internal dashboards.",
    skills: "HTML, CSS, JavaScript, React",
    achievements: "React Basics, Coursera",
    experience: [{
      title: "Frontend Developer",
      company: "Example Tech",
      dates: "2024 - Present",
      bullets: "worked on checkout flow for 120 users\nresponsible for fixing UI bugs weekly",
    }],
    projects: [{
      title: "Cart App",
      subtitle: "React",
      dates: "2024",
      bullets: "helped with API integration for 20 products",
    }],
    education: [{ school: "Delhi University", degree: "Bachelor of Computer Application", dates: "2021 - 2024" }],
  });

  const beforeScore = scoreResume(weakResume).score;
  const improved = autoImproveResume(weakResume, "Frontend Developer");
  const afterScore = scoreResume(improved).score;
  const rendered = composeResumeText(improved);

  assert.ok(afterScore > beforeScore);
  assert.match(improved.summary, /Frontend Developer/i);
  assert.match(improved.experience[0].bullets, /Delivered checkout flow/i);
  assert.match(improved.experience[0].bullets, /Managed fixing UI bugs weekly/i);
  assert.match(improved.projects[0].bullets, /Supported API integration/i);
  assert.doesNotMatch(rendered, /Construction Labourer/i);
});

test("summary stops before employment history and education sections", () => {
  const raw = `Nikhil Yadav
61422720102 ny0411054@gmail.com Melbourne, VIC
PROFESSIONAL SUMMARY
Reliable and physically fit Construction Labourer with hands-on experience across residential and commercial construction sites in Melbourne. Skilled in site preparation, material handling, demolition support, and assisting trades including carpentry and concreting. Strong knowledge of WHS compliance, PPE usage, and safe work practices. Available for immediate start.
EMPLOYMENT HISTORY
Construction Laborer | BRC Construction, Melbourne, VIC May 2025 - Present
- Assisted in over 15 residential and commercial construction projects.
EDUCATION
RMIT University, Australia Jul 2024 - Present Master of Civil Engineering`;
  const resume = localOptimizeResume(raw, "");

  assert.match(resume.summary, /Available for immediate start\./);
  assert.doesNotMatch(resume.summary, /Employment History|Construction Laborer|RMIT University/i);
  assert.match(resume.experience[0].title, /Construction Laborer/i);
  assert.match(composeResumeText(resume), /Education/i);
});

test("normalizer removes leaked sections from ai summary output", () => {
  const resume = normalizeResume({
    name: "Nikhil Yadav",
    phone: "61422720102",
    email: "ny0411054@gmail.com",
    summary:
      "Reliable and physically fit Construction Labourer with hands-on experience across residential and commercial construction sites in Melbourne. Available for immediate start. EMPLOYMENT HISTOR Construction Laborer | BRC Construction EDUCATION RMIT University",
    experience: [{ title: "Construction Laborer", company: "BRC Construction", dates: "May 2025 - Present", bullets: "Assisted construction teams across residential projects." }],
    projects: [],
    skills: "Domain Skills: Construction Labouring, WHS Compliance",
    education: [{ school: "RMIT University", degree: "Master of Civil Engineering", dates: "Jul 2024 - Present" }],
  });

  assert.equal(
    resume.summary,
    "Reliable and physically fit Construction Labourer with hands-on experience across residential and commercial construction sites in Melbourne. Available for immediate start.",
  );
});

test("normalizer removes duplicate skill category labels and canonical skill repeats", () => {
  const resume = normalizeResume({
    name: "E DUCATION MERN Stack",
    phone: "8052869880",
    email: "as7612399@gmail.com",
    summary: "Automation Engineer and MERN Stack Developer with practical full-stack and automation experience.",
    skills: [
      "Languages: HTML5, CSS3, Tailwind CSS, SQL, HTML, CSS",
      "Frontend: Frontend, Bootstrap, React.js, Next.js",
      "Backend: Backend, Node.js, Express.js, REST APIs",
      "Database: Database, MongoDB",
      "Tools: TECHNICAL SKILLS, Automation & Tools, Selenium WebDriver, ChromeDriver, Git, GitHub, VS Code, Antigravity, Selenium",
    ].join("\n"),
    experience: [{ title: "Automation Engineer", company: "9 JOBS Application Services", dates: "Dec 2025 - Present", bullets: "Automated workflows using Selenium WebDriver and ChromeDriver." }],
    projects: [],
    education: [{ school: "Integral University", degree: "BCA", dates: "2019 - 2022" }],
  });

  assert.doesNotMatch(resume.skills, /Frontend:\s*Frontend/i);
  assert.doesNotMatch(resume.skills, /Backend:\s*Backend/i);
  assert.doesNotMatch(resume.skills, /Database:\s*Database/i);
  assert.doesNotMatch(resume.skills, /TECHNICAL SKILLS|Automation & Tools/i);
  const languagesLine = resume.skills.split("\n").find((line) => /^Languages:/i.test(line)) || "";
  assert.match(languagesLine, /HTML5, CSS3, SQL/i);
  assert.doesNotMatch(languagesLine.replace(/^Languages:\s*/i, ""), /(?:^|,\s*)HTML(?:,|$)/i);
  assert.doesNotMatch(languagesLine.replace(/^Languages:\s*/i, ""), /(?:^|,\s*)CSS(?:,|$)/i);
  assert.match(resume.skills, /Languages: HTML5, CSS3, SQL/i);
  assert.match(resume.skills, /Frontend: Tailwind CSS, Bootstrap, React\.js, Next\.js/i);
  assert.match(resume.skills, /Backend: Node\.js, Express\.js, REST APIs/i);
  assert.match(resume.skills, /Database: MongoDB/i);
  assert.match(resume.skills, /Tools: Selenium WebDriver, ChromeDriver, Git, GitHub, VS Code, Antigravity, Selenium/i);
});


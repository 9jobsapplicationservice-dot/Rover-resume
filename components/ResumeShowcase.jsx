const resumes = [
  {
    name: "MERN Stack Developer",
    summary:
      "MERN Stack Developer and Automation Engineer with experience in full-stack application development. Proficient in MongoDB, Express.js, React.js, Node.js, REST APIs, JWT, and workflow automation.",
    experience: [
      {
        role: "MERN Stack Developer and Web Developer",
        dates: "2023 - Present",
        bullets: ["Developed and deployed full-stack MERN applications", "Integrated REST APIs with JWT authentication and MongoDB queries"],
      },
    ],
    project: "Ecommerce Website",
    projectDate: "Feb 2025 - Aug 2025",
    skills: "Languages: HTML, CSS, JavaScript. Frontend: React.js, Responsive Design. Backend: Node.js, Express.js, RESTful APIs, JWT Authentication. Database: MongoDB, SQL.",
    certs: "Microsoft Azure; Web Development with MERN Stack",
    education: "Master of Computer Application; Bachelor of Computer Application",
  },
  {
    name: "Frontend Developer",
    summary:
      "Frontend Developer focused on responsive interfaces, accessible components, and clean React workflows. Experienced building dashboards and conversion-focused web screens.",
    experience: [
      {
        role: "Frontend Developer",
        dates: "2024 - Present",
        bullets: ["Built reusable React components for SaaS dashboards", "Improved page speed and mobile usability across key flows"],
      },
    ],
    project: "Analytics Dashboard UI",
    projectDate: "2025",
    skills: "Languages: JavaScript, HTML, CSS. Frontend: React.js, Next.js, Responsive Design. Tools: Git, Figma, API Integration.",
    certs: "Responsive Web Design Certification; React Fundamentals",
    education: "Bachelor of Information Technology",
  },
  {
    name: "Data Analyst",
    summary:
      "Data Analyst with experience turning raw business data into clear reporting, operational insights, and stakeholder-ready dashboards using SQL and BI tools.",
    experience: [
      {
        role: "Data Analyst",
        dates: "2023 - Present",
        bullets: ["Created weekly KPI dashboards for sales and operations", "Cleaned large datasets and improved report accuracy"],
      },
    ],
    project: "Sales Forecasting Report",
    projectDate: "2025",
    skills: "Analytics: SQL, Excel, Power BI, Tableau. Soft Skills: Stakeholder Communication, Documentation, Problem Solving.",
    certs: "Google Data Analytics Certificate",
    education: "Bachelor of Commerce",
  },
  {
    name: "Project Coordinator",
    summary:
      "Project Coordinator with strong scheduling, documentation, and cross-team communication skills. Experienced supporting delivery teams from planning to completion.",
    experience: [
      {
        role: "Project Coordinator",
        dates: "2022 - Present",
        bullets: ["Tracked milestones, risks, and action items for project teams", "Prepared client updates and weekly delivery reports"],
      },
    ],
    project: "Site Delivery Tracker",
    projectDate: "2024",
    skills: "Project Tools: MS Project, Excel, Jira. Strengths: Scheduling, Reporting, Vendor Coordination, Meeting Notes.",
    certs: "CAPM Coursework Completed",
    education: "Bachelor of Business Administration",
  },
  {
    name: "Customer Support Specialist",
    summary:
      "Customer Support Specialist known for calm communication, fast ticket resolution, and clear product guidance across chat and phone channels.",
    experience: [
      {
        role: "Customer Support Specialist",
        dates: "2023 - Present",
        bullets: ["Resolved customer tickets across billing and product issues", "Maintained help center articles for common workflows"],
      },
    ],
    project: "Help Center Refresh",
    projectDate: "2025",
    skills: "Support: Zendesk, Intercom, CRM Notes. Soft Skills: Empathy, De-escalation, Clear Writing, Follow-up.",
    certs: "Customer Service Excellence Training",
    education: "BA Communications",
  },
  {
    name: "Digital Marketing Executive",
    summary:
      "Digital Marketer with practical experience in campaign planning, SEO content, paid social, and performance reporting for growing online brands.",
    experience: [
      {
        role: "Digital Marketing Executive",
        dates: "2024 - Present",
        bullets: ["Managed social content calendars and campaign reports", "Optimized landing pages for search and lead capture"],
      },
    ],
    project: "Lead Generation Campaign",
    projectDate: "2025",
    skills: "Marketing: SEO, Google Ads, Meta Ads, Analytics. Tools: Canva, HubSpot, Google Search Console.",
    certs: "Google Ads Search Certification",
    education: "Bachelor of Management Studies",
  },
  {
    name: "Assistant Accountant",
    summary:
      "Accountant with experience in reconciliations, month-end support, invoice processing, and accurate financial reporting for small business teams.",
    experience: [
      {
        role: "Assistant Accountant",
        dates: "2022 - Present",
        bullets: ["Prepared bank reconciliations and month-end schedules", "Processed invoices and supported payroll checks"],
      },
    ],
    project: "Expense Audit Cleanup",
    projectDate: "2024",
    skills: "Accounting: Xero, MYOB, Excel, Reconciliations. Strengths: Accuracy, Compliance, Reporting, Time Management.",
    certs: "Xero Advisor Certification",
    education: "Bachelor of Accounting",
  },
  {
    name: "Mechanical Technician",
    summary:
      "Mechanical Technician experienced in equipment inspection, maintenance support, fault finding, and safe workshop practices in industrial environments.",
    experience: [
      {
        role: "Mechanical Technician",
        dates: "2023 - Present",
        bullets: ["Inspected machinery and completed preventive maintenance tasks", "Documented faults and supported repair planning"],
      },
    ],
    project: "Workshop Maintenance Log",
    projectDate: "2025",
    skills: "Technical: Preventive Maintenance, Hand Tools, Diagnostics, Safety Checks. Soft Skills: Teamwork, Documentation.",
    certs: "Mechanical Trade Certificate; First Aid Training",
    education: "Diploma in Mechanical Engineering",
  },
];

export function ResumeShowcase() {
  const track = [...resumes, ...resumes];
  return (
    <section className="showcase-section" aria-label="ATS resume examples">
      <div className="section-head showcase-head">
        <p className="eyebrow">Resume Examples</p>
        <h2>Live ATS Resume Examples</h2>
        <p>Clean, parser-friendly resumes across different roles.</p>
      </div>
      <div className="resume-marquee">
        <div className="resume-track">
          {track.map((resume, index) => (
            <article className="mini-resume" key={`${resume.name}-${index}`}>
              <h3>{resume.name}</h3>
              <MiniSection title="Professional Summary">
                <p>{resume.summary}</p>
              </MiniSection>
              <MiniSection title="Professional Experience">
                {resume.experience.map((item) => (
                  <div key={item.role}>
                    <div className="mini-resume-row">
                      <strong>{item.role}</strong>
                      <strong>{item.dates}</strong>
                    </div>
                    <ul>
                      {item.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </MiniSection>
              <MiniSection title="Projects">
                <div className="mini-resume-row">
                  <strong>{resume.project}</strong>
                  <strong>{resume.projectDate}</strong>
                </div>
              </MiniSection>
              <MiniSection title="Skills">
                <p>{resume.skills}</p>
              </MiniSection>
              <MiniSection title="Licences and Certifications">
                <p>{resume.certs}</p>
              </MiniSection>
              <MiniSection title="Education">
                <p>
                  <strong>{resume.education}</strong>
                </p>
              </MiniSection>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function MiniSection({ title, children }) {
  return (
    <>
      <h4>{title}</h4>
      {children}
    </>
  );
}

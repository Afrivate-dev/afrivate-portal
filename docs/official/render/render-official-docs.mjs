import { chromium } from 'playwright'
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { onboardingHandbookBody } from './content/onboarding-handbook-body.mjs'
import { swpBody } from './content/swp-body.mjs'
import { hrSignBlockIssuedHtml } from './hr-signature.mjs'

const downloadsDir = path.resolve('C:/Users/DELL/Downloads')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const officialRoot = path.resolve(__dirname, '..')
const logoPath = path.resolve(officialRoot, 'brand', 'afrivate-logo-long-purple.png')
const logoUrl = `file:///${logoPath.replace(/\\/g, '/')}`

const sharedCss = `
  :root {
    --purple: #8d4087;
    --ink: #1f1f1f;
    --muted: #5f5f5f;
    --line: #ebdceb;
    --soft: #f8f3f8;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    color: var(--ink);
    font-family: Inter, Segoe UI, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.62;
    background: #fff;
  }
  .shell {
    position: relative;
    padding: 0 4px;
  }
  .brand-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--purple);
    margin-bottom: 18px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .brand img {
    width: 154px;
    height: 49px;
    object-fit: contain;
    object-position: left center;
  }
  .chip {
    text-align: right;
    font-size: 10px;
    color: var(--muted);
    line-height: 1.45;
  }
  h1 {
    font-size: 18px;
    line-height: 1.3;
    margin: 0 0 14px;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .meta {
    display: grid;
    gap: 8px;
    background: var(--soft);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 12px 14px;
    margin: 0 0 20px;
  }
  .meta div {
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: 8px;
  }
  .meta span { color: var(--muted); }
  h2 {
    font-size: 12.5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--purple);
    margin: 20px 0 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--line);
    break-after: avoid-page;
  }
  h3 {
    font-size: 11.5px;
    margin: 14px 0 8px;
  }
  p { margin: 0 0 11px; }
  ul, ol {
    margin: 0 0 14px;
    padding-left: 22px;
  }
  li {
    margin: 0 0 8px;
    break-inside: avoid-page;
  }
  .note {
    background: var(--soft);
    border-left: 3px solid var(--purple);
    padding: 11px 13px;
    margin: 10px 0 16px;
  }
  .sign-block {
    margin-top: 32px;
    break-inside: avoid-page;
  }
  .sign-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
    margin-top: 18px;
  }
  .sign-card {
    border-top: 1px solid #bbb;
    padding-top: 10px;
  }
  .sign-card .who { font-weight: 700; margin-top: 30px; }
  .sign-card .role { color: var(--muted); font-size: 10.5px; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 14px;
    font-size: 9.8pt;
  }
  th, td {
    border: 1px solid var(--line);
    padding: 7px 8px;
    vertical-align: top;
    text-align: left;
  }
  th {
    background: var(--soft);
    color: var(--purple);
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .footer-note {
    margin-top: 16px;
    font-size: 9.5pt;
    color: var(--muted);
  }
`

function shell(title, bodyHtml, metaLines = []) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>${sharedCss}</style>
</head>
<body>
  <div class="shell">
    <div class="brand-row">
      <div class="brand">
        <img src="${logoUrl}" alt="AfriVate" />
      </div>
      <div class="chip">Official Document<br/>AfriVate Technologies Ltd<br/>RC: 9210092</div>
    </div>
    <h1>${title}</h1>
    ${
      metaLines.length
        ? `<section class="meta">${metaLines
            .map(([k, v]) => `<div><strong>${k}</strong><span>${v}</span></div>`)
            .join('')}</section>`
        : ''
    }
    ${bodyHtml}
  </div>
</body>
</html>`
}

const docs = [
  {
    folder: 'policies',
    file: 'Afrivate-Team-Lead-Operational-Playbook.pdf',
    htmlFile: 'Afrivate-Team-Lead-Operational-Playbook.html',
    title: 'Afrivate Team Lead Operational Playbook',
    meta: [
      ['Document Code', 'AFRI-TLOP-01'],
      ['Status', 'Official — Binding for Team Leads'],
      ['Applies To', 'Portal Team Leads and Assistant Leads'],
      ['Effective Date', '2 August 2026'],
      ['Related', 'AFRI-SWP · AFRI-DOA-01 · AFRI-LAP-01 · AFRI-ORG-01'],
    ],
    body: `
      <div class="note"><strong>Authority ceiling:</strong> This Playbook grants only the powers listed below. It does not create employment authority, spending authority, or final leave-approval authority. AFRI-DOA-01 prevails on conflicts about who may decide.</div>

      <h2>1. Purpose</h2>
      <p>This Playbook defines the operational duties and limits of Team Leads (including Assistant Leads where the Portal assigns them lead functions) at AfriVate Technologies Ltd.</p>

      <h2>2. Operating systems</h2>
      <p>Slack is the official internal communication channel. The AfriVate Portal is the sole system of record for tasks, weekly check-ins, goals, leave requests, onboarding, learning, resources, surveys, feedback, performance records, events, and people operations. A Slack message does not create a Portal decision.</p>

      <h2>3. Mandatory duties</h2>
      <ul>
        <li><strong>Task management:</strong> Create, assign, clarify, and reassign work through <strong>Portal → My work</strong>, stating outcome, owner, priority, deadline, status, hours, dependencies, and blockers.</li>
        <li><strong>Goals and KPIs:</strong> Agree goals with direct reports, record them in <strong>Portal → Growth → OKRs</strong>, and review progress through Weekly check-in.</li>
        <li><strong>Performance monitoring:</strong> Maintain an accurate performance record using Portal tasks, weekly check-ins, OKRs, IDPs, feedback, and 1:1 records.</li>
        <li><strong>First-level conduct:</strong> Initiate coaching, verbal warnings, and written warnings in accordance with AFRI-SWP, and copy People &amp; Culture on written warnings.</li>
        <li><strong>Escalation:</strong> Record risks and blockers in the applicable Portal workflow and escalate through Slack per AFRI-DOA-01 (critical matters within sixty (60) minutes).</li>
        <li><strong>Leave recommendation:</strong> Within one (1) official work day of a team leave request, record in the Portal an objective operational recommendation (impact, handover adequacy, capacity). Final approval or decline is by People &amp; Culture under AFRI-LAP-01.</li>
      </ul>

      <h2>4. Powers granted</h2>
      <p>Team Leads <strong>may</strong>:</p>
      <ul>
        <li>Assign and reassign tasks within their Portal team;</li>
        <li>Agree KPIs with direct reports and record goals in Portal OKRs;</li>
        <li>Record leave recommendations (not final approvals) in the Portal;</li>
        <li>Use Slack to clarify work and coordinate delivery;</li>
        <li>Issue verbal and written warnings (written warnings copied to People &amp; Culture);</li>
        <li>Recommend Performance Improvement Plans (PIPs) to People &amp; Culture.</li>
      </ul>
      <p>Team Leads <strong>must not</strong>:</p>
      <ul>
        <li>End a Team Member’s engagement, revoke Portal access, or “terminate employment” (People &amp; Culture / CEO under AFRI-DOA-01 and AFRI-ICEF-01);</li>
        <li>Promise, change, or discuss as binding any salary, stipend, equity, or benefits;</li>
        <li>Create any Cash Commitment or sign any agreement binding AfriVate;</li>
        <li>Override company-wide policy or this Playbook’s limits;</li>
        <li>Treat a leave request as approved unless People &amp; Culture’s decision appears in the Portal (or a written CEO delegation expressly authorises the Team Lead for a defined scope).</li>
      </ul>

      <h2>5. Success metrics</h2>
      <ul>
        <li>Team delivery against Portal deadlines and outcomes</li>
        <li>KPI / OKR completion rates for reports</li>
        <li>Communication discipline (Slack acknowledgement and Portal accuracy)</li>
        <li>Escalation accuracy and timeliness</li>
      </ul>

      <h2>6. Task assignment checklist (completeness gate)</h2>
      <ol>
        <li>Clear title, outcome, and description in the Portal</li>
        <li>Owner or assignees confirmed</li>
        <li>Priority and deadline stated</li>
        <li>Dependencies, files, and success criteria attached where relevant</li>
        <li>Clarification handled through Slack; final agreed outcome reflected in the Portal task</li>
      </ol>
      <div class="note"><strong>Completeness requirement:</strong> A task missing any element above is incomplete and is not valid assigned work until corrected.</div>

      <h2>7. Governing provisions</h2>
      <p>Governed by the laws of the Federal Republic of Nigeria. Amendments only by CEO-authorised update published under Portal Resources. AFRI-DOA-01 and AFRI-LAP-01 prevail over this Playbook on decision rights and leave.</p>
    `,
  },
  {
    folder: 'policies',
    file: 'Afrivate-Employee-Onboarding-Handbook.pdf',
    htmlFile: 'Afrivate-Employee-Onboarding-Handbook.html',
    title: 'Afrivate Team Member Onboarding Handbook',
    meta: [
      ['Document Code', 'AFRI-EOH-01'],
      ['Status', 'Official — Mandatory acknowledgement'],
      ['Applies To', 'All new and existing Team Members'],
      ['Effective Date', '2 August 2026'],
      ['Precedence', 'AFRI-SWP and AFRI-ICEF-01 prevail on conflict'],
    ],
    body: onboardingHandbookBody,
  },
  {
    folder: 'policies',
    file: 'Afrivate-Volunteer-Code-of-Conduct.pdf',
    htmlFile: 'Afrivate-Volunteer-Code-of-Conduct.html',
    title: 'Afrivate Volunteer Code of Conduct',
    meta: [
      ['Document Code', 'AFRI-VCC'],
      ['Status', 'Official — Binding upon acceptance'],
      ['Applies To', 'External volunteers and partner collaborators (not internal unpaid operators)'],
      ['Effective Date', '2 August 2026'],
      ['Related', 'AFRI-ICEF-01 applies to internal unpaid Contributors instead'],
    ],
    body: `
      <div class="note"><strong>Scope boundary:</strong> This Code applies to external volunteers and partner collaborators placed with or through AfriVate programmes. Persons who operate AfriVate internally without pay are governed by <strong>AFRI-ICEF-01</strong>, not this Code alone. This Code does not create employment with AfriVate or with any Partner.</div>

      <h2>1. Definitions</h2>
      <ul>
        <li><strong>Volunteer:</strong> A person accepting an external volunteering, internship, mentorship, or similar placement under AfriVate or a Partner arrangement.</li>
        <li><strong>Partner:</strong> The host organisation named in the opportunity or placement terms.</li>
        <li><strong>Written / writing:</strong> Email, Portal record, or signed PDF — not WhatsApp alone.</li>
      </ul>

      <h2>2. Professionalism and excellence</h2>
      <ul>
        <li>Meet commitments, deadlines, and agreed deliverables.</li>
        <li>Produce work that meets AfriVate’s quality standard for the role.</li>
        <li>Maintain skills required for the assignment.</li>
      </ul>

      <h2>3. Integrity, confidentiality, and IP</h2>
      <ul>
        <li>Protect Confidential Information of AfriVate and the Partner; do not disclose without written authorisation.</li>
        <li>Record progress and blockers accurately in Portal tasks and Weekly check-in where those workflows apply; use Slack only for coordination.</li>
        <li>Do not speak on behalf of AfriVate without prior written authorisation from AfriVate.</li>
        <li>Unless a written placement term states otherwise, work product created for AfriVate in the placement is owned by AfriVate; work product created solely for a Partner under that Partner’s brief is governed by the Partner’s written terms. If unclear, ask People &amp; Culture in writing before proceeding.</li>
      </ul>

      <h2>4. Notice and departure</h2>
      <ul>
        <li>Give at least fourteen (14) calendar days’ written notice before ending the engagement, except where immediate departure is required for safety or unlawful conditions (notify AfriVate immediately).</li>
        <li>Complete Portal handover: unfinished tasks, notes, learning records, and resources; clarify ownership on Slack.</li>
      </ul>

      <h2>5. Safety, fair treatment, and hours</h2>
      <ul>
        <li>A Volunteer may refuse work that is unsafe, unlawful, unethical, or outside the agreed written scope, and must report it through <strong>Portal → People → Growth → Speak up</strong> (or to hr@afrivate.org if Portal access is unavailable).</li>
        <li>Harassment and discrimination are prohibited. Use Speak up for confidential reports.</li>
        <li>Volunteers must not be required to exceed the maximum hours agreed in writing for the placement.</li>
      </ul>

      <h2>6. Official systems</h2>
      <ul>
        <li><strong>Slack:</strong> Official coordination channel where issued.</li>
        <li><strong>Portal:</strong> System of record for applicable workflows. A Slack message does not replace a required Portal submission.</li>
      </ul>

      <h2>7. End of status</h2>
      <p>AfriVate and/or the Partner may end the volunteering relationship immediately for serious breach, or otherwise on written notice, including for: consistent failure to meet agreed KPIs; breach of confidentiality or this Code; or conduct that materially damages AfriVate’s or the Partner’s reputation. Confidentiality and any IP assignment survive end of status.</p>

      <h2>8. Governing law</h2>
      <p>Governed by the laws of the Federal Republic of Nigeria. Acceptance (including Portal acknowledgement) binds the Volunteer to this Code.</p>

      ${hrSignBlockIssuedHtml}
    `,
  },
  {
    folder: 'policies',
    file: 'Afrivate-Standard-Work-Process.pdf',
    htmlFile: 'Afrivate-Standard-Work-Process.html',
    title: 'Afrivate Standard Work Process (SWP)',
    meta: [
      ['Document Code', 'AFRI-SWP'],
      ['Status', 'Official — Binding'],
      ['Applies To', 'All AfriVate Team Members (paid or unpaid), Team Leads, and Pillar Heads'],
      ['Effective Date', '2 August 2026'],
      ['Review Cycle', 'Every 6 months or on material operational change'],
      ['Owner', 'CEO / People & Culture'],
    ],
    body: swpBody,
  },
  {
    folder: 'hiring/job-posts',
    file: 'Afrivate-Front-End-Developer-Job-Post.pdf',
    htmlFile: 'Afrivate-Front-End-Developer-Job-Post.html',
    title: 'We Are Hiring: Front-End Developer',
    meta: [
      ['Department', 'Technology & Product'],
      ['Role', 'Front-End Developer'],
      ['Location', 'Remote'],
      ['Employment', 'Full-Time · Flexible Work Structure'],
      ['Primary Stack', 'React · TypeScript · Git/GitHub'],
      ['Application', 'CV + Cover Letter + GitHub/Portfolio'],
    ],
    body: `
      <h2>Build Digital Products That Elevate Life in Africa</h2>
      <p>AfriVate Technologies Ltd is looking for a thoughtful, dependable Front-End Developer to build fast, accessible, and responsive web experiences. You will translate product requirements and designs into maintainable React interfaces, collaborate with product and backend contributors, and help strengthen the quality of AfriVate’s digital products.</p>

      <h2>What You Will Do</h2>
      <ul>
        <li>Build reusable, responsive user interfaces with React and TypeScript.</li>
        <li>Translate product designs and requirements into clean, accessible experiences across mobile and desktop.</li>
        <li>Integrate REST APIs and backend services, handling loading, errors, authentication, and edge cases carefully.</li>
        <li>Maintain shared components, application state, routing, forms, and client-side data flows.</li>
        <li>Write tests, review pull requests, investigate defects, and improve performance and usability.</li>
        <li>Use Git and GitHub for branches, pull requests, code review, issue tracking, and collaborative delivery.</li>
        <li>Keep assigned work and progress current in the AfriVate Portal and communicate with the team through Slack.</li>
      </ul>

      <h2>Core Requirements</h2>
      <ul>
        <li>Practical experience with <strong>React, JavaScript (ES6+), TypeScript, HTML5, and modern CSS</strong>.</li>
        <li>Strong understanding of components, hooks, state management, forms, routing, and API integration.</li>
        <li>Comfort with <strong>Git and GitHub</strong>, including feature branches, pull requests, merge conflict resolution, and code review.</li>
        <li>Ability to build responsive interfaces and apply accessibility fundamentals.</li>
        <li>Ability to debug browser issues and communicate technical decisions clearly.</li>
        <li>A portfolio, deployed application, or GitHub repositories demonstrating relevant work.</li>
      </ul>

      <h2>Useful Technologies</h2>
      <p>Experience with some of the following is valuable; candidates are not expected to know everything:</p>
      <ul>
        <li>Vite, React Router, Tailwind CSS, component libraries, and design systems;</li>
        <li>TanStack Query or similar server-state tools; Context, Zustand, or Redux where appropriate;</li>
        <li>Backend-as-a-service platforms such as Supabase, Firebase, or Appwrite;</li>
        <li>Vitest/Jest, React Testing Library, and Playwright for end-to-end testing;</li>
        <li>PWA development, browser performance, web security, and CI/CD workflows;</li>
        <li>Figma collaboration and basic UX judgement.</li>
      </ul>

      <h2>What We Value</h2>
      <ul>
        <li>Ownership, integrity, reliability, and attention to detail;</li>
        <li>Readable code and pragmatic engineering decisions;</li>
        <li>Willingness to learn, receive feedback, and document work;</li>
        <li>Respectful collaboration and consistent delivery.</li>
      </ul>

      <h2>Role Benefits</h2>
      <div class="note"><strong>Non-binding until signed:</strong> Any salary, stipend, data support, equity, or benefit is effective only under a written instrument signed by the CEO (or authorised signatory). Advertisements and interviews create no entitlement. AfriVate may engage successful candidates as unpaid Internal Contributors under AFRI-ICEF-01 until such an instrument exists.</div>
      <ul>
        <li><strong>Remote, flexible work:</strong> A role with a flexible work structure focused on accountability and outcomes (full-time expectation only if stated in the signed instrument).</li>
        <li><strong>Equity participation (if offered in writing):</strong> Where the CEO issues a formal equity award, indicative terms may include up to a 2% equity stake vesting over two years, subject to the award document, vesting terms, continued qualifying service, and applicable company documentation. No equity exists without that signed award.</li>
        <li><strong>Monthly data support:</strong> A ₦20,000 data stipend to support reliable remote work.</li>
        <li><strong>Professional growth:</strong> Practical learning opportunities, direct exposure to product and engineering decisions, and space to strengthen your technical judgement.</li>
        <li><strong>Meaningful ownership:</strong> The opportunity to shape products, engineering standards, and user experiences from an early stage.</li>
        <li><strong>Career development:</strong> Clear responsibility, portfolio-strengthening work, cross-functional collaboration, and increased leadership opportunities as the company grows.</li>
        <li><strong>Purpose-led impact:</strong> Work on technology intended to improve connectivity and elevate life across Africa.</li>
      </ul>

      <h2>How to Apply</h2>
      <p>Email the following application materials to <strong>afrivatehr@gmail.com</strong>:</p>
      <ul>
        <li>Your current CV;</li>
        <li>A tailored cover letter explaining why you want to join AfriVate and how your experience fits this role;</li>
        <li>Your GitHub profile; and</li>
        <li>Your portfolio, deployed applications, or relevant project links.</li>
      </ul>
      <div class="note"><strong>Required email subject:</strong> APPLICATION FOR FRONT-END DEVELOPER — [YOUR FULL NAME]<br/><strong>Portfolio note:</strong> Identify one project you are proud of, what you personally contributed, and the most difficult technical problem you solved.</div>
      <p>Applications sent without the required subject line or cover letter may not be reviewed.</p>
      <p>AfriVate welcomes candidates whose practical ability is demonstrated through projects and sound engineering judgement, including strong early-career developers.</p>
    `,
    contact: 'afrivatehr@gmail.com',
  },
  {
    folder: 'hiring/job-posts',
    file: 'Afrivate-Back-End-Developer-Job-Post.pdf',
    htmlFile: 'Afrivate-Back-End-Developer-Job-Post.html',
    title: 'We Are Hiring: Back-End Developer',
    meta: [
      ['Department', 'Technology & Product'],
      ['Role', 'Back-End Developer'],
      ['Location', 'Remote'],
      ['Employment', 'Full-Time · Flexible Work Structure'],
      ['Stack', 'TypeScript · Node.js or NestJS · PostgreSQL'],
      ['Application', 'CV + Cover Letter + GitHub/Portfolio'],
    ],
    body: `
      <h2>Build Secure Systems Behind High-Impact Products</h2>
      <p>AfriVate Technologies Ltd is looking for a Back-End Developer to design reliable APIs, data models, integrations, and services that work naturally with modern React applications. Our recommended foundation is <strong>TypeScript, Node.js using Express or Fastify, or NestJS, with PostgreSQL</strong>. This gives the product team a shared language across frontend and backend while retaining a strong relational data foundation.</p>

      <h2>What You Will Do</h2>
      <ul>
        <li>Design, build, document, and maintain secure REST APIs and backend services.</li>
        <li>Model relational data in PostgreSQL and write safe migrations, queries, indexes, and constraints.</li>
        <li>Implement authentication, role-based access control, permissions, validation, audit trails, and secure file workflows.</li>
        <li>Integrate backend services cleanly with React clients and third-party providers.</li>
        <li>Build background jobs, notifications, webhooks, scheduled processes, and real-time workflows where required.</li>
        <li>Write automated tests, review pull requests, monitor failures, and diagnose production issues.</li>
        <li>Use Git and GitHub for collaborative delivery, keep work current in the AfriVate Portal, and communicate through Slack.</li>
      </ul>

      <h2>Core Requirements</h2>
      <ul>
        <li>Strong JavaScript/TypeScript and practical backend experience with <strong>Node.js</strong>.</li>
        <li>Experience building APIs with <strong>Node.js using Express or Fastify, NestJS</strong>, or a comparable framework.</li>
        <li>Strong understanding of <strong>PostgreSQL</strong>, relational modelling, transactions, migrations, indexing, and query performance.</li>
        <li>Understanding of authentication, authorisation, input validation, API security, and OWASP fundamentals.</li>
        <li>Comfort with Git/GitHub, pull requests, code review, debugging, and technical documentation.</li>
        <li>Ability to design clear API contracts that frontend developers can consume reliably.</li>
      </ul>

      <h2>Preferred Stack &amp; Nice-to-Have Experience</h2>
      <ul>
        <li><strong>Node.js with Express or Fastify, or NestJS</strong> for TypeScript backend services, with <strong>PostgreSQL</strong> as the primary database;</li>
        <li>Prisma, Drizzle, or TypeORM where an ORM improves maintainability;</li>
        <li>Redis, caching, queues, background workers, webhooks, and scheduled jobs;</li>
        <li>Jest/Vitest, integration testing, contract testing, and API documentation with OpenAPI/Swagger;</li>
        <li>Docker, Linux, CI/CD, cloud/serverless deployment, logging, monitoring, and incident response;</li>
        <li>Optional experience with Supabase, Firebase, Appwrite, or another backend-as-a-service platform;</li>
        <li>Experience supporting React or React Native clients.</li>
      </ul>

      <h2>What We Value</h2>
      <ul>
        <li>Security-minded engineering and careful handling of user data;</li>
        <li>Clear ownership, accurate estimates, and early escalation of blockers;</li>
        <li>Simple, maintainable architecture over unnecessary complexity;</li>
        <li>Evidence-based problem-solving, documentation, and respectful collaboration.</li>
      </ul>

      <h2>Role Benefits</h2>
      <div class="note"><strong>Non-binding until signed:</strong> Any salary, stipend, data support, equity, or benefit is effective only under a written instrument signed by the CEO (or authorised signatory). Advertisements and interviews create no entitlement. AfriVate may engage successful candidates as unpaid Internal Contributors under AFRI-ICEF-01 until such an instrument exists.</div>
      <ul>
        <li><strong>Remote, flexible work:</strong> A role with a flexible work structure focused on accountability and outcomes (full-time expectation only if stated in the signed instrument).</li>
        <li><strong>Equity participation (if offered in writing):</strong> Where the CEO issues a formal equity award, indicative terms may include up to a 2% equity stake vesting over two years, subject to the award document, vesting terms, continued qualifying service, and applicable company documentation. No equity exists without that signed award.</li>
        <li><strong>Monthly data support:</strong> A ₦20,000 data stipend to support reliable remote work.</li>
        <li><strong>Professional growth:</strong> Practical learning opportunities, direct exposure to product, architecture, infrastructure, and security decisions, and space to strengthen your technical judgement.</li>
        <li><strong>Meaningful ownership:</strong> The opportunity to shape backend systems, engineering standards, and technical foundations from an early stage.</li>
        <li><strong>Career development:</strong> Clear responsibility, portfolio-strengthening work, cross-functional collaboration, and increased leadership opportunities as the company grows.</li>
        <li><strong>Purpose-led impact:</strong> Work on technology intended to improve connectivity and elevate life across Africa.</li>
      </ul>

      <h2>How to Apply</h2>
      <p>Email the following application materials to <strong>afrivatehr@gmail.com</strong>:</p>
      <ul>
        <li>Your current CV;</li>
        <li>A tailored cover letter explaining why you want to join AfriVate and how your experience fits this role;</li>
        <li>Your GitHub profile; and</li>
        <li>Relevant repositories, deployed APIs, or a technical portfolio.</li>
      </ul>
      <div class="note"><strong>Required email subject:</strong> APPLICATION FOR BACK-END DEVELOPER — [YOUR FULL NAME]<br/><strong>Technical note:</strong> Identify a backend system or API you built and briefly explain its architecture, your contribution, security decisions, and one challenge you resolved.</div>
      <p>Applications sent without the required subject line or cover letter may not be reviewed.</p>
    `,
    contact: 'afrivatehr@gmail.com',
  },
  {
    folder: 'hiring/job-posts',
    file: 'Afrivate-Graphic-Designer-Job-Post.pdf',
    htmlFile: 'Afrivate-Graphic-Designer-Job-Post.html',
    title: 'We Are Hiring: Graphic Designer',
    meta: [
      ['Department', 'Brand, Media & Creative'],
      ['Role', 'Graphic Designer'],
      ['Location', 'Remote'],
      ['Employment', 'Full-Time · Flexible Work Structure'],
      ['Core Tools', 'Adobe Creative Suite · Figma'],
      ['Application', 'CV + Cover Letter + Portfolio'],
    ],
    body: `
      <h2>Design Visual Experiences That Elevate Life in Africa</h2>
      <p>AfriVate Technologies Ltd is looking for a creative, detail-oriented Graphic Designer to translate ideas, campaigns, and product stories into clear and memorable visual communication. You will help protect and evolve the AfriVate brand across digital platforms, marketing materials, presentations, social media, events, and product-supporting assets.</p>

      <h2>What You Will Do</h2>
      <ul>
        <li>Create high-quality graphics for social media, campaigns, recruitment, presentations, events, reports, and internal initiatives.</li>
        <li>Apply and maintain AfriVate’s visual identity consistently across colours, typography, imagery, layout, and logo usage.</li>
        <li>Develop campaign concepts and turn approved creative directions into platform-ready assets in multiple formats and sizes.</li>
        <li>Design print-ready and digital materials, including flyers, posters, brochures, infographics, templates, and branded documents.</li>
        <li>Support product teams with icons, illustrations, interface assets, launch graphics, and visual storytelling where required.</li>
        <li>Prepare organised, editable source files and export production-ready assets with accurate dimensions, colour profiles, and file formats.</li>
        <li>Manage assigned work through the AfriVate Portal and use Slack for briefs, clarification, feedback, and team communication.</li>
      </ul>

      <h2>Core Requirements</h2>
      <ul>
        <li>A strong portfolio demonstrating branding, layout, typography, social media design, and campaign work.</li>
        <li>Practical proficiency with <strong>Adobe Photoshop and Adobe Illustrator</strong>.</li>
        <li>Working knowledge of <strong>Figma</strong> and the ability to collaborate on shared files and design systems.</li>
        <li>Strong understanding of composition, hierarchy, colour, typography, image selection, and brand consistency.</li>
        <li>Ability to interpret briefs, propose thoughtful concepts, receive feedback professionally, and deliver polished work on time.</li>
        <li>Ability to prepare assets correctly for web, social media, presentations, and print.</li>
        <li>Reliable file organisation, version control habits, and attention to detail.</li>
      </ul>

      <h2>Useful Tools &amp; Nice-to-Have Experience</h2>
      <p>Experience with some of the following is valuable; candidates are not expected to know everything:</p>
      <ul>
        <li>Adobe InDesign for reports, brochures, and multi-page documents;</li>
        <li>After Effects, Premiere Pro, CapCut, or another tool for motion graphics and short-form video;</li>
        <li>Canva for controlled template systems and rapid content adaptation;</li>
        <li>Basic UI/UX principles, responsive design, and developer handoff;</li>
        <li>Illustration, icon design, photo editing, art direction, or creative campaign strategy;</li>
        <li>Experience designing for African audiences, technology products, startups, or social-impact brands.</li>
      </ul>

      <h2>What We Value</h2>
      <ul>
        <li>Original thinking grounded in the brief and the audience;</li>
        <li>Consistency, craftsmanship, and strong visual judgement;</li>
        <li>Ownership, reliability, and respect for deadlines;</li>
        <li>Clear communication and the ability to explain design decisions;</li>
        <li>Curiosity, adaptability, and willingness to improve through practice and feedback.</li>
      </ul>

      <h2>Role Benefits</h2>
      <div class="note"><strong>Non-binding until signed:</strong> Any salary, stipend, data support, equity, or benefit is effective only under a written instrument signed by the CEO (or authorised signatory). Advertisements and interviews create no entitlement. AfriVate may engage successful candidates as unpaid Internal Contributors under AFRI-ICEF-01 until such an instrument exists.</div>
      <ul>
        <li><strong>Remote, flexible work:</strong> A role with a flexible work structure focused on accountability and outcomes (full-time expectation only if stated in the signed instrument).</li>
        <li><strong>Equity participation (if offered in writing):</strong> Where the CEO issues a formal equity award, indicative terms may include up to a 2% equity stake vesting over two years, subject to the award document, vesting terms, continued qualifying service, and applicable company documentation. No equity exists without that signed award.</li>
        <li><strong>Monthly data support:</strong> A ₦20,000 data stipend to support reliable remote work.</li>
        <li><strong>Creative ownership:</strong> The opportunity to shape the visual expression of an African technology brand and establish reusable creative standards.</li>
        <li><strong>Portfolio development:</strong> Exposure to varied brand, campaign, product, event, editorial, and corporate design work.</li>
        <li><strong>Cross-functional experience:</strong> Collaboration with product, technology, people, operations, and leadership teams.</li>
        <li><strong>Career development:</strong> Increasing responsibility and future creative-leadership opportunities as the company grows.</li>
        <li><strong>Purpose-led impact:</strong> Design for technology intended to improve connectivity and elevate life across Africa.</li>
      </ul>

      <h2>How to Apply</h2>
      <p>Email the following application materials to <strong>afrivatehr@gmail.com</strong>:</p>
      <ul>
        <li>Your current CV;</li>
        <li>A tailored cover letter explaining why you want to join AfriVate and how your experience fits this role;</li>
        <li>A portfolio link or PDF portfolio containing your strongest relevant work; and</li>
        <li>Optional links to Behance, Dribbble, a personal website, or relevant social design work.</li>
      </ul>
      <div class="note"><strong>Required email subject:</strong> APPLICATION FOR GRAPHIC DESIGNER — [YOUR FULL NAME]<br/><strong>Portfolio note:</strong> Identify two projects in your portfolio, explain the brief and your contribution, and state the tools used.</div>
      <p>Applications sent without the required subject line, cover letter, or portfolio may not be reviewed.</p>
    `,
    contact: 'afrivatehr@gmail.com',
  },
  {
    folder: 'policies',
    file: 'Afrivate-Leave-and-Absence-Policy.pdf',
    htmlFile: 'Afrivate-Leave-and-Absence-Policy.html',
    title: 'Afrivate Leave and Absence Policy',
    meta: [
      ['Document Code', 'AFRI-LAP-01'],
      ['Status', 'Official — Binding'],
      ['Applies To', 'All Team Members within Agreed Capacity (paid or unpaid)'],
      ['Policy Owner', 'People & Culture'],
      ['Effective Date', '2 August 2026'],
      ['Related', 'AFRI-SWP · AFRI-DOA-01 · AFRI-ICEF-01 · AFRI-TLOP-01'],
    ],
    body: `
      <div class="note"><strong>What “leave” means:</strong> For unpaid Internal Contributors, leave is <strong>authorised absence from Agreed Capacity</strong> under AFRI-ICEF-01. It is not, by itself, statutory annual leave, paid leave, or an employment benefit. For any future paid Employee, statutory rights under Nigerian law apply in addition to this process; this Policy still governs how absence is requested and approved in AfriVate systems.</div>

      <h2>1. Purpose</h2>
      <p>This Policy sets the exclusive process for requesting and deciding absence from duty at AfriVate Technologies Ltd, so wellbeing and continuity are balanced without informal or ambiguous approvals.</p>

      <h2>2. Definitions</h2>
      <ul>
        <li><strong>Leave:</strong> Authorised absence from Agreed Capacity / scheduled duty for stated dates.</li>
        <li><strong>Official work days:</strong> Monday–Thursday, excluding public holidays and company-declared non-working days.</li>
        <li><strong>Unauthorised absence:</strong> Any absence from Agreed Capacity without a Portal decision of “approved” (except while an emergency is being regularised under §6 in good faith).</li>
      </ul>

      <h2>3. Notice requirement</h2>
      <p>Except under §6 (emergency), every leave request must be submitted in the Portal at least <strong>three (3) official work days</strong> before the first intended day of absence.</p>
      <div class="note"><strong>No constructive approval:</strong> Submission is not approval. The Team Member remains available for duty until People &amp; Culture’s decision appears in the Portal as approved.</div>

      <h2>4. Handover (condition of proceeding)</h2>
      <p>Before starting approved leave, the Team Member must:</p>
      <ul>
        <li>Complete due work for the period; or</li>
        <li>Agree reassignment with the Team Lead to a named colleague;</li>
        <li>Provide handover (status, deadlines, files, access, next actions); and</li>
        <li>Obtain confirmation that the Team Lead and receiving colleague understand the temporary ownership.</li>
      </ul>
      <p>People &amp; Culture may delay or decline leave where handover is inadequate and continuity would be materially affected.</p>

      <h2>5. Approval authority (exclusive rule)</h2>
      <ol>
        <li>Every request must state truthful reason, dates, and supporting information where required.</li>
        <li>The Team Lead must record an operational recommendation in the Portal within <strong>one (1) official work day</strong> (impact, handover, capacity).</li>
        <li><strong>People &amp; Culture alone approves or declines</strong>, after considering reason, urgency, notice, handover, capacity, and attendance history. The CEO may override in writing.</li>
        <li>A Team Lead Portal action is a recommendation only, unless the CEO has issued a written, time-bound delegation naming the delegate and scope (see AFRI-DOA-01). Silence is not delegation.</li>
        <li>Where a request is declined, People &amp; Culture will ordinarily state the reason in the Portal.</li>
      </ol>

      <h2>6. Official channel</h2>
      <p>Leave requests must be submitted through the <strong>AfriVate Portal</strong>. Requests made solely through WhatsApp, Slack, email, telephone, or verbal conversation are not leave and will not be treated as approved.</p>
      <ol>
        <li>Sign in to the Portal.</li>
        <li>Open Leave / Time off; select leave type.</li>
        <li>Enter dates and clear reason.</li>
        <li>Add handover details and supporting documents where required.</li>
        <li>Submit and await the Portal decision.</li>
      </ol>

      <h2>7. Emergency and impromptu absence</h2>
      <p>Notice under §3 may be impossible only for:</p>
      <ul>
        <li><strong>Medical emergency:</strong> Urgent illness, injury, hospital admission, or immediate medical situation affecting the Team Member or a person under their direct care.</li>
        <li><strong>Specified personal emergency:</strong> A serious, unforeseen personal event requiring immediate presence; circumstances must be stated in the Portal and may require reasonable supporting information.</li>
      </ul>
      <p>The Team Member must notify the Team Lead and People &amp; Culture as soon as reasonably possible and submit or regularise the Portal request at the earliest opportunity. Emergency notice is not automatic approval and must not be used to evade ordinary process.</p>

      <h2>8. Consequences</h2>
      <p>Repeated late requests, unauthorised absence, or misuse of §7 may result in coaching, verbal or written warning, closer review of future requests, or further action under AFRI-SWP progressive discipline — assessed fairly on explanation, evidence, history, and impact.</p>

      <h2>9. Responsibilities</h2>
      <ul>
        <li><strong>Team Members:</strong> Timely accurate requests; handover; wait for Portal approval.</li>
        <li><strong>Team Leads:</strong> Assess impact; support handover; record recommendation within one official work day.</li>
        <li><strong>People &amp; Culture:</strong> Decide consistently; record in Portal; maintain records.</li>
      </ul>

      <div class="note"><strong>Hard rule:</strong> No leave is approved until the decision appears in the AfriVate Portal.</div>

      <h2>10. Governing law</h2>
      <p>Governed by the laws of the Federal Republic of Nigeria. Severability and no-waiver apply. Amendments only by CEO-authorised publication under Portal Resources.</p>
    `,
  },
]


await mkdir(path.join(officialRoot, 'policies'), { recursive: true })
await mkdir(path.join(officialRoot, 'hiring', 'job-posts'), { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage()

const footerTemplate = (email = 'afrivatetech@gmail.com') => `
  <div style="width:100%;font-size:9px;color:#666;padding:0 18mm;display:flex;justify-content:space-between;font-family:Segoe UI, Arial, sans-serif;">
    <span>${email} · X: afrivate tech · Instagram: afrivate_tech</span>
    <span>RC: 9210092 · Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
  </div>`

for (const doc of docs) {
  const html = shell(doc.title, doc.body, doc.meta)
  const outDir = path.join(officialRoot, doc.folder)
  const htmlPath = path.join(outDir, doc.htmlFile)
  const pdfPath = path.join(outDir, doc.file)
  await writeFile(htmlPath, html, 'utf8')
  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' })
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: footerTemplate(doc.contact),
    margin: { top: '16mm', right: '16mm', bottom: '18mm', left: '18mm' },
  })
  console.log('Wrote', pdfPath)
  if (doc.folder === 'policies') {
    try {
      await copyFile(pdfPath, path.join(downloadsDir, doc.file))
    } catch {
      /* ignore lock */
    }
  }
}

await browser.close()
console.log('Done')

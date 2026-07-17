import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = __dirname
const iconPath = path.resolve(__dirname, '../../public/afrivate-icon.svg')
const iconUrl = `file:///${iconPath.replace(/\\/g, '/')}`

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
    width: 40px;
    height: 46px;
    object-fit: contain;
  }
  .brand .name {
    font-size: 21px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.1;
  }
  .brand .tag {
    color: var(--purple);
    font-size: 11px;
    font-weight: 600;
    margin-top: 2px;
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
  li { margin: 0 0 8px; }
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
        <img src="${iconUrl}" alt="Afrivate" />
        <div>
          <div class="name">Afrivate</div>
          <div class="tag">Elevating Life In Africa</div>
        </div>
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
    file: 'Afrivate-Team-Lead-Operational-Playbook.pdf',
    htmlFile: 'Afrivate-Team-Lead-Operational-Playbook.html',
    title: 'Afrivate Team Lead Operational Playbook',
    meta: [
      ['Document Code', 'AFRI-TLOP-01'],
      ['Target Audience', 'Team Leads'],
      ['Focus', 'Authority, Accountability & Delivery'],
    ],
    body: `
      <h2>Introduction</h2>
      <p>This Playbook defines the operational authority, responsibilities, and success metrics for Team Leads at AfriVate Technologies Ltd. It ensures consistent leadership standards across all departments.</p>

      <h2>C1. Core Responsibilities of Team Leads</h2>
      <ul>
        <li>Task assignment and clarification</li>
        <li>KPI definition and tracking</li>
        <li>Performance monitoring</li>
        <li>First-level disciplinary actions</li>
        <li>Escalation of risks and blockers</li>
      </ul>

      <h2>C2. Team Lead Authority Boundaries</h2>
      <h3>Team Leads may:</h3>
      <ul>
        <li>Assign and reassign tasks within their team</li>
        <li>Set weekly KPIs for direct reports</li>
        <li>Issue verbal and written warnings</li>
        <li>Recommend Performance Improvement Plans (PIPs)</li>
      </ul>
      <h3>Team Leads may NOT:</h3>
      <ul>
        <li>Terminate employment without HR/Admin approval</li>
        <li>Change compensation or benefits</li>
        <li>Override company-wide policy</li>
        <li>Approve leave outside defined authority</li>
      </ul>

      <h2>C3. Team Lead Success Metrics</h2>
      <ul>
        <li>Team delivery consistency</li>
        <li>KPI completion rates</li>
        <li>Communication discipline</li>
        <li>Escalation accuracy and timeliness</li>
      </ul>

      <h2>Leadership Protocol: Task Assignment Checklist</h2>
      <ol>
        <li>Clear outcome defined</li>
        <li>Deadline stated</li>
        <li>Owner confirmed</li>
      </ol>
      <div class="note"><em>If any are missing, the task is invalid.</em></div>
    `,
  },
  {
    file: 'Afrivate-Employee-Onboarding-Handbook.pdf',
    htmlFile: 'Afrivate-Employee-Onboarding-Handbook.html',
    title: 'Afrivate Employee Onboarding Handbook',
    meta: [
      ['Document Code', 'AFRI-EOH-01'],
      ['Target Audience', 'New Hires & Existing Staff'],
      ['Status', 'Mandatory Reading'],
    ],
    body: `
      <h2>Welcome to Afrivate</h2>
      <p>This handbook is a simplified orientation guide for new and existing staff. It summarizes culture, communication, performance, and conduct expectations.</p>
      <div class="note"><strong>Note:</strong> The handbook does not replace the SWP. In the event of conflict, the SWP prevails.</div>

      <h2>1. Mission &amp; Culture Overview</h2>
      <p><strong>Overview of Afrivate’s mission and culture:</strong> We are building the future of user connectivity. Our culture is rooted in excellence, ownership, professionalism, and high-speed execution.</p>

      <h2>2. Schedule &amp; Availability</h2>
      <p><strong>Summary of work schedules and availability expectations:</strong></p>
      <ul>
        <li><strong>Official Days:</strong> Monday to Thursday.</li>
        <li><strong>Friday to Sunday:</strong> Off-days / Asynchronous updates.</li>
        <li><strong>Core Hours:</strong> You must be reachable and active during team-defined hours.</li>
      </ul>

      <h2>3. Communication Standards</h2>
      <p><strong>Communication rules and response time standards:</strong></p>
      <ul>
        <li><strong>The 4-Hour Rule:</strong> All official messages must be acknowledged within four hours.</li>
        <li><strong>Official Channels:</strong> WhatsApp (Coordination), Email (Formal Decisions), Project Tools (Tasks).</li>
      </ul>

      <h2>4. Performance &amp; Reporting</h2>
      <p><strong>KPI and reporting expectations:</strong></p>
      <ul>
        <li>Every employee maintains 3–5 Weekly KPIs.</li>
        <li>Reports must be submitted weekly to your Team Lead.</li>
        <li>Goal: Support the target of <strong>1,000,000 users by Dec 31, 2026</strong>.</li>
      </ul>

      <h2>5. Evaluation &amp; Conduct</h2>
      <p><strong>High-level appraisal and discipline overview:</strong></p>
      <ul>
        <li>Appraisals are 60% Output and 40% Soft Skills.</li>
        <li>Afrivate uses a progressive discipline system (Warnings → PIP → Termination).</li>
      </ul>
      <p><strong>Code of Conduct summary:</strong></p>
      <ul>
        <li>Act with integrity.</li>
        <li>Pursue constant excellence.</li>
        <li>Respect the hierarchy.</li>
        <li>Protect company data.</li>
      </ul>

      <h2>New Hire Checklist</h2>
      <ol>
        <li>☐ Review the full SWP Document.</li>
        <li>☐ Join official WhatsApp Work Groups.</li>
        <li>☐ Set up @afrivate Email.</li>
        <li>☐ Define initial 3–5 KPIs with Team Lead.</li>
        <li>☐ Sign the SWP Acknowledgement.</li>
      </ol>
    `,
  },
  {
    file: 'Afrivate-Volunteer-Code-of-Conduct.pdf',
    htmlFile: 'Afrivate-Volunteer-Code-of-Conduct.html',
    title: 'Afrivate Volunteer Code of Conduct',
    meta: [
      ['Document Type', 'Code of Conduct'],
      ['Audience', 'Volunteers & Partner Collaborators'],
      ['Status', 'Binding upon acceptance'],
    ],
    body: `
      <h2>1. Professionalism &amp; Excellence (The Standard)</h2>
      <ul>
        <li><strong>Reliability:</strong> Meet commitments, deadlines, and agreed deliverables consistently.</li>
        <li><strong>Excellence:</strong> Produce work that reflects AfriVate’s quality and professionalism standards.</li>
        <li><strong>Continuous Learning:</strong> Maintain and sharpen the skills required for your role.</li>
      </ul>

      <h2>2. Integrity &amp; Character (The Foundation)</h2>
      <ul>
        <li><strong>Confidentiality (NDA):</strong> Protect sensitive data and information at all times.</li>
        <li><strong>Honesty in Reporting:</strong> Report progress and blockers accurately.</li>
        <li><strong>Representation:</strong> Do not speak for AfriVate without explicit permission.</li>
      </ul>

      <h2>3. The “Bridge” Protocol (Notice &amp; Departure)</h2>
      <ul>
        <li><strong>The Two-Week Rule:</strong> Provide at least two weeks’ notice before stepping away.</li>
        <li><strong>Knowledge Transfer:</strong> Hand over documents, access notes, and unfinished work cleanly.</li>
      </ul>

      <h2>4. Anti-Exploitation &amp; Safety (Your Rights)</h2>
      <ul>
        <li><strong>Right to Refuse:</strong> A volunteer may refuse work that is unsafe, unethical, or outside agreed scope.</li>
        <li><strong>Harassment-Free Zone:</strong> Report harassment immediately through AfriVate channels.</li>
        <li><strong>Work-Life Balance:</strong> Volunteers should not be pressured to work beyond agreed maximum hours.</li>
      </ul>

      <h2>5. Grounds for Termination of Status</h2>
      <p>A volunteer’s relationship with AfriVate and the Partner may be terminated for:</p>
      <ul>
        <li><strong>Lack of Productivity:</strong> Consistent failure to meet agreed-upon KPIs.</li>
        <li><strong>Breach of Contract:</strong> Violating the NDA or the terms of this Code.</li>
        <li><strong>Unprofessional Conduct:</strong> Behavior that damages the reputation of AfriVate or the Partner.</li>
      </ul>

      <div class="sign-block">
        <p><strong>Signed,</strong></p>
        <div class="sign-row">
          <div class="sign-card">
            <div class="who">Joshua Oluwasujibomi Komolafe</div>
            <div class="role">CEO, Afrivate Technologies Limited</div>
          </div>
          <div class="sign-card">
            <div class="who">Daniel Ifeoluwasubomi Akinyemi</div>
            <div class="role">CHRO, Afrivate Technologies Limited</div>
          </div>
        </div>
      </div>
    `,
  },
]

await mkdir(outDir, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage()

const footerTemplate = `
  <div style="width:100%;font-size:9px;color:#666;padding:0 18mm;display:flex;justify-content:space-between;font-family:Segoe UI, Arial, sans-serif;">
    <span>afrivatetech@gmail.com · X: afrivate tech · Instagram: afrivate_tech</span>
    <span>RC: 9210092 · Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
  </div>`

for (const doc of docs) {
  const html = shell(doc.title, doc.body, doc.meta)
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
    footerTemplate,
    margin: { top: '16mm', right: '16mm', bottom: '18mm', left: '18mm' },
  })
  console.log('Wrote', pdfPath)
}

await browser.close()
console.log('Done')

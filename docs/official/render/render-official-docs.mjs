import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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
      ['Target Audience', 'Team Leads'],
      ['Focus', 'Authority, Accountability & Delivery'],
    ],
    body: `
      <h2>Introduction</h2>
      <p>This Playbook defines the operational authority, responsibilities, and success metrics for Team Leads at AfriVate Technologies Ltd. It ensures consistent leadership standards across all departments.</p>
      <div class="note"><strong>Operating systems:</strong> Slack is AfriVate’s official internal communication channel. The AfriVate Portal is the system of record for operational workflows, including tasks, weekly check-ins, goals, leave, onboarding, learning, resources, surveys, feedback, performance records, events, and people operations.</div>

      <h2>C1. Core Responsibilities of Team Leads</h2>
      <ul>
        <li><strong>Task management:</strong> Create, assign, clarify, and reassign work through <strong>Portal → My work</strong>, including the outcome, owner, priority, deadline, status, hours, dependencies, and blockers.</li>
        <li><strong>Goals and KPIs:</strong> Agree goals with direct reports, record them through <strong>Portal → Growth → OKRs</strong>, and review progress through Weekly check-in.</li>
        <li><strong>Performance monitoring:</strong> Use Portal tasks, weekly check-ins, OKRs, IDPs, feedback, and 1:1 records to maintain an accurate performance record.</li>
        <li><strong>Disciplinary authority:</strong> Initiate first-level disciplinary actions in accordance with the Standard Work Process and applicable People &amp; Culture procedures.</li>
        <li><strong>Escalation:</strong> Record risks and blockers in the relevant Portal workflow and communicate or escalate them through Slack.</li>
      </ul>

      <h2>C2. Team Lead Authority Boundaries</h2>
      <h3>Team Leads may:</h3>
      <ul>
        <li>Assign and reassign tasks within their team through the Portal</li>
        <li>Agree KPIs with direct reports, record goals in Portal OKRs, and review progress through Weekly check-in</li>
        <li>Review team leave requests, check handover and delivery impact, and record the permitted recommendation or decision in the Portal</li>
        <li>Use Slack to clarify work, coordinate delivery, and communicate operational decisions</li>
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
        <li>Clear title, outcome, and description entered in the Portal</li>
        <li>Owner or assignees confirmed</li>
        <li>Priority and deadline stated</li>
        <li>Dependencies, files, and success criteria attached where relevant</li>
        <li>Clarification and follow-up communication handled through Slack</li>
      </ol>
      <div class="note"><strong>Completeness requirement:</strong> A task that omits any of the above elements is incomplete and must be corrected before it is treated as valid assigned work.</div>
    `,
  },
  {
    folder: 'policies',
    file: 'Afrivate-Employee-Onboarding-Handbook.pdf',
    htmlFile: 'Afrivate-Employee-Onboarding-Handbook.html',
    title: 'Afrivate Employee Onboarding Handbook',
    meta: [
      ['Document Code', 'AFRI-EOH-01'],
      ['Target Audience', 'New Hires & Existing Staff'],
      ['Status', 'Mandatory Reading'],
    ],
    body: `
      <h2>Welcome to AfriVate</h2>
      <p>This handbook provides a formal orientation to AfriVate Technologies Ltd for new and existing personnel. It summarises culture, communication, performance, and conduct expectations.</p>
      <div class="note"><strong>Precedence:</strong> This handbook does not supersede the Standard Work Process (SWP). Where any conflict arises, the SWP prevails.</div>

      <h2>1. Mission &amp; Culture Overview</h2>
      <p>AfriVate is building the future of user connectivity. Our culture is founded on excellence, ownership, professionalism, and disciplined execution.</p>

      <h2>2. Schedule &amp; Availability</h2>
      <ul>
        <li><strong>Official work days:</strong> Monday to Thursday.</li>
        <li><strong>Friday to Sunday:</strong> Off-days or asynchronous update days, unless an approved team schedule states otherwise.</li>
        <li><strong>Core hours:</strong> Personnel must remain reachable and active during team-defined core hours on official work days.</li>
      </ul>

      <h2>3. Communication Standards</h2>
      <ul>
        <li><strong>Four-hour acknowledgement rule:</strong> Official messages received through Slack must be acknowledged within four (4) hours during official work days.</li>
        <li><strong>Official communication channel:</strong> Slack is the approved channel for internal communication, coordination, clarification, and follow-up.</li>
        <li><strong>Portal as system of record:</strong> Complete and record every applicable workflow in the AfriVate Portal, including tasks, weekly check-ins, leave, onboarding, goals, learning submissions, surveys, feedback, policy acknowledgements, resources, events, and people operations.</li>
        <li><strong>Email:</strong> Use your @afrivate email address for account access and approved external or formal correspondence. Email does not replace Slack for internal operational communication.</li>
      </ul>

      <h2>4. Performance &amp; Reporting</h2>
      <ul>
        <li>Each employee maintains three to five (3–5) weekly KPIs.</li>
        <li>Agree goals with your Team Lead and record them through <strong>Portal → Growth → OKRs</strong>.</li>
        <li>Submit the weekly report through <strong>Portal → Weekly check-in</strong> for Team Lead review.</li>
        <li>Maintain accurate Portal task records, including status, progress, hours, and blockers.</li>
        <li>Individual and team goals must support AfriVate’s organisational target of <strong>1,000,000 users by 31 December 2026</strong>.</li>
      </ul>

      <h2>5. Evaluation &amp; Conduct</h2>
      <ul>
        <li>Appraisals are weighted <strong>60% output / deliverables</strong> and <strong>40% professional and behavioural competencies</strong>.</li>
        <li>AfriVate applies progressive discipline: coaching or verbal warning, written warning, Performance Improvement Plan (PIP), restricted duties where applicable, and termination subject to fair review.</li>
      </ul>
      <p><strong>Conduct expectations:</strong></p>
      <ul>
        <li>Act with integrity.</li>
        <li>Pursue consistent excellence.</li>
        <li>Respect reporting lines and organisational authority.</li>
        <li>Protect company data and confidential information.</li>
      </ul>

      <h2>New Hire Checklist</h2>
      <ol>
        <li>☐ Sign in to the AfriVate Portal and complete the assigned onboarding checklist and videos.</li>
        <li>☐ Open the SWP under <strong>Portal → Resources</strong>, read it in full, and complete the required policy acknowledgement.</li>
        <li>☐ Join the AfriVate Slack workspace and the assigned team channels.</li>
        <li>☐ Configure your @afrivate email account for access and approved external correspondence.</li>
        <li>☐ Agree three to five (3–5) initial KPIs with your Team Lead and record the goals through <strong>Portal → Growth → OKRs</strong>.</li>
        <li>☐ Review assigned tasks and submit progress through <strong>Portal → Weekly check-in</strong>.</li>
      </ol>
    `,
  },
  {
    folder: 'policies',
    file: 'Afrivate-Volunteer-Code-of-Conduct.pdf',
    htmlFile: 'Afrivate-Volunteer-Code-of-Conduct.html',
    title: 'Afrivate Volunteer Code of Conduct',
    meta: [
      ['Document Type', 'Code of Conduct'],
      ['Audience', 'Volunteers & Partner Collaborators'],
      ['Status', 'Binding upon acceptance'],
    ],
    body: `
      <h2>1. Professionalism &amp; Excellence</h2>
      <ul>
        <li><strong>Reliability:</strong> Meet commitments, deadlines, and agreed deliverables consistently.</li>
        <li><strong>Excellence:</strong> Produce work that reflects AfriVate’s quality and professionalism standards.</li>
        <li><strong>Continuous learning:</strong> Maintain and develop the skills required for the assigned role.</li>
      </ul>

      <h2>2. Integrity &amp; Character</h2>
      <ul>
        <li><strong>Confidentiality:</strong> Protect sensitive data and information at all times, in accordance with any applicable non-disclosure obligations.</li>
        <li><strong>Honesty in reporting:</strong> Record progress and blockers accurately in Portal tasks and Weekly check-in; use Slack for related communication and clarification.</li>
        <li><strong>Representation:</strong> Do not speak on behalf of AfriVate without prior written authorisation.</li>
      </ul>

      <h2>3. Notice &amp; Departure Protocol</h2>
      <ul>
        <li><strong>Notice period:</strong> Provide at least two (2) weeks’ written notice before ending the volunteer engagement.</li>
        <li><strong>Knowledge transfer:</strong> Update unfinished tasks, shared notes, learning records, and applicable resources in the Portal, then communicate the handover and clarify ownership through Slack.</li>
      </ul>

      <h2>4. Safety, Fair Treatment &amp; Rights</h2>
      <ul>
        <li><strong>Right to refuse:</strong> A volunteer may refuse work that is unsafe, unethical, or outside the agreed scope.</li>
        <li><strong>Harassment-free workplace:</strong> Submit a confidential report through <strong>Portal → People → Growth → Speak up</strong>. Use Slack only for necessary follow-up communication.</li>
        <li><strong>Working hours:</strong> Volunteers must not be required to work beyond agreed maximum hours.</li>
      </ul>

      <h2>5. Official Systems &amp; Records</h2>
      <ul>
        <li><strong>Slack:</strong> The official channel for internal communication, coordination, clarification, and follow-up.</li>
        <li><strong>AfriVate Portal:</strong> The official system for every feature and workflow available within the website, including tasks, check-ins, onboarding, learning, leave, goals, feedback, surveys, resources, acknowledgements, events, and people processes.</li>
        <li><strong>Accuracy:</strong> Volunteers must keep their assigned Portal records complete and current. A Slack message does not replace a required Portal submission or update.</li>
      </ul>

      <h2>6. Grounds for Termination of Status</h2>
      <p>A volunteer’s relationship with AfriVate and the Partner may be terminated for:</p>
      <ul>
        <li><strong>Inadequate productivity:</strong> Consistent failure to meet agreed KPIs.</li>
        <li><strong>Breach of obligations:</strong> Violation of confidentiality obligations or the terms of this Code.</li>
        <li><strong>Unprofessional conduct:</strong> Behaviour that damages the reputation of AfriVate or the Partner.</li>
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
  {
    folder: 'policies',
    file: 'Afrivate-Standard-Work-Process.pdf',
    htmlFile: 'Afrivate-Standard-Work-Process.html',
    title: 'Afrivate Standard Work Process (SWP)',
    meta: [
      ['Document Status', 'Official Internal Policy'],
      ['Applies To', 'All AfriVate Employees, Contractors, Volunteers & Team Leads'],
      ['Effective Date', '4 February 2026'],
      ['Review Cycle', 'Every 6 Months'],
      ['Approved By', 'CEO & Executive Leadership'],
    ],
    body: `
      <h2>1. Purpose of This Document</h2>
      <p>The AfriVate Standard Work Process (SWP) is the authoritative framework governing how work is performed, managed, recorded, and evaluated across the organisation. It formalises operations, establishes accountability, and sets clear expectations for professional conduct, performance, and collaboration across all teams.</p>
      <p>This document is designed to:</p>
      <ul>
        <li><strong>Eliminate ambiguity</strong> by clearly defining roles, responsibilities, authority, and expectations.</li>
        <li><strong>Standardise operations</strong> so work is executed consistently across teams.</li>
        <li><strong>Enable accountability</strong> through measurable standards, accurate Portal records, and appropriate consequences.</li>
        <li><strong>Support scalability</strong> through systems suitable for growth, hiring, delivery, and infrastructure expansion.</li>
      </ul>
      <div class="note"><strong>Mandatory compliance:</strong> This SWP is the primary operational standard for AfriVate personnel. Failure to comply may result in corrective or disciplinary action.</div>

      <h2>2. Core Principles</h2>
      <ul>
        <li><strong>Accountability:</strong> Every role has defined ownership, deliverables, and measurable outcomes. Team members own the quality, timeliness, impact, and accurate reporting of their work.</li>
        <li><strong>Structure with Flexibility:</strong> AfriVate maintains clear systems for order and predictability while permitting justified flexibility that does not weaken accountability.</li>
        <li><strong>Professionalism:</strong> All personnel must demonstrate reliability, ethical conduct, time discipline, and respect. Informality must never become laxity or missed obligations.</li>
        <li><strong>Transparency:</strong> Expectations, decisions, evaluations, and consequences must be clearly documented and communicated through the approved systems.</li>
        <li><strong>Performance-Driven Growth:</strong> Advancement and opportunities are earned through consistent results and professional behaviour.</li>
        <li><strong>Excellence:</strong> Work must be thoughtful, precise, impactful, and continuously improved—not merely completed.</li>
      </ul>

      <h2>3. Organisational Structure &amp; Authority</h2>
      <h3>3.1 Leadership Hierarchy</h3>
      <ul>
        <li><strong>Chief Executive Officer (CEO):</strong> Strategic direction, final decision-making authority, and organisational accountability.</li>
        <li><strong>Executive Leadership / C-Level:</strong> Departmental oversight, strategy execution, and cross-functional alignment.</li>
        <li><strong>Team Leads:</strong> Day-to-day operational management, task assignment, performance monitoring, review, and escalation.</li>
        <li><strong>Team Members:</strong> Execution of assigned responsibilities and delivery of defined outcomes.</li>
      </ul>
      <p>Leadership roles exist to manage responsibility, performance, and escalation. They do not imply personal superiority.</p>

      <h3>3.2 Reporting Lines</h3>
      <ul>
        <li>Team Members report to their assigned Team Lead or formally designated manager.</li>
        <li>Team Leads report to their Department Head or the CEO, depending on the approved structure.</li>
        <li>Direct CEO escalation is reserved for critical risks, authorised matters, or situations where the normal reporting line is implicated.</li>
        <li>Reporting relationships, departments, and team assignments must be maintained accurately in the AfriVate Portal.</li>
      </ul>

      <h2>4. Work Schedule &amp; Availability</h2>
      <h3>4.1 Official Work Days</h3>
      <ul>
        <li><strong>Monday to Thursday:</strong> Primary execution, collaboration, meetings, and decision-making.</li>
        <li><strong>Friday to Sunday:</strong> Off-days or asynchronous update days unless an approved team schedule states otherwise.</li>
      </ul>
      <p>Teams supporting weekend operations may schedule work in advance with Team Lead approval and appropriate notice.</p>

      <h3>4.2 Work Hours &amp; Meetings</h3>
      <ul>
        <li>Each team will define core availability hours within official work days.</li>
        <li>Team members must be reachable through Slack during those hours.</li>
        <li>Meetings require punctuality, preparation, active participation, and advance notice where attendance is impossible.</li>
        <li>Repeated unauthorised unavailability, lateness, absence, or disengagement may affect performance evaluation.</li>
      </ul>

      <h2>5. Official Systems &amp; Communication</h2>
      <h3>5.1 Slack: Official Internal Communication</h3>
      <p>Slack is AfriVate’s official channel for internal communication, coordination, clarification, follow-up, and operational escalation. Official Slack messages must be professional, clear, solution-oriented, and acknowledged within <strong>four (4) hours</strong> during official work days.</p>
      <p>Personal messaging applications, including WhatsApp, must not replace Slack for official work. Slack supports day-to-day coordination only; the AfriVate Portal remains the system of record for submissions, approvals, acknowledgements, and operational history. Email is reserved for account access, approved external correspondence, and circumstances expressly authorised by leadership.</p>

      <h3>5.2 AfriVate Portal: Official System of Record</h3>
      <p>The AfriVate Portal is the official system for every feature and workflow available within the website. Where a Portal feature exists, the relevant work must be completed and recorded there. This includes:</p>
      <ul>
        <li>Tasks, assignees, priorities, deadlines, status, progress, hours, and blockers;</li>
        <li>Weekly check-ins, goals and OKRs, 1:1 records, development plans, feedback, and milestones;</li>
        <li>Leave requests, supporting documents, reviews, and decisions;</li>
        <li>Onboarding, learning assignments, certificate submissions, and completion records;</li>
        <li>Resources, policy acknowledgements, surveys, events, and approved company records;</li>
        <li>People operations, reporting relationships, grievances, recruitment, recognition, and other enabled workflows.</li>
      </ul>
      <div class="note"><strong>System rule:</strong> Slack is used to communicate; the Portal is used to perform and record the corresponding workflow. A Slack message does not replace a required Portal submission, approval, acknowledgement, or update.</div>

      <h2>6. Standard Work Process (How Work Is Done)</h2>
      <h3>6.1 Task Assignment</h3>
      <p>All actionable work must be recorded in the Portal by the authorised owner or Team Lead. A valid task must contain:</p>
      <ul>
        <li><strong>Clear Owner:</strong> One accountable owner or identified assignees.</li>
        <li><strong>Defined Outcome:</strong> A clear description of successful completion.</li>
        <li><strong>Priority &amp; Deadline:</strong> The relative urgency and agreed delivery date.</li>
        <li><strong>Supporting Context:</strong> Relevant files, dependencies, notes, and success criteria.</li>
      </ul>
      <p>Clarification and coordination occur through Slack; the agreed outcome must then be reflected in the Portal task.</p>

      <h3>6.2 Execution &amp; Reporting</h3>
      <ul>
        <li>Execute work to agreed quality, security, and professional standards.</li>
        <li>Keep Portal tasks current by recording status, progress, hours, and blockers.</li>
        <li>Communicate risks, delays, and blockers early through Slack.</li>
        <li>Submit the weekly report through <strong>Portal → Weekly check-in</strong> against defined KPIs.</li>
        <li>Team Leads review performance and escalate where required.</li>
      </ul>

      <h2>7. Targets, KPIs &amp; Performance Management</h2>
      <h3>7.1 Company and Individual Targets</h3>
      <p>AfriVate’s primary strategic objective is <strong>1,000,000 users by 31 December 2026</strong>. Departmental and individual goals must directly or indirectly support this objective.</p>
      <p>Each team member must maintain <strong>3–5 weekly KPIs</strong> that are specific, measurable, actionable, and results-driven. Goals are recorded in Portal OKRs and progress is reported through Weekly check-in.</p>

      <h3>7.2 Appraisal Structure</h3>
      <ul>
        <li><strong>60% Deliverables &amp; Output:</strong> Quality, timeliness, consistency, and impact.</li>
        <li><strong>40% Professional Skills:</strong> Communication, ownership, attitude, teamwork, reliability, and conduct.</li>
      </ul>
      <p>Standard employees receive quarterly appraisals. Employees with active performance concerns may receive monthly reviews or a Performance Improvement Plan (PIP). Portal records—including tasks, check-ins, OKRs, feedback, 1:1s, and development plans—form part of the evidence used in a fair evaluation.</p>

      <h3>7.3 Performance Scale</h3>
      <ul>
        <li><strong>70% and above:</strong> Exceptional performance; reward-eligible.</li>
        <li><strong>60–69%:</strong> Good performance.</li>
        <li><strong>50–59%:</strong> Performance concern; coaching required.</li>
        <li><strong>40–49%:</strong> Disciplinary or corrective action may apply.</li>
        <li><strong>Below 40%:</strong> Termination consideration, subject to fair review and applicable policy.</li>
      </ul>

      <h2>8. Leave, Attendance &amp; Continuity</h2>
      <p>Leave must be requested through the AfriVate Portal in accordance with the current Leave and Absence Policy. Except for accepted medical or clearly specified personal emergencies, a minimum of <strong>three (3) official work days’ notice</strong> is required.</p>
      <p>Before leave, outstanding work must be completed or reassigned, Portal tasks and shared records must be updated, and the handover must be communicated through Slack. A request is not approved until the decision is recorded in the Portal. Repeated avoidable impromptu leave may attract corrective action.</p>

      <h2>9. Discipline &amp; Corrective Action</h2>
      <p>Discipline exists to correct behaviour and protect organisational standards. Triggers may include missed deadlines, inaccurate reporting, poor communication, unauthorised absence, misconduct, repeated underperformance, security violations, or failure to use the approved systems.</p>
      <ol>
        <li>Documented coaching or verbal warning</li>
        <li>Written warning</li>
        <li>Performance Improvement Plan (PIP)</li>
        <li>Restricted responsibilities or other proportionate corrective action</li>
        <li>Termination, subject to fair review and applicable requirements</li>
      </ol>

      <h2>10. Reward &amp; Incentive System</h2>
      <p>Subject to leadership approval, performance, affordability, and applicable terms, recognition may include bonuses, learning opportunities, public recognition, representation at approved events, speaking opportunities, awards, or long-term benefits. Recognition and awards available through the Portal should be recorded there.</p>

      <h2>11. Culture &amp; Employee Engagement</h2>
      <ul>
        <li><strong>Ownership:</strong> Take responsibility for outcomes, not only effort.</li>
        <li><strong>Punctuality:</strong> Respect commitments across meetings, deadlines, and responses.</li>
        <li><strong>Respect for Authority:</strong> Follow reporting lines while retaining the right to raise concerns responsibly.</li>
        <li><strong>Speak Up:</strong> Confidential workplace concerns may be submitted through <strong>Portal → People → Growth → Speak up</strong>.</li>
        <li><strong>Participation:</strong> Complete assigned surveys, learning, onboarding, policy acknowledgements, feedback, and development workflows in the Portal.</li>
      </ul>

      <h2>12. Crisis Management &amp; Escalation</h2>
      <p>A crisis is an event posing immediate risk to operations, reputation, infrastructure, legal standing, safety, or user trust. The escalation flow is:</p>
      <ol>
        <li>The Team Member communicates the issue immediately through Slack and records the relevant operational detail in the Portal where an applicable workflow exists.</li>
        <li>The Team Lead assesses severity and escalates a critical issue within one hour.</li>
        <li>Executive Leadership coordinates the response.</li>
        <li>The CEO retains final authority over crisis decisions.</li>
      </ol>

      <h2>13. Document Governance &amp; Amendments</h2>
      <p>This SWP is a living document reviewed every six months or when material operational changes occur. The current approved copy will be maintained under Portal Resources. Personnel are responsible for reading the current version and completing the required Portal policy acknowledgement.</p>

      <h2>14. Employee Acknowledgement</h2>
      <p>By completing the policy acknowledgement in the AfriVate Portal, the team member confirms that they have read, understood, and agree to comply with this SWP. Where a physical signature is required, complete the fields below.</p>
      <div class="sign-block">
        <div class="sign-row">
          <div class="sign-card"><div class="who">Employee Name / Signature</div><div class="role">Role / Department · Date</div></div>
          <div class="sign-card"><div class="who">Authorised AfriVate Representative</div><div class="role">Name / Role · Date</div></div>
        </div>
      </div>
    `,
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
      <ul>
        <li><strong>Remote, flexible work:</strong> A full-time role with a flexible work structure focused on accountability and outcomes.</li>
        <li><strong>Equity participation:</strong> A 2% equity stake vesting over two years, subject to the formal equity award, vesting terms, continued service, and applicable company documentation.</li>
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
      <ul>
        <li><strong>Remote, flexible work:</strong> A full-time role with a flexible work structure focused on accountability and outcomes.</li>
        <li><strong>Equity participation:</strong> A 2% equity stake vesting over two years, subject to the formal equity award, vesting terms, continued service, and applicable company documentation.</li>
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
      <ul>
        <li><strong>Remote, flexible work:</strong> A full-time role with a flexible work structure focused on accountability and outcomes.</li>
        <li><strong>Equity participation:</strong> A 2% equity stake vesting over two years, subject to the formal equity award, vesting terms, continued service, and applicable company documentation.</li>
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
      ['Target Audience', 'All Staff & Volunteers'],
      ['Policy Owner', 'People & Culture (HR)'],
      ['Status', 'Mandatory Compliance'],
    ],
    body: `
      <h2>1. Purpose</h2>
      <p>This Policy establishes a clear and consistent process for requesting leave from AfriVate Technologies Ltd. It is designed to protect employee wellbeing while ensuring continuity, accountability, and uninterrupted team delivery.</p>

      <h2>2. Notice Requirement</h2>
      <p>Except in an accepted emergency, every leave request must be submitted at least <strong>three (3) official work days</strong> before the first intended day of absence. Official work days are the days recognised by AfriVate as scheduled working days and do not include weekends, public holidays, or company-declared non-working days.</p>
      <div class="note"><strong>Important:</strong> Submission of a request does not constitute approval. Personnel must remain available for duty until the request has been formally approved in the Portal.</div>

      <h2>3. Work Completion &amp; Handover</h2>
      <p>Before proceeding on approved leave, the requesting team member must protect the continuity of their work. They are required to:</p>
      <ul>
        <li><strong>Complete outstanding work:</strong> Conclude all due or outstanding work for the relevant period before leave begins; or</li>
        <li><strong>Arrange reassignment:</strong> Where completion is not reasonably possible, agree with the Team Lead to reassign the work to an appropriate colleague;</li>
        <li><strong>Provide a clear handover:</strong> Share the status, deadlines, files, access information, and next actions needed by the colleague taking over; and</li>
        <li><strong>Confirm ownership:</strong> Ensure the Team Lead and receiving colleague understand and accept the temporary arrangement.</li>
      </ul>
      <p>Leave may be delayed or declined where an adequate handover has not been completed and business continuity would be materially affected.</p>

      <h2>4. Reason &amp; Approval</h2>
      <p>Every request must include a clear and truthful reason, the requested dates, and any relevant supporting information. The People &amp; Culture (HR) team retains the authority to <strong>approve or decline</strong> a leave request after considering:</p>
      <ul>
        <li>The reason and urgency of the request;</li>
        <li>The notice provided;</li>
        <li>The employee’s handover and outstanding responsibilities;</li>
        <li>Team capacity and operational requirements; and</li>
        <li>The employee’s recent leave and attendance record.</li>
      </ul>
      <p>HR may consult the relevant Team Lead before making a decision. Where reasonable and appropriate, HR will communicate the reason for a declined request.</p>

      <h2>5. Official Submission Channel</h2>
      <p>All leave requests must be submitted through the <strong>AfriVate Portal</strong>. Requests made solely through WhatsApp, Slack, email, telephone, or verbal conversation are not official and will not be treated as approved leave.</p>
      <ol>
        <li>Sign in to the AfriVate Portal.</li>
        <li>Open the Leave section and select the applicable leave type.</li>
        <li>Enter the dates and a clear reason for the request.</li>
        <li>Add handover details and supporting documentation where required.</li>
        <li>Submit the request and await the decision recorded in the portal.</li>
      </ol>

      <h2>6. Emergency &amp; Impromptu Leave</h2>
      <p>AfriVate recognises that an accepted emergency may make the required three official work days’ notice impossible. Emergency consideration is limited to:</p>
      <ul>
        <li><strong>Medical emergencies:</strong> An urgent illness, injury, hospital admission, or immediate medical situation affecting the team member or a person under their direct care.</li>
        <li><strong>Specified personal emergencies:</strong> A serious, unforeseen personal event that requires the team member’s immediate presence. The specific circumstances must be clearly stated in the portal request and may require reasonable supporting information.</li>
      </ul>
      <p>In either case, the team member must notify their Team Lead and HR as soon as reasonably possible and submit or regularise the request through the portal at the earliest opportunity.</p>
      <p>An emergency exception is not an automatic approval and must not be used to avoid the standard notice and handover requirements.</p>

      <h2>7. Repeated Impromptu Leave &amp; Consequences</h2>
      <p>Consistent impromptu leave, repeated late requests, unauthorised absence, or misuse of the emergency exception may attract corrective or disciplinary action. Depending on frequency, impact, and surrounding circumstances, action may include:</p>
      <ul>
        <li>A documented discussion or coaching;</li>
        <li>A verbal or written warning;</li>
        <li>Restriction or closer review of future discretionary leave requests; or</li>
        <li>Further action under AfriVate’s progressive discipline process.</li>
      </ul>
      <p>Any consequence will be considered fairly, with regard to the employee’s explanation, supporting evidence, attendance history, and applicable company policy.</p>

      <h2>8. Responsibilities</h2>
      <ul>
        <li><strong>Team Members:</strong> Submit timely and accurate requests, complete or hand over work, and wait for formal approval.</li>
        <li><strong>Team Leads:</strong> Assess delivery impact, support handover arrangements, and provide HR with an objective operational recommendation.</li>
        <li><strong>People &amp; Culture (HR):</strong> Review requests consistently, record decisions through the portal, and maintain appropriate leave records.</li>
      </ul>

      <div class="note"><strong>Policy standard:</strong> No leave is approved until the decision appears in the AfriVate Portal. Medical emergencies and clearly specified personal emergencies will be considered with fairness, but repeated avoidable non-compliance may attract a penalty under the progressive discipline process.</div>
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
}

await browser.close()
console.log('Done')

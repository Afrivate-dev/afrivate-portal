import { hrAcknowledgementSignBlockHtml } from '../hr-signature.mjs'

export const swpBody = `
      <div class="note"><strong>Status disclaimer:</strong> Compliance with this SWP is a condition of continued Portal access and contribution. It does <strong>not</strong> by itself create employment, wages, or benefits. Unpaid Internal Contributors are also bound by AFRI-ICEF-01. Structure detail is in AFRI-ORG-01. Decision rights are in AFRI-DOA-01.</div>

      <h2>1. Purpose and scope</h2>
      <p>The SWP is AfriVate’s authoritative framework for how work is performed, recorded, evaluated, corrected, and recognised. It applies to every Team Member with Portal access — paid or unpaid — and to Team Leads and Pillar Heads in their operational duties.</p>
      <p>Failure to comply may result in progressive discipline under §10, including end of unpaid engagement or, where a paid employment contract exists, termination of that contract subject to applicable law and any signed employment instrument.</p>

      <h2>2. Definitions</h2>
      <table>
        <thead><tr><th>Term</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td>Team Member</td><td>Any person with approved Portal access performing AfriVate work.</td></tr>
          <tr><td>Internal Contributor</td><td>An unpaid Team Member engaged under AFRI-ICEF-01.</td></tr>
          <tr><td>Official work days</td><td>Monday to Thursday, excluding public holidays and company-declared non-working days.</td></tr>
          <tr><td>Core hours</td><td>The daily availability window on official work days that the Team Lead records for the team.</td></tr>
          <tr><td>Agreed Capacity</td><td>The hours/days a Team Member commits to AfriVate work, recorded in writing or the Portal.</td></tr>
          <tr><td>Writing</td><td>@afrivate email, Portal Memo, or signed instrument — not WhatsApp alone.</td></tr>
          <tr><td>System of record</td><td>The Portal feature that holds the authoritative record for a workflow (tasks, leave, OKRs, etc.).</td></tr>
        </tbody>
      </table>

      <h2>3. Core principles</h2>
      <ul>
        <li><strong>Accountability:</strong> Every role has defined ownership and measurable outcomes. Team Members own quality, timeliness, impact, and accurate reporting.</li>
        <li><strong>Documented flexibility only:</strong> Exceptions to process require Team Lead or Pillar Head approval recorded in the Portal or in writing. Informal “flexibility” that erases accountability is not permitted.</li>
        <li><strong>Professionalism:</strong> Reliability, ethical conduct, time discipline, and respect are mandatory.</li>
        <li><strong>Transparency:</strong> Expectations, decisions, evaluations, and consequences must be recorded in approved systems.</li>
        <li><strong>Excellence:</strong> Work must meet the stated success criteria — completion without quality is failure.</li>
        <li><strong>Single source of truth:</strong> Where the Portal has a feature for a workflow, the Portal record prevails over chat claims.</li>
      </ul>

      <h2>4. Structure and authority</h2>
      <p>Hierarchy and pillar ownership are set exclusively by <strong>AFRI-ORG-01</strong>. In summary:</p>
      <ul>
        <li><strong>CEO</strong> — strategy and final organisational authority.</li>
        <li><strong>Pillar Heads</strong> — ownership of pillar outcomes.</li>
        <li><strong>Team Leads</strong> — day-to-day operational management under AFRI-TLOP-01.</li>
        <li><strong>Human Resources Manager (People &amp; Culture)</strong> — policy stewardship, people systems, recruitment administration, learning, surveys, and progressive discipline process administration.</li>
        <li><strong>Team Members</strong> — execution of assigned outcomes.</li>
      </ul>
      <p>Reporting lines in the Portal Directory are conclusive for day-to-day authority. Direct CEO escalation is limited to critical risk, authorised matters, or where the normal line is implicated (including Speak up).</p>

      <h2>5. Work schedule and availability</h2>
      <ul>
        <li><strong>Monday–Thursday:</strong> Official work days for execution, collaboration, meetings, and decisions.</li>
        <li><strong>Friday–Sunday:</strong> Not official work days. Duty exists only if Agreed Capacity or an approved written/Portal team schedule expressly requires specified work.</li>
        <li>Team Members must be reachable on Slack during core hours on official work days.</li>
        <li>Meetings require punctuality, preparation, and advance notice if attendance is impossible.</li>
        <li>Repeated unauthorised unavailability, lateness, absence, or disengagement is a performance and conduct issue under §10.</li>
        <li>Working outside Agreed Capacity without approval does not create entitlement to recognition, leave, or pay.</li>
      </ul>

      <h2>6. Official systems</h2>
      <h3>6.1 Slack</h3>
      <p>Official channel for internal communication, coordination, clarification, follow-up, and operational escalation. Official messages must be acknowledged within <strong>four (4) hours</strong> during official work days and core hours.</p>
      <ul>
        <li>Use channels for work visible to the team; use DMs for legitimately private one-to-one matters.</li>
        <li>Summarize decisions after long threads; link to the Portal task or memo where the decision is recorded.</li>
        <li>WhatsApp must not replace Slack for official work, leave, policy acknowledgement, or performance management.</li>
      </ul>
      <h3>6.2 Portal</h3>
      <p>The Portal is the system of record wherever a feature exists, including tasks, weekly check-ins, OKRs, 1:1s, leave, onboarding, learning, resources, acknowledgements, surveys, events, directory, and people workflows.</p>
      <div class="note"><strong>System rule:</strong> Slack communicates; the Portal records. A Slack message never replaces a required Portal submission, approval, acknowledgement, or update.</div>
      <h3>6.3 Email</h3>
      <p>Use @afrivate email for authorised external correspondence and account security. Email does not replace Slack for day-to-day internal ops or the Portal for workflow records.</p>

      <h2>7. How work is assigned and executed</h2>
      <h3>7.1 Task assignment standards</h3>
      <p>All actionable work must be recorded in the Portal. A valid task requires:</p>
      <ul>
        <li>Clear owner or assignees</li>
        <li>Defined outcome (what “done” looks like)</li>
        <li>Priority and deadline</li>
        <li>Supporting context: files, dependencies, links, and success criteria</li>
      </ul>
      <p>Clarification may occur on Slack; the agreed outcome must be reflected in the Portal task before execution proceeds on ambiguous work.</p>
      <h3>7.2 Execution standards</h3>
      <ul>
        <li>Execute to agreed quality, security, and professional standards for your function.</li>
        <li>Keep Portal tasks current (status, progress, hours, blockers) at least every official work day the task is active.</li>
        <li>Raise risks and delays early on Slack <strong>and</strong> in the Portal — not after the deadline.</li>
        <li>Submit <strong>Portal → Weekly check-in</strong> each period against defined KPIs, including when progress was blocked.</li>
        <li>Hand over work clearly when interrupted by leave, reassignment, or end of engagement.</li>
      </ul>
      <h3>7.3 Prohibited work practices</h3>
      <ul>
        <li>Claiming completion without meeting stated success criteria.</li>
        <li>Performing material work with no Portal record when a task workflow exists.</li>
        <li>Ignoring official messages beyond the four-hour rule without explanation.</li>
        <li>Using WhatsApp or informal channels to bypass leave, discipline, or policy acknowledgement.</li>
      </ul>

      <h2>8. Meetings and collaboration</h2>
      <ul>
        <li>Meetings require an agenda or stated purpose, a designated owner, and documented outcomes where decisions are made.</li>
        <li>Decisions that assign work must result in Portal tasks within one official work day.</li>
        <li>Record townhall and all-hands actions in Memos or tasks — attendance alone is not execution.</li>
        <li>Respect others’ time: start and end on schedule; do not double-book core hours without notice.</li>
      </ul>

      <h2>9. Documentation, quality, and handover</h2>
      <h3>9.1 Documentation</h3>
      <ul>
        <li>Store deliverables and source files in approved locations referenced from the Portal task.</li>
        <li>Use clear naming, version notes, and README/context where another Team Member must continue the work.</li>
        <li>Do not leave critical knowledge only in private chats.</li>
      </ul>
      <h3>9.2 Quality standards</h3>
      <p>Quality means the deliverable meets the agreed success criteria and is fit for its intended use. Examples:</p>
      <ul>
        <li><strong>Engineering:</strong> Works as specified, reviewed, tested appropriately, no known critical defects undocumented.</li>
        <li><strong>Design / media:</strong> On-brand, correct dimensions, editable source retained, approved before external publish.</li>
        <li><strong>Operations / HR:</strong> Accurate, timely, confidential information protected, recorded in the Portal.</li>
      </ul>
      <h3>9.3 Handover</h3>
      <p>Before leave, reassignment, or departure, provide: status summary, links, credentials handoff where authorised, open risks, and next actions — in the Portal task and to your Team Lead in writing.</p>

      <h2>10. Targets, KPIs, and performance management</h2>
      <p>Departmental and individual goals must support organisational objectives published by the CEO for the relevant period. Each Team Member maintains <strong>3–5 weekly KPIs</strong>, recorded in Portal OKRs and reported via Weekly check-in.</p>
      <ul>
        <li><strong>Appraisal weights:</strong> 60% deliverables/output; 40% professional conduct.</li>
        <li><strong>Cadence:</strong> Ordinary appraisals are quarterly. Active performance concerns may trigger monthly review or a PIP.</li>
        <li><strong>Evidence:</strong> Portal tasks, check-ins, OKRs, feedback, 1:1s, learning records, and development plans.</li>
        <li><strong>Team Lead duty:</strong> Agree KPIs, review check-ins, coach, and escalate sustained underperformance to People &amp; Culture.</li>
      </ul>
      <p><strong>Performance scale (indicative):</strong></p>
      <table>
        <thead><tr><th>Score band</th><th>Meaning</th><th>Typical action</th></tr></thead>
        <tbody>
          <tr><td>70%+</td><td>Exceptional</td><td>Recognition-eligible under §11; consider expanded responsibility.</td></tr>
          <tr><td>60–69%</td><td>Good</td><td>Continue; maintain standards.</td></tr>
          <tr><td>50–59%</td><td>Concern</td><td>Documented coaching required.</td></tr>
          <tr><td>40–49%</td><td>Underperformance</td><td>Written warning or PIP may apply.</td></tr>
          <tr><td>Below 40%</td><td>Critical</td><td>End of engagement or employment termination may apply, subject to fair review.</td></tr>
        </tbody>
      </table>

      <h2>11. Recognition</h2>
      <p>Recognition (learning opportunities, public recognition, events, awards, or — only if separately approved in writing by the CEO — any cash or equity benefit) is discretionary, subject to performance, affordability, and AFRI-DOA-01. No Team Member has a right to bonus or reward. Portal awards must be recorded in the Portal.</p>

      <h2>12. Discipline and corrective action</h2>
      <p>Triggers include missed deadlines, inaccurate reporting, poor communication, unauthorised absence, misconduct, repeated underperformance, security violations, confidentiality breaches, and failure to use approved systems.</p>
      <h3>12.1 Progressive steps</h3>
      <ol>
        <li>Documented coaching or verbal warning (recorded by Team Lead or HR)</li>
        <li>Written warning (copied to People &amp; Culture)</li>
        <li>Performance Improvement Plan (PIP) with measurable targets and timeline</li>
        <li>Restricted responsibilities or other proportionate corrective action</li>
        <li>End of unpaid engagement and/or termination of paid employment, subject to AFRI-DOA-01, AFRI-ICEF-01, and applicable law</li>
      </ol>
      <p>AfriVate may skip steps for serious misconduct (including dishonesty, harassment, confidentiality breach, or security violations).</p>
      <h3>12.2 Mandatory system compliance</h3>
      <p>Failure to join or remain on official systems when required (e.g. Slack workspace, Portal onboarding, policy acknowledgements) may be treated as non-compliance with this SWP and may result in corrective action up to end of engagement, as demonstrated in operational enforcement.</p>

      <h2>13. Culture, speak up, and surveys</h2>
      <ul>
        <li>Own outcomes, not only effort.</li>
        <li>Respect commitments (meetings, deadlines, response times).</li>
        <li>Follow reporting lines; raise concerns through <strong>Portal → People → Growth → Speak up</strong>.</li>
        <li>Complete assigned surveys, learning, onboarding, acknowledgements, and development workflows honestly and on time.</li>
        <li>Retaliation against good-faith Speak up reports is prohibited.</li>
      </ul>

      <h2>14. Security and confidential information</h2>
      <ul>
        <li>Protect Portal credentials, workspace access, and unreleased company information.</li>
        <li>Do not exfiltrate user data, partner terms, or internal metrics without authorisation.</li>
        <li>Report suspected incidents immediately to your Team Lead and People &amp; Culture.</li>
        <li>Follow secure engineering and document-handling practices applicable to your role.</li>
      </ul>

      <h2>15. Crisis escalation</h2>
      <p>A crisis is an event posing immediate risk to operations, reputation, infrastructure, legal standing, safety, or user trust.</p>
      <ol>
        <li>Team Member notifies via Slack immediately and records detail in the Portal where a workflow exists.</li>
        <li>Team Lead assesses and, if critical, escalates to Pillar Head and CEO within <strong>sixty (60) minutes</strong> of becoming aware it is critical.</li>
        <li>Pillar Heads coordinate the operational response.</li>
        <li>CEO retains final authority over crisis decisions and public statements.</li>
      </ol>

      <h2>16. Leave</h2>
      <p>Absence from duty is governed exclusively by AFRI-LAP-01. No leave is effective until the People &amp; Culture decision appears in the Portal.</p>

      <h2>17. Portal workflow quick reference</h2>
      <table>
        <thead><tr><th>Workflow</th><th>Portal path</th><th>Rule</th></tr></thead>
        <tbody>
          <tr><td>Assigned work</td><td>Tasks</td><td>Must exist before execution on non-trivial work.</td></tr>
          <tr><td>Weekly reporting</td><td>Weekly check-in</td><td>Submit each period; no silent weeks.</td></tr>
          <tr><td>Goals</td><td>Growth → OKRs</td><td>3–5 KPIs, measurable.</td></tr>
          <tr><td>Leave</td><td>Leave / Time off</td><td>Only Portal approval counts.</td></tr>
          <tr><td>Policies</td><td>Resources</td><td>Acknowledge within 7 official work days when assigned.</td></tr>
          <tr><td>Concerns</td><td>People → Speak up</td><td>Confidential good-faith reporting.</td></tr>
        </tbody>
      </table>

      <h2>18. Governance, law, and acknowledgement</h2>
      <ul>
        <li>Reviewed every six months or on material change. Binding version is the Portal Resources copy with Document Code AFRI-SWP.</li>
        <li>Governed by the laws of the Federal Republic of Nigeria; FCT Abuja courts (subject to mandatory rules).</li>
        <li>Severability and no-waiver apply.</li>
        <li>Only the CEO (or a person the CEO expressly authorises in writing) may amend this document.</li>
        <li>Portal acknowledgement = confirmation of reading, understanding, and agreement to comply.</li>
      </ul>
      ${hrAcknowledgementSignBlockHtml}
      <p class="footer-note">Document Code AFRI-SWP · Effective 2 August 2026 · Owner: CEO / People &amp; Culture · Related: AFRI-ORG-01 · AFRI-ICEF-01 · AFRI-DOA-01 · AFRI-LAP-01 · AFRI-EOH-01</p>
`

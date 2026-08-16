import { hrSignBlockWithCeoHtml } from '../hr-signature.mjs'

export const onboardingHandbookBody = `
      <div class="note"><strong>Status:</strong> Most AfriVate Team Members are Internal Contributors under AFRI-ICEF-01 (unpaid). This handbook orients you to standards. It does <strong>not</strong> create employment or any right to pay. “Employee” in any older form means Team Member.</div>

      <h2>1. Welcome and mission</h2>
      <p>AfriVate Technologies Ltd builds platforms and programmes that connect African Pathfinders (talent) with Enablers (organisations) through volunteering, internships, mentorship, micro-tasks, remote work, and related opportunities — elevating life and professional growth across Africa.</p>
      <p>Our mission is practical: create technology and operating systems that improve how African talent is discovered, developed, and connected to opportunity. Every Team Member contributes to that mission through disciplined execution, professional conduct, and accurate use of AfriVate’s official systems.</p>
      <h3>1.1 Culture standards</h3>
      <ul>
        <li><strong>Excellence:</strong> Work meets stated success criteria — completion without quality is not success.</li>
        <li><strong>Ownership:</strong> You own outcomes, communication, and accurate reporting — not only effort.</li>
        <li><strong>Professionalism:</strong> Reliability, integrity, respect, and time discipline are mandatory.</li>
        <li><strong>Disciplined execution:</strong> Expectations are recorded in the Portal; Slack coordinates; neither replaces the other.</li>
      </ul>

      <h2>2. Precedence and mandatory documents</h2>
      <p>This handbook summarises expectations for orientation. It does not supersede binding instruments. On conflict, the following prevail in the order set by AFRI-ODR-01:</p>
      <ol>
        <li><strong>AFRI-SWP</strong> — Standard Work Process (how work is performed and evaluated)</li>
        <li><strong>AFRI-ORG-01</strong> — Organisational structure and role ownership</li>
        <li><strong>AFRI-ICEF-01</strong> — Internal Contributor Engagement Framework (if unpaid)</li>
        <li><strong>AFRI-DOA-01</strong> — Delegation of Authority</li>
        <li><strong>AFRI-LAP-01</strong> — Leave and Absence Policy</li>
        <li><strong>AFRI-EOH-01</strong> — This Handbook</li>
      </ol>
      <p>You must acknowledge each applicable document in <strong>Portal → Resources</strong> within seven (7) official work days of access approval or of a material update notice.</p>

      <h2>3. Key contacts and reporting lines</h2>
      <table>
        <thead><tr><th>Contact</th><th>When to reach them</th></tr></thead>
        <tbody>
          <tr><td><strong>Your Team Lead</strong></td><td>Daily work, tasks, KPIs, weekly check-ins, operational blockers, and first-line performance matters.</td></tr>
          <tr><td><strong>People &amp; Culture / HR</strong></td><td>Portal access, policy questions, leave, onboarding, learning assignments, conduct concerns, and Speak up follow-up. Email: hr@afrivate.org</td></tr>
          <tr><td><strong>CEO</strong></td><td>Strategy, authorised escalations, and matters reserved under AFRI-DOA-01 — not routine task clarification.</td></tr>
        </tbody>
      </table>
      <p>Your <strong>Portal Directory</strong> record (department, job title, reports-to) is conclusive for day-to-day authority. Notify People &amp; Culture immediately if any field is incorrect.</p>

      <h2>4. Schedule, availability, and capacity</h2>
      <h3>4.1 Official work week</h3>
      <ul>
        <li><strong>Official work days:</strong> Monday to Thursday, excluding public holidays and company-declared non-working days.</li>
        <li><strong>Friday to Sunday:</strong> Not official work days. No duty applies unless (a) your Agreed Capacity or an approved team schedule recorded in writing/Portal expressly includes specific weekend work, or (b) you voluntarily complete asynchronous work without creating an expectation of others’ availability.</li>
        <li><strong>Core hours:</strong> During official work days, you must be reachable on Slack during the core hours your Team Lead records for your team (typically a contiguous window such as 10:00 AM – 4:00 PM WAT unless your team agrees otherwise in writing).</li>
      </ul>
      <h3>4.2 Agreed Capacity</h3>
      <p>Your Team Lead and People &amp; Culture will agree your <strong>Agreed Capacity</strong> — the hours and days you commit to AfriVate work. This must be recorded in writing or in the Portal. Do not accept informal “always available” expectations that contradict AFRI-SWP.</p>
      <h3>4.3 Meetings and punctuality</h3>
      <ul>
        <li>Join meetings on time with agenda context reviewed.</li>
        <li>If you cannot attend, notify the organiser before the meeting starts and read the summary or recording afterward.</li>
        <li>Repeated lateness or unexplained absence from scheduled meetings is a conduct issue under AFRI-SWP.</li>
      </ul>

      <h2>5. Communication standards</h2>
      <h3>5.1 Slack — official internal channel</h3>
      <ul>
        <li><strong>Four-hour rule:</strong> Acknowledge official Slack messages within four (4) hours during official work days and core hours.</li>
        <li>Use department and project channels for work that affects others; use direct messages for sensitive one-to-one matters that do not belong in a channel.</li>
        <li>Do not use WhatsApp for leave, policy acknowledgement, appraisals, discipline, or formal people processes.</li>
        <li>Keep tone professional: clear subject lines in long posts, @mentions used purposefully, and decisions summarized after discussions.</li>
      </ul>
      <h3>5.2 Portal — system of record</h3>
      <p>Complete every applicable workflow: tasks, weekly check-ins, leave, onboarding, goals, learning, surveys, feedback, acknowledgements, events, and people records. A Slack message <strong>never</strong> replaces a required Portal submission.</p>
      <h3>5.3 Email</h3>
      <p>Use your @afrivate address for account access and authorised external/formal correspondence. Email does not replace Slack for internal operational coordination.</p>
      <h3>5.4 WhatsApp</h3>
      <p>Informal or emergency contact only. Never for official HR processes, policy acknowledgements, or performance management.</p>

      <h2>6. Portal essentials — what to use and when</h2>
      <table>
        <thead><tr><th>Portal area</th><th>Your responsibility</th></tr></thead>
        <tbody>
          <tr><td><strong>Dashboard / Getting started</strong></td><td>Complete onboarding checklist, profile, and first-time setup within Day 1–3.</td></tr>
          <tr><td><strong>Tasks</strong></td><td>All assigned work lives here. Update status, progress, hours, and blockers at least every official work day you touch the task.</td></tr>
          <tr><td><strong>Weekly check-in</strong></td><td>Submit each reporting period against your agreed KPIs — even if progress was limited (explain why).</td></tr>
          <tr><td><strong>Growth → OKRs</strong></td><td>Maintain 3–5 measurable KPIs aligned to team and organisational objectives.</td></tr>
          <tr><td><strong>Leave / Time off</strong></td><td>Submit all absence requests here. No leave is effective until approved in the Portal (AFRI-LAP-01).</td></tr>
          <tr><td><strong>Resources</strong></td><td>Read and acknowledge policies, handbooks, and official memos assigned to you.</td></tr>
          <tr><td><strong>Learning</strong></td><td>Complete assigned courses and submit required evidence by stated deadlines.</td></tr>
          <tr><td><strong>Memos / Updates</strong></td><td>Read HR digests, townhall notices, and operational announcements promptly.</td></tr>
          <tr><td><strong>People → Speak up</strong></td><td>Confidential channel for concerns about conduct, safety, or policy breaches.</td></tr>
        </tbody>
      </table>

      <h2>7. Performance, KPIs, and reporting</h2>
      <ul>
        <li>Maintain three to five (3–5) weekly KPIs agreed with your Team Lead within your first week.</li>
        <li>Record goals in <strong>Portal → Growth → OKRs</strong> with clear success criteria (number, date, or verifiable outcome).</li>
        <li>Submit <strong>Portal → Weekly check-in</strong> each reporting period, covering: KPI progress, blockers, support needed, and next-week priorities.</li>
        <li>Keep Portal tasks accurate — stale tasks erode trust and distort reporting.</li>
        <li>Align personal goals to organisational objectives published by the CEO for the period.</li>
      </ul>
      <div class="note"><strong>Example KPIs:</strong> “Ship login bugfix by Thursday”; “Publish 2 recruitment posts with approved creative”; “Complete Alison course + submit Learner Record by deadline”; “Hold weekly 1:1 with each direct report and log in Portal.”</div>

      <h2>8. Evaluation, conduct, and discipline</h2>
      <ul>
        <li>Appraisals use <strong>60% deliverables</strong> and <strong>40% professional conduct</strong>, per AFRI-SWP.</li>
        <li>Evidence includes Portal tasks, check-ins, OKRs, feedback, 1:1 records, and learning completion.</li>
        <li>Progressive discipline follows AFRI-SWP: coaching/verbal warning → written warning → PIP → restricted duties → end of engagement (or employment termination where a paid contract exists).</li>
        <li>Act with integrity; protect Confidential Information; respect reporting lines; use Portal Speak up for confidential concerns.</li>
        <li>Harassment, dishonesty, security violations, and repeated disregard for official systems may skip progressive steps.</li>
      </ul>

      <h2>9. Security, confidentiality, and acceptable use</h2>
      <ul>
        <li>Do not share Portal credentials, Slack workspace invites, or internal documents outside AfriVate without written authorisation.</li>
        <li>Use strong passwords and enable account security features when prompted.</li>
        <li>Confidential Information includes unreleased product plans, user data, partner terms, internal metrics, and HR records.</li>
        <li>Store work product in approved systems — not personal WhatsApp threads or unmanaged personal drives for official records.</li>
        <li>Report suspected security incidents to your Team Lead and People &amp; Culture immediately.</li>
      </ul>

      <h2>10. Learning and development</h2>
      <ul>
        <li>Complete assigned learning promptly and submit required evidence (reports, certificates, Learner Records) by stated deadlines.</li>
        <li>Apply course lessons to your role — learning is measured by behaviour and output, not completion alone.</li>
        <li>Request clarification from HR if a course or deadline is unclear before the due date.</li>
      </ul>

      <h2>11. Leave and absence (summary)</h2>
      <p>All absence from duty is governed by <strong>AFRI-LAP-01</strong>. Submit requests through the Portal with adequate notice (minimum forty-eight (48) hours for ordinary planned absence unless a genuine emergency applies). Emergency absence still requires Portal regularisation at the earliest opportunity.</p>

      <h2>12. Day-by-day onboarding roadmap</h2>
      <h3>Day 1 — Access and orientation</h3>
      <ol>
        <li>Sign in to the Portal; complete Getting started / onboarding checklist and orientation videos.</li>
        <li>Confirm Directory shows correct department, job title, and reports-to; notify People &amp; Culture of errors.</li>
        <li>Join Slack and assigned channels; set profile photo and display name professionally.</li>
        <li>Configure @afrivate email if issued.</li>
      </ol>
      <h3>Day 2 — Policies and systems</h3>
      <ol>
        <li>Acknowledge in Portal Resources: AFRI-SWP, AFRI-ORG-01, AFRI-ICEF-01 (if unpaid), AFRI-LAP-01, and this Handbook (AFRI-EOH-01).</li>
        <li>Review assigned tasks; clarify outcomes and deadlines with your Team Lead on Slack and in the Portal.</li>
        <li>Locate Resources for your department (standards, templates, prior work).</li>
      </ol>
      <h3>Day 3–4 — Goals and rhythm</h3>
      <ol>
        <li>Agree Agreed Capacity and 3–5 KPIs with your Team Lead; record OKRs in the Portal.</li>
        <li>Confirm core hours and meeting cadence with your team.</li>
        <li>Begin execution on first tasks; update Portal status daily.</li>
      </ol>
      <h3>Day 5–7 — First reporting cycle</h3>
      <ol>
        <li>Submit your first Weekly check-in on schedule.</li>
        <li>Complete any assigned learning or surveys.</li>
        <li>Attend team meetings and townhalls as scheduled.</li>
        <li>Raise blockers early — waiting silently past a deadline is not acceptable.</li>
      </ol>

      <h2>13. Days 8–30 — settling in</h2>
      <ul>
        <li>Maintain weekly check-ins without reminder.</li>
        <li>Demonstrate reliable Slack responsiveness during core hours.</li>
        <li>Deliver at least one visible outcome per KPI cycle where applicable.</li>
        <li>Participate in surveys, feedback, and learning assignments.</li>
        <li>Ask for help through the correct channel before missing a commitment.</li>
      </ul>

      <h2>14. Getting help and escalation</h2>
      <ol>
        <li><strong>Task or delivery issue</strong> → Team Lead (Slack + Portal task comment).</li>
        <li><strong>Policy, leave, access, or learning</strong> → People &amp; Culture / hr@afrivate.org.</li>
        <li><strong>Conduct or safety concern</strong> → Portal Speak up (confidential) or HR if Speak up is unavailable.</li>
        <li><strong>Critical operational crisis</strong> → Team Lead immediately; escalate per AFRI-SWP §12 if unresolved within sixty (60) minutes.</li>
      </ol>

      <h2>15. Acknowledgement</h2>
      <p>Portal acknowledgement of this Handbook confirms you have read, understood, and agree to comply. Continued Portal access after the effective date constitutes notice of these expectations.</p>
      ${hrSignBlockWithCeoHtml}
      <p class="footer-note">Document Code AFRI-EOH-01 · Effective 2 August 2026 · Owner: People &amp; Culture · Related: AFRI-SWP · AFRI-ORG-01 · AFRI-ICEF-01 · AFRI-LAP-01</p>
`

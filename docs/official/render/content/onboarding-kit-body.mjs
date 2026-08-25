import { hrSignBlockIssuedHtml } from '../hr-signature.mjs'

export const onboardingKitBody = `
      <div class="note"><strong>How to use this kit:</strong> People &amp; Culture runs the process. The Team Lead owns Day 1 work and KPIs. The new joiner completes Portal Getting started. This kit does <strong>not</strong> create employment or any right to pay. Most AfriVate Team Members are Internal Contributors under AFRI-ICEF-01 (unpaid). “Employee” in any older form means Team Member. AFRI-SWP, AFRI-ICEF-01, and AFRI-EOH-01 prevail on conflict.</div>

      <h2>1. Purpose</h2>
      <p>This Onboarding Kit is the operational playbook for bringing a new Team Member onto AfriVate systems, standards, and work. It packages the official instruments already in force and tells People &amp; Culture, Team Leads, and the joiner <strong>who does what, in what order, and in which system</strong>.</p>
      <p>The joiner-facing orientation document remains <strong>AFRI-EOH-01</strong> (Team Member Onboarding Handbook). This kit is the runbook that makes that handbook happen.</p>
      <ul>
        <li><strong>Slack</strong> coordinates (questions, introductions, Day 1 welcome).</li>
        <li><strong>Portal</strong> (portal.afrivate.org) records (access, tasks, acknowledgements, check-ins, OKRs, leave, learning).</li>
        <li><strong>Email</strong> issues the engagement letter and formal welcome.</li>
        <li><strong>WhatsApp</strong> is informal or emergency contact only — never for leave, policy acknowledgement, or people processes.</li>
      </ul>

      <h2>2. Choose the engagement track first</h2>
      <p>Do not start Portal access until People &amp; Culture has confirmed the track and the written instrument is ready to send. The track determines which documents are issued.</p>
      <table>
        <thead><tr><th>Track</th><th>Written instrument</th><th>Typical use</th></tr></thead>
        <tbody>
          <tr><td><strong>A — Internal Contributor</strong></td><td>ICEF Engagement Letter, issued under AFRI-ICEF-01</td><td>Unpaid internal placement (majority of joiners)</td></tr>
          <tr><td><strong>B — Internal Contributor with equity</strong></td><td>ICEF Engagement Letter with CEO-approved stipend/equity clauses + Share Option Agreement when executed</td><td>Core-team placements with ESOP participation</td></tr>
          <tr><td><strong>C — Paid employment</strong></td><td>Written employment contract signed under AFRI-DOA-01</td><td>Only when a paid contract actually exists</td></tr>
          <tr><td><strong>D — Team Lead / Assistant Lead</strong></td><td>Track A, B, or C <em>plus</em> AFRI-TLOP-01 and AFRI-DOA-01 acknowledgement</td><td>Anyone assigned lead functions in the Portal Directory</td></tr>
          <tr><td><strong>E — External volunteer / partner collaborator</strong></td><td>Placement terms + AFRI-VCC (not ICEF)</td><td>External programme placements, not internal operators</td></tr>
        </tbody>
      </table>
      <div class="note"><strong>Hard rule:</strong> Portal access, a job title, or Slack membership never creates employment, salary, stipend, or equity. Only a written instrument signed by the CEO (or a person the CEO has expressly authorised in writing) can do that.</div>

      <h2>3. Document pack — what to issue</h2>
      <p>Issue documents as Portal → Resources items with <strong>Requires acknowledgement</strong> where the table says “Acknowledge”. Master copies live in the official repository; the staff-facing binding copy is the Portal version with the matching Document Code.</p>
      <h3>3.1 Every internal Team Member (Tracks A–D)</h3>
      <table>
        <thead><tr><th>Code</th><th>Document</th><th>When</th><th>Action</th></tr></thead>
        <tbody>
          <tr><td>—</td><td>Engagement letter (or employment contract for Track C)</td><td>Before or on Day 0</td><td>Email PDF; keep signed copy</td></tr>
          <tr><td>AFRI-EOH-01</td><td>Team Member Onboarding Handbook</td><td>Day 1–2</td><td>Acknowledge</td></tr>
          <tr><td>AFRI-SWP</td><td>Standard Work Process</td><td>Day 1–2</td><td>Acknowledge</td></tr>
          <tr><td>AFRI-ORG-01</td><td>Organisational Structure &amp; Role Charters</td><td>Day 1–2</td><td>Acknowledge</td></tr>
          <tr><td>AFRI-LAP-01</td><td>Leave and Absence Policy</td><td>Day 1–2</td><td>Acknowledge</td></tr>
          <tr><td>AFRI-PUG-02</td><td>Portal User Guide (Staff)</td><td>Day 1–3</td><td>Read (procedural; acknowledgement optional)</td></tr>
          <tr><td>—</td><td>Slack House Rules (pinned in #announcements)</td><td>Day 1</td><td>Read the pin; acknowledgement is still via Portal policies</td></tr>
        </tbody>
      </table>
      <h3>3.2 Add by track</h3>
      <table>
        <thead><tr><th>Track</th><th>Also issue</th></tr></thead>
        <tbody>
          <tr><td>A and B</td><td><strong>AFRI-ICEF-01</strong> Internal Contributor Engagement Framework — acknowledge</td></tr>
          <tr><td>B</td><td>Formal Share Option Agreement when executed (CEO / Decision Class A). The engagement letter is a summary only until that agreement is signed.</td></tr>
          <tr><td>C</td><td>Paid employment contract. Do <em>not</em> issue AFRI-ICEF-01 as the governing engagement framework.</td></tr>
          <tr><td>D</td><td><strong>AFRI-TLOP-01</strong> Team Lead Operational Playbook and <strong>AFRI-DOA-01</strong> Delegation of Authority — acknowledge. Also give <strong>AFRI-PUG-03</strong> (Team Lead Portal guide).</td></tr>
          <tr><td>E</td><td><strong>AFRI-VCC</strong> Volunteer Code of Conduct instead of ICEF. Do not treat as an internal operator.</td></tr>
        </tbody>
      </table>
      <p>Deadline: the joiner must acknowledge each applicable document in Portal → Resources within <strong>seven (7) official work days</strong> of access approval (or of a material update notice), per AFRI-EOH-01 and AFRI-ODR-01.</p>

      <h2>4. Who owns what</h2>
      <table>
        <thead><tr><th>Role</th><th>Owns</th><th>Must not</th></tr></thead>
        <tbody>
          <tr>
            <td><strong>People &amp; Culture</strong></td>
            <td>Track confirmation; engagement letter; Portal user, department, job title, reports-to; Slack invite; document pack; acknowledgement chase; onboarding progress in Getting started → Manage content</td>
            <td>Promise pay, stipend, or equity that the CEO has not approved in writing</td>
          </tr>
          <tr>
            <td><strong>Team Lead</strong></td>
            <td>Day 1 welcome on Slack; first Portal tasks with outcome, deadline, and success criteria; Agreed Capacity; 3–5 KPIs in Growth → OKRs; first-week 1:1; leave recommendation later as needed</td>
            <td>Create, change, or discuss as binding any salary, stipend, equity, or end of engagement</td>
          </tr>
          <tr>
            <td><strong>New joiner</strong></td>
            <td>Portal Getting started checklist and videos; Slack profile; policy acknowledgements; My Info; first weekly check-in; honest blockers</td>
            <td>Treat WhatsApp or a Slack message as a Portal submission, leave approval, or policy acknowledgement</td>
          </tr>
          <tr>
            <td><strong>CEO</strong></td>
            <td>Cash Commitments, equity grants, paid contracts, and any exception to this kit</td>
            <td>—</td>
          </tr>
        </tbody>
      </table>

      <h2>5. Timeline at a glance</h2>
      <table>
        <thead><tr><th>Window</th><th>Official work days</th><th>Outcome</th></tr></thead>
        <tbody>
          <tr><td><strong>Pre-start</strong></td><td>Before Day 1</td><td>Track confirmed, letter sent and accepted, Directory fields ready, Slack invite queued</td></tr>
          <tr><td><strong>Day 0</strong></td><td>Access day (may be the same as Day 1)</td><td>Portal account approved; Slack invite sent; welcome email sent</td></tr>
          <tr><td><strong>Day 1</strong></td><td>First official work day</td><td>Signed in; profile and Slack live; videos started; Team Lead has assigned first tasks</td></tr>
          <tr><td><strong>Day 2</strong></td><td>Second official work day</td><td>Required policies acknowledged (or clearly in progress); tasks clarified</td></tr>
          <tr><td><strong>Days 3–4</strong></td><td>Third and fourth official work days</td><td>Agreed Capacity and 3–5 KPIs recorded in Portal OKRs; execution started</td></tr>
          <tr><td><strong>Days 5–7</strong></td><td>Rest of first official week / next week as needed</td><td>First weekly check-in submitted; learning started if assigned; blockers raised</td></tr>
          <tr><td><strong>Days 8–30</strong></td><td>Weeks 2–4</td><td>Rhythm without reminder; at least one visible outcome per KPI cycle where applicable</td></tr>
        </tbody>
      </table>
      <p>Official work days are <strong>Monday to Thursday</strong> unless a written/Portal schedule says otherwise. Friday–Sunday are not official work days. Core hours are the contiguous window the Team Lead records for the team (typically 10:00 AM – 4:00 PM WAT unless agreed otherwise in writing). Acknowledge official Slack messages within <strong>four (4) hours</strong> during official work days and core hours.</p>

      <h2>6. People &amp; Culture — pre-start checklist</h2>
      <p>Complete before sending the Slack invite. Tick in this kit or copy into a Portal task for the onboarding coordinator.</p>
      <table>
        <thead><tr><th>☐</th><th>Step</th><th>System</th></tr></thead>
        <tbody>
          <tr><td>☐</td><td>Confirm track (A–E) with the hiring manager / CEO as required by AFRI-DOA-01</td><td>Written / Portal</td></tr>
          <tr><td>☐</td><td>Prepare the engagement letter or contract from the current template; insert name, role, reports-to, start date, Agreed Capacity notes</td><td>Email PDF</td></tr>
          <tr><td>☐</td><td>Send the letter for signature; file the accepted copy in the HR vault</td><td>Email + Drive</td></tr>
          <tr><td>☐</td><td>Create or approve the Portal user: department, job title, reports-to, start date — Directory is conclusive for day-to-day authority</td><td>Admin → Users / Employees</td></tr>
          <tr><td>☐</td><td>Confirm required Resources are published with acknowledgement enabled (pack in §3)</td><td>Portal → Resources</td></tr>
          <tr><td>☐</td><td>Queue Slack workspace invite to the work/personal email on file</td><td>Slack Admin</td></tr>
          <tr><td>☐</td><td>Issue @afrivate email if authorised for this role; otherwise record that Portal + Slack use the address on file</td><td>IT / Admin</td></tr>
          <tr><td>☐</td><td>Notify the Team Lead of start date, track, and that first Portal tasks must be ready on Day 1</td><td>Slack</td></tr>
          <tr><td>☐</td><td>Send the welcome email (Appendix A or B) with Portal URL, Slack join instructions, and what Day 1 looks like</td><td>Email</td></tr>
          <tr><td>☐</td><td>If a learning assignment applies, create it in Portal → Learning with a deadline</td><td>Portal</td></tr>
        </tbody>
      </table>

      <h2>7. Day 0 — access</h2>
      <ol>
        <li>Approve Portal access. The joiner should be able to sign in at <strong>https://portal.afrivate.org</strong>.</li>
        <li>Send the Slack invite. Ask them to use their real name and a professional photo before posting.</li>
        <li>Do not treat access as complete until they can open Getting started, Resources, My work, and Directory.</li>
        <li>If access fails, People &amp; Culture owns the fix the same official work day — do not leave the joiner waiting on WhatsApp.</li>
      </ol>

      <h2>8. New joiner — Day 1 to Day 7</h2>
      <p>This is the same roadmap as AFRI-EOH-01 §§12–13, written as a working checklist. The Portal Getting started list is the live tracker; this table is the full standard.</p>
      <h3>8.1 Day 1 — Access and orientation</h3>
      <table>
        <thead><tr><th>☐</th><th>Joiner action</th><th>Where</th></tr></thead>
        <tbody>
          <tr><td>☐</td><td>Sign in to the Portal</td><td>portal.afrivate.org</td></tr>
          <tr><td>☐</td><td>Complete My Info (photo, phone, emergency contact, bio)</td><td>People → My info</td></tr>
          <tr><td>☐</td><td>Confirm Directory shows the correct department, job title, and reports-to; notify People &amp; Culture immediately if any field is wrong</td><td>People → Directory</td></tr>
          <tr><td>☐</td><td>Watch Getting started videos and mark them watched</td><td>Getting started</td></tr>
          <tr><td>☐</td><td>Join Slack; set real name and profile photo; turn on DM and @mention notifications</td><td>Slack</td></tr>
          <tr><td>☐</td><td>Read the Slack House Rules pin in #announcements</td><td>Slack</td></tr>
          <tr><td>☐</td><td>Say hello in the team channel and message the Team Lead that you are on Slack</td><td>Slack</td></tr>
          <tr><td>☐</td><td>Bookmark the Portal</td><td>Browser</td></tr>
          <tr><td>☐</td><td>Configure @afrivate email if issued</td><td>Email</td></tr>
        </tbody>
      </table>
      <h3>8.2 Day 2 — Policies and systems</h3>
      <table>
        <thead><tr><th>☐</th><th>Joiner action</th><th>Where</th></tr></thead>
        <tbody>
          <tr><td>☐</td><td>Acknowledge required policies (pack in §3 for your track)</td><td>Resources</td></tr>
          <tr><td>☐</td><td>Read AFRI-PUG-02 (Staff Portal User Guide)</td><td>Resources</td></tr>
          <tr><td>☐</td><td>Open assigned tasks; ask the Team Lead to clarify outcomes and deadlines on Slack, then confirm the Portal task is accurate</td><td>My work + Slack</td></tr>
          <tr><td>☐</td><td>Locate department resources and templates</td><td>Resources</td></tr>
        </tbody>
      </table>
      <h3>8.3 Days 3–4 — Goals and rhythm</h3>
      <table>
        <thead><tr><th>☐</th><th>Joiner action</th><th>Where</th></tr></thead>
        <tbody>
          <tr><td>☐</td><td>Agree Agreed Capacity with the Team Lead (hours/days or outcome load). It must be recorded in writing or in the Portal — not as an informal “always available” expectation</td><td>Slack then Portal</td></tr>
          <tr><td>☐</td><td>Agree 3–5 measurable KPIs; record them in Growth → OKRs with a number, date, or verifiable outcome</td><td>People → Growth</td></tr>
          <tr><td>☐</td><td>Confirm core hours and meeting cadence with the team</td><td>Slack</td></tr>
          <tr><td>☐</td><td>Start first tasks; update Portal status on every official work day you touch the work</td><td>My work</td></tr>
        </tbody>
      </table>
      <h3>8.4 Days 5–7 — First reporting cycle</h3>
      <table>
        <thead><tr><th>☐</th><th>Joiner action</th><th>Where</th></tr></thead>
        <tbody>
          <tr><td>☐</td><td>Submit the first Weekly check-in on schedule, even if progress was limited (explain why)</td><td>Weekly update</td></tr>
          <tr><td>☐</td><td>Complete any assigned learning or survey, and submit evidence in the Portal where required</td><td>People → Learning / Surveys</td></tr>
          <tr><td>☐</td><td>Attend team meetings and townhalls as scheduled; notify the organiser before start if you cannot attend</td><td>Calendar + Slack</td></tr>
          <tr><td>☐</td><td>Raise blockers early. Waiting silently past a deadline is not acceptable</td><td>Portal task + Slack</td></tr>
        </tbody>
      </table>

      <h2>9. Team Lead — first-week checklist</h2>
      <p>Governed by AFRI-TLOP-01. A Slack welcome is not a substitute for Portal tasks.</p>
      <table>
        <thead><tr><th>☐</th><th>Lead action</th><th>When</th></tr></thead>
        <tbody>
          <tr><td>☐</td><td>Have at least one complete Portal task waiting on Day 1 (title, outcome, owner, priority, deadline, success criteria)</td><td>Before Day 1</td></tr>
          <tr><td>☐</td><td>Send the Day 1 Slack DM (Appendix C) and introduce them in the team channel</td><td>Day 1 morning</td></tr>
          <tr><td>☐</td><td>Walk through how the team uses Slack vs Portal vs Drive</td><td>Day 1</td></tr>
          <tr><td>☐</td><td>Agree Agreed Capacity and core hours; write it down</td><td>Days 1–3</td></tr>
          <tr><td>☐</td><td>Agree 3–5 KPIs and confirm they appear in Portal → Growth → OKRs</td><td>Days 3–4</td></tr>
          <tr><td>☐</td><td>Hold a first 1:1; log it in the Portal if the 1:1 workflow applies to your team</td><td>First week</td></tr>
          <tr><td>☐</td><td>Check Getting started progress; ping People &amp; Culture if videos or acknowledgements are stalled after Day 2</td><td>Day 3</td></tr>
          <tr><td>☐</td><td>Do not promise pay, stipend, equity, or “you’re hired as staff” unless a CEO-signed instrument already says so</td><td>Always</td></tr>
        </tbody>
      </table>
      <div class="note"><strong>Completeness gate (AFRI-TLOP-01):</strong> A task missing outcome, owner, priority, or deadline is not valid assigned work until corrected. Do not give Day 1 work only as a Slack paragraph.</div>

      <h2>10. Days 8–30 — settling in</h2>
      <ul>
        <li>Weekly check-ins without reminder.</li>
        <li>Reliable Slack responsiveness during core hours (four-hour rule).</li>
        <li>At least one visible outcome per KPI cycle where applicable.</li>
        <li>Surveys, feedback, and learning assignments completed on time.</li>
        <li>Help requested through the correct channel before a commitment is missed.</li>
      </ul>
      <p>People &amp; Culture reviews Getting started completion in the Admin / Manage content view during week 2. Incomplete acknowledgements after seven official work days are a compliance follow-up, not a casual reminder.</p>

      <h2>11. Onboarding complete — the gate</h2>
      <p>People &amp; Culture may mark onboarding operationally complete when all of the following are true:</p>
      <ol>
        <li>Portal Getting started videos and checklist are complete (or remaining items are waived in writing by People &amp; Culture).</li>
        <li>Required policy acknowledgements for the joiner’s track are recorded in Resources.</li>
        <li>Directory (department, job title, reports-to) is accurate.</li>
        <li>My Info includes a usable phone number and emergency contact.</li>
        <li>Slack profile is set; joiner is in the correct team channels.</li>
        <li>At least one Portal task has been updated by the joiner.</li>
        <li>3–5 KPIs exist in Growth → OKRs.</li>
        <li>One Weekly check-in has been submitted.</li>
      </ol>
      <p>Completion of this gate does not end probation-style review where AFRI-ICEF-01 or a paid contract provides for periodic review. It only means systems onboarding is done.</p>

      <h2>12. Getting help</h2>
      <ol>
        <li><strong>Task or delivery</strong> → Team Lead (Slack + Portal task comment).</li>
        <li><strong>Access, policy, leave, learning</strong> → People &amp; Culture / hr@afrivate.org (operational inbox also: afrivatehr@gmail.com).</li>
        <li><strong>Conduct or safety</strong> → Portal → People → Growth → Speak up, or HR if Speak up is unavailable.</li>
        <li><strong>Critical operational crisis</strong> → Team Lead immediately; escalate per AFRI-SWP if unresolved within sixty (60) minutes.</li>
      </ol>

      <h2>13. Master file locations</h2>
      <table>
        <thead><tr><th>Item</th><th>Where the master lives</th></tr></thead>
        <tbody>
          <tr><td>This kit (AFRI-ONB-01)</td><td><code>docs/official/hiring/onboarding/</code></td></tr>
          <tr><td>Onboarding Handbook (AFRI-EOH-01) and policies</td><td><code>docs/official/policies/</code> and Portal → Resources</td></tr>
          <tr><td>ICEF and equity engagement letter templates</td><td><code>docs/official/hiring/engagement-letters/</code></td></tr>
          <tr><td>Slack House Rules and welcome scripts</td><td><code>docs/official/ops/</code></td></tr>
          <tr><td>Staff / Lead / Admin Portal guides</td><td><code>docs/official/policies/</code> (AFRI-PUG-01 / 02 / 03)</td></tr>
          <tr><td>Interview kit (pre-hire, not this pack)</td><td><code>docs/official/hiring/interviews/</code></td></tr>
        </tbody>
      </table>

      <h2>Appendix A — Welcome email (Track A, Internal Contributor)</h2>
      <p class="path">Copy from docs/official/hiring/onboarding/Afrivate-Welcome-Email-ICEF.txt</p>
      <p>Subject: Welcome to AfriVate — your first days</p>
      <p>Use after the engagement letter has been sent. Replace bracketed fields. Do not attach policies to email if they are already in Portal Resources — point the joiner there so acknowledgement is tracked.</p>

      <h2>Appendix B — Welcome email (Track B, equity core team)</h2>
      <p class="path">Copy from docs/official/hiring/onboarding/Afrivate-Welcome-Email-Equity.txt</p>
      <p>Same structure as Appendix A, with an extra paragraph that the stipend and equity terms in the letter are the only current commitments, and that the Share Option Agreement (when issued) governs the option.</p>

      <h2>Appendix C — Team Lead Day 1 Slack DM</h2>
      <p class="path">Copy from docs/official/hiring/onboarding/Afrivate-Day1-Slack-DM.txt</p>
      <p>Send as a Slack DM, not WhatsApp. Then post a short team-channel intro (name, role, that they are starting today).</p>

      <h2>Appendix D — Informal WhatsApp only</h2>
      <p class="path">Copy from docs/official/hiring/onboarding/Afrivate-Welcome-WhatsApp-Informal.txt</p>
      <p>Use only if the person is not yet on Slack or email delivery failed. The message must send them to Portal and Slack. Do not run onboarding on WhatsApp.</p>

      <h2>Appendix E — Acknowledgement matrix (quick view)</h2>
      <table>
        <thead><tr><th>Document</th><th>A</th><th>B</th><th>C</th><th>D (add)</th><th>E</th></tr></thead>
        <tbody>
          <tr><td>AFRI-SWP</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td><td>If Portal access issued</td></tr>
          <tr><td>AFRI-ORG-01</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td><td>If internal-facing</td></tr>
          <tr><td>AFRI-LAP-01</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td><td>If leave workflow applies</td></tr>
          <tr><td>AFRI-EOH-01</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td><td>Optional summary</td></tr>
          <tr><td>AFRI-ICEF-01</td><td>✓</td><td>✓</td><td>—</td><td>If unpaid</td><td>—</td></tr>
          <tr><td>AFRI-VCC</td><td>—</td><td>—</td><td>—</td><td>—</td><td>✓</td></tr>
          <tr><td>AFRI-TLOP-01</td><td>—</td><td>—</td><td>—</td><td>✓</td><td>—</td></tr>
          <tr><td>AFRI-DOA-01</td><td>—</td><td>—</td><td>—</td><td>✓</td><td>—</td></tr>
        </tbody>
      </table>
      <p>Pillar Heads must also acknowledge AFRI-DOA-01 even if they are not Team Leads, per AFRI-ODR-01.</p>

      ${hrSignBlockIssuedHtml}
      <p class="footer-note">Document Code AFRI-ONB-01 · Effective 25 August 2026 · Owner: People &amp; Culture · Operational playbook (not a policy) · Related: AFRI-EOH-01 · AFRI-SWP · AFRI-ICEF-01 · AFRI-TLOP-01 · AFRI-ODR-01 · AFRI-PUG-02</p>
`

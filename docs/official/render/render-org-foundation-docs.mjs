/**
 * AfriVate foundation governance docs → HTML + PDF
 * AFRI-ORG-01 · AFRI-ICEF-01 · AFRI-DOA-01 · AFRI-ODR-01
 * Run: node docs/official/render/render-org-foundation-docs.mjs
 */
import { chromium } from 'playwright'
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const officialRoot = path.resolve(__dirname, '..')
const outDir = path.join(officialRoot, 'policies')
const logoPath = path.resolve(officialRoot, 'brand', 'afrivate-logo-long-purple.png')
const logoUrl = `file:///${logoPath.replace(/\\/g, '/')}`
const downloadsDir = path.resolve('C:/Users/DELL/Downloads')

const css = `
  :root { --purple:#8d4087; --ink:#1f1f1f; --muted:#5f5f5f; --line:#ebdceb; --soft:#f8f3f8; }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; color:var(--ink); font-family:Inter,Segoe UI,Arial,sans-serif; font-size:10.5pt; line-height:1.58; background:#fff; }
  .shell { position:relative; padding:0 4px; }
  .brand-row { display:flex; align-items:center; justify-content:space-between; gap:16px; padding-bottom:12px; border-bottom:2px solid var(--purple); margin-bottom:18px; }
  .brand img { width:154px; height:49px; object-fit:contain; object-position:left center; }
  .chip { text-align:right; font-size:10px; color:var(--muted); line-height:1.45; }
  h1 { font-size:15.5px; line-height:1.3; margin:0 0 14px; text-align:center; text-transform:uppercase; letter-spacing:0.02em; }
  .meta { display:grid; gap:8px; background:var(--soft); border:1px solid var(--line); border-radius:10px; padding:12px 14px; margin:0 0 20px; }
  .meta div { display:grid; grid-template-columns:150px 1fr; gap:8px; }
  .meta span { color:var(--muted); }
  h2 { font-size:11.5px; text-transform:uppercase; letter-spacing:0.04em; color:var(--purple); margin:18px 0 8px; padding-bottom:5px; border-bottom:1px solid var(--line); break-after:avoid-page; }
  h3 { font-size:11px; margin:12px 0 6px; break-after:avoid-page; }
  p { margin:0 0 10px; }
  ul, ol { margin:0 0 12px; padding-left:20px; }
  li { margin:0 0 6px; break-inside:avoid-page; }
  .note { background:var(--soft); border-left:3px solid var(--purple); padding:10px 12px; margin:8px 0 14px; }
  table { width:100%; border-collapse:collapse; margin:0 0 14px; font-size:9.4pt; }
  th, td { border:1px solid var(--line); padding:7px 8px; vertical-align:top; text-align:left; }
  th { background:var(--soft); color:var(--purple); font-size:9pt; text-transform:uppercase; letter-spacing:0.03em; }
  .role-block { break-inside:avoid-page; margin:0 0 12px; padding:10px 12px; border:1px solid var(--line); border-radius:8px; }
  .role-block h3 { margin-top:0; color:var(--purple); }
  .sign-block { margin-top:28px; break-inside:avoid-page; }
  .sign-row { display:grid; grid-template-columns:1fr 1fr; gap:28px; margin-top:16px; }
  .sign-card { border-top:1px solid #bbb; padding-top:10px; }
  .sign-card .who { font-weight:700; margin-top:28px; }
  .sign-card .role { color:var(--muted); font-size:10.5px; }
  .footer-note { margin-top:16px; font-size:9.5pt; color:var(--muted); }
`

function wrap(title, metaRows, body) {
  const meta = metaRows.map(([k, v]) => `<div><strong>${k}</strong><span>${v}</span></div>`).join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>${title}</title><style>${css}</style></head><body><div class="shell"><div class="brand-row"><div class="brand"><img src="${logoUrl}" alt="AfriVate" /></div><div class="chip">Official Document<br/>AfriVate Technologies Ltd<br/>RC: 9210092</div></div><h1>${title}</h1><section class="meta">${meta}</section>${body}</div></body></html>`
}

const signBlock = `
  <div class="sign-block">
    <p><strong>Issued for and on behalf of AfriVate Technologies Ltd,</strong></p>
    <div class="sign-row">
      <div class="sign-card"><div class="who">Joshua Oluwasujibomi Komolafe</div><div class="role">Chief Executive Officer</div></div>
      <div class="sign-card"><div class="who">Emmanuel Okpiaifo</div><div class="role">Chief Human Resources Officer / Head of People &amp; Culture</div></div>
    </div>
  </div>`

const commonClosing = (code, related) => `
  <h2>Governing law and general</h2>
  <ul>
    <li><strong>Governing law:</strong> This document is governed by the laws of the Federal Republic of Nigeria. Subject to any mandatory forum rules, the courts of the Federal Capital Territory, Abuja, have jurisdiction over disputes arising from it.</li>
    <li><strong>Severability:</strong> If any provision is held invalid or unenforceable, the remaining provisions continue in full force.</li>
    <li><strong>No waiver:</strong> Failure by AfriVate to enforce a provision is not a waiver of that provision or any other provision.</li>
    <li><strong>Amendments:</strong> Only the CEO (or a person the CEO expressly authorises in writing) may amend this document. The binding version is the version published under Portal → Resources (or the master copy designated in AFRI-ODR-01). Informal messages do not amend policy.</li>
    <li><strong>Acknowledgement:</strong> Portal acknowledgement constitutes the Team Member’s confirmation that they have read, understood, and agree to comply. Continued access after the effective date constitutes notice of the terms; acknowledgement remains mandatory within seven (7) official work days of access approval or of a material update notice.</li>
  </ul>
  ${signBlock}
  <p class="footer-note">Document Code ${code} · Effective 2 August 2026 · Related: ${related}</p>
`

const orgBody = `
  <div class="note"><strong>Status of titles:</strong> AfriVate Technologies Ltd presently operates without payment of salaries or wages to internal Team Members. Titles in this document describe <em>accountability and decision ownership only</em>. They do not create employment, partnership, agency, or any right to remuneration. Engagement terms are governed by AFRI-ICEF-01 (and, where applicable, a separate written instrument signed by the CEO).</div>

  <h2>1. Purpose and effect</h2>
  <p>This document is the authoritative organisational structure of AfriVate Technologies Ltd (“AfriVate”). It defines pillars, reporting lines, and role ownership.</p>
  <ul>
    <li>For <strong>how work is performed</strong>, the Standard Work Process (AFRI-SWP) prevails.</li>
    <li>For <strong>who may decide</strong>, the Delegation of Authority (AFRI-DOA-01) prevails.</li>
    <li>For <strong>who owns which outcomes</strong>, this document (AFRI-ORG-01) prevails over any informal chart, Slack description, or verbal understanding.</li>
  </ul>

  <h2>2. Definitions</h2>
  <table>
    <thead><tr><th>Term</th><th>Meaning</th></tr></thead>
    <tbody>
      <tr><td>Team Member</td><td>Any person with an approved AfriVate Portal account who performs AfriVate work, whether unpaid or (if later) paid.</td></tr>
      <tr><td>Internal Contributor</td><td>A Team Member engaged without current salary or wages under AFRI-ICEF-01.</td></tr>
      <tr><td>Employee</td><td>A person engaged under a written paid employment contract or offer signed by the CEO (or authorised signatory). No person is an Employee merely by title, tenure, or Portal role.</td></tr>
      <tr><td>Pillar</td><td>One of the functional domains listed in §3.</td></tr>
      <tr><td>Pillar Head</td><td>The person recorded in the Portal as head of the corresponding department (or otherwise designated in writing by the CEO).</td></tr>
      <tr><td>Team Lead</td><td>A person recorded in the Portal as lead or assistant lead of a team, operating under AFRI-TLOP-01.</td></tr>
      <tr><td>Writing / written</td><td>Email from an @afrivate address, a Portal Memo, or a signed PDF/HTML instrument — not WhatsApp alone.</td></tr>
    </tbody>
  </table>

  <h2>3. Structure</h2>
  <p>AfriVate is organised into the Leadership Office and six pillars. Each Pillar Head reports to the CEO unless the CEO designates otherwise in writing.</p>
  <table>
    <thead><tr><th>Unit</th><th>Accountable owner</th><th>Sole purpose</th></tr></thead>
    <tbody>
      <tr><td>Leadership Office</td><td>CEO; supported by Chief of Staff / Operations (may dual-hat)</td><td>Strategy, culture tone, capital/runway decisions, cross-pillar rhythm</td></tr>
      <tr><td>Product &amp; Technology</td><td>Head of Product &amp; Technology</td><td>AfriVate product platforms (including Team Space), roadmap, reliability, security</td></tr>
      <tr><td>Community &amp; Opportunity</td><td>Head of Community &amp; Opportunity</td><td>Pathfinder ↔ Enabler opportunity quality and mission outcomes</td></tr>
      <tr><td>Growth &amp; Partnerships</td><td>Head of Growth &amp; Partnerships</td><td>Enabler acquisition, partnerships, and sustainability pipeline</td></tr>
      <tr><td>People &amp; Culture</td><td>Head of People &amp; Culture (CHRO)</td><td>Talent systems, policies, engagement, L&amp;D, people records via Portal</td></tr>
      <tr><td>Finance &amp; Administration</td><td>Head of Finance &amp; Administration</td><td>Cash stewardship, books, compliance, vendor and contract administration</td></tr>
      <tr><td>Brand &amp; Communications</td><td>Head of Brand &amp; Communications (or, until appointed, Growth jointly with Product Design as designated by the CEO)</td><td>External narrative, brand standards, employer brand assets</td></tr>
    </tbody>
  </table>

  <h2>4. Single-threaded ownership</h2>
  <p>Every material outcome has one accountable Pillar Head. Cross-pillar work may use temporary goal teams, but accountability remains with the named Pillar Head unless the CEO reassigns it in writing. Dual-hat arrangements are permitted only if the primary pillar is recorded in the Portal Directory.</p>

  <h2>5. Role charters — accountable owners</h2>
  <div class="role-block">
    <h3>CEO</h3>
    <p><strong>Owns:</strong> Vision; final strategy; culture tone; appointment and removal of Pillar Heads; final people decisions of material consequence; authority to bind AfriVate to salary, equity, or cash commitments.</p>
    <p><strong>Does not:</strong> Replace Pillar Heads on ordinary pillar decisions within AFRI-DOA-01.</p>
  </div>
  <div class="role-block">
    <h3>Chief of Staff / Head of Operations (optional dual-hat)</h3>
    <p><strong>Owns:</strong> Leadership cadence; decision log; follow-through on CEO commitments; coordination across pillars.</p>
    <p><strong>Does not:</strong> Exercise CEO decision rights, or override a Pillar Head, unless the CEO has granted that authority in writing for a defined matter.</p>
  </div>
  <div class="role-block">
    <h3>Head of Product &amp; Technology</h3>
    <p><strong>Owns:</strong> Product roadmap sequencing; engineering standards; production reliability; security baseline for AfriVate systems.</p>
    <p><strong>Typical reports:</strong> Frontend Engineer; Backend/Platform Engineer; Product Designer.</p>
    <p><strong>Does not:</strong> Approve cash spend, sign partner agreements, or promise employment/remuneration.</p>
  </div>
  <div class="role-block">
    <h3>Head of Community &amp; Opportunity</h3>
    <p><strong>Owns:</strong> Opportunity quality standards; matching and placement outcomes; community health metrics for Pathfinders and Enablers within AfriVate programmes.</p>
    <p><strong>Does not:</strong> Own the product backlog or bind AfriVate financially.</p>
  </div>
  <div class="role-block">
    <h3>Head of Growth &amp; Partnerships</h3>
    <p><strong>Owns:</strong> Enabler and partner pipeline; partnership process up to signature-ready drafts; conversion metrics.</p>
    <p><strong>Does not:</strong> Sign MoUs/agreements (CEO only, unless DOA says otherwise); promise product features without Product Head written concurrence.</p>
  </div>
  <div class="role-block">
    <h3>Head of People &amp; Culture</h3>
    <p><strong>Owns:</strong> Policy stewardship; Portal people systems; recruitment administration; L&amp;D; surveys; engagement; progressive discipline process administration.</p>
    <p><strong>Does not:</strong> Replace Team Leads’ duty to conduct 1:1s and OKR coaching for their reports.</p>
  </div>
  <div class="role-block">
    <h3>Head of Finance &amp; Administration</h3>
    <p><strong>Owns:</strong> Books; expense and vendor control; runway reporting to the CEO; statutory readiness — including while salaries are zero.</p>
    <p><strong>Does not:</strong> Authorise spend without CEO approval where AFRI-DOA-01 so requires.</p>
  </div>

  <h2>6. Portal is conclusive for assignments</h2>
  <p>Department, job title, reports-to, Team Lead, and Pillar Head designations in the AfriVate Portal are conclusive as between Team Members for day-to-day authority, unless corrected by People &amp; Culture or the CEO. A Slack claim of authority that contradicts the Portal is void.</p>

  <h2>7. Hiring sequence (internal guidance)</h2>
  <p>AfriVate fills capacity in this order unless the CEO decides otherwise in writing: (1) critical Pillar Heads and essential ICs for Product, Community, Growth, People, and Finance; (2) depth roles when a Pillar Head is overloaded; (3) Brand Head and specialist roles when volume requires them. Premature C-suite titles (COO, CFO, CRO) are not used until the CEO creates them in writing.</p>

  ${commonClosing('AFRI-ORG-01', 'AFRI-SWP · AFRI-DOA-01 · AFRI-ICEF-01 · AFRI-ODR-01')}
`

const icefBody = `
  <div class="note"><strong>Binding status disclaimer:</strong> This Framework governs unpaid internal contribution. It is <strong>not</strong> a contract of employment. Nothing in this Framework, in any title, in Portal access, or in the performance of work creates employment, a contract of service, partnership, joint venture, or agency, or any entitlement to salary, wages, benefits, equity, or severance — unless a separate written instrument signed by the CEO expressly creates that entitlement.</div>

  <h2>1. Purpose and scope</h2>
  <p>This Framework sets the exclusive terms of <strong>internal unpaid contribution</strong> to AfriVate Technologies Ltd.</p>
  <p><strong>It applies to</strong> every person who (a) holds an approved AfriVate Portal account assigned to an internal department or team, and (b) performs AfriVate work without current salary or wages paid by AfriVate.</p>
  <p><strong>It does not apply to</strong> external Pathfinders or partner-placed volunteers solely under AFRI-VCC, except where People &amp; Culture states in writing that both instruments apply. If both apply and conflict, People &amp; Culture issues a written determination; until then, the stricter confidentiality and IP rules apply.</p>

  <h2>2. Definitions</h2>
  <table>
    <thead><tr><th>Term</th><th>Meaning</th></tr></thead>
    <tbody>
      <tr><td>Contributor</td><td>A person within the scope of §1.</td></tr>
      <tr><td>Agreed Capacity</td><td>The weekly hour band (or equivalent deliverable expectation) recorded with the Pillar Head or Team Lead in the Portal (task, note, OKR, or Memo) or in writing.</td></tr>
      <tr><td>Work Product</td><td>All work, code, designs, content, data, inventions, improvements, and materials created by the Contributor in the course of AfriVate work or using AfriVate systems/confidential information.</td></tr>
      <tr><td>Confidential Information</td><td>Non-public AfriVate information including credentials, unreleased product plans, partner data, personnel data, financials, and security details.</td></tr>
    </tbody>
  </table>

  <h2>3. Nature of the relationship</h2>
  <ol>
    <li>Contribution is <strong>voluntary and unpaid</strong> unless and until a separate paid instrument is signed by the CEO.</li>
    <li>Titles (including Head, Lead, Engineer, Designer, Officer) describe accountability only.</li>
    <li>The Contributor is not entitled to insist on continued access, a minimum volume of work, or conversion to employment.</li>
    <li>AfriVate may accept or decline contribution, and may end the engagement under §8, without stating a reason, subject only to any mandatory rule of Nigerian law that cannot be excluded.</li>
  </ol>

  <h2>4. AfriVate provides</h2>
  <ul>
    <li>Access to systems reasonably required for the assigned role (Portal, Slack, and other tools AfriVate designates).</li>
    <li>Supervision and feedback through Portal workflows and Team Leads.</li>
    <li>Learning assignments AfriVate chooses to assign.</li>
    <li>Upon request and subject to good standing and proper handover: a factual reference limited to role, dates, and nature of contribution.</li>
  </ul>
  <p>AfriVate does <strong>not</strong>, by this Framework, provide salary, stipend, equity, insurance, pension, leave pay, or expense reimbursement — except where the CEO approves a specific item in writing under AFRI-DOA-01.</p>

  <h2>5. Contributor obligations</h2>
  <ol>
    <li>Comply with AFRI-SWP, AFRI-ORG-01, AFRI-DOA-01, AFRI-LAP-01, this Framework, and all policies AfriVate requires the Contributor to acknowledge.</li>
    <li>Maintain Agreed Capacity; request material changes in writing before reducing capacity.</li>
    <li>Meet commitments, keep Portal records accurate, and acknowledge official Slack messages within four (4) hours on official work days during core hours.</li>
    <li>Protect Confidential Information indefinitely after the engagement ends, except information that is public other than by the Contributor’s breach, or that AfriVate authorises in writing to disclose.</li>
    <li>Not speak for AfriVate externally without prior written authorisation from the CEO or Brand owner designated by the CEO.</li>
    <li>Refuse and promptly report unsafe, unlawful, or unethical instructions through Portal Speak up or to People &amp; Culture.</li>
  </ol>

  <h2>6. Intellectual property</h2>
  <ol>
    <li>All Work Product is owned exclusively by AfriVate Technologies Ltd from creation.</li>
    <li>To the extent any right does not automatically vest in AfriVate, the Contributor hereby assigns to AfriVate all right, title, and interest in the Work Product worldwide, and agrees to execute further documents reasonably required to perfect that ownership.</li>
    <li>The Contributor waives, to the maximum extent permitted by law, moral rights in Work Product in favour of AfriVate’s commercial exploitation.</li>
    <li>Tools, templates, and credentials provided by AfriVate remain AfriVate property and must be returned or access revoked on exit.</li>
  </ol>

  <h2>7. Absence from Agreed Capacity</h2>
  <p>“Leave” under AFRI-LAP-01 means authorised absence from Agreed Capacity. It is a continuity control, not a statutory paid-leave entitlement for unpaid Contributors. Unauthorised absence is a breach.</p>

  <h2>8. Ending the engagement</h2>
  <ol>
    <li><strong>By the Contributor:</strong> At least fourteen (14) calendar days’ written notice to the Pillar Head and hr@afrivate.org (or the then-current People &amp; Culture address), with Portal handover completed.</li>
    <li><strong>By AfriVate:</strong> Immediate end for serious breach (including confidentiality, IP, dishonesty, harassment, or security violations); otherwise AfriVate will ordinarily give seven (7) calendar days’ written notice, or pay/provide no notice where contribution is unpaid — notice is a courtesy standard, not a right to continued access.</li>
    <li>On end: access is revoked; Confidential Information duties and IP assignment survive.</li>
  </ol>

  <h2>9. Path to paid employment</h2>
  <p>If AfriVate later pays for a role, selection is at AfriVate’s sole discretion under written criteria published or applied by the CEO and People &amp; Culture. Prior unpaid contribution is a factor AfriVate may consider; it creates <strong>no automatic right</strong> to an offer, salary level, or equity.</p>

  <h2>10. No other promises</h2>
  <p>Any promise of pay, equity, or employment is void unless in a written instrument signed by the CEO (or a signatory the CEO has authorised in writing for that class of commitment). Verbal, Slack, or WhatsApp statements do not bind AfriVate on remuneration.</p>

  ${commonClosing('AFRI-ICEF-01', 'AFRI-SWP · AFRI-ORG-01 · AFRI-VCC · AFRI-LAP-01 · AFRI-ODR-01')}
`

const doaBody = `
  <div class="note"><strong>Rule of construction:</strong> Authority not expressly granted by this document, by AFRI-ORG-01, by AFRI-TLOP-01, or by a written CEO delegation is reserved to the CEO. When in doubt, escalate — do not invent authority.</div>

  <h2>1. Purpose</h2>
  <p>This Delegation of Authority states who may decide, approve, commit, publish, and escalate for AfriVate Technologies Ltd. It applies to all Team Members regardless of pay status.</p>

  <h2>2. Definitions</h2>
  <ul>
    <li><strong>Approve</strong> means the binding decision recorded in the Portal (or, for matters with no Portal workflow, in writing).</li>
    <li><strong>Recommend</strong> means an operational opinion that is not binding until the Approver records the decision.</li>
    <li><strong>Cash Commitment</strong> means any obligation that requires AfriVate (or anyone seeking reimbursement from AfriVate) to pay money, including subscriptions, vendors, travel, stipends, and contractor fees.</li>
  </ul>

  <h2>3. Decision classes</h2>
  <table>
    <thead><tr><th>Class</th><th>Examples</th><th>Approver</th></tr></thead>
    <tbody>
      <tr><td>A — Reserved</td><td>Mission change; entity actions; first salary budget; equity grants; crisis public statements; litigation strategy</td><td>CEO only (Board if constituted and required)</td></tr>
      <tr><td>B — Pillar</td><td>Roadmap sequencing within pillar; programme playbooks; partner outreach within approved criteria; IC tasking within pillar</td><td>Pillar Head</td></tr>
      <tr><td>C — Team</td><td>Task assignment; KPI agreement; first-level coaching/verbal or written warning; leave recommendation</td><td>Team Lead under AFRI-TLOP-01</td></tr>
      <tr><td>D — Individual</td><td>Executing assigned work; accurate Portal updates; Slack acknowledgements</td><td>Team Member</td></tr>
    </tbody>
  </table>

  <h2>4. Authority matrix (binding)</h2>
  <table>
    <thead><tr><th>Matter</th><th>Team Lead</th><th>Pillar Head</th><th>People &amp; Culture</th><th>Finance</th><th>CEO</th></tr></thead>
    <tbody>
      <tr><td>Assign/reassign Portal tasks in team</td><td>Approve</td><td>Approve</td><td>—</td><td>—</td><td>Approve</td></tr>
      <tr><td>Agree Agreed Capacity</td><td>Recommend</td><td>Approve</td><td>Advise</td><td>—</td><td>Override</td></tr>
      <tr><td>Leave / absence from duty</td><td>Recommend in Portal within 1 official work day</td><td>May recommend</td><td><strong>Approve or decline (final)</strong></td><td>—</td><td>Override</td></tr>
      <tr><td>Portal access for new Internal Contributor</td><td>Recommend</td><td>Recommend</td><td>Approve access</td><td>—</td><td>Approve Pillar Head appointments</td></tr>
      <tr><td>End Internal Contributor engagement</td><td>Recommend</td><td>Recommend</td><td>Administer; approve ordinary cases</td><td>—</td><td>Approve for Pillar Heads / material cases</td></tr>
      <tr><td>Promise salary, stipend, equity, or employment</td><td>Forbidden</td><td>Forbidden</td><td>Forbidden</td><td>Forbidden</td><td><strong>Only in writing</strong></td></tr>
      <tr><td>Cash Commitment</td><td>Forbidden</td><td>Propose in writing</td><td>—</td><td>Review &amp; log</td><td><strong>Approve in writing</strong></td></tr>
      <tr><td>Sign MoU / partner / vendor agreement</td><td>Forbidden</td><td>Draft only</td><td>People clauses</td><td>Commercial review</td><td><strong>Sign</strong></td></tr>
      <tr><td>Production release (material)</td><td>—</td><td>Product Head Approve</td><td>—</td><td>—</td><td>Approve major public launches</td></tr>
      <tr><td>Company-wide policy change</td><td>Forbidden</td><td>Propose</td><td>Draft &amp; steward</td><td>Finance policies</td><td>Approve</td></tr>
      <tr><td>External press / public statement</td><td>Forbidden</td><td>Forbidden unless CEO-authorised in writing</td><td>Forbidden</td><td>Forbidden</td><td>Approve</td></tr>
      <tr><td>Written warning</td><td>May issue (copy People &amp; Culture)</td><td>May issue</td><td>Record &amp; oversee</td><td>—</td><td>May issue</td></tr>
      <tr><td>PIP</td><td>Recommend</td><td>Support</td><td>Approve process &amp; record</td><td>—</td><td>Severe cases</td></tr>
      <tr><td>End paid employment (if any exists)</td><td>Forbidden</td><td>Recommend</td><td>Process</td><td>—</td><td>Approve</td></tr>
    </tbody>
  </table>

  <h2>5. Leave authority (conflict rule)</h2>
  <p>If any playbook or Portal label appears to allow a Team Lead to “approve leave,” that means the Team Lead may record the operational recommendation or a Portal action only as configured. <strong>The final decision on leave rests with People &amp; Culture</strong> under AFRI-LAP-01, unless the CEO has granted a written, time-bound delegation naming the delegate and scope. Silence is not delegation.</p>

  <h2>6. Cash and personal outlay</h2>
  <ol>
    <li>No Team Member may create a Cash Commitment without prior written CEO approval and Finance logging.</li>
    <li>“I will pay personally and reclaim later” is a Cash Commitment and requires the same prior approval.</li>
    <li>Unapproved spend is the personal responsibility of the person who incurred it.</li>
  </ol>

  <h2>7. Escalation</h2>
  <ol>
    <li>Team Member → Team Lead (Slack + Portal record where a workflow exists).</li>
    <li>Team Lead → Pillar Head.</li>
    <li>Pillar Head → CEO; copy People &amp; Culture for people-risk; copy Finance for money-risk.</li>
    <li>Direct CEO or Speak up route: critical risk, alleged misconduct by the reporting line, legal/safety risk, or whistleblowing.</li>
  </ol>
  <p>For a crisis (immediate risk to operations, reputation, infrastructure, legal standing, safety, or user trust): the Team Lead must escalate to the Pillar Head and CEO within <strong>sixty (60) minutes</strong> of becoming aware that the matter is critical.</p>

  <h2>8. Conflicts between documents</h2>
  <ol>
    <li>AFRI-LAP-01 controls leave procedure.</li>
    <li>AFRI-TLOP-01 controls Team Lead operational duties within §4 of this matrix.</li>
    <li>AFRI-ORG-01 controls ownership of outcomes.</li>
    <li>AFRI-SWP controls work process and progressive discipline steps.</li>
    <li>If still unclear: People &amp; Culture interprets; the CEO decides finally in writing.</li>
  </ol>

  ${commonClosing('AFRI-DOA-01', 'AFRI-ORG-01 · AFRI-TLOP-01 · AFRI-SWP · AFRI-LAP-01 · AFRI-ICEF-01 · AFRI-ODR-01')}
`

const odrBody = `
  <h2>1. Purpose</h2>
  <p>This Official Document Register is the index of AfriVate’s binding internal instruments. A document is not an official AfriVate policy unless it appears in this Register (or is a temporary Portal Memo that expressly states it is issued under authority of a registered policy and does not contradict a higher instrument).</p>

  <h2>2. Precedence (highest to lowest)</h2>
  <ol>
    <li>Mandatory provisions of Nigerian law and AfriVate’s corporate constitutional documents</li>
    <li>AFRI-SWP — Standard Work Process</li>
    <li>AFRI-ORG-01 — Organisational Structure &amp; Role Charters</li>
    <li>AFRI-DOA-01 — Delegation of Authority</li>
    <li>Specialist policies (including AFRI-ICEF-01, AFRI-VCC, AFRI-LAP-01)</li>
    <li>Playbooks and handbooks (AFRI-TLOP-01, AFRI-EOH-01, AFRI-PUG-01 / AFRI-PUG-02 / AFRI-PUG-03)</li>
    <li>Portal Memos — operational instructions only; they cannot silently repeal a higher instrument</li>
  </ol>
  <p>If two instruments at the same level conflict, People &amp; Culture issues a written determination; the CEO may override in writing.</p>

  <h2>3. Register of official instruments</h2>
  <table>
    <thead><tr><th>Code</th><th>Title</th><th>Owner</th><th>Audience</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>AFRI-SWP</td><td>Standard Work Process</td><td>CEO / People &amp; Culture</td><td>All Team Members</td><td>In force</td></tr>
      <tr><td>AFRI-ORG-01</td><td>Organisational Structure &amp; Role Charters</td><td>CEO</td><td>All Team Members</td><td>In force</td></tr>
      <tr><td>AFRI-DOA-01</td><td>Delegation of Authority</td><td>CEO</td><td>Leads, Heads, Finance, People &amp; Culture</td><td>In force</td></tr>
      <tr><td>AFRI-ICEF-01</td><td>Internal Contributor Engagement Framework</td><td>People &amp; Culture</td><td>Internal unpaid Contributors</td><td>In force</td></tr>
      <tr><td>AFRI-VCC</td><td>Volunteer Code of Conduct</td><td>People &amp; Culture</td><td>External volunteers &amp; partner collaborators</td><td>In force</td></tr>
      <tr><td>AFRI-LAP-01</td><td>Leave and Absence Policy</td><td>People &amp; Culture</td><td>All Team Members within scope of LAP</td><td>In force</td></tr>
      <tr><td>AFRI-EOH-01</td><td>Team Member Onboarding Handbook</td><td>People &amp; Culture</td><td>New and existing Team Members</td><td>In force</td></tr>
      <tr><td>AFRI-TLOP-01</td><td>Team Lead Operational Playbook</td><td>People &amp; Culture</td><td>Team Leads</td><td>In force</td></tr>
      <tr><td>AFRI-PUG-01</td><td>Portal User Guide (full / Admin)</td><td>People &amp; Culture / Product</td><td>People &amp; Culture, Administrators (reference for all)</td><td>In force (procedural guide; not a policy)</td></tr>
      <tr><td>AFRI-PUG-02</td><td>Portal User Guide (Staff)</td><td>People &amp; Culture / Product</td><td>Team members</td><td>In force (procedural guide; not a policy)</td></tr>
      <tr><td>AFRI-PUG-03</td><td>Portal User Guide (Team Leads)</td><td>People &amp; Culture / Product</td><td>Team leads and assistant leads</td><td>In force (procedural guide; not a policy)</td></tr>
      <tr><td>AFRI-ODR-01</td><td>Official Document Register</td><td>People &amp; Culture</td><td>All</td><td>In force</td></tr>
    </tbody>
  </table>

  <h2>4. Interpretation rules</h2>
  <ul>
    <li><strong>“Employee”</strong> in any legacy wording means Team Member, unless a paid employment contract exists.</li>
    <li><strong>“Must / shall”</strong> is mandatory. <strong>“May”</strong> is discretionary. <strong>“Should”</strong> is guidance only and is avoided in binding clauses.</li>
    <li><strong>Days:</strong> “Official work days” means Monday–Thursday unless AfriVate has declared otherwise in writing. “Calendar days” means consecutive days including weekends.</li>
    <li><strong>Portal record controls:</strong> Where a decision must be recorded in the Portal, no informal channel creates that decision.</li>
  </ul>

  <h2>5. Publication and master copies</h2>
  <ol>
    <li>Master HTML/PDF copies are maintained under AfriVate’s official document repository as designated by People &amp; Culture (including <code>docs/official/policies/</code> in the company repository and the approved Drive vault).</li>
    <li>The staff-facing binding copy is the version published in Portal → Resources with the matching Document Code and effective date.</li>
    <li>People &amp; Culture must update this Register in the same release as any addition, retirement, or material amendment of an official instrument.</li>
    <li>WhatsApp and Slack cannot create, amend, or repeal policy.</li>
  </ol>

  <h2>6. Instruments created only on trigger</h2>
  <table>
    <thead><tr><th>Instrument</th><th>Trigger</th></tr></thead>
    <tbody>
      <tr><td>Compensation &amp; Benefits Policy</td><td>CEO approves a salary or stipend budget in writing</td></tr>
      <tr><td>Expanded Information Security Policy</td><td>CEO or partner/audit requirement at material personal-data scale</td></tr>
      <tr><td>Board / Governance Charter</td><td>Formal board constituted</td></tr>
      <tr><td>Impact / MEL Framework</td><td>Grant or partner reporting obligation requires it</td></tr>
    </tbody>
  </table>

  <h2>7. Minimum operating set</h2>
  <p>AfriVate treats the following as the minimum set every Internal Contributor must acknowledge before or within seven (7) official work days of access: AFRI-SWP, AFRI-ORG-01, AFRI-ICEF-01, AFRI-LAP-01, and AFRI-EOH-01. Team Leads must also acknowledge AFRI-TLOP-01 and AFRI-DOA-01. Pillar Heads must acknowledge AFRI-DOA-01.</p>

  ${commonClosing('AFRI-ODR-01', 'All registered instruments')}
`

const docs = [
  {
    file: 'Afrivate-Organizational-Structure',
    title: 'Afrivate Organisational Structure &amp; Role Charters',
    meta: [
      ['Document Code', 'AFRI-ORG-01'],
      ['Status', 'Official — Binding'],
      ['Applies To', 'All AfriVate Team Members'],
      ['Compensation Stage', 'Unpaid internal contribution unless a separate paid instrument exists'],
      ['Effective Date', '2 August 2026'],
      ['Review Cycle', 'Every 6 months or at first salary transition'],
      ['Owner', 'CEO'],
    ],
    body: orgBody,
  },
  {
    file: 'Afrivate-Internal-Contributor-Engagement-Framework',
    title: 'Afrivate Internal Contributor Engagement Framework',
    meta: [
      ['Document Code', 'AFRI-ICEF-01'],
      ['Status', 'Official — Binding'],
      ['Applies To', 'Internal unpaid Contributors'],
      ['Not', 'A contract of employment'],
      ['Effective Date', '2 August 2026'],
      ['Review Cycle', 'At first salary payment or every 6 months'],
      ['Owner', 'People &amp; Culture'],
    ],
    body: icefBody,
  },
  {
    file: 'Afrivate-Delegation-of-Authority',
    title: 'Afrivate Delegation of Authority',
    meta: [
      ['Document Code', 'AFRI-DOA-01'],
      ['Status', 'Official — Binding'],
      ['Applies To', 'CEO, Pillar Heads, Team Leads, People &amp; Culture, Finance'],
      ['Effective Date', '2 August 2026'],
      ['Review Cycle', 'Every 6 months'],
      ['Owner', 'CEO'],
    ],
    body: doaBody,
  },
  {
    file: 'Afrivate-Official-Document-Register',
    title: 'Afrivate Official Document Register',
    meta: [
      ['Document Code', 'AFRI-ODR-01'],
      ['Status', 'Official — Binding index'],
      ['Applies To', 'All persons creating or relying on official documents'],
      ['Effective Date', '2 August 2026'],
      ['Review Cycle', 'Updated whenever the official set changes'],
      ['Owner', 'People &amp; Culture'],
    ],
    body: odrBody,
  },
]

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch()
for (const doc of docs) {
  const htmlPath = path.join(outDir, `${doc.file}.html`)
  const pdfPath = path.join(outDir, `${doc.file}.pdf`)
  await writeFile(htmlPath, wrap(doc.title, doc.meta, doc.body), 'utf8')
  const page = await browser.newPage()
  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' })
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `<div style="width:100%;font-size:9px;color:#666;padding:0 18mm;display:flex;justify-content:space-between;font-family:Segoe UI,Arial,sans-serif;"><span>hr@afrivate.org · portal.afrivate.org</span><span>RC: 9210092 · Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
    margin: { top: '14mm', right: '14mm', bottom: '16mm', left: '16mm' },
  })
  await page.close()
  try {
    await copyFile(pdfPath, path.join(downloadsDir, `${doc.file}.pdf`))
  } catch {
    /* ignore lock */
  }
  console.log('Wrote', pdfPath)
}
await browser.close()
console.log('Foundation docs done')

import { hrSignBlockWithCeoHtml } from '../hr-signature.mjs'

function offenseTable(rows) {
  const body = rows
    .map(
      ([offense, cat, first, second, third]) =>
        `<tr><td>${offense}</td><td><strong>${cat}</strong></td><td>${first}</td><td>${second}</td><td>${third}</td></tr>`,
    )
    .join('')
  return `<table>
    <thead><tr><th>Offense</th><th>Cat.</th><th>1st occurrence</th><th>2nd occurrence</th><th>3rd / Escalation</th></tr></thead>
    <tbody>${body}</tbody>
  </table>`
}

export const pdpBody = `
      <div class="note"><strong>Status disclaimer:</strong> This Policy operationalises the progressive discipline framework already established in AFRI-SWP §10–12 by setting a detailed schedule of offenses, categories, and corresponding penalties, and by clarifying investigation, suspension, and appeal procedure. It does not replace AFRI-SWP, AFRI-DOA-01, or AFRI-ICEF-01; where a conflict arises, those instruments prevail in the order set by AFRI-ODR-01. This Policy does not, by itself, create employment, wages, or benefits for unpaid Internal Contributors, and does not remove any statutory right available to a future paid Employee under the laws of the Federal Republic of Nigeria.</div>

      <h2>1. Purpose and scope</h2>
      <p>This Policy sets out, in one place, the offenses that may attract disciplinary action at AfriVate Technologies Ltd (“AfriVate”), the categories those offenses fall into, and the penalties that ordinarily apply on a first, second, and further occurrence. It exists so that no Team Member is disciplined by guesswork, and so that Team Leads and Pillar Heads apply consequences consistently across departments.</p>
      <p>It applies to every Team Member with approved Portal access — Internal Contributors under AFRI-ICEF-01 and any future paid Employee alike — and to Team Leads and Pillar Heads acting in their operational capacity. Where a person also falls under AFRI-VCC (external volunteers and partner-placed collaborators), the relevant provisions of that Code apply in addition to, and where narrower than, this Policy.</p>
      <p>This Policy is a schedule under, and subordinate to, AFRI-SWP §10–§12 (Targets, KPIs, and Performance Management; Discipline and Corrective Action). It does not create a new disciplinary authority structure — authority to issue each penalty remains exactly as set out in AFRI-DOA-01. It exists to make the schedule of offenses and penalties detailed, predictable, and consistently applied.</p>

      <h2>2. Definitions</h2>
      <table>
        <thead><tr><th>Term</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><strong>Offense</strong></td><td>Any act or omission described in §6 of this Policy, or any breach of AFRI-SWP, AFRI-ICEF-01, AFRI-LAP-01, AFRI-DOA-01, AFRI-ORG-01, AFRI-TLOP-01, AFRI-VCC, or a lawful instruction, that this Policy or AFRI-SWP treats as subject to disciplinary action.</td></tr>
          <tr><td><strong>Misconduct</strong></td><td>Conduct that falls short of AfriVate’s professionalism, integrity, or system-of-record standards, whether or not it was deliberate.</td></tr>
          <tr><td><strong>Gross Misconduct</strong></td><td>Conduct so serious that it fundamentally breaches the trust between AfriVate and the Team Member, justifying suspension and, ordinarily, immediate end of engagement or employment without progressive steps (Category D, §5.4).</td></tr>
          <tr><td><strong>Penalty</strong></td><td>Any consequence listed in §4.2, from documented coaching to end of engagement or termination of paid employment.</td></tr>
          <tr><td><strong>Live Warning</strong></td><td>A verbal, written, or final written warning that remains in effect for the period stated in §7.3 and is counted when assessing a repeat occurrence.</td></tr>
          <tr><td><strong>Disciplinary Authority</strong></td><td>The person or office empowered under §4 (mirroring AFRI-DOA-01) to issue or approve a specific penalty.</td></tr>
          <tr><td><strong>Investigating Officer</strong></td><td>The Team Lead, Pillar Head, or People &amp; Culture representative assigned to establish the facts of a suspected offense under §8.</td></tr>
          <tr><td><strong>Rolling Period</strong></td><td>The trailing twelve (12) calendar months used to determine whether an offense is a first, second, or further occurrence, unless a shorter period is stated for a specific offense.</td></tr>
        </tbody>
      </table>

      <h2>3. Guiding principles</h2>
      <p>AfriVate applies discipline according to the following principles, drawn from AFRI-SWP’s culture standards and from generally accepted employment-relations practice in Nigeria and internationally:</p>
      <ul>
        <li><strong>Proportionality.</strong> The penalty must fit the offense, its impact, and the Team Member’s record — not the mood of the moment.</li>
        <li><strong>Consistency.</strong> Two people who commit materially the same offense in materially the same circumstances receive materially the same penalty. Disciplinary Authorities should check prior Portal records for comparable cases before deciding.</li>
        <li><strong>Investigate before you penalise.</strong> No penalty above documented coaching is issued without the fact-finding process in §8, however brief that process may reasonably be for a clear-cut Category A matter.</li>
        <li><strong>Right to be heard.</strong> A Team Member facing Category B, C, or D action is told what they are alleged to have done and is given a fair opportunity to respond before a decision is recorded, per §9.</li>
        <li><strong>Documentation, not memory.</strong> Every coaching note, warning, PIP, suspension, and end-of-engagement decision is recorded in the Portal. A Slack or WhatsApp exchange is never the disciplinary record (AFRI-SWP §6.2).</li>
        <li><strong>Confidentiality.</strong> Disciplinary matters are shared only with those who need to know to investigate, decide, or implement the outcome.</li>
        <li><strong>Non-retaliation.</strong> No Team Member is disciplined for a good-faith Speak Up report, for refusing an unsafe or unlawful instruction, or for raising a concern through the correct channel. Retaliation is itself a Category D offense (§6.6).</li>
        <li><strong>Skip-step is the exception, not the rule.</strong> Steps in the progressive sequence (§4.1) may be skipped only for Category C or D conduct, and the reason for skipping must be recorded.</li>
      </ul>

      <h2>4. Progressive sequence and authority to discipline</h2>
      <h3>4.1 The progressive sequence</h3>
      <p>Consistent with AFRI-SWP §12.1, AfriVate’s ordinary disciplinary sequence is:</p>
      <ol>
        <li>Documented coaching or verbal warning</li>
        <li>Written warning</li>
        <li>Final written warning and/or Performance Improvement Plan (PIP)</li>
        <li>Suspension of Portal access and/or restricted duties, pending or following investigation</li>
        <li>End of unpaid engagement, or termination of paid employment where a signed employment contract exists, subject to applicable law</li>
      </ol>
      <p>AfriVate may enter this sequence at any step, and may skip steps, where the severity of the conduct under §6 justifies it — this is stated for each offense in the Schedule.</p>
      <h3>4.2 Who may issue or approve each penalty</h3>
      <p>Authority mirrors AFRI-DOA-01 exactly. This table restates it for quick disciplinary reference; AFRI-DOA-01 controls in the event of any inconsistency.</p>
      <table>
        <thead><tr><th>Penalty</th><th>Team Lead</th><th>Pillar Head</th><th>People &amp; Culture</th><th>CEO</th></tr></thead>
        <tbody>
          <tr><td>Documented coaching / verbal warning</td><td>May issue</td><td>May issue</td><td>May issue</td><td>May issue</td></tr>
          <tr><td>Written warning</td><td>May issue (copy People &amp; Culture)</td><td>May issue</td><td>May issue</td><td>May issue</td></tr>
          <tr><td>Final written warning</td><td>Recommend</td><td>May issue</td><td>May issue</td><td>May issue</td></tr>
          <tr><td>Performance Improvement Plan (PIP)</td><td>Recommend</td><td>Support</td><td>Approve and record</td><td>Approve for severe cases</td></tr>
          <tr><td>Suspension of Portal access / restricted duties</td><td>Recommend, escalate immediately</td><td>Recommend</td><td>Approve</td><td>Approve / override</td></tr>
          <tr><td>End of unpaid engagement</td><td>Recommend</td><td>Recommend</td><td>Administer; approve ordinary cases</td><td>Approve for Pillar Heads or material cases</td></tr>
          <tr><td>Termination of paid employment (where applicable)</td><td>Forbidden</td><td>Recommend</td><td>Process</td><td>Approve</td></tr>
        </tbody>
      </table>
      <p>A Team Lead’s Portal action on any of the above is a recommendation only unless the CEO has issued a written, time-bound delegation naming the delegate and scope (AFRI-DOA-01 §5). Silence is not delegation.</p>

      <h2>5. Classification of offenses</h2>
      <p>Every offense in this Policy is assigned one of four categories. The category — not the department or the identity of the person involved — determines the ordinarily applicable penalty range.</p>
      <table>
        <thead><tr><th>Category</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><strong>A — Minor</strong></td><td>First-time, low-impact lapses correctable through coaching. Left unaddressed, repeated Category A conduct becomes Category B.</td></tr>
          <tr><td><strong>B — Moderate</strong></td><td>A repeat of Category A after coaching, or a single incident whose operational impact is clearer — a missed deliverable, an unauthorised absence, a Portal-record integrity lapse. Category B ordinarily starts at a written warning.</td></tr>
          <tr><td><strong>C — Serious</strong></td><td>Conduct that damages trust, breaches an authority limit under AFRI-DOA-01, causes material operational, financial, or reputational harm, or repeats Category B after a live warning. AfriVate may skip directly to a final written warning, PIP, or suspension pending investigation.</td></tr>
          <tr><td><strong>D — Gross Misconduct</strong></td><td>Conduct so severe — dishonesty, theft, fraud, harassment, violence, security or confidentiality sabotage, corruption, or a serious and willful breach of AFRI-ICEF-01’s confidentiality or intellectual-property terms — that it justifies immediate suspension pending investigation and, ordinarily, immediate end of engagement or termination of employment without progressive steps, in accordance with AFRI-SWP §12.1 and AFRI-ICEF-01 §8.2.</td></tr>
        </tbody>
      </table>

      <h2>6. Schedule of offenses and penalties</h2>
      <p>The Schedule below is organised by theme. Unless the offense description states otherwise, “occurrence” is counted within the Rolling Period defined in §2, and each theme’s occurrences are counted separately unless the underlying conduct is the same act.</p>

      <h3>6.1 Attendance, availability, and leave</h3>
      ${offenseTable([
        ['Failing to acknowledge an official Slack message within 4 hours during official work days and core hours (AFRI-SWP §6.1), without reasonable explanation.', 'A', 'Documented coaching', 'Verbal warning', 'Written warning; Category B on 3rd occurrence'],
        ['Unexplained lateness to, or unannounced absence from, a scheduled meeting.', 'A', 'Documented coaching', 'Verbal warning', 'Written warning'],
        ['Missing a Weekly check-in without explanation (AFRI-EOH-01 §7).', 'A', 'Documented coaching', 'Written warning', 'Final written warning'],
        ['Being unreachable during agreed core hours on official work days without prior notice to the Team Lead.', 'B', 'Written warning', 'Final written warning / PIP', 'Suspension recommendation'],
        ['Submitting a leave request through WhatsApp, Slack, email, or verbally instead of the Portal (AFRI-LAP-01 §6).', 'B', 'Written warning; request still requires proper Portal submission', 'Final written warning', 'PIP'],
        ['Taking unauthorised absence from Agreed Capacity before a Portal decision of “approved” appears (AFRI-LAP-01 §2, §5).', 'B', 'Written warning', 'Final written warning / PIP', 'Suspension recommendation; Category C on repeat after PIP'],
        ['Repeated late leave requests (inside the 3 official work day notice window) without a genuine emergency (AFRI-LAP-01 §3, §8).', 'B', 'Verbal warning / coaching', 'Written warning', 'Final written warning'],
        ['Misusing the emergency-absence provision (AFRI-LAP-01 §7) to evade the ordinary notice process.', 'C', 'Final written warning / PIP', 'Suspension recommendation', 'End of engagement recommendation'],
        ['Proceeding on leave without completing the mandatory handover under AFRI-LAP-01 §4.', 'B', 'Written warning', 'Final written warning', 'PIP'],
        ['Prolonged, unexplained disengagement from Portal and Slack activity during an active Agreed Capacity period.', 'C', 'Final written warning / PIP, with Portal access review', 'Suspension recommendation', 'End of engagement recommendation'],
      ])}

      <h3>6.2 Portal, Slack, and systems compliance</h3>
      ${offenseTable([
        ['Leaving Portal tasks stale (status, progress, hours, or blockers not updated on an official work day the task is active) (AFRI-SWP §7.2).', 'A', 'Documented coaching', 'Verbal warning', 'Written warning'],
        ['Failing to acknowledge an assigned policy or handbook in Portal → Resources within 7 official work days of access approval or a material update notice.', 'A', 'Documented coaching / reminder', 'Verbal warning', 'Written warning'],
        ['Performing material, non-trivial work with no corresponding Portal task record where a task workflow exists (AFRI-SWP §7.3).', 'B', 'Written warning', 'Final written warning', 'PIP'],
        ['Using WhatsApp or informal channels to bypass a required Portal workflow for leave, discipline, or policy acknowledgement (AFRI-SWP §7.3).', 'B', 'Written warning', 'Final written warning', 'PIP'],
        ['Claiming completion of a task without meeting its stated success criteria (AFRI-SWP §7.3).', 'B', 'Written warning and rework required', 'Final written warning / PIP', 'Suspension recommendation'],
        ['Failing to complete assigned learning or submit required evidence by the stated deadline without agreed extension.', 'A', 'Documented coaching / reminder', 'Written warning', 'Final written warning'],
        ['As a Team Lead, assigning a task that fails the completeness gate in AFRI-TLOP-01 §6 more than once after feedback.', 'B', 'Coaching from Pillar Head', 'Written warning', 'Final written warning'],
        ['Falsifying a Portal record — task completion, logged hours, a check-in, or a 1:1 mark — that does not reflect what actually occurred.', 'C', 'Final written warning / suspension pending investigation', 'End of engagement recommendation', 'Treated as Category D on evidence of repeated or deliberate pattern'],
        ['Deliberately disabling, evading, or instructing others to evade a Portal control (e.g. approval gates, audit trail) for personal convenience.', 'C', 'Suspension pending investigation', '—', 'End of engagement recommendation'],
      ])}

      <h3>6.3 Communication, professionalism, and interpersonal conduct</h3>
      ${offenseTable([
        ['Unprofessional tone, sarcasm, or disrespect toward a colleague on Slack, Portal comments, or in a meeting.', 'A', 'Documented coaching', 'Verbal warning', 'Written warning'],
        ['Escalating a personal disagreement in a team or department Slack channel instead of resolving it privately or through the Team Lead.', 'A', 'Documented coaching', 'Written warning', 'Final written warning'],
        ['Repeated failure to summarise decisions after long Slack threads or to keep discussion professional, after being asked to.', 'A', 'Documented coaching', 'Verbal warning', 'Written warning'],
        ['Speaking, posting, or otherwise communicating externally on AfriVate’s behalf without prior written authorisation from the CEO or an authorised Brand owner.', 'C', 'Final written warning; content taken down where possible', 'Suspension recommendation', 'End of engagement recommendation; Category D if the statement causes material reputational or legal harm'],
        ['Undermining a colleague’s or Team Lead’s authority in front of others, or refusing a lawful, safe instruction without raising it through Speak Up or the correct channel first.', 'B', 'Written warning', 'Final written warning', 'PIP'],
        ['Bullying, persistent belittling, or a hostile pattern of conduct toward a colleague that does not (yet) meet the harassment threshold in §6.6.', 'C', 'Suspension pending investigation, then final written warning / PIP if substantiated', '—', 'End of engagement recommendation'],
        ['Dishonesty toward a Team Lead, Pillar Head, or People &amp; Culture on a work-related matter (e.g. misrepresenting why a deadline was missed).', 'B', 'Written warning', 'Final written warning', 'PIP; Category C where the dishonesty concealed a more serious matter'],
      ])}

      <h3>6.4 Authority, governance, and financial integrity</h3>
      ${offenseTable([
        ['As a Team Lead, treating a leave request as approved, or telling a Team Member it is approved, before People &amp; Culture’s decision appears in the Portal.', 'B', 'Written warning; decision corrected', 'Final written warning', 'Removal of Team Lead duties recommendation'],
        ['Promising, discussing as binding, or implying any salary, stipend, equity, or employment outcome without CEO authorisation in writing.', 'C', 'Final written warning / suspension pending investigation', '—', 'End of engagement or removal from role recommendation'],
        ['Creating a Cash Commitment, or agreeing to personally pay and reclaim later, without prior written CEO approval and Finance logging.', 'C', 'Final written warning; unapproved spend is the individual’s personal responsibility', 'Suspension recommendation', 'End of engagement recommendation; Category D where the amount or intent indicates misappropriation'],
        ['Signing, or purporting to sign, an MoU, partner agreement, or vendor contract binding AfriVate without CEO authority.', 'D', 'Suspension pending investigation and immediate end of engagement/termination', '—', '—'],
        ['Making an external press or public statement on AfriVate’s behalf without CEO authorisation.', 'C', 'Final written warning / suspension pending investigation', '—', 'End of engagement recommendation; Category D on material reputational harm'],
        ['Overriding or ignoring company-wide policy or a Playbook limit that AFRI-DOA-01 reserves to a higher authority.', 'C', 'Final written warning', 'Suspension recommendation', 'End of engagement recommendation'],
        ['Approving a Production release of material scope without the authority AFRI-DOA-01 reserves to the Head of Product &amp; Technology or CEO.', 'B', 'Written warning', 'Final written warning', 'PIP'],
      ])}

      <h3>6.5 Confidentiality, data security, and intellectual property</h3>
      ${offenseTable([
        ['Using a weak password or ignoring an account-security prompt after being asked to correct it (AFRI-SWP §14).', 'A', 'Documented coaching', 'Verbal warning', 'Written warning'],
        ['Sharing Portal credentials or a Slack workspace invite with someone outside AfriVate without written authorisation.', 'C', 'Final written warning / suspension pending investigation and forced credential reset', '—', 'End of engagement recommendation'],
        ['Failing to report a suspected security incident to the Team Lead and People &amp; Culture immediately upon discovery.', 'B', 'Written warning', 'Final written warning', 'PIP'],
        ['Disclosing non-public AfriVate information (product plans, partner data, personnel data, financials, security details) without written authorisation.', 'C', 'Suspension pending investigation; final written warning if substantiated but limited in impact', '—', 'End of engagement recommendation; Category D where disclosure is deliberate, repeated, or causes material harm'],
        ['Storing official Work Product only in personal WhatsApp threads or unmanaged personal drives instead of approved systems.', 'A', 'Documented coaching; files retrieved and migrated', 'Written warning', 'Final written warning'],
        ['Using AfriVate Work Product, tools, templates, or Confidential Information for personal or third-party benefit.', 'D', 'Suspension pending investigation and immediate end of engagement', '—', '—'],
        ['Deliberate exfiltration, leak, or sale of user data, partner terms, or internal metrics.', 'D', 'Immediate suspension and end of engagement/termination; matter referred for legal action where warranted', '—', '—'],
        ['Failing to return AfriVate tools, templates, credentials, or devices on exit, or retaining access after engagement ends.', 'B', 'Written warning; formal recovery demand issued', 'Escalated recovery action, which may include legal referral', '—'],
      ])}

      <h3>6.6 Harassment, discrimination, and workplace safety</h3>
      ${offenseTable([
        ['A single, non-severe instance of disrespectful or exclusionary conduct related to a colleague’s identity, background, or personal characteristics, promptly acknowledged once raised.', 'B', 'Written warning and mandatory conversation with People &amp; Culture', 'Final written warning / PIP', 'Suspension recommendation; Category C/D where the pattern continues'],
        ['Harassment (verbal or non-physical), including unwelcome comments, persistent unwanted contact, or a hostile pattern directed at a colleague, Pathfinder, Enabler, or Partner.', 'C', 'Immediate suspension pending investigation', '—', 'End of engagement recommendation if substantiated; Category D where severe or repeated'],
        ['Sexual harassment of any kind, including unwelcome sexual comments, advances, or contact.', 'D', 'Immediate suspension pending investigation and, if substantiated, immediate end of engagement/termination; matter may be referred to law enforcement', '—', '—'],
        ['Discrimination in a work-related decision or interaction on the basis of a protected characteristic.', 'D', 'Immediate suspension pending investigation and, if substantiated, immediate end of engagement/termination', '—', '—'],
        ['Retaliation, or an attempt at retaliation, against a person for a good-faith Speak Up report or for cooperating with an investigation.', 'D', 'Immediate suspension pending investigation and, if substantiated, immediate end of engagement/termination', '—', '—'],
        ['Workplace violence, threats of violence, or intimidation directed at any person connected to AfriVate.', 'D', 'Immediate suspension and end of engagement/termination; matter referred to law enforcement where warranted', '—', '—'],
        ['Attending an official meeting, call, or engagement while impaired in a way that affects safety, judgment, or professionalism.', 'C', 'Suspension pending investigation and mandatory conversation with People &amp; Culture', '—', 'End of engagement recommendation on repeat; Category D where safety is endangered'],
        ['Failing to report, or instructing another Team Member to ignore, an unsafe, unlawful, or unethical instruction.', 'B', 'Written warning', 'Final written warning', 'PIP'],
      ])}

      <h3>6.7 Performance integrity and task management</h3>
      ${offenseTable([
        ['Repeatedly missing agreed KPI deadlines without raising the risk early on Slack and in the Portal.', 'B', 'Written warning / coaching under AFRI-SWP §10 performance scale', 'PIP', 'Suspension or end of engagement, per AFRI-SWP §10'],
        ['As a Team Lead, failing to escalate a critical operational risk to the Pillar Head and CEO within 60 minutes of becoming aware it is critical.', 'B', 'Written warning', 'Final written warning', 'Removal of escalation duties recommendation'],
        ['Submitting inaccurate, incomplete, or misleading information in a Weekly check-in, appraisal, or performance record.', 'B', 'Written warning', 'Final written warning', 'PIP; Category C where the inaccuracy was deliberate and material'],
        ['Falsifying academic, professional, or identity credentials submitted during onboarding or at any point during engagement.', 'D', 'Immediate end of engagement/termination on verification of falsification', '—', '—'],
        ['Gross negligence in the performance of assigned duties that causes material harm to AfriVate, a partner, or a Pathfinder/Enabler.', 'C', 'Suspension pending investigation and, ordinarily, final written warning / PIP', '—', 'End of engagement recommendation; Category D where negligence was reckless or the harm severe'],
      ])}

      <h3>6.8 Gross misconduct — general catch-all</h3>
      <p>The offenses below are illustrative, not exhaustive, of conduct that AfriVate treats as Category D regardless of which theme it falls under. Each ordinarily results in immediate suspension pending investigation and, if substantiated, immediate end of engagement or termination of employment without progressive steps, and may be referred to law enforcement or civil action where warranted.</p>
      ${offenseTable([
        ['Theft, embezzlement, or misappropriation of AfriVate, partner, or colleague property or funds.', 'D', 'Immediate suspension; end of engagement/termination if substantiated', '—', '—'],
        ['Fraud, including falsified expense claims, invoices, or financial records.', 'D', 'Immediate suspension; end of engagement/termination if substantiated', '—', '—'],
        ['Bribery, corruption, or soliciting/accepting a kickback from a partner, vendor, or Enabler.', 'D', 'Immediate suspension; end of engagement/termination if substantiated', '—', '—'],
        ['Criminal conduct connected to AfriVate work, or that materially undermines fitness to continue in role.', 'D', 'Immediate suspension; end of engagement/termination if substantiated', '—', '—'],
        ['Serious and willful breach of confidentiality or intellectual-property obligations under AFRI-ICEF-01 §5.4 or §6.', 'D', 'Immediate suspension; end of engagement/termination if substantiated', '—', '—'],
        ['Deliberate sabotage of AfriVate systems, data, or Work Product.', 'D', 'Immediate suspension; end of engagement/termination if substantiated', '—', '—'],
      ])}

      <h2>7. Aggravating and mitigating factors</h2>
      <p>Before deciding a penalty within the range the Schedule allows, the Disciplinary Authority considers the following factors. They can move a penalty up or down within the ordinary range, and — in combination — can justify moving up or down one full step, with reasons recorded in the Portal.</p>
      <h3>7.1 Aggravating factors</h3>
      <ul>
        <li>The Team Member holds a position of trust (Team Lead, Pillar Head, or handling Confidential Information, cash, or vulnerable Pathfinders) relevant to the offense.</li>
        <li>The conduct was deliberate, planned, or concealed rather than careless.</li>
        <li>The offense caused, or could reasonably have caused, material harm to a person, AfriVate, or a partner.</li>
        <li>The Team Member has a live warning for the same or related conduct.</li>
        <li>The Team Member was untruthful during the investigation, or asked others to be.</li>
        <li>The conduct targeted a person who was, or could reasonably be seen as, vulnerable.</li>
      </ul>
      <h3>7.2 Mitigating factors</h3>
      <ul>
        <li>The Team Member self-reported the issue before it was discovered.</li>
        <li>The Team Member has a clean record over a substantial period of active contribution.</li>
        <li>The Team Member cooperated fully and promptly once the matter was raised.</li>
        <li>The conduct was a genuine, isolated error rather than a pattern.</li>
        <li>External circumstances reasonably contributed to the lapse (illness, emergency, documented technical failure) and were disclosed promptly.</li>
      </ul>
      <h3>7.3 Duration of a live warning</h3>
      <p>A warning that has expired is not deleted from Portal history but is not counted when assessing whether new conduct is a first, second, or further occurrence, unless the new conduct is a continuation or repetition of the exact same underlying issue.</p>
      <table>
        <thead><tr><th>Penalty</th><th>Stays “live” for</th></tr></thead>
        <tbody>
          <tr><td>Documented coaching / verbal warning</td><td>6 months from the date recorded in the Portal</td></tr>
          <tr><td>Written warning</td><td>9 months from the date recorded in the Portal</td></tr>
          <tr><td>Final written warning</td><td>12 months from the date recorded in the Portal, or the duration of an active PIP if longer</td></tr>
          <tr><td>Performance Improvement Plan (PIP)</td><td>Until closed out by People &amp; Culture as successful, unsuccessful, or superseded</td></tr>
        </tbody>
      </table>

      <h2>8. Investigation procedure</h2>
      <p>The depth of investigation is proportionate to the category and complexity of the suspected offense. A clear-cut Category A matter may be resolved on the spot by direct conversation; Category C and D matters require the fuller process below.</p>
      <ol>
        <li><strong>Detection or report.</strong> A suspected offense may come from direct observation, a Portal or Slack record, a colleague’s report, or a Speak Up submission (People → Growth → Speak up).</li>
        <li><strong>Preliminary assessment.</strong> The Team Lead (or People &amp; Culture, if the Team Lead is implicated or unavailable) reviews available Portal and Slack evidence and decides whether the matter can be resolved informally (Category A) or requires a formal investigation (Category B, C, or D).</li>
        <li><strong>Appointment of an Investigating Officer.</strong> For Category C and D matters, People &amp; Culture appoints an Investigating Officer who is not the complainant and, where reasonably possible, not the Team Member’s direct Team Lead if that Team Lead is closely involved in the underlying facts.</li>
        <li><strong>Fact-finding.</strong> The Investigating Officer gathers relevant Portal records, Slack messages, documents, and witness accounts, and keeps a written record of what was reviewed.</li>
        <li><strong>Notice to the Team Member.</strong> Before a Category B, C, or D penalty is decided, the Team Member is told, in writing, what they are alleged to have done and is given a reasonable opportunity — ordinarily at least two (2) official work days — to respond in writing or in a meeting.</li>
        <li><strong>Decision.</strong> The Disciplinary Authority named in §4.2 decides the outcome based on the evidence gathered and the Team Member’s response, applying §5 through §7, and records the decision and reasons in the Portal.</li>
        <li><strong>Communication.</strong> The Team Member is told the outcome, the reasons, and their right of appeal under §11, in writing.</li>
      </ol>
      <p>Investigations are completed as promptly as the facts allow. As a guide, Category B matters are ordinarily decided within five (5) official work days of the preliminary assessment, and Category C/D matters within ten (10) official work days, extended where complexity genuinely requires more time. Delay beyond this does not, by itself, invalidate the process, but should be explained to the Team Member.</p>

      <h2>9. Disciplinary meetings and right to respond</h2>
      <ul>
        <li>A Team Member facing a Category B, C, or D decision may request that a colleague of their choice (who is not a witness in the same matter) join any disciplinary meeting for support.</li>
        <li>The Team Member is entitled to see the substance of the evidence against them before the meeting, redacted only where necessary to protect a complainant’s identity or safety.</li>
        <li>Minutes or a summary of the meeting are recorded in the Portal or in writing and shared with the Team Member.</li>
        <li>Silence or a refusal to respond does not, by itself, establish guilt, but the Disciplinary Authority may decide the matter on the evidence available if the Team Member does not engage after a reasonable opportunity to do so.</li>
      </ul>

      <h2>10. Suspension pending investigation</h2>
      <p>Suspension of Portal access and/or restricted duties pending investigation is a neutral precautionary step, not a penalty, and does not itself imply a finding of guilt. It is used where continued full access could risk the investigation, AfriVate’s systems, or the safety or wellbeing of others.</p>
      <ul>
        <li>Suspension pending investigation is approved by People &amp; Culture (or the CEO for a Pillar Head or material case), consistent with §4.2.</li>
        <li>For unpaid Internal Contributors, suspension pending investigation does not create or imply any right to pay, since no current salary or wages are payable in any event (AFRI-ICEF-01 §3).</li>
        <li>For any future paid Employee, suspension pending investigation follows the terms of the signed employment instrument and applicable Nigerian law in addition to this Policy.</li>
        <li>Suspension is kept as short as the investigation reasonably requires, and the Team Member is updated if it will extend beyond ten (10) official work days.</li>
        <li>During suspension, the Team Member may ordinarily still read Memos and Resources unless the Investigating Officer determines that even this access should be restricted.</li>
      </ul>

      <h2>11. Appeals</h2>
      <p>A Team Member who disagrees with a disciplinary decision may appeal in writing within five (5) official work days of being notified of the outcome, stating the grounds of appeal.</p>
      <table>
        <thead><tr><th>Decision appealed</th><th>Appeal heard by</th></tr></thead>
        <tbody>
          <tr><td>Decision issued by a Team Lead</td><td>The relevant Pillar Head</td></tr>
          <tr><td>Decision issued by a Pillar Head</td><td>People &amp; Culture</td></tr>
          <tr><td>Decision issued by People &amp; Culture</td><td>The CEO</td></tr>
          <tr><td>Decision issued or approved by the CEO</td><td>The CEO’s decision is final, subject to any right the Team Member has under mandatory Nigerian law</td></tr>
        </tbody>
      </table>
      <p>The person hearing the appeal was not involved in the original decision wherever practicable. An appeal does not automatically pause a suspension or the effect of a warning, but the appeal-hearer may pause either where fairness requires it. The appeal outcome is communicated in writing within ten (10) official work days of the appeal being received, and is recorded in the Portal.</p>

      <h2>12. Records and confidentiality</h2>
      <p>The Portal is the sole system of record for coaching notes, warnings, PIPs, suspension decisions, and end-of-engagement/termination records, consistent with AFRI-SWP §6.2. A Slack or WhatsApp message never substitutes for the Portal record.</p>
      <p>Disciplinary records are visible only to the Team Member concerned, their current Team Lead and Pillar Head, People &amp; Culture, and the CEO, and are used only for the purposes of this Policy, AFRI-SWP §10, and any lawful successor process.</p>
      <p>Records are retained for as long as reasonably necessary for performance management, legal compliance, and dispute resolution, and are not disclosed to a third party except as required by law, with the Team Member’s written consent, or as part of a legitimate reference check limited to role, dates, and nature of contribution (AFRI-ICEF-01 §4).</p>

      <h2>13. Relationship to other instruments</h2>
      <p>This Policy sits below AFRI-SWP, AFRI-ORG-01, and AFRI-DOA-01, and alongside AFRI-ICEF-01 and AFRI-LAP-01, in the precedence order set by AFRI-ODR-01 §2. If any provision of this Policy appears to conflict with AFRI-SWP, AFRI-DOA-01, AFRI-ICEF-01, AFRI-LAP-01, AFRI-ORG-01, AFRI-TLOP-01, or AFRI-VCC, the higher or more specific instrument prevails, and People &amp; Culture will issue a written determination to resolve the ambiguity, with the CEO able to override in writing.</p>

      <h2>14. Special provisions for unpaid Internal Contributors and future paid Employees</h2>
      <p>Most AfriVate Team Members currently contribute without pay under AFRI-ICEF-01. For this group:</p>
      <ul>
        <li>Discipline under this Policy, including end of engagement, does not create, and should not be read as creating, any employment relationship, wages, benefits, or severance entitlement (AFRI-ICEF-01, binding status disclaimer).</li>
        <li>“End of engagement” for an Internal Contributor means the ending of Portal access and unpaid contribution, following AFRI-ICEF-01 §8.</li>
      </ul>
      <p>If and when AfriVate engages a Team Member under a signed, paid employment contract:</p>
      <ul>
        <li>This Policy continues to apply to how conduct is assessed and categorised, but any penalty amounting to suspension without pay or termination of employment is additionally subject to the terms of that signed contract and to the mandatory provisions of Nigerian labour law, including the Labour Act and any applicable rules on notice, fair hearing, and terminal benefits.</li>
        <li>Where this Policy and a signed employment contract conflict on a matter mandatory Nigerian law governs, the law and the contract prevail to the extent of the conflict.</li>
      </ul>

      <h2>15. Governing law and general</h2>
      <ul>
        <li><strong>Governing law:</strong> This document is governed by the laws of the Federal Republic of Nigeria. Subject to any mandatory forum rules, the courts of the Federal Capital Territory, Abuja, have jurisdiction over disputes arising from it.</li>
        <li><strong>Severability:</strong> If any provision is held invalid or unenforceable, the remaining provisions continue in full force.</li>
        <li><strong>No waiver:</strong> Failure by AfriVate to enforce a provision, or a decision to resolve a particular matter informally, is not a waiver of that provision or of AfriVate’s right to enforce it on a future occasion.</li>
        <li><strong>Amendments:</strong> Only the CEO (or a person the CEO expressly authorises in writing) may amend this document. The binding version is the version published under Portal → Resources, or the master copy designated in AFRI-ODR-01. Informal messages do not amend this Policy.</li>
        <li><strong>Acknowledgement:</strong> Portal acknowledgement constitutes the Team Member’s confirmation that they have read, understood, and agree to comply with this Policy. Continued access after the effective date constitutes notice of these terms; acknowledgement remains mandatory within seven (7) official work days of access approval or of a material update notice, consistent with the minimum operating set in AFRI-ODR-01 §7.</li>
      </ul>

      ${hrSignBlockWithCeoHtml}
      <p class="footer-note">Document Code AFRI-PDP-01 · Effective 1 September 2026 · Owner: CEO / People &amp; Culture · Related: AFRI-SWP · AFRI-DOA-01 · AFRI-ICEF-01 · AFRI-LAP-01 · AFRI-ORG-01 · AFRI-TLOP-01 · AFRI-VCC · AFRI-ODR-01</p>
`

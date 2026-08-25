function fill(n = 1) {
  return Array.from({ length: n }, () => '<td class="fill"></td>').join('')
}

export const appraisalFormBody = `
  <div class="note"><strong>How to use:</strong> Complete this form in a live discussion with the Team Member. Scores must be evidenced from Portal work (tasks, weekly check-ins, OKRs, feedback, 1:1s, learning). Record the outcome in the AfriVate Portal. Slack coordinates; it does not replace the Portal record. This form does <strong>not</strong> create employment or any right to pay.</div>

  <p>This evaluation links role expectations to actual performance. Its purpose is professional development — identifying strengths and improvement areas — and to help leadership assess performance and plan development interventions.</p>

  <h2>1. Team Member details</h2>
  <table class="form">
    <thead>
      <tr>
        <th>Team Member name</th>
        <th>Supervisor / Team Lead</th>
        <th>Job title</th>
        <th>Time in role</th>
      </tr>
    </thead>
    <tbody>
      <tr>${fill(4)}</tr>
      <tr>
        <th>Appraisal period</th>
        <th>Date of review</th>
        <th>Department / team</th>
        <th>Engagement type</th>
      </tr>
      <tr>
        <td class="preset">January – June 2026</td>
        <td class="fill"></td>
        <td class="fill"></td>
        <td class="hint">Internal Contributor / Employee / Volunteer / Contractor</td>
      </tr>
    </tbody>
  </table>

  <h2>2. Rating key</h2>
  <p>Use one overall category after calculating the weighted score (Part A + Part B = 100%).</p>
  <table>
    <thead>
      <tr><th>Category</th><th>Score (%)</th><th>Meaning</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Exceeds expectations</strong></td>
        <td>75–100</td>
        <td>Performance regularly surpasses established standards. Results and impact go beyond a satisfactory level.</td>
      </tr>
      <tr>
        <td><strong>Meets expectations</strong></td>
        <td>60–74</td>
        <td>Competent and successful in the role. Produces intended results and satisfies established standards.</td>
      </tr>
      <tr>
        <td><strong>Needs PIP</strong></td>
        <td>51–59</td>
        <td>Performance requires a formal Performance Improvement Plan (typically three months). Strong improvement may support retention; escalate per AFRI-SWP if not.</td>
      </tr>
      <tr>
        <td><strong>Below expectations</strong></td>
        <td>26–50</td>
        <td>Standards not met due to effort and/or skill gaps. Immediate corrective action is required under progressive discipline.</td>
      </tr>
      <tr>
        <td><strong>Termination band</strong></td>
        <td>0–25</td>
        <td>Unacceptable performance. Subject to fair review and applicable policy; end of engagement or termination may be considered.</td>
      </tr>
    </tbody>
  </table>

  <h2>3. Score weighting</h2>
  <table>
    <thead>
      <tr><th>Performance area</th><th>Weight</th></tr>
    </thead>
    <tbody>
      <tr><td>Part A — Core competencies (role KPIs / deliverables)</td><td><strong>60%</strong></td></tr>
      <tr><td>Part B — Behavioural competencies</td><td><strong>40%</strong></td></tr>
      <tr><td><strong>Cumulative total</strong></td><td><strong>100%</strong></td></tr>
    </tbody>
  </table>
  <p class="fine">Aligned with AFRI-SWP: 60% deliverables and output · 40% professional / soft skills.</p>

  <h2>4. Part A — Core competencies (60%)</h2>
  <p>List role-specific KPIs in the Description column. Enter the rating as a score within each row’s weight (for a 10% row, score 0–10). The supervisor confirms the rating.</p>
  <table class="form">
    <thead>
      <tr>
        <th>Description (KPI / deliverable)</th>
        <th class="num">Weight</th>
        <th class="num">Rating</th>
        <th class="num">Supervisor</th>
      </tr>
    </thead>
    <tbody>
      ${['10%', '10%', '10%', '10%', '10%', '5%', '5%']
        .map(
          (w) => `<tr>
        <td class="fill fill-kpi"></td>
        <td class="num"><strong>${w}</strong></td>
        <td class="fill"></td>
        <td class="fill"></td>
      </tr>`,
        )
        .join('\n')}
      <tr class="total">
        <td><strong>Part A total</strong></td>
        <td class="num"><strong>60%</strong></td>
        <td class="fill"></td>
        <td class="fill"></td>
      </tr>
    </tbody>
  </table>

  <h2>5. Part B — Behavioural competencies (40%)</h2>
  <table class="form">
    <thead>
      <tr>
        <th>Description</th>
        <th class="num">Weight</th>
        <th class="num">Rating</th>
        <th class="num">Supervisor</th>
      </tr>
    </thead>
    <tbody>
      ${[
        ['Team spirit', '7%'],
        ['Time management', '7%'],
        ['Commitment to problem-solving', '7%'],
        ['Attitude to work', '7%'],
        ['Professionalism', '5%'],
        ['Attitude to line supervisors / managers or direct reports', '7%'],
      ]
        .map(
          ([label, w]) => `<tr>
        <td>${label}</td>
        <td class="num"><strong>${w}</strong></td>
        <td class="fill"></td>
        <td class="fill"></td>
      </tr>`,
        )
        .join('\n')}
      <tr class="total">
        <td><strong>Part B total</strong></td>
        <td class="num"><strong>40%</strong></td>
        <td class="fill"></td>
        <td class="fill"></td>
      </tr>
    </tbody>
  </table>

  <h2>6. Summary of scores</h2>
  <table class="form">
    <thead>
      <tr>
        <th>Part A score (/60)</th>
        <th>Part B score (/40)</th>
        <th>Overall rating (/100)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="fill fill-lg"></td>
        <td class="fill fill-lg"></td>
        <td class="fill fill-lg"></td>
      </tr>
      <tr>
        <th colspan="2">Score category (from rating key)</th>
        <td class="fill fill-lg"></td>
      </tr>
    </tbody>
  </table>
  <p>Minimum performance threshold for this cycle: <span class="line">__________ %</span> (insert the approved organisational threshold before use).</p>

  <h2>7. Comments and development</h2>
  <h3>Supervisor / Team Lead — comments and recommendation</h3>
  <div class="comment"></div>
  <h3>Team Member comment</h3>
  <div class="comment"></div>
  <h3>Pillar Head / senior manager comment</h3>
  <div class="comment"></div>
  <h3>What can improve performance?</h3>
  <p class="fine">Beyond training — for example attention to detail, timely submissions, escalation habits.</p>
  <div class="comment"></div>
  <h3>Training needs</h3>
  <div class="comment comment-sm"></div>
  <h3>People &amp; Culture comment</h3>
  <div class="comment"></div>

  <h2>8. Acknowledgement</h2>
  <p>By signing, the parties confirm this appraisal was discussed. Record the outcome in the AfriVate Portal where the appraisal workflow is available. Slack supports communication only and does not replace the Portal record.</p>
  <div class="sign-row form-sign">
    <div class="sign-card">
      <div class="who">Team Member</div>
      <p>Signature: ______________________________</p>
      <p>Date: __________________________________</p>
    </div>
    <div class="sign-card">
      <div class="who">Manager / Team Lead / Pillar Head</div>
      <p>Signature: ______________________________</p>
      <p>Date: __________________________________</p>
    </div>
  </div>

  <div class="hr-box">
    <strong>People &amp; Culture use only</strong>
    <p>Recorded in Portal: ☐ Yes &nbsp;&nbsp; ☐ Pending</p>
    <p>Follow-up: ☐ None &nbsp;&nbsp; ☐ Coaching &nbsp;&nbsp; ☐ PIP &nbsp;&nbsp; ☐ Other _______________</p>
    <p>HR signature / date: ________________________________</p>
  </div>

  <p class="footer-note">Document code AFRI-PAF-01 · Pair with Portal appraisals and AFRI-SWP progressive discipline. Internal use. Most AfriVate Team Members are Internal Contributors under AFRI-ICEF-01.</p>
`

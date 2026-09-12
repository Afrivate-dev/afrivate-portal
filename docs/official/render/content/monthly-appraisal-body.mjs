export const monthlyAppraisalBody = `
      <div class="note"><strong>How to use:</strong> Complete this form in a live monthly discussion. The Team Member completes Section A first. The Team Lead completes Sections B and C. Record the outcome in the AfriVate Portal where the workflow exists. Slack coordinates; it does not replace the Portal record. Monthly reviews feed into — but do not replace — the formal appraisal (AFRI-PAF-01). This form does <strong>not</strong> create employment or any right to pay. “Employee” in any older wording means Team Member.</div>

      <p>This form supports a consistent monthly check-in between Team Leads and Team Members. It is intended to recognise achievements, surface challenges early, and agree on actions that support performance and professional growth.</p>

      <h2>Section A — Recorded by the Team Member</h2>
      <table class="form">
        <tbody>
          <tr><th>Team Member name</th><td class="fill"></td></tr>
          <tr><th>Role / position</th><td class="fill"></td></tr>
          <tr><th>Department / team</th><td class="fill"></td></tr>
          <tr><th>Month of review</th><td class="fill"></td></tr>
          <tr><th>Team Lead / reviewer</th><td class="fill"></td></tr>
        </tbody>
      </table>

      <h3>Task summary for the month</h3>
      <table class="form">
        <thead>
          <tr><th>Task(s) for the month</th><th>Actual result</th><th>Team Member comment</th></tr>
        </thead>
        <tbody>
          <tr><td class="fill-lg"></td><td class="fill-lg"></td><td class="fill-lg"></td></tr>
          <tr><td class="fill-lg"></td><td class="fill-lg"></td><td class="fill-lg"></td></tr>
          <tr><td class="fill-lg"></td><td class="fill-lg"></td><td class="fill-lg"></td></tr>
        </tbody>
      </table>

      <h3>Support needed</h3>
      <p>What would help you perform better next month? (resources, training, clarity, tools, and so on)</p>
      <div class="comment"></div>

      <h2>Section B — Recorded by the Team Lead / reviewer</h2>
      <h3>Reviewer comment / recommendation</h3>
      <div class="comment"></div>

      <h3>KPI alignment check</h3>
      <p>Are this month’s KPIs aligned with the Team Member’s upcoming formal appraisal KPIs? Tick as applicable.</p>
      <table class="form">
        <tbody>
          <tr>
            <td>☐ Fully aligned</td>
            <td>☐ Partially aligned</td>
            <td>☐ Not aligned</td>
          </tr>
        </tbody>
      </table>

      <h3>Areas for improvement</h3>
      <div class="comment-sm"></div>
      <h3>Training needs</h3>
      <div class="comment-sm"></div>

      <h2>Section C — Performance rating (out of 45)</h2>
      <h3>Task execution / delivery (out of 10)</h3>
      <p>To what extent did the Team Member deliver on what they set out to do this month?</p>
      <table class="form">
        <thead><tr><th>Category</th><th class="num">Score (out of 10)</th></tr></thead>
        <tbody>
          <tr><td>Task execution / delivery</td><td class="fill num"></td></tr>
        </tbody>
      </table>

      <h3>Behavioural skill and cultural fit (scale 1–5)</h3>
      <p>Score each category from 1–5. Subtotal is out of 35.</p>
      <table class="form">
        <thead><tr><th>Rating category</th><th class="num">Score (1–5)</th></tr></thead>
        <tbody>
          <tr><td>Ownership and leadership</td><td class="fill num"></td></tr>
          <tr><td>Professionalism</td><td class="fill num"></td></tr>
          <tr><td>Respect</td><td class="fill num"></td></tr>
          <tr><td>Initiative</td><td class="fill num"></td></tr>
          <tr><td>Communication</td><td class="fill num"></td></tr>
          <tr><td>Teamwork / reliability</td><td class="fill num"></td></tr>
          <tr><td>Excellence / work quality</td><td class="fill num"></td></tr>
          <tr class="total"><td><strong>Subtotal (out of 35)</strong></td><td class="fill num"></td></tr>
          <tr class="total"><td><strong>Grand total (task execution + behavioural, out of 45)</strong></td><td class="fill num"></td></tr>
        </tbody>
      </table>

      <h3>Selected band</h3>
      <p>Tick the score band that applies to this month’s performance.</p>
      <table>
        <thead>
          <tr><th>Band</th><th>Score</th><th>Meaning</th></tr>
        </thead>
        <tbody>
          <tr><td>☐ Exceeds expectations</td><td>36–45</td><td>Performance regularly surpasses established standards.</td></tr>
          <tr><td>☐ Meets expectations</td><td>27–35</td><td>Competent and successful in the role this month.</td></tr>
          <tr><td>☐ Needs improvement plan</td><td>20–26</td><td>Improvement actions required; coach and record next steps.</td></tr>
          <tr><td>☐ Below expectations</td><td>12–19</td><td>Standards not met. Two consecutive months in this band or Unsatisfactory should be referred to People &amp; Culture for a possible PIP.</td></tr>
          <tr><td>☐ Unsatisfactory</td><td>0–11</td><td>Unacceptable performance this month. Refer to People &amp; Culture.</td></tr>
        </tbody>
      </table>
      <p><strong>Selected band:</strong> <span class="line"></span></p>

      <div class="note"><strong>People &amp; Culture note:</strong> Monthly appraisal scores are used for performance tracking, coaching, and development. They do not directly trigger termination decisions but may inform formal appraisal outcomes (AFRI-PAF-01) and progressive discipline under AFRI-SWP / AFRI-PDP-01. Two consecutive months in the Below Expectations or Unsatisfactory band should trigger a referral to People &amp; Culture to consider a formal Performance Improvement Plan (PIP).</div>

      <h2>Signatures</h2>
      <p>By signing, both parties confirm this monthly review was discussed. Record the outcome in the Portal where available.</p>
      <div class="sign-block">
        <div class="sign-row">
          <div class="sign-card">
            <div class="who">Team Member name / signature</div>
            <div class="role">Date</div>
          </div>
          <div class="sign-card">
            <div class="who">Team Lead name / signature</div>
            <div class="role">Date</div>
          </div>
        </div>
      </div>
      <p class="footer-note">Document Code AFRI-MPA-01 · Monthly form for Team Leads · Related: AFRI-PAF-01 · AFRI-SWP · AFRI-PDP-01 · AFRI-TLOP-01 · Internal use · Most AfriVate Team Members are Internal Contributors under AFRI-ICEF-01</p>
`

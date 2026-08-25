/**
 * Core Team Engagement and Equity Letters → branded HTML + PDF
 * Run: node docs/official/render/render-equity-engagement-letters.mjs
 */
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const officialRoot = path.resolve(__dirname, '..')
const outDir = path.join(officialRoot, 'hiring', 'engagement-letters')
const logoPath = path.join(officialRoot, 'brand', 'afrivate-logo-long-purple.png')
const logoUrl = `file:///${logoPath.replace(/\\/g, '/')}`
const data = JSON.parse(
  await readFile(path.join(__dirname, 'content', 'equity-engagement-letters.json'), 'utf8'),
)

const esc = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

const css = `
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
    font-size: 10.5pt;
    line-height: 1.58;
    background: #fff;
  }
  .shell { position: relative; padding: 0 4px; }
  .brand-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--purple);
    margin-bottom: 16px;
  }
  .brand { display: flex; align-items: center; gap: 12px; }
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
    font-size: 16.5px;
    line-height: 1.3;
    margin: 0 0 6px;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .kicker {
    text-align: center;
    color: var(--muted);
    font-size: 10.5px;
    margin: 0 0 16px;
  }
  .meta {
    display: grid;
    gap: 7px;
    background: var(--soft);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 12px 14px;
    margin: 0 0 14px;
  }
  .meta div {
    display: grid;
    grid-template-columns: 148px 1fr;
    gap: 8px;
  }
  .meta span { color: var(--muted); }
  h2 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--purple);
    margin: 18px 0 8px;
    padding-bottom: 5px;
    border-bottom: 1px solid var(--line);
    break-after: avoid-page;
  }
  p { margin: 0 0 10px; }
  ul, ol { margin: 0 0 12px; padding-left: 20px; }
  li { margin: 0 0 6px; break-inside: avoid-page; }
  .note {
    background: var(--soft);
    border-left: 3px solid var(--purple);
    padding: 10px 12px;
    margin: 0 0 16px;
  }
  .salutation { font-weight: 700; margin-top: 2px; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 12px;
    font-size: 9.6pt;
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
  .sign-block { margin-top: 28px; break-inside: avoid-page; }
  .sign-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
    margin-top: 16px;
  }
  .sign-card { border-top: 1px solid #bbb; padding-top: 10px; }
  .sign-card .who { font-weight: 700; margin-top: 36px; }
  .sign-card .role { color: var(--muted); font-size: 10.5px; }
  .sign-line {
    border-bottom: 1px solid #bbb;
    height: 32px;
    margin: 6px 0 4px;
  }
  .sign-label { font-size: 9.5px; color: var(--muted); margin: 0 0 10px; }
  .footer-note { margin-top: 18px; font-size: 9pt; color: var(--muted); }
  .fill-in { color: var(--purple); font-weight: 700; }
`

function letterHtml(letter) {
  const duties = letter.responsibilities.map((item) => `<li>${esc(item)}</li>`).join('')
  const terms = data.clause6terms
    .map(([k, v]) => `<tr><td><strong>${esc(k)}</strong></td><td>${esc(v)}</td></tr>`)
    .join('')
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Core Team Engagement and Equity Letter — ${esc(letter.fullName)}</title>
  <style>${css}</style>
</head>
<body>
  <div class="shell">
    <div class="brand-row">
      <div class="brand">
        <img src="${logoUrl}" alt="AfriVate" />
      </div>
      <div class="chip">Official Document<br/>AfriVate Technologies Ltd<br/>RC: 9210092</div>
    </div>

    <h1>Core Team Engagement and Equity Letter</h1>
    <p class="kicker">${esc(letter.kicker)}</p>

    <section class="meta">
      <div><strong>To</strong><span>${esc(letter.fullName)}</span></div>
      <div><strong>From</strong><span>${esc(data.from)}</span></div>
      <div><strong>Role</strong><span>${esc(letter.role)}</span></div>
      <div><strong>Department</strong><span>${esc(letter.department)}</span></div>
      <div><strong>Reports to</strong><span>${esc(letter.reportsTo)}</span></div>
      <div><strong>Location</strong><span>Remote</span></div>
      <div><strong>Start Date</strong><span class="fill-in">${esc(data.startDate)}</span></div>
      <div><strong>Date</strong><span>${esc(data.letterDate)}</span></div>
      <div><strong>Document Reference</strong><span>${esc(data.documentReference)}</span></div>
    </section>

    <div class="note"><strong>Written instrument:</strong> ${esc(data.documentReference)}.</div>

    <p class="salutation">Dear ${esc(letter.firstName)},</p>
    <p>${esc(letter.opening)}</p>

    <h2>1. Nature of This Engagement</h2>
    <p>${esc(data.clause1a)}</p>
    <p>${esc(data.clause1b)}</p>

    <h2>2. Duration</h2>
    <p>${esc(letter.duration)}</p>

    <h2>3. Working Structure and Agreed Capacity</h2>
    <p>${esc(letter.working)}</p>

    <h2>4. Key Responsibilities</h2>
    <ul>${duties}</ul>
    <p>${esc(letter.classD)}</p>

    <h2>5. Compensation and Support</h2>
    <p>${esc(data.clause5a)}</p>
    <p>${esc(data.clause5b)}</p>

    <h2>6. Equity Participation</h2>
    <p>${esc(data.clause6intro)}</p>
    <table>
      <thead><tr><th>Term</th><th>Detail</th></tr></thead>
      <tbody>${terms}</tbody>
    </table>
    <p>${esc(data.clause6close)}</p>

    <h2>7. Confidentiality and Data Protection</h2>
    <p>${esc(letter.confidentiality)}</p>

    <h2>8. Intellectual Property</h2>
    <p>${esc(data.clause8)}</p>

    <h2>9. Portfolio Use</h2>
    <p>${esc(letter.portfolio)}</p>

    <h2>10. Ending the Engagement</h2>
    <ul>
      <li><strong>By you:</strong> ${esc(letter.clause10a.replace(/^By you:\s*/i, ''))}</li>
      <li><strong>By AfriVate:</strong> ${esc(data.clause10b.replace(/^By AfriVate:\s*/i, ''))}</li>
      <li><strong>On ending the placement, however it ends:</strong> ${esc(data.clause10c.replace(/^On ending the placement, however it ends:\s*/i, ''))}</li>
    </ul>

    <h2>11. Governing Policies</h2>
    <p>${esc(data.clause11)}</p>

    <h2>12. Not a Promise of Continued or Paid Employment</h2>
    <p>${esc(data.clause12)}</p>

    <h2>13. Effect if This Relationship Is Later Recharacterised</h2>
    <p>${esc(data.clause13)}</p>

    <h2>14. Acceptance</h2>
    <p>${esc(data.clause14)}</p>

    <div class="sign-block">
      <p>Sincerely,</p>
      <div class="sign-row">
        <div class="sign-card">
          <div class="who">Joshua Oluwasujibomi Komolafe</div>
          <div class="role">Chief Executive Officer</div>
          <div class="role">AfriVate Technologies Ltd</div>
        </div>
        <div class="sign-card">
          <p style="margin:0 0 4px"><strong>Accepted by:</strong> ${esc(letter.fullName)}</p>
          <div class="sign-line"></div>
          <p class="sign-label">Signature</p>
          <div class="sign-line"></div>
          <p class="sign-label">Date</p>
        </div>
      </div>
    </div>

    <p class="footer-note">${esc(data.footer)}</p>
  </div>
</body>
</html>`
}

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage()

for (const letter of data.letters) {
  const base = `Afrivate-Core-Team-Engagement-Equity-Letter-${letter.slug}`
  const htmlPath = path.join(outDir, `${base}.html`)
  const pdfPath = path.join(outDir, `${base}.pdf`)
  const downloadsPdf = path.resolve(`C:/Users/DELL/Downloads/Afrivate Engagement Equity Letter - ${letter.fullName}.pdf`)
  await writeFile(htmlPath, letterHtml(letter), 'utf8')
  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' })
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="width:100%;font-size:9px;color:#666;padding:0 18mm;display:flex;justify-content:space-between;font-family:Segoe UI, Arial, sans-serif;">
        <span>hr@afrivate.org · portal.afrivate.org</span>
        <span>RC: 9210092 · Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>`,
    margin: { top: '14mm', right: '14mm', bottom: '16mm', left: '16mm' },
  })
  try {
    await copyFile(pdfPath, downloadsPdf)
    console.log('Wrote', pdfPath)
    console.log('Copied', downloadsPdf)
  } catch (err) {
    console.log('Wrote', pdfPath)
    console.warn('Could not copy to Downloads:', err.message)
  }
}

await browser.close()

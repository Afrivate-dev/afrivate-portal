/**
 * End of Engagement letters → branded HTML + PDF
 * Run: node docs/official/render/render-end-of-engagement-letters.mjs
 */
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const officialRoot = path.resolve(__dirname, '..')
const outDir = path.join(officialRoot, 'hiring', 'end-of-engagement')
const logoPath = path.join(officialRoot, 'brand', 'afrivate-logo-long-purple.png')
const logoUrl = `file:///${logoPath.replace(/\\/g, '/')}`
const data = JSON.parse(
  await readFile(path.join(__dirname, 'content', 'end-of-engagement-letters.json'), 'utf8'),
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
    margin: 0 0 18px;
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
  ul { margin: 0 0 12px; padding-left: 20px; }
  li { margin: 0 0 8px; break-inside: avoid-page; }
  .note {
    background: var(--soft);
    border-left: 3px solid var(--purple);
    padding: 10px 12px;
    margin: 0 0 16px;
  }
  .salutation { font-weight: 700; margin-top: 2px; }
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
  .footer-note { margin-top: 18px; font-size: 9pt; color: var(--muted); }
`

function letterHtml(letter) {
  const grounds = data.grounds.map((item) => `<li>${esc(item)}</li>`).join('')
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>End of Engagement — ${esc(letter.fullName)}</title>
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

    <h1>End of Engagement</h1>
    <p class="kicker">${esc(data.kicker)}</p>

    <section class="meta">
      <div><strong>To</strong><span>${esc(letter.fullName)}</span></div>
      <div><strong>From</strong><span>${esc(data.from)}</span></div>
      <div><strong>Effective</strong><span>${esc(data.letterDate)} — immediate</span></div>
      <div><strong>Date</strong><span>${esc(data.letterDate)}</span></div>
      <div><strong>Document Reference</strong><span>${esc(data.documentReference)}</span></div>
    </section>

    <div class="note"><strong>Status:</strong> Portal and Slack access are revoked with immediate effect. This letter does not create employment or any right to pay.</div>

    <p class="salutation">Dear ${esc(letter.firstName)},</p>
    <p>${esc(data.notice)}</p>
    <p>${esc(data.groundsIntro)}</p>
    <ul>${grounds}</ul>
    <p>${esc(data.surviving)}</p>
    <p>${esc(data.financial)}</p>
    <p>${esc(data.closing)}</p>

    <div class="sign-block">
      <p>Yours faithfully,</p>
      <div class="sign-row">
        <div class="sign-card">
          <div class="who">Emmanuel Okpiaifo</div>
          <div class="role">Human Resources Manager</div>
          <div class="role">AfriVate Technologies Ltd</div>
        </div>
        <div class="sign-card">
          <div class="who">For AfriVate Technologies Ltd</div>
          <div class="role">People &amp; Culture</div>
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
  const base = `Afrivate-End-of-Engagement-Letter-${letter.slug}`
  const htmlPath = path.join(outDir, `${base}.html`)
  const pdfPath = path.join(outDir, `${base}.pdf`)
  const downloadsPdf = path.resolve(
    `C:/Users/DELL/Downloads/Afrivate End of Engagement Letter - ${letter.fullName}.pdf`,
  )
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
        <span>hr@afrivate.org · Confidential people document</span>
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

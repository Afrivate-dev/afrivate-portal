/**
 * AFRI-CVS-01 CEO Video Series — Shooting Guide → HTML + PDF
 * Run: node docs/official/render/render-ceo-video-series-guide.mjs
 */
import { chromium } from 'playwright'
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GUIDE_CSS } from './brandedGuide.mjs'
import { ceoVideoSeriesGuideBody } from './content/ceo-video-series-guide-body.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const officialRoot = path.resolve(__dirname, '..')
const outDir = path.join(officialRoot, 'ops')
const logoPath = path.resolve(officialRoot, 'brand', 'afrivate-logo-long-purple.png')
const logoUrl = `file:///${logoPath.replace(/\\/g, '/')}`
const downloadsDir = path.resolve('C:/Users/DELL/Downloads')
const outBase = 'Afrivate-CEO-Video-Series-Shooting-Guide'

const extraCss = `
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
  .split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 0 0 14px;
  }
  .box {
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 10px 12px;
    background: #fff;
  }
  .box h4 { margin-top: 0; }
  .box p, .box ul { margin-bottom: 0; }
  .box ul { padding-left: 18px; }
  .do { border-left: 3px solid var(--purple); background: var(--soft); }
  .dont { border-left: 3px solid #c4a0c1; }
  .pills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0 0 12px;
  }
  .pill {
    background: var(--soft);
    border: 1px solid var(--line);
    color: var(--purple);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 3px 9px;
    border-radius: 999px;
  }
  .frame {
    display: grid;
    grid-template-columns: 92px 1fr;
    gap: 16px;
    align-items: center;
    margin: 0 0 14px;
  }
  .phone {
    width: 90px;
    height: 160px;
    border: 2.5px solid var(--purple);
    border-radius: 16px;
    position: relative;
    background: linear-gradient(180deg, #f8f3f8 0%, #fff 70%);
    box-shadow: inset 0 0 0 4px #fff;
  }
  .phone .headroom {
    position: absolute;
    left: 22px;
    right: 22px;
    top: 18px;
    height: 10px;
    border-bottom: 1.5px dashed #c4a0c1;
  }
  .phone .bust {
    position: absolute;
    left: 16px;
    right: 16px;
    top: 36px;
    bottom: 18px;
    border: 1.5px solid var(--purple);
    border-radius: 40px 40px 8px 8px;
    opacity: 0.55;
  }
  .check-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 16px;
    margin: 0 0 16px;
  }
  .tick {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    font-size: 10pt;
  }
  .box-tick {
    width: 12px;
    height: 12px;
    border: 1.5px solid var(--purple);
    border-radius: 2px;
    margin-top: 3px;
    flex-shrink: 0;
  }
  .shot {
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 14px 16px 10px;
    margin: 0 0 16px;
    background: #fff;
  }
  .shot.page-break {
    break-before: page;
    page-break-before: always;
  }
  .shot-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--line);
  }
  .shot-head h3 {
    margin: 6px 0 0;
    font-size: 14px;
    text-transform: none;
    letter-spacing: 0;
    color: var(--ink);
  }
  .shot-meta {
    font-size: 9.5px;
    color: var(--muted);
    text-align: right;
    white-space: nowrap;
    padding-top: 4px;
  }
  .ep {
    display: inline-block;
    background: var(--purple);
    color: #fff;
    font-size: 8.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 4px;
    font-weight: 700;
  }
  .beats { margin-bottom: 10px; }
  .script {
    background: var(--soft);
    border: 1px solid var(--line);
    border-left: 3px solid var(--purple);
    border-radius: 0 8px 8px 0;
    padding: 12px 16px;
    margin: 6px 0 10px;
    font-size: 10.6pt;
    line-height: 1.68;
  }
  .script p { margin: 0 0 8px; }
  .script p:last-child { margin: 0; }
  .take-note {
    font-size: 9.5pt;
    color: var(--muted);
    margin-bottom: 4px;
  }
  .tagline {
    font-weight: 700;
    color: var(--purple);
    letter-spacing: 0.01em;
  }
  @media print {
    .shot.page-break { break-before: page; }
  }
`

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>AfriVate CEO Video Series — Shooting Guide</title>
  <style>${GUIDE_CSS}${extraCss}</style>
</head>
<body>
  <div class="shell">
    <div class="brand-row">
      <div class="brand">
        <img src="${logoUrl}" alt="AfriVate" />
      </div>
      <div class="chip">Official Document<br/>AfriVate Technologies Ltd<br/>RC: 9210092</div>
    </div>
    <h1>CEO Video Series — Shooting Guide</h1>
    <section class="meta">
      <div><strong>Document Code</strong><span>AFRI-CVS-01</span></div>
      <div><strong>Status</strong><span>Operational brief — not a policy</span></div>
      <div><strong>To</strong><span>Joshua Oluwasujibomi Komolafe, Chief Executive Officer</span></div>
      <div><strong>From</strong><span>People &amp; Culture / Human Relations</span></div>
      <div><strong>Format</strong><span>Vertical 9:16 · Mobile phone · 8 films · 60–90 seconds each</span></div>
      <div><strong>Audience</strong><span>AfriVate Team Members (internal)</span></div>
      <div><strong>Issued</strong><span>25 August 2026</span></div>
      <div><strong>Owner</strong><span>People &amp; Culture</span></div>
      <div><strong>Contact</strong><span>hr@afrivate.org</span></div>
    </section>
    ${ceoVideoSeriesGuideBody}
  </div>
</body>
</html>`

await mkdir(outDir, { recursive: true })
const htmlPath = path.join(outDir, `${outBase}.html`)
const pdfPath = path.join(outDir, `${outBase}.pdf`)
await writeFile(htmlPath, html, 'utf8')

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' })
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: `
    <div style="width:100%;font-size:9px;color:#666;padding:0 18mm;display:flex;justify-content:space-between;font-family:Segoe UI, Arial, sans-serif;">
      <span>hr@afrivate.org · AFRI-CVS-01 · Internal shooting brief</span>
      <span>RC: 9210092 · Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>`,
  margin: { top: '14mm', right: '14mm', bottom: '16mm', left: '16mm' },
})
await browser.close()

console.log('Wrote', htmlPath)
console.log('Wrote', pdfPath)
try {
  await copyFile(pdfPath, path.join(downloadsDir, `${outBase}.pdf`))
  console.log('Also copied to Downloads')
} catch {
  console.log('Could not copy to Downloads (file may be open).')
}

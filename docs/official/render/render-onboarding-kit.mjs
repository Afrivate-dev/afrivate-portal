/**
 * AFRI-ONB-01 New Team Member Onboarding Kit → HTML + PDF
 * Run: node docs/official/render/render-onboarding-kit.mjs
 */
import { chromium } from 'playwright'
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GUIDE_CSS } from './brandedGuide.mjs'
import { onboardingKitBody } from './content/onboarding-kit-body.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const officialRoot = path.resolve(__dirname, '..')
const outDir = path.join(officialRoot, 'hiring', 'onboarding')
const logoPath = path.resolve(officialRoot, 'brand', 'afrivate-logo-long-purple.png')
const logoUrl = `file:///${logoPath.replace(/\\/g, '/')}`
const downloadsDir = path.resolve('C:/Users/DELL/Downloads')
const outBase = 'Afrivate-New-Team-Member-Onboarding-Kit'

const extraCss = `
  .path {
    display: inline-block;
    background: var(--soft);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 9.5pt;
    color: var(--muted);
    margin: 0 0 8px;
  }
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
`

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Afrivate New Team Member Onboarding Kit</title>
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
    <h1>Afrivate New Team Member Onboarding Kit</h1>
    <section class="meta">
      <div><strong>Document Code</strong><span>AFRI-ONB-01</span></div>
      <div><strong>Status</strong><span>Official — Operational playbook (not a policy)</span></div>
      <div><strong>Applies To</strong><span>People &amp; Culture, Team Leads, and new Team Members</span></div>
      <div><strong>Effective Date</strong><span>25 August 2026</span></div>
      <div><strong>Owner</strong><span>People &amp; Culture</span></div>
      <div><strong>Related</strong><span>AFRI-EOH-01 · AFRI-SWP · AFRI-ICEF-01 · AFRI-TLOP-01 · AFRI-ODR-01</span></div>
    </section>
    ${onboardingKitBody}
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
      <span>hr@afrivate.org · Internal onboarding playbook · Confidential</span>
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

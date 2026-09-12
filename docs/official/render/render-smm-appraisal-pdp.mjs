/**
 * Branded HTML + PDF for:
 *   AFRI-SMM-EX-01 Social Media take-home
 *   AFRI-MPA-01 Monthly Performance Appraisal
 *   AFRI-PDP-01 Penalty & Disciplinary Policy
 * Run: node docs/official/render/render-smm-appraisal-pdp.mjs
 */
import { chromium } from 'playwright'
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GUIDE_CSS } from './brandedGuide.mjs'
import { smmTakeHomeBody } from './content/smm-takehome-body.mjs'
import { monthlyAppraisalBody } from './content/monthly-appraisal-body.mjs'
import { pdpBody } from './content/pdp-body.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const officialRoot = path.resolve(__dirname, '..')
const logoPath = path.resolve(officialRoot, 'brand', 'afrivate-logo-long-purple.png')
const logoUrl = `file:///${logoPath.replace(/\\/g, '/')}`
const downloadsDir = path.resolve('C:/Users/DELL/Downloads')

const extraCss = `
  .sign-block { margin-top: 28px; break-inside: avoid-page; }
  .sign-row { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 16px; }
  .sign-card { border-top: 1px solid #bbb; padding-top: 10px; }
  .sign-card .who { font-weight: 700; margin-top: 28px; }
  .sign-card .role { color: var(--muted); font-size: 10.5px; }
  td.fill { height: 28px; background: #fff; }
  td.fill-lg { height: 44px; background: #fff; }
  table.form th.num, table.form td.num { text-align: center; width: 22%; white-space: nowrap; }
  tr.total td { background: var(--soft); }
  .comment, .comment-sm {
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #fff;
    margin: 0 0 14px;
  }
  .comment { min-height: 78px; }
  .comment-sm { min-height: 52px; }
  .line {
    display: inline-block;
    min-width: 160px;
    border-bottom: 1px solid var(--ink);
    padding: 0 8px;
  }
`

function shell({ title, meta, body }) {
  const metaHtml = meta
    .map(([k, v]) => `<div><strong>${k}</strong><span>${v}</span></div>`)
    .join('')
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
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
    <h1>${title}</h1>
    <section class="meta">${metaHtml}</section>
    ${body}
  </div>
</body>
</html>`
}

const docs = [
  {
    folder: path.join(officialRoot, 'hiring', 'exercises'),
    outBase: 'Afrivate-SMM-Take-Home-Exercise',
    downloadsName: 'Afrivate SMM Take-Home Exercise.pdf',
    footer: 'hr@afrivate.org · AFRI-SMM-EX-01 · Hiring exercise',
    title: 'Social Media Manager &amp; Content Creator — Take-Home Exercise',
    meta: [
      ['Document Code', 'AFRI-SMM-EX-01'],
      ['Status', 'Hiring exercise — not a policy'],
      ['Audience', 'Social Media Manager &amp; Content Creator candidates'],
      ['Suggested time', '3–4 hours'],
      ['Deadline', 'Within 24 hours of receipt'],
      ['Submit to', 'afrivatehr@gmail.com'],
      ['Owner', 'People &amp; Culture / Brand &amp; Communications'],
    ],
    body: smmTakeHomeBody,
  },
  {
    folder: path.join(officialRoot, 'policies'),
    outBase: 'Afrivate-Monthly-Performance-Appraisal',
    downloadsName: 'Afrivate Monthly Performance Appraisal.pdf',
    footer: 'hr@afrivate.org · AFRI-MPA-01 · Internal monthly form',
    title: 'Monthly Performance Appraisal Form',
    meta: [
      ['Document Code', 'AFRI-MPA-01'],
      ['Status', 'Official form — not a policy'],
      ['Audience', 'Team Leads and Team Members'],
      ['Cadence', 'Monthly; feeds into AFRI-PAF-01'],
      ['Effective Date', '8 September 2026'],
      ['Owner', 'People &amp; Culture'],
    ],
    body: monthlyAppraisalBody,
  },
  {
    folder: path.join(officialRoot, 'policies'),
    outBase: 'Afrivate-Penalty-and-Disciplinary-Policy',
    downloadsName: 'Afrivate Penalty and Disciplinary Policy.pdf',
    footer: 'hr@afrivate.org · AFRI-PDP-01 · Binding policy',
    title: 'Afrivate Penalty &amp; Disciplinary Policy',
    meta: [
      ['Document Code', 'AFRI-PDP-01'],
      ['Status', 'Official — Binding'],
      ['Applies To', 'All AfriVate Team Members (paid or unpaid), Team Leads, and Pillar Heads'],
      ['Effective Date', '1 September 2026'],
      ['Review Cycle', 'Every 6 months, or immediately on material amendment to AFRI-SWP §10–12'],
      ['Owner', 'CEO / People &amp; Culture'],
      ['Related', 'AFRI-SWP · AFRI-DOA-01 · AFRI-ICEF-01 · AFRI-LAP-01 · AFRI-ORG-01 · AFRI-ODR-01'],
    ],
    body: pdpBody,
  },
]

const browser = await chromium.launch()
const page = await browser.newPage()

for (const doc of docs) {
  await mkdir(doc.folder, { recursive: true })
  const htmlPath = path.join(doc.folder, `${doc.outBase}.html`)
  const pdfPath = path.join(doc.folder, `${doc.outBase}.pdf`)
  await writeFile(htmlPath, shell(doc), 'utf8')
  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' })
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="width:100%;font-size:9px;color:#666;padding:0 18mm;display:flex;justify-content:space-between;font-family:Segoe UI, Arial, sans-serif;">
        <span>${doc.footer}</span>
        <span>RC: 9210092 · Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>`,
    margin: { top: '14mm', right: '14mm', bottom: '16mm', left: '16mm' },
  })
  console.log('Wrote', pdfPath)
  try {
    await copyFile(pdfPath, path.join(downloadsDir, doc.downloadsName))
    console.log('Copied', doc.downloadsName)
  } catch (err) {
    console.warn('Could not copy to Downloads:', err.message)
  }
}

await browser.close()

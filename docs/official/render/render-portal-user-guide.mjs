/**
 * Branded AfriVate Portal User Guide → HTML + PDF.
 * Source content: docs/PORTAL_USER_GUIDE.md
 * Body HTML: docs/official/render/portal-user-guide-body.html
 * Run: node docs/official/render/render-portal-user-guide.mjs
 */
import { chromium } from 'playwright'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const officialRoot = path.resolve(__dirname, '..')
const outDir = path.join(officialRoot, 'policies')
const logoPath = path.resolve(officialRoot, 'brand', 'afrivate-logo-long-purple.png')
const logoUrl = `file:///${logoPath.replace(/\\/g, '/')}`
const htmlPath = path.join(outDir, 'Afrivate-Portal-User-Guide.html')
const pdfPath = path.join(outDir, 'Afrivate-Portal-User-Guide.pdf')
const downloadsPath = path.resolve('C:/Users/DELL/Downloads/Afrivate-Portal-User-Guide.pdf')

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
    margin-bottom: 18px;
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
    font-size: 17px;
    line-height: 1.3;
    margin: 0 0 14px;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .meta {
    display: grid;
    gap: 8px;
    background: var(--soft);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 12px 14px;
    margin: 0 0 20px;
  }
  .meta div {
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: 8px;
  }
  .meta span { color: var(--muted); }
  h2 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--purple);
    margin: 22px 0 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--line);
    break-after: avoid-page;
  }
  h3 {
    font-size: 11.2px;
    margin: 14px 0 6px;
    color: var(--ink);
    break-after: avoid-page;
  }
  h4 {
    font-size: 10.8px;
    margin: 12px 0 6px;
    color: var(--purple);
    break-after: avoid-page;
  }
  p { margin: 0 0 10px; }
  ul, ol {
    margin: 0 0 12px;
    padding-left: 20px;
  }
  li {
    margin: 0 0 6px;
    break-inside: avoid-page;
  }
  .note {
    background: var(--soft);
    border-left: 3px solid var(--purple);
    padding: 11px 13px;
    margin: 10px 0 16px;
  }
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
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 14px;
    font-size: 9.8pt;
  }
  tr { break-inside: avoid-page; }
  th, td {
    border: 1px solid var(--line);
    padding: 7px 9px;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: var(--soft);
    color: var(--purple);
    font-weight: 700;
  }
  .footer-note {
    margin-top: 28px;
    padding-top: 12px;
    border-top: 1px solid var(--line);
    font-size: 9.5pt;
    color: var(--muted);
    font-style: italic;
  }
  code {
    font-family: Consolas, Monaco, monospace;
    font-size: 9pt;
    background: var(--soft);
    padding: 1px 4px;
    border-radius: 3px;
  }
  strong { font-weight: 700; }
`

const body = await readFile(path.join(__dirname, 'portal-user-guide-body.html'), 'utf8')

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>AfriVate Team Space — Portal User Guide</title>
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
    <h1>AfriVate Team Space — Portal User Guide</h1>
    <section class="meta">
      <div><strong>Document Code</strong><span>AFRI-PUG-01</span></div>
      <div><strong>Product</strong><span>AfriVate Team Space · portal.afrivate.org</span></div>
      <div><strong>Audience</strong><span>Every team member, lead, People &amp; Culture, and administrator</span></div>
      <div><strong>Last updated</strong><span>14 August 2026</span></div>
      <div><strong>Contact</strong><span>hr@afrivate.org</span></div>
    </section>
    ${body}
  </div>
</body>
</html>`

await mkdir(outDir, { recursive: true })
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
      <span>hr@afrivate.org · portal.afrivate.org</span>
      <span>RC: 9210092 · Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>`,
  margin: { top: '14mm', right: '14mm', bottom: '16mm', left: '16mm' },
})
await browser.close()

console.log('Wrote', htmlPath)
console.log('Wrote', pdfPath)

try {
  await copyFile(pdfPath, downloadsPath)
  console.log('Also copied to', downloadsPath)
} catch {
  console.log('Could not copy to Downloads (file may be open).')
}

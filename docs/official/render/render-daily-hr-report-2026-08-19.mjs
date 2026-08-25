/**
 * AfriVate Daily HR Report · 19 August 2026 → branded HTML + PDF
 * Run: node docs/official/render/render-daily-hr-report-2026-08-19.mjs
 */
import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const officialRoot = path.resolve(__dirname, '..')
const reportsDir = path.join(officialRoot, 'reports')
const brandDir = path.join(officialRoot, 'brand')
const baseName = 'Afrivate-Daily-HR-Report-2026-08-19'
const sourcePath = path.join(reportsDir, `${baseName}.html`)
const portalPath = path.join(reportsDir, `${baseName}-Portal.html`)
const pdfPath = path.join(reportsDir, `${baseName}.pdf`)
const printPath = path.join(reportsDir, `${baseName}-print.html`)
const downloadsPdf = path.resolve('C:/Users/DELL/Downloads/Afrivate Daily HR Report - 19 August 2026.pdf')
const logoPath = path.join(brandDir, 'afrivate-logo-long-purple-web.png')

await mkdir(reportsDir, { recursive: true })

const [source, logo] = await Promise.all([
  readFile(sourcePath, 'utf8'),
  readFile(logoPath),
])

const dataUri = `data:image/png;base64,${logo.toString('base64')}`
await writeFile(
  portalPath,
  source.replace('src="../brand/afrivate-logo-long-purple-web.png"', `src="${dataUri}"`),
  'utf8',
)

const logoUrl = `file:///${logoPath.replace(/\\/g, '/')}`
await writeFile(
  printPath,
  source.replace('src="../brand/afrivate-logo-long-purple-web.png"', `src="${logoUrl}"`),
  'utf8',
)

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(`file:///${printPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' })
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: `<div style="width:100%;font-size:9px;color:#666;padding:0 18mm;display:flex;justify-content:space-between;font-family:Segoe UI,Arial,sans-serif;"><span>AfriVate · People &amp; Culture · hr@afrivate.org</span><span>RC: 9210092 · Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
  margin: { top: '14mm', right: '14mm', bottom: '16mm', left: '16mm' },
})
await browser.close()

try {
  await copyFile(pdfPath, downloadsPdf)
  console.log('Wrote', pdfPath)
  console.log('Copied to', downloadsPdf)
} catch (err) {
  console.log('Wrote', pdfPath)
  console.warn('Could not copy to Downloads:', err.message)
}

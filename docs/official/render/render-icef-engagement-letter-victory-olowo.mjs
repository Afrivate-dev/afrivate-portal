/**
 * ICEF engagement letter for Victory Olowo → branded HTML + PDF
 * Run: node docs/official/render/render-icef-engagement-letter-victory-olowo.mjs
 */
import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, '..', 'hiring', 'engagement-letters')
const base = 'Afrivate-ICEF-Engagement-Letter-Victory-Olowo'
const htmlPath = path.join(outDir, `${base}.html`)
const pdfPath = path.join(outDir, `${base}.pdf`)
const downloadsPdf = path.resolve('C:/Users/DELL/Downloads/Afrivate ICEF Engagement Letter - Victory Olowo.pdf')

await mkdir(outDir, { recursive: true })

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

try {
  await copyFile(pdfPath, downloadsPdf)
  console.log('Wrote', pdfPath)
  console.log('Copied to', downloadsPdf)
} catch (err) {
  console.log('Wrote', pdfPath)
  console.warn('Could not copy to Downloads:', err.message)
}

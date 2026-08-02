import { chromium } from 'playwright'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const interviewsDir = path.resolve(__dirname, '..', 'hiring', 'interviews')
const htmlPath = path.join(interviewsDir, 'Afrivate-Developer-Interview-Kit.html')
const pdfPath = path.join(interviewsDir, 'Afrivate-Developer-Interview-Kit.pdf')

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
      <span>afrivatehr@gmail.com · Internal interviewer guide · Confidential</span>
      <span>RC: 9210092 · Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>`,
  margin: { top: '14mm', right: '14mm', bottom: '16mm', left: '16mm' },
})

await browser.close()
console.log('Wrote', pdfPath)

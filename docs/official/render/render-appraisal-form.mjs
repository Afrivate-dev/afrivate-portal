/**
 * AFRI-PAF-01 Performance Appraisal Form → HTML + PDF + DOCX
 * Run: node docs/official/render/render-appraisal-form.mjs
 */
import { chromium } from 'playwright'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  ShadingType,
  VerticalAlign,
} from 'docx'
import { GUIDE_CSS } from './brandedGuide.mjs'
import { appraisalFormBody } from './content/appraisal-form-body.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const officialRoot = path.resolve(__dirname, '..')
const outDir = path.join(officialRoot, 'policies')
const logoPath = path.resolve(officialRoot, 'brand', 'afrivate-logo-long-purple.png')
const logoUrl = `file:///${logoPath.replace(/\\/g, '/')}`
const downloadsDir = path.resolve('C:/Users/DELL/Downloads')
const outBase = 'Afrivate-Performance-Appraisal-Form'

const extraCss = `
  .fine {
    font-size: 9.5pt;
    color: var(--muted);
    font-style: italic;
  }
  table.form th.num, table.form td.num {
    text-align: center;
    width: 14%;
    white-space: nowrap;
  }
  td.fill {
    height: 28px;
    background: #fff;
  }
  td.fill-kpi { height: 36px; }
  td.fill-lg { height: 44px; }
  td.preset { color: var(--muted); }
  td.hint {
    color: var(--muted);
    font-style: italic;
    font-size: 9pt;
  }
  tr.total td { background: var(--soft); }
  .comment {
    min-height: 78px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #fff;
    margin: 0 0 14px;
  }
  .comment-sm { min-height: 52px; }
  .line {
    display: inline-block;
    min-width: 88px;
    border-bottom: 1px solid var(--ink);
    padding: 0 8px;
  }
  .sign-block { margin-top: 8px; }
  .sign-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
    margin: 16px 0 18px;
  }
  .sign-card {
    border-top: 1px solid #bbb;
    padding-top: 10px;
  }
  .sign-card .who { font-weight: 700; margin: 0 0 10px; }
  .sign-card p { margin: 0 0 8px; font-size: 10pt; }
  .form-sign { break-inside: avoid-page; }
  .hr-box {
    background: var(--soft);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 12px 14px;
    margin: 8px 0 16px;
    break-inside: avoid-page;
  }
  .hr-box p { margin: 6px 0 0; }
`

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>AfriVate Performance Appraisal Form</title>
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
    <h1>Performance Appraisal Form</h1>
    <section class="meta">
      <div><strong>Document Code</strong><span>AFRI-PAF-01</span></div>
      <div><strong>Status</strong><span>Official form — complete and record in the Portal</span></div>
      <div><strong>Cycle</strong><span>January – June 2026 · Mid-year review</span></div>
      <div><strong>Applies To</strong><span>All AfriVate Team Members under review</span></div>
      <div><strong>Owner</strong><span>People &amp; Culture</span></div>
      <div><strong>Related</strong><span>AFRI-SWP · AFRI-ICEF-01 · AFRI-TLOP-01 · AFRI-ORG-01</span></div>
      <div><strong>Contact</strong><span>hr@afrivate.org</span></div>
    </section>
    ${appraisalFormBody}
  </div>
</body>
</html>`

await mkdir(outDir, { recursive: true })
const htmlPath = path.join(outDir, `${outBase}.html`)
const pdfPath = path.join(outDir, `${outBase}.pdf`)
const docxPath = path.join(outDir, `${outBase}.docx`)
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
      <span>hr@afrivate.org · AFRI-PAF-01 · Internal appraisal form</span>
      <span>RC: 9210092 · Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>`,
  margin: { top: '14mm', right: '14mm', bottom: '16mm', left: '16mm' },
})
await browser.close()

const PURPLE = '8D4087'
const SOFT = 'F8F3F8'
const LINE = 'EBDCEB'
const INK = '1F1F1F'
const MUTED = '5F5F5F'
const CONTENT_W = 10080
const thin = { style: BorderStyle.SINGLE, size: 6, color: LINE }
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const borders = { top: thin, bottom: thin, left: thin, right: thin }
const noBorders = { top: none, bottom: none, left: none, right: none }
const logoBuffer = await readFile(logoPath)
const metaW = [2520, 2520, 2520, 2520]
const ratingW = [2200, 1400, 6480]
const kpiW = [5040, 1260, 1890, 1890]
const summaryW = [3360, 3360, 3360]

function p(text, opts = {}) {
  const {
    bold = false,
    size = 20,
    color = INK,
    italics = false,
    spacingAfter = 80,
    spacingBefore = 0,
    align,
  } = opts
  return new Paragraph({
    alignment: align,
    spacing: { after: spacingAfter, before: spacingBefore },
    children: [new TextRun({ text, bold, italics, size, color, font: 'Calibri' })],
  })
}

function cell(text, opts = {}) {
  const {
    width,
    shade,
    bold = false,
    center = false,
    color = INK,
    size = 18,
    italics = false,
    borders: cellBorders = borders,
  } = opts
  const lines = Array.isArray(text) ? text : [text]
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: shade ? { type: ShadingType.CLEAR, fill: shade } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    children: lines.map(
      (line, i) =>
        new Paragraph({
          alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { after: i === lines.length - 1 ? 40 : 20, before: 40 },
          children: [
            new TextRun({
              text: String(line ?? ''),
              bold,
              italics,
              size,
              color: bold && shade === SOFT ? PURPLE : color,
              font: 'Calibri',
            }),
          ],
        }),
    ),
  })
}

function blankCell(width, minLines = 1) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    children: Array.from({ length: minLines }, () =>
      new Paragraph({
        spacing: { after: 120, before: 120 },
        children: [new TextRun({ text: ' ', size: 18, font: 'Calibri' })],
      }),
    ),
  })
}

function sectionTitle(text) {
  return p(text, {
    bold: true,
    size: 22,
    color: PURPLE,
    spacingBefore: 240,
    spacingAfter: 120,
  })
}

function metaRow(label, value) {
  return new TableRow({
    children: [
      cell(label, { width: 2520, shade: SOFT, bold: true, size: 17 }),
      cell(value, { width: 7560, size: 17, color: MUTED }),
    ],
  })
}

const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 720, right: 720, bottom: 900, left: 720 },
        },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              spacing: { after: 0 },
              children: [
                new TextRun({
                  text: 'hr@afrivate.org  ·  AFRI-PAF-01  ·  portal.afrivate.org          AfriVate Technologies Ltd  ·  RC: 9210092',
                  size: 16,
                  color: MUTED,
                  font: 'Calibri',
                }),
              ],
            }),
          ],
        }),
      },
      children: [
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [6300, 3780],
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: noBorders,
                  width: { size: 6300, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      spacing: { after: 0, before: 0 },
                      children: [
                        new ImageRun({
                          type: 'png',
                          data: logoBuffer,
                          transformation: { width: 154, height: 49 },
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  borders: noBorders,
                  width: { size: 3780, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    p('Official Document', {
                      size: 16,
                      color: MUTED,
                      align: AlignmentType.RIGHT,
                      spacingAfter: 0,
                    }),
                    p('AfriVate Technologies Ltd', {
                      size: 16,
                      color: MUTED,
                      align: AlignmentType.RIGHT,
                      spacingAfter: 0,
                    }),
                    p('RC: 9210092', {
                      size: 16,
                      color: MUTED,
                      align: AlignmentType.RIGHT,
                      spacingAfter: 0,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 18, color: PURPLE, space: 4 },
          },
          spacing: { after: 160, before: 60 },
          children: [new TextRun({ text: ' ', size: 4, font: 'Calibri' })],
        }),
        p('PERFORMANCE APPRAISAL FORM', {
          bold: true,
          size: 28,
          color: PURPLE,
          align: AlignmentType.CENTER,
          spacingAfter: 40,
        }),
        p('January – June 2026  ·  Mid-Year Review', {
          size: 20,
          color: MUTED,
          align: AlignmentType.CENTER,
          spacingAfter: 160,
        }),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [2520, 7560],
          rows: [
            metaRow('Document Code', 'AFRI-PAF-01'),
            metaRow('Status', 'Official form — complete and record in the Portal'),
            metaRow('Applies To', 'All AfriVate Team Members under review'),
            metaRow('Owner', 'People & Culture'),
            metaRow('Related', 'AFRI-SWP · AFRI-ICEF-01 · AFRI-TLOP-01 · AFRI-ORG-01'),
            metaRow('Contact', 'hr@afrivate.org'),
          ],
        }),
        p(
          'This evaluation links role expectations to actual performance. Complete it in discussion with the Team Member. Record the outcome in the AfriVate Portal. Slack does not replace the Portal record. This form does not create employment or any right to pay.',
          { size: 18, spacingBefore: 160, spacingAfter: 160 },
        ),

        sectionTitle('1. Team Member details'),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: metaW,
          rows: [
            new TableRow({
              children: ['Team Member name', 'Supervisor / Team Lead', 'Job title', 'Time in role'].map(
                (t, i) => cell(t, { width: metaW[i], shade: SOFT, bold: true, size: 16 }),
              ),
            }),
            new TableRow({ children: metaW.map((w) => blankCell(w)) }),
            new TableRow({
              children: ['Appraisal period', 'Date of review', 'Department / team', 'Engagement type'].map(
                (t, i) => cell(t, { width: metaW[i], shade: SOFT, bold: true, size: 16 }),
              ),
            }),
            new TableRow({
              children: [
                cell('Jan – Jun 2026', { width: metaW[0], size: 18, color: MUTED }),
                blankCell(metaW[1]),
                blankCell(metaW[2]),
                cell('Internal Contributor / Employee / Volunteer / Contractor', {
                  width: metaW[3],
                  size: 15,
                  color: MUTED,
                  italics: true,
                }),
              ],
            }),
          ],
        }),

        sectionTitle('2. Rating key'),
        p('Use one overall category after calculating the weighted score (Part A + Part B = 100%).', {
          size: 17,
          color: MUTED,
          spacingAfter: 100,
        }),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: ratingW,
          rows: [
            new TableRow({
              children: ['Category', 'Score (%)', 'Meaning'].map((t, i) =>
                cell(t, { width: ratingW[i], shade: SOFT, bold: true, center: i > 0 }),
              ),
            }),
            new TableRow({
              children: [
                cell('Exceeds expectations', { width: ratingW[0], bold: true, size: 17 }),
                cell('75–100', { width: ratingW[1], center: true, bold: true, size: 17 }),
                cell(
                  'Performance regularly surpasses established standards. Results and impact go beyond a satisfactory level.',
                  { width: ratingW[2], size: 16 },
                ),
              ],
            }),
            new TableRow({
              children: [
                cell('Meets expectations', { width: ratingW[0], bold: true, size: 17 }),
                cell('60–74', { width: ratingW[1], center: true, bold: true, size: 17 }),
                cell(
                  'Competent and successful in the role. Produces intended results and satisfies established standards.',
                  { width: ratingW[2], size: 16 },
                ),
              ],
            }),
            new TableRow({
              children: [
                cell('Needs PIP', { width: ratingW[0], bold: true, size: 17 }),
                cell('51–59', { width: ratingW[1], center: true, bold: true, size: 17 }),
                cell(
                  'Performance requires a formal Performance Improvement Plan (typically three months). Strong improvement may support retention; escalate per AFRI-SWP if not.',
                  { width: ratingW[2], size: 16 },
                ),
              ],
            }),
            new TableRow({
              children: [
                cell('Below expectations', { width: ratingW[0], bold: true, size: 17 }),
                cell('26–50', { width: ratingW[1], center: true, bold: true, size: 17 }),
                cell(
                  'Standards not met due to effort and/or skill gaps. Immediate corrective action is required under progressive discipline.',
                  { width: ratingW[2], size: 16 },
                ),
              ],
            }),
            new TableRow({
              children: [
                cell('Termination band', { width: ratingW[0], bold: true, size: 17 }),
                cell('0–25', { width: ratingW[1], center: true, bold: true, size: 17 }),
                cell(
                  'Unacceptable performance. Subject to fair review and applicable policy; end of engagement or termination may be considered.',
                  { width: ratingW[2], size: 16 },
                ),
              ],
            }),
          ],
        }),

        sectionTitle('3. Score weighting'),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [6720, 3360],
          rows: [
            new TableRow({
              children: [
                cell('Performance area', { width: 6720, shade: SOFT, bold: true }),
                cell('Weight', { width: 3360, shade: SOFT, bold: true, center: true }),
              ],
            }),
            new TableRow({
              children: [
                cell('Part A — Core competencies (role KPIs / deliverables)', {
                  width: 6720,
                  size: 17,
                }),
                cell('60%', { width: 3360, center: true, bold: true, size: 18 }),
              ],
            }),
            new TableRow({
              children: [
                cell('Part B — Behavioural competencies', { width: 6720, size: 17 }),
                cell('40%', { width: 3360, center: true, bold: true, size: 18 }),
              ],
            }),
            new TableRow({
              children: [
                cell('Cumulative total', { width: 6720, bold: true, size: 17 }),
                cell('100%', { width: 3360, center: true, bold: true, size: 18 }),
              ],
            }),
          ],
        }),
        p('Aligned with AFRI-SWP: 60% deliverables and output · 40% professional / soft skills.', {
          size: 16,
          italics: true,
          color: MUTED,
          spacingBefore: 80,
          spacingAfter: 80,
        }),

        sectionTitle('4. Part A — Core competencies (60%)'),
        p(
          'List role-specific KPIs in the Description column. Enter the rating as a score within each row’s weight (e.g. for a 10% row, score 0–10). Supervisor confirms the rating.',
          { size: 17, color: MUTED, spacingAfter: 100 },
        ),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: kpiW,
          rows: [
            new TableRow({
              children: ['Description (KPI / deliverable)', 'Weight', 'Rating', 'Supervisor'].map(
                (t, i) =>
                  cell(t, {
                    width: kpiW[i],
                    shade: SOFT,
                    bold: true,
                    center: i > 0,
                    size: 16,
                  }),
              ),
            }),
            ...['10%', '10%', '10%', '10%', '10%', '5%', '5%'].map(
              (weight) =>
                new TableRow({
                  children: [
                    blankCell(kpiW[0], 2),
                    cell(weight, { width: kpiW[1], center: true, bold: true, size: 17 }),
                    blankCell(kpiW[2]),
                    blankCell(kpiW[3]),
                  ],
                }),
            ),
            new TableRow({
              children: [
                cell('Part A total', { width: kpiW[0], bold: true, shade: SOFT, size: 17 }),
                cell('60%', { width: kpiW[1], center: true, bold: true, shade: SOFT, size: 17 }),
                blankCell(kpiW[2]),
                blankCell(kpiW[3]),
              ],
            }),
          ],
        }),

        sectionTitle('5. Part B — Behavioural competencies (40%)'),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: kpiW,
          rows: [
            new TableRow({
              children: ['Description', 'Weight', 'Rating', 'Supervisor'].map((t, i) =>
                cell(t, {
                  width: kpiW[i],
                  shade: SOFT,
                  bold: true,
                  center: i > 0,
                  size: 16,
                }),
              ),
            }),
            ...[
              ['Team spirit', '7%'],
              ['Time management', '7%'],
              ['Commitment to problem-solving', '7%'],
              ['Attitude to work', '7%'],
              ['Professionalism', '5%'],
              ['Attitude to line supervisors / managers or direct reports', '7%'],
            ].map(
              ([label, weight]) =>
                new TableRow({
                  children: [
                    cell(label, { width: kpiW[0], size: 17 }),
                    cell(weight, { width: kpiW[1], center: true, bold: true, size: 17 }),
                    blankCell(kpiW[2]),
                    blankCell(kpiW[3]),
                  ],
                }),
            ),
            new TableRow({
              children: [
                cell('Part B total', { width: kpiW[0], bold: true, shade: SOFT, size: 17 }),
                cell('40%', { width: kpiW[1], center: true, bold: true, shade: SOFT, size: 17 }),
                blankCell(kpiW[2]),
                blankCell(kpiW[3]),
              ],
            }),
          ],
        }),

        sectionTitle('6. Summary of scores'),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: summaryW,
          rows: [
            new TableRow({
              children: ['Part A score (/60)', 'Part B score (/40)', 'Overall rating (/100)'].map(
                (t, i) => cell(t, { width: summaryW[i], shade: SOFT, bold: true, center: true }),
              ),
            }),
            new TableRow({
              children: summaryW.map((w) => blankCell(w, 2)),
            }),
            new TableRow({
              children: [
                new TableCell({
                  borders,
                  columnSpan: 2,
                  width: { size: summaryW[0] + summaryW[1], type: WidthType.DXA },
                  shading: { type: ShadingType.CLEAR, fill: SOFT },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      spacing: { after: 40, before: 40 },
                      children: [
                        new TextRun({
                          text: 'Score category (from rating key)',
                          bold: true,
                          size: 17,
                          color: PURPLE,
                          font: 'Calibri',
                        }),
                      ],
                    }),
                  ],
                }),
                blankCell(summaryW[2], 2),
              ],
            }),
          ],
        }),
        p(
          'Minimum performance threshold for this cycle: ________ %  (insert the approved organisational threshold before use).',
          { size: 17, spacingBefore: 120, spacingAfter: 80 },
        ),

        sectionTitle('7. Comments and development'),
        p('Supervisor / Team Lead — comments and recommendation', {
          bold: true,
          size: 18,
          spacingAfter: 60,
        }),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [CONTENT_W],
          rows: [new TableRow({ children: [blankCell(CONTENT_W, 4)] })],
        }),
        p('Team Member comment', { bold: true, size: 18, spacingBefore: 160, spacingAfter: 60 }),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [CONTENT_W],
          rows: [new TableRow({ children: [blankCell(CONTENT_W, 3)] })],
        }),
        p('Pillar Head / senior manager comment', {
          bold: true,
          size: 18,
          spacingBefore: 160,
          spacingAfter: 60,
        }),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [CONTENT_W],
          rows: [new TableRow({ children: [blankCell(CONTENT_W, 3)] })],
        }),
        p(
          'What can improve performance? (Beyond training — e.g. attention to detail, timely submissions, escalation habits)',
          { bold: true, size: 18, spacingBefore: 160, spacingAfter: 60 },
        ),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [CONTENT_W],
          rows: [new TableRow({ children: [blankCell(CONTENT_W, 3)] })],
        }),
        p('Training needs', { bold: true, size: 18, spacingBefore: 160, spacingAfter: 60 }),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [CONTENT_W],
          rows: [new TableRow({ children: [blankCell(CONTENT_W, 2)] })],
        }),
        p('People & Culture comment', {
          bold: true,
          size: 18,
          spacingBefore: 160,
          spacingAfter: 60,
        }),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [CONTENT_W],
          rows: [new TableRow({ children: [blankCell(CONTENT_W, 3)] })],
        }),

        sectionTitle('8. Acknowledgement'),
        p(
          'By signing, the parties confirm this appraisal was discussed. Record the outcome in the AfriVate Portal where the appraisal workflow is available. Slack supports communication only and does not replace the Portal record.',
          { size: 17, color: MUTED, spacingAfter: 140 },
        ),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [5040, 5040],
          rows: [
            new TableRow({
              children: [
                cell('Team Member', { width: 5040, shade: SOFT, bold: true }),
                cell('Manager / Team Lead / Pillar Head', { width: 5040, shade: SOFT, bold: true }),
              ],
            }),
            new TableRow({
              children: [
                cell(['Signature: _______________________', 'Date: ___________________________'], {
                  width: 5040,
                  size: 17,
                }),
                cell(['Signature: _______________________', 'Date: ___________________________'], {
                  width: 5040,
                  size: 17,
                }),
              ],
            }),
          ],
        }),
        p('', { spacingAfter: 160 }),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [CONTENT_W],
          rows: [
            new TableRow({
              children: [
                cell(
                  [
                    'People & Culture use only',
                    'Recorded in Portal: ☐ Yes   ☐ Pending',
                    'Follow-up: ☐ None   ☐ Coaching   ☐ PIP   ☐ Other _______________',
                    'HR signature / date: ________________________________',
                  ],
                  { width: CONTENT_W, shade: SOFT, size: 17 },
                ),
              ],
            }),
          ],
        }),
        p(
          'Document code: AFRI-PAF-01 · Pair with Portal appraisals and AFRI-SWP progressive discipline. Internal use.',
          { size: 15, color: MUTED, spacingBefore: 200 },
        ),
      ],
    },
  ],
})

const buffer = await Packer.toBuffer(doc)
await writeFile(docxPath, buffer)

console.log('Wrote', htmlPath)
console.log('Wrote', pdfPath)
console.log('Wrote', docxPath)

for (const [src, name] of [
  [pdfPath, `${outBase}.pdf`],
  [docxPath, 'AfriVate-Performance-Appraisal-Form.docx'],
]) {
  try {
    await copyFile(src, path.join(downloadsDir, name))
    console.log('Also copied', name, 'to Downloads')
  } catch {
    console.log('Could not copy', name, 'to Downloads (file may be open).')
  }
}

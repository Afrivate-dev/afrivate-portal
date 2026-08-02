/**
 * Redesigned AfriVate Performance Appraisal Form (DOCX).
 * Source structure from AfriVate Appraisal Form Template.
 * Run: node docs/official/render/render-appraisal-form.mjs
 */
import { copyFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AlignmentType,
  BorderStyle,
  Document,
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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, '..', 'policies')
const outPath = path.join(outDir, 'Afrivate-Performance-Appraisal-Form.docx')
const downloadsPath = path.resolve(
  'C:/Users/DELL/Downloads/AfriVate-Performance-Appraisal-Form.docx',
)

const PURPLE = '8D4087'
const SOFT = 'F8F3F8'
const LINE = 'EBDCEB'
const INK = '1F1F1F'
const MUTED = '5F5F5F'
const CONTENT_W = 10080

const thin = { style: BorderStyle.SINGLE, size: 6, color: LINE }
const borders = { top: thin, bottom: thin, left: thin, right: thin }

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
  } = opts
  const lines = Array.isArray(text) ? text : [text]
  return new TableCell({
    borders,
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

const metaW = [2520, 2520, 2520, 2520]
const ratingW = [2200, 1400, 6480]
const kpiW = [5040, 1260, 1890, 1890]
const summaryW = [3360, 3360, 3360]

const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children: [
        p('AFRIVATE TECHNOLOGIES LTD · RC: 9210092', {
          size: 16,
          color: MUTED,
          spacingAfter: 40,
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

        p(
          'This evaluation links role expectations to actual performance. Its purpose is professional development—identifying strengths and improvement areas—and to help management assess performance and plan career-development interventions.',
          { size: 18, spacingAfter: 160 },
        ),

        sectionTitle('1. Employee details'),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: metaW,
          rows: [
            new TableRow({
              children: ['Employee name', 'Supervisor / manager', 'Job title / grade', 'Time in role'].map(
                (t, i) => cell(t, { width: metaW[i], shade: SOFT, bold: true, size: 16 }),
              ),
            }),
            new TableRow({
              children: metaW.map((w) => blankCell(w)),
            }),
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
                cell('Employee / Volunteer / Contractor', {
                  width: metaW[3],
                  size: 16,
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
                  'Performance requires a formal Performance Improvement Plan (typically three months). Strong improvement may support retention; escalate per SWP if not.',
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
                  'Unacceptable performance. Subject to fair review and applicable policy; termination may be considered.',
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
        p(
          'Aligned with AfriVate SWP appraisal structure: 60% deliverables & output · 40% professional / soft skills.',
          { size: 16, italics: true, color: MUTED, spacingBefore: 80, spacingAfter: 80 },
        ),

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

        sectionTitle('7. Comments & development'),
        p('Supervisor / line manager — comments & recommendation', {
          bold: true,
          size: 18,
          spacingAfter: 60,
        }),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [CONTENT_W],
          rows: [new TableRow({ children: [blankCell(CONTENT_W, 4)] })],
        }),

        p('Appraisee comment', { bold: true, size: 18, spacingBefore: 160, spacingAfter: 60 }),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [CONTENT_W],
          rows: [new TableRow({ children: [blankCell(CONTENT_W, 3)] })],
        }),

        p('Senior manager comment', { bold: true, size: 18, spacingBefore: 160, spacingAfter: 60 }),
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

        p('People & Culture (HR) comment', {
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
                cell('Employee', { width: 5040, shade: SOFT, bold: true }),
                cell('Manager / line supervisor / HOD', { width: 5040, shade: SOFT, bold: true }),
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
                    'HR use only',
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
          'Document code: AFRI-PAF-01 · Pair with Portal appraisals & SWP progressive discipline. Internal use.',
          { size: 15, color: MUTED, spacingBefore: 200 },
        ),
      ],
    },
  ],
})

const buffer = await Packer.toBuffer(doc)
await writeFile(outPath, buffer)
try {
  await copyFile(outPath, downloadsPath)
  console.log('Wrote', outPath)
  console.log('Also copied to', downloadsPath)
} catch {
  console.log('Wrote', outPath)
  console.log('Could not copy to Downloads (file may be open).')
}

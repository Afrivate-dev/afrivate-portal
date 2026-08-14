/**
 * Completed interview scorecard for Esther.
 * Run: node docs/official/render/render-esther-scorecard.mjs
 */
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.resolve(
  __dirname,
  '..',
  'hiring',
  'interviews',
  'candidates',
  'Afrivate-Interview-Scorecard-Esther.docx',
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
  const { bold = false, size = 20, color = INK, spacingAfter = 80, align } = opts
  return new Paragraph({
    alignment: align,
    spacing: { after: spacingAfter },
    children: [new TextRun({ text, bold, size, color, font: 'Calibri' })],
  })
}

function h(text) {
  return p(text, { bold: true, size: 22, color: PURPLE, spacingAfter: 100 })
}

function cell(text, { width, shade, bold = false, center = false } = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: shade ? { type: ShadingType.CLEAR, fill: shade } : undefined,
    verticalAlign: VerticalAlign.TOP,
    children: [
      new Paragraph({
        alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text: String(text),
            bold,
            size: 17,
            color: bold && shade ? PURPLE : INK,
            font: 'Calibri',
          }),
        ],
      }),
    ],
  })
}

function metaTable() {
  const widths = [2520, 2520, 2520, 2520]
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        children: ['Candidate', 'Role', 'Interview date', 'Interviewer'].map((text, index) =>
          cell(text, { width: widths[index], shade: SOFT, bold: true }),
        ),
      }),
      new TableRow({
        children: [
          cell('Esther', { width: widths[0] }),
          cell('Front-End Developer', { width: widths[1] }),
          cell('30 July 2026', { width: widths[2] }),
          cell('Emmanuel Okpiaifo (CHRO)', { width: widths[3] }),
        ],
      }),
    ],
  })
}

function scoreTable() {
  const widths = [3600, 1200, 5280]
  const rows = [
    ['Competency', 'Score', 'Evidence and rationale'],
    [
      'A1 Ownership of contribution',
      '2',
      'She appears to have project exposure, but her answers did not demonstrate convincing ownership or real-world delivery depth.',
    ],
    [
      'A2 Problem-solving process',
      '1',
      'Answers did not show a clear, independent process for diagnosing and resolving realistic problems.',
    ],
    [
      'A3 Communication clarity',
      '1',
      'Communication was poor. Several answers sounded read or externally sourced rather than explained naturally in her own words.',
    ],
    [
      'A4 Remote reliability & preparation',
      '1',
      'She appeared unprepared for the interview and repeatedly seemed to search for answers during the call.',
    ],
    [
      'A5 Feedback & collaboration',
      '2',
      'Team collaboration and client-relations ability were not demonstrated. Her prior experience did not translate into credible live examples.',
    ],
    [
      'C Technical depth (Front-End)',
      '2',
      'Some project experience is present, but the interview did not establish sufficient production-level or client-facing application of the skills.',
    ],
  ]

  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map(
      (row, rowIndex) =>
        new TableRow({
          children: row.map((text, columnIndex) =>
            cell(text, {
              width: widths[columnIndex],
              shade: rowIndex === 0 ? SOFT : undefined,
              bold: rowIndex === 0 || columnIndex === 1,
              center: columnIndex === 1,
            }),
          ),
        }),
    ),
  })
}

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
        p('AFRIVATE TECHNOLOGIES LTD · RC: 9210092 · AFRI-DISC-01 (completed)', {
          size: 16,
          color: MUTED,
          spacingAfter: 40,
        }),
        p('DEVELOPER INTERVIEW SCORECARD — COMPLETED', {
          bold: true,
          size: 26,
          color: PURPLE,
          align: AlignmentType.CENTER,
          spacingAfter: 40,
        }),
        p('Esther', {
          bold: true,
          size: 24,
          align: AlignmentType.CENTER,
          spacingAfter: 160,
        }),
        metaTable(),
        p('', { spacingAfter: 80 }),

        h('Overall judgment'),
        p('Overall impression score: 39 / 100', { bold: true, spacingAfter: 60 }),
        p(
          'Esther was not well prepared, struggled to communicate clearly, and did not demonstrate that her project experience translates into real-world delivery or client relations. This creates material risk for team communication and collaboration.',
          { spacingAfter: 100 },
        ),
        p(
          'Several answers felt read or searched for during the interview. Possible AI or external assistance was suspected but not verified, so this is recorded only as an interview-integrity concern—not as a proven finding.',
          { spacingAfter: 140 },
        ),

        h('Competency scores'),
        scoreTable(),
        p('', { spacingAfter: 100 }),
        p(
          'All competencies scored below 3. Communication, problem-solving, and preparation scored 1. No competency met the hiring bar.',
          { size: 18, spacingAfter: 140 },
        ),

        h('Hard gates and concerns'),
        p('☐ Proven integrity violation (not established)', { spacingAfter: 40 }),
        p('☑ Interview-integrity concern requiring documentation', { bold: true, spacingAfter: 40 }),
        p('☑ Unable to explain experience with sufficient real-world depth', { bold: true, spacingAfter: 40 }),
        p('☑ Communication and collaboration below role requirements', {
          bold: true,
          spacingAfter: 140,
        }),

        h('Confidence'),
        p('☑ High   ☐ Medium   ☐ Low', { bold: true, spacingAfter: 60 }),
        p(
          'The No Hire decision does not depend on proving AI use. Preparation, communication, real-world depth, and collaboration signals were independently below the bar.',
          { size: 18, color: MUTED, spacingAfter: 140 },
        ),

        h('Recommendation'),
        p('☐ Strong Yes', { spacingAfter: 40 }),
        p('☐ Yes', { spacingAfter: 40 }),
        p('☐ Hold / second look', { spacingAfter: 40 }),
        p('☑ No Hire', { bold: true, spacingAfter: 40 }),
        p('☐ Strong No', { spacingAfter: 80 }),
        p(
          'Rule match: Multiple competencies ≤ 2 and technical depth ≤ 2. The candidate does not meet AfriVate’s current hiring bar.',
          { size: 18, spacingAfter: 140 },
        ),

        h('Hiring summary'),
        p(
          'Esther is not recommended for hiring: despite some project exposure, she was unprepared and did not demonstrate the communication, collaboration, real-world experience, or independent technical judgment required for the role.',
          { bold: true, spacingAfter: 140 },
        ),

        h('Interviewer attestation'),
        p('☑ This form reflects my post-interview judgment for Esther.', { spacingAfter: 60 }),
        p('Interviewer: Emmanuel Okpiaifo — Chief Human Resources Officer (CHRO)', { spacingAfter: 60 }),
        p('Signature: Emmanuel Okpiaifo', { spacingAfter: 60 }),
        p('Date: 30 July 2026', { spacingAfter: 120 }),
        p('Internal hiring record · Pair with AfriVate Developer Interview Kit', {
          size: 16,
          color: MUTED,
        }),
      ],
    },
  ],
})

const buffer = await Packer.toBuffer(doc)
await writeFile(outPath, buffer)
console.log('Wrote', outPath)

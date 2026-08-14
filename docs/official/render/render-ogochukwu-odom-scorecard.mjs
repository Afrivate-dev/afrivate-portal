/**
 * Completed interview scorecard for Ogochukwu Odom.
 * Run: node docs/official/render/render-ogochukwu-odom-scorecard.mjs
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
  'Afrivate-Interview-Scorecard-Ogochukwu-Odom.docx',
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
          cell('Ogochukwu Odom', { width: widths[0] }),
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
      '3',
      'Presented his strengths convincingly and demonstrated credible ownership. Projects appear solidly decent, though not the strongest signal in the interview.',
    ],
    [
      'A2 Problem-solving process',
      '4',
      'Consistently demonstrated that he understands a problem before implementing a fix. Answers used realistic scenarios and showed strong judgment.',
    ],
    [
      'A3 Communication clarity',
      '4',
      'Best communicator interviewed so far: direct, concise, well-articulated, and attentive to the question before answering. Sold his strengths without losing relevance.',
    ],
    [
      'A4 Remote reliability & delivery',
      '3',
      'Appears comfortable with deadlines and pressure, which supports delivery. Monitor whether pressure becomes necessary for productivity or affects sustainable pacing.',
    ],
    [
      'A5 Feedback & collaboration',
      '4',
      'Strong collaboration signal. His communication, listening, and problem-understanding should translate well into effective team work and joint problem-solving.',
    ],
    [
      'C Technical depth (Front-End)',
      '3',
      'Projects and realistic technical answers establish a solid practical foundation for the role. Meets the technical bar.',
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
        p('Ogochukwu Odom', {
          bold: true,
          size: 24,
          align: AlignmentType.CENTER,
          spacingAfter: 160,
        }),
        metaTable(),
        p('', { spacingAfter: 80 }),

        h('Overall judgment'),
        p('Overall impression score: 85 / 100', { bold: true, spacingAfter: 60 }),
        p(
          'Ogochukwu delivered the strongest communication performance so far. He was direct and concise, understood questions before answering, and supported his answers with realistic scenarios. He communicated his strengths persuasively without becoming vague or unfocused.',
          { spacingAfter: 100 },
        ),
        p(
          'His strongest signals are communication, collaboration, problem-solving, and understanding a problem before implementing a solution. His projects appear solidly decent and support the practical foundation required for the role.',
          { spacingAfter: 100 },
        ),
        p(
          'His questions about AfriVate were excellent and helped him build a meaningful understanding of the company and role. This demonstrated curiosity, engagement, and strong two-way communication.',
          { spacingAfter: 140 },
        ),

        h('Competency scores'),
        scoreTable(),
        p('', { spacingAfter: 100 }),
        p(
          'Communication, problem-solving, and collaboration scored 4 (Strong). Ownership, delivery, and technical depth scored 3 (Meets bar). No score is below 3 and there are no hard fails.',
          { size: 18, spacingAfter: 140 },
        ),

        h('Hard gates'),
        p('☑ None', { bold: true, spacingAfter: 60 }),
        p(
          'No integrity, security, reliability, authorship, communication, or conduct concern was identified.',
          { size: 18, color: MUTED, spacingAfter: 140 },
        ),

        h('Confidence'),
        p('☑ High   ☐ Medium   ☐ Low', { bold: true, spacingAfter: 60 }),
        p(
          'The interview produced clear evidence across communication, realistic problem-solving, collaboration, technical foundation, and motivation.',
          { size: 18, color: MUTED, spacingAfter: 140 },
        ),

        h('Recommendation'),
        p('☑ Strong Yes', { bold: true, spacingAfter: 40 }),
        p('☐ Yes', { spacingAfter: 40 }),
        p('☐ Hold / second look', { spacingAfter: 40 }),
        p('☐ No Hire', { spacingAfter: 40 }),
        p('☐ Strong No', { spacingAfter: 80 }),
        p(
          'Rule match: Every scored competency is ≥ 3, technical depth is ≥ 3, Confidence is High, no hard gates apply, and three competencies scored 4.',
          { size: 18, spacingAfter: 140 },
        ),

        h('Hiring summary'),
        p(
          'Ogochukwu Odom is a Strong Yes: an excellent communicator with strong collaboration and problem-solving signals, realistic technical judgment, credible projects, and thoughtful engagement with AfriVate.',
          { bold: true, spacingAfter: 140 },
        ),

        h('Development focus if hired'),
        p(
          'Monitor deadline/pressure habits to ensure he maintains consistent output without depending on urgency or unsustainable pressure.',
          { spacingAfter: 140 },
        ),

        h('Suggested next step'),
        p('☑ Advance to reference / offer discussion', { bold: true, spacingAfter: 40 }),
        p('☐ Additional technical verification', { spacingAfter: 40 }),
        p('☐ Hold for comparison', { spacingAfter: 140 }),

        h('Interviewer attestation'),
        p('☑ This form reflects my post-interview judgment for Ogochukwu Odom.', {
          spacingAfter: 60,
        }),
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

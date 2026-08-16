/**
 * Completed interview scorecard for Jeffrey Nmose — reconstructed from interviewer judgment.
 * Run: node docs/official/render/render-jeffrey-nmose-scorecard.mjs
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
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  ShadingType,
  VerticalAlign,
} from 'docx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.resolve(
  __dirname,
  '..',
  'hiring',
  'interviews',
  'candidates',
  'Afrivate-Interview-Scorecard-Jeffrey-Nmose.docx',
)
const outPathAlt = path.resolve(
  __dirname,
  '..',
  'hiring',
  'interviews',
  'candidates',
  'Afrivate-Interview-Scorecard-Jeffrey-Nmose-updated.docx',
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
  const { bold = false, size = 20, color = INK, italics = false, spacingAfter = 80, spacingBefore = 0, align } = opts
  return new Paragraph({
    alignment: align,
    spacing: { after: spacingAfter, before: spacingBefore },
    children: [new TextRun({ text, bold, italics, size, color, font: 'Calibri' })],
  })
}

function rich(runs, opts = {}) {
  const { spacingAfter = 80, spacingBefore = 0 } = opts
  return new Paragraph({
    spacing: { after: spacingAfter, before: spacingBefore },
    children: runs.map(
      (r) =>
        new TextRun({
          text: r.text,
          bold: !!r.bold,
          italics: !!r.italics,
          size: r.size ?? 20,
          color: r.color ?? INK,
          font: 'Calibri',
        }),
    ),
  })
}

function h(text) {
  return new Paragraph({
    spacing: { before: 220, after: 100 },
    children: [new TextRun({ text, bold: true, size: 22, color: PURPLE, font: 'Calibri', allCaps: true })],
  })
}

function cell(text, opts = {}) {
  const { width, shade, bold = false, center = false } = opts
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: shade ? { type: ShadingType.CLEAR, fill: shade } : undefined,
    verticalAlign: VerticalAlign.TOP,
    children: [
      new Paragraph({
        alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: 40, before: 40 },
        children: [new TextRun({ text: String(text), bold, size: 17, color: bold && shade ? PURPLE : INK, font: 'Calibri' })],
      }),
    ],
  })
}

function metaTable() {
  const w = [2520, 2520, 2520, 2520]
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: w,
    rows: [
      new TableRow({
        children: ['Candidate', 'Role', 'Interview date', 'Interviewer'].map((t, i) =>
          cell(t, { width: w[i], shade: SOFT, bold: true }),
        ),
      }),
      new TableRow({
        children: [
          cell('Jeffrey Nmose', { width: w[0] }),
          cell('Front-End Developer', { width: w[1] }),
          cell('28 July 2026', { width: w[2] }),
          cell('Emmanuel Okpiaifo (Human Resources Manager)', { width: w[3] }),
        ],
      }),
    ],
  })
}

function scoreTable() {
  const w = [3600, 1200, 5280]
  const rows = [
    ['Competency', 'Score', 'Justification (from interviewer judgment)'],
    [
      'A1 Ownership of contribution',
      '3',
      'Has real projects and experience; contribution is credible. Did not stand out as exceptional ownership storytelling.',
    ],
    [
      'A2 Problem-solving process',
      '3',
      'Demonstrates workable technical problem-solving consistent with someone who has shipped work. Not a memorable / standout process narrative.',
    ],
    [
      'A3 Communication clarity',
      '3',
      'Communication was mid: clear enough to assess competence and collaborate, but average — not crisp or impressive. Meets bar; blocks Strong Yes.',
    ],
    [
      'A4 Remote reliability & escalation',
      '3',
      'No reliability red flag recorded; treated as meets bar for remote fit pending working norms.',
    ],
    [
      'A5 Feedback & collaboration',
      '3',
      'No collaboration concern recorded; treated as meets bar.',
    ],
    [
      'C Technical depth (role stack)',
      '3',
      'Has the skills for the role. Experience and projects support hire. Depth was adequate, not impressive.',
    ],
  ]
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: w,
    rows: rows.map((r, idx) =>
      new TableRow({
        children: r.map((text, i) =>
          cell(text, {
            width: w[i],
            shade: idx === 0 ? SOFT : undefined,
            bold: idx === 0 || i === 1,
            center: i === 1,
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
        p('Jeffrey Nmose', {
          bold: true,
          size: 24,
          align: AlignmentType.CENTER,
          spacingAfter: 160,
        }),

        metaTable(),
        p('', { spacingAfter: 80 }),

        rich(
          [
            {
              text: 'Scoring method note: ',
              bold: true,
              size: 18,
              color: PURPLE,
            },
            {
              text:
                'Live anchored scoring was not completed during the call. Scores below were reconstructed immediately after from the interviewer overall judgment (~70/100). Confidence is Medium because item-level evidence was not captured live.',
              size: 18,
            },
          ],
          { spacingAfter: 140 },
        ),

        h('Overall judgment'),
        p('Overall impression score: 70 / 100', { bold: true, spacingAfter: 60 }),
        p(
          'Jeffrey has the skills, projects, and experience for the role and is a good fit. He did not strongly impress. Mid communication is the main reason this is a Yes rather than a Strong Yes — not a reason to Hold.',
          { spacingAfter: 140 },
        ),

        h('Hard gates'),
        p('☐ None checked', { bold: true, spacingAfter: 60 }),
        p(
          'No integrity, security, reliability, authorship, or conduct hard gate was reported from this interview.',
          { size: 18, color: MUTED, spacingAfter: 140 },
        ),

        h('Competency scores (reconstructed)'),
        scoreTable(),
        p('', { spacingAfter: 80 }),
        p('All scored competencies = 3 (Meets bar). No 4s. No scores below 3. No hard fails. Mid communication is noted inside A3 as quality-within-bar, not a fail.', {
          size: 18,
          spacingAfter: 140,
        }),

        h('Confidence'),
        p('☑ Medium   ☐ High   ☐ Low', { bold: true, spacingAfter: 60 }),
        p(
          'Medium because the formal live scorecard was not filled during the interview; the 70% judgment and Yes recommendation are still clear.',
          { size: 18, color: MUTED, spacingAfter: 140 },
        ),

        h('Recommendation (forced choice)'),
        p('☐ Strong Yes', { spacingAfter: 40 }),
        p('☑ Yes', { bold: true, spacingAfter: 40 }),
        p('☐ Hold / second look', { spacingAfter: 40 }),
        p('☐ No', { spacingAfter: 40 }),
        p('☐ Strong No', { spacingAfter: 80 }),
        p(
          'Rule match: All scored competencies ≥ 3, technical ≥ 3, no hard fails/gates, Confidence Medium → Yes. Not Strong Yes: no 4s, interview was not impressive, and communication was mid.',
          { size: 18, spacingAfter: 140 },
        ),

        h('One-sentence hiring summary'),
        p(
          'Jeffrey Nmose is a Yes — good fit with the skills, projects, and experience for the role; mid communication and a non-impressive interview keep this from Strong Yes for now.',
          { bold: true, spacingAfter: 140 },
        ),

        h('Suggested next step'),
        p('☐ Take-home assignment', { spacingAfter: 40 }),
        p('☐ Second technical call (narrow topic)', { spacingAfter: 40 }),
        p('☑ Advance to reference / offer discussion', { bold: true, spacingAfter: 40 }),
        p('☐ Hold for comparison against other finalists', { spacingAfter: 100 }),
        p(
          'If comparing multiple Yes candidates later, prefer whoever communicates more clearly — Jeffrey clears the bar but does not raise it.',
          { size: 18, color: MUTED, spacingAfter: 160 },
        ),

        h('Interviewer attestation'),
        p('☑ This form reflects my post-interview judgment for Jeffrey Nmose.', { spacingAfter: 60 }),
        p('Interviewer name: Emmanuel Okpiaifo — Human Resources Manager, AfriVate Technologies Ltd', { spacingAfter: 60 }),
        p('Signature: Emmanuel Okpiaifo', { spacingAfter: 60 }),
        p('Date: 28 July 2026', { spacingAfter: 120 }),
        p('Internal hiring record · Pair with AfriVate Developer Interview Kit', {
          size: 16,
          color: MUTED,
        }),
      ],
    },
  ],
})

const buffer = await Packer.toBuffer(doc)
try {
  await writeFile(outPath, buffer)
  console.log('Wrote', outPath)
} catch (err) {
  if (err && err.code === 'EBUSY') {
    await writeFile(outPathAlt, buffer)
    console.log('Primary file locked; wrote', outPathAlt)
    console.log('Close the open DOCX, then re-run to replace the main file.')
  } else {
    throw err
  }
}

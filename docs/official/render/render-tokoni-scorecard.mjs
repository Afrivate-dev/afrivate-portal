/**
 * Completed interview scorecard for Tamarautokoih Standwell — reconstructed from interviewer judgment.
 * Run: node docs/official/render/render-tokoni-scorecard.mjs
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
  'Afrivate-Interview-Scorecard-Tamarautokoih-Standwell.docx',
)
const outPathAlt = path.resolve(
  __dirname,
  '..',
  'hiring',
  'interviews',
  'candidates',
  'Afrivate-Interview-Scorecard-Tamarautokoih-Standwell-updated.docx',
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
  const { bold = false, size = 20, color = INK, italics = false, spacingAfter = 80, spacingBefore = 0, align } =
    opts
  return new Paragraph({
    alignment: align,
    spacing: { after: spacingAfter, before: spacingBefore },
    children: [new TextRun({ text, bold, italics, size, color, font: 'Calibri' })],
  })
}

function rich(runs, opts = {}) {
  const { spacingAfter = 80 } = opts
  return new Paragraph({
    spacing: { after: spacingAfter },
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
          cell('Tamarautokoih Standwell', { width: w[0] }),
          cell('Front-End Developer', { width: w[1] }),
          cell('28 July 2026', { width: w[2] }),
          cell('Emmanuel Okpiaifo (CHRO)', { width: w[3] }),
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
      'Has experience and skills for the role; credible project background. Not a standout ownership narrative.',
    ],
    [
      'A2 Problem-solving process',
      '3',
      'Technical capability present. Overall mid — nothing impressive in how problems were framed, but adequate for the role.',
    ],
    [
      'A3 Communication clarity',
      '3',
      'Communication needs a lot of work (developmental). Still clear enough to evaluate fit and hire with coaching. Meets bar for Yes; blocks Strong Yes.',
    ],
    [
      'A4 Remote reliability & escalation',
      '4',
      'Stuck/unblock answer: tries personally first, then escalates and collaborates to remove the blocker. Explicit willingness to communicate when needed — strong remote/escalation signal.',
    ],
    [
      'A5 Feedback & collaboration',
      '3',
      'General collaboration style still unclear from the interview. Escalation story did show willingness to collaborate once personal effort fails. Treat as meets bar with a development area.',
    ],
    [
      'C Technical depth (role stack)',
      '3',
      'Experience and skills support the role. Adequacy over impressiveness. Coachable under AfriVate given that foundation.',
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
        p('Tamarautokoih Standwell', {
          bold: true,
          size: 24,
          align: AlignmentType.CENTER,
          spacingAfter: 160,
        }),

        metaTable(),
        p('', { spacingAfter: 80 }),

        rich(
          [
            { text: 'Scoring method note: ', bold: true, size: 18, color: PURPLE },
            {
              text:
                'Live anchored scoring was not completed during the call. Scores below were reconstructed immediately after from interviewer judgment (~80/100). Confidence is Medium because item-level evidence was not captured live.',
              size: 18,
            },
          ],
          { spacingAfter: 140 },
        ),

        h('Overall judgment'),
        p('Overall impression score: 80 / 100', { bold: true, spacingAfter: 60 }),
        p(
          'Would have been ~70 (mid, not impressive, but has the experience and skills). Raised to ~80 because his closing questions were excellent: he asked what challenges AfriVate currently faces and what his impact would be at AfriVate. That shows product curiosity and ownership orientation beyond the technical mid baseline.',
          { spacingAfter: 100 },
        ),
        p(
          'Communication needs development and collaboration remains partly unclear, but both are trainable given his experience/skills. Escalation answer was a clear positive: communicates and escalates when stuck, then collaborates to clear blockers.',
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
        p(
          'Most competencies = 3 (Meets bar). A4 Escalation = 4 (Strong). No scores below 3. No hard fails. Only one 4 → cannot be Strong Yes.',
          { size: 18, spacingAfter: 140 },
        ),

        h('Confidence'),
        p('☑ Medium   ☐ High   ☐ Low', { bold: true, spacingAfter: 60 }),
        p(
          'Medium because live scorecard was not filled; collaboration remains partly unclear. Escalation answer and closing questions give enough signal for Yes.',
          { size: 18, color: MUTED, spacingAfter: 140 },
        ),

        h('Recommendation (forced choice)'),
        p('☐ Strong Yes', { spacingAfter: 40 }),
        p('☑ Yes', { bold: true, spacingAfter: 40 }),
        p('☐ Hold / second look', { spacingAfter: 40 }),
        p('☐ No', { spacingAfter: 40 }),
        p('☐ Strong No', { spacingAfter: 80 }),
        p(
          'Rule match: All scored competencies ≥ 3, technical ≥ 3, no hard fails/gates, Confidence Medium → Yes. Not Strong Yes: overall mid/not impressive, communication needs work, collaboration still unclear, and only one competency scored 4.',
          { size: 18, spacingAfter: 140 },
        ),

        h('One-sentence hiring summary'),
        p(
          'Tamarautokoih Standwell is a Yes — solid experience/skills and strong escalation plus excellent impact-focused questions; mid delivery and coachable gaps in communication/collaboration keep this from Strong Yes.',
          { bold: true, spacingAfter: 140 },
        ),

        h('Development focus if hired'),
        p('1. Communication clarity — structure, precision, less reliance on interviewer rescue.', {
          spacingAfter: 40,
        }),
        p('2. Collaboration habits — make pairing, review, and cross-functional working style explicit early.', {
          spacingAfter: 40,
        }),
        p('3. Preserve escalation strength — reinforce early blocker updates in Portal/Slack.', {
          spacingAfter: 140,
        }),

        h('Suggested next step'),
        p('☐ Take-home assignment', { spacingAfter: 40 }),
        p('☐ Second technical call (narrow topic)', { spacingAfter: 40 }),
        p('☑ Advance to reference / offer discussion', { bold: true, spacingAfter: 40 }),
        p('☐ Hold for comparison against other finalists', { spacingAfter: 100 }),
        p(
          'Compared with other Yes candidates: Tamarautokoih’s edge is escalation maturity and strong candidate questions; watch communication in onboarding.',
          { size: 18, color: MUTED, spacingAfter: 160 },
        ),

        h('Interviewer attestation'),
        p('☑ This form reflects my post-interview judgment for Tamarautokoih Standwell.', {
          spacingAfter: 60,
        }),
        p('Interviewer name: Emmanuel Okpiaifo — Chief Human Resources Officer (CHRO)', { spacingAfter: 60 }),
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
  } else {
    throw err
  }
}

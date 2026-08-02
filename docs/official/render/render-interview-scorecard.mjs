/**
 * Generates AfriVate Developer Interview Scorecard (DOCX).
 * Run: node docs/official/render/render-interview-scorecard.mjs
 */
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
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
  'Afrivate-Developer-Interview-Scorecard.docx',
)

const PURPLE = '8D4087'
const SOFT = 'F8F3F8'
const LINE = 'EBDCEB'
const INK = '1F1F1F'
const MUTED = '5F5F5F'

const thin = { style: BorderStyle.SINGLE, size: 6, color: LINE }
const borders = { top: thin, bottom: thin, left: thin, right: thin }
const noBorder = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
}

const PAGE_W = 12240 // US Letter-ish via A4-ish width in DXA for A4 ~11906; use 11906
const CONTENT_W = 10080 // with ~0.75" margins on A4

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
    children: [
      new TextRun({
        text,
        bold,
        italics,
        size,
        color,
        font: 'Calibri',
      }),
    ],
  })
}

function rich(runs, opts = {}) {
  const { spacingAfter = 80, spacingBefore = 0, align } = opts
  return new Paragraph({
    alignment: align,
    spacing: { after: spacingAfter, before: spacingBefore },
    children: runs.map((r) =>
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

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: level === HeadingLevel.HEADING_1 ? 24 : 22,
        color: PURPLE,
        font: 'Calibri',
        allCaps: level === HeadingLevel.HEADING_1,
      }),
    ],
  })
}

function cell(children, opts = {}) {
  const { width = CONTENT_W / 2, shade, boldHeader = false, center = false } = opts
  const content = Array.isArray(children) ? children : [children]
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: shade ? { type: ShadingType.CLEAR, fill: shade } : undefined,
    verticalAlign: VerticalAlign.TOP,
    children: content.map((c) => {
      if (c instanceof Paragraph) return c
      return new Paragraph({
        alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: 40, before: 40 },
        children: [
          new TextRun({
            text: String(c),
            bold: boldHeader,
            size: boldHeader ? 18 : 18,
            color: boldHeader ? PURPLE : INK,
            font: 'Calibri',
          }),
        ],
      })
    }),
  })
}

function simpleRow(cells, widths, shadeFirst = false) {
  return new TableRow({
    children: cells.map((c, i) =>
      cell(c, {
        width: widths[i],
        shade: shadeFirst && i === 0 ? SOFT : undefined,
        boldHeader: shadeFirst && i === 0,
      }),
    ),
  })
}

function headerRow(labels, widths) {
  return new TableRow({
    children: labels.map((label, i) =>
      cell(label, { width: widths[i], shade: SOFT, boldHeader: true, center: i > 0 && widths.length > 3 }),
    ),
  })
}

function fieldLine(label, blank = '________________________________') {
  return rich(
    [
      { text: `${label} `, bold: true, size: 20 },
      { text: blank, size: 20, color: MUTED },
    ],
    { spacingAfter: 100 },
  )
}

function check(text) {
  return p(`☐  ${text}`, { size: 18, spacingAfter: 60 })
}

function mustNote(text) {
  return rich(
    [
      { text: 'Required note: ', bold: true, size: 18, color: PURPLE },
      { text: text, size: 18, color: MUTED, italics: true },
    ],
    { spacingAfter: 60 },
  )
}

function scoreBlock({ id, title, definition, anchors, evidencePrompt, hardFail }) {
  const w = [1400, 2160, 2160, 2160, 2160]
  return [
    heading(`${id}. ${title}`, HeadingLevel.HEADING_2),
    p(definition, { size: 18, color: MUTED, spacingAfter: 100 }),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: w,
      rows: [
        headerRow(['Score', '1 — Below bar', '2 — Partial', '3 — Meets bar', '4 — Strong'], w),
        new TableRow({
          children: [
            cell(
              [
                new Paragraph({
                  spacing: { after: 40, before: 40 },
                  children: [
                    new TextRun({ text: 'Mark one:', bold: true, size: 16, color: PURPLE, font: 'Calibri' }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 20 },
                  children: [new TextRun({ text: '☐ 1', size: 18, font: 'Calibri' })],
                }),
                new Paragraph({
                  spacing: { after: 20 },
                  children: [new TextRun({ text: '☐ 2', size: 18, font: 'Calibri' })],
                }),
                new Paragraph({
                  spacing: { after: 20 },
                  children: [new TextRun({ text: '☐ 3', size: 18, font: 'Calibri' })],
                }),
                new Paragraph({
                  spacing: { after: 20 },
                  children: [new TextRun({ text: '☐ 4', size: 18, font: 'Calibri' })],
                }),
              ],
              { width: w[0], shade: SOFT },
            ),
            cell(anchors[0], { width: w[1] }),
            cell(anchors[1], { width: w[2] }),
            cell(anchors[2], { width: w[3] }),
            cell(anchors[3], { width: w[4] }),
          ],
        }),
      ],
    }),
    p('', { spacingAfter: 60 }),
    ...anchorsEvidence(evidencePrompt),
    ...(hardFail
      ? [
          rich(
            [
              { text: 'Hard fail if checked: ', bold: true, size: 18, color: '8B1E3F' },
              { text: hardFail, size: 18 },
            ],
            { spacingAfter: 40 },
          ),
          p('☐  Hard fail applies on this competency', { size: 18, spacingAfter: 160 }),
        ]
      : [p('', { spacingAfter: 120 })]),
  ]
}

function anchorsEvidence(prompt) {
  return [
    mustNote(prompt),
    p('Evidence (specific answer / quote / behaviour observed):', { bold: true, size: 18, spacingAfter: 40 }),
    p('___________________________________________________________________________', {
      size: 18,
      color: MUTED,
      spacingAfter: 40,
    }),
    p('___________________________________________________________________________', {
      size: 18,
      color: MUTED,
      spacingAfter: 80,
    }),
  ]
}

const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children: [
        p('AFRIVATE TECHNOLOGIES LTD · RC: 9210092', {
          size: 16,
          color: MUTED,
          spacingAfter: 40,
        }),
        p('DEVELOPER INTERVIEW SCORECARD', {
          bold: true,
          size: 28,
          color: PURPLE,
          align: AlignmentType.CENTER,
          spacingAfter: 60,
        }),
        p('Front-End & Back-End · Virtual interview · One form per candidate', {
          size: 18,
          color: MUTED,
          align: AlignmentType.CENTER,
          spacingAfter: 160,
        }),

        // Meta
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [2520, 2520, 2520, 2520],
          rows: [
            headerRow(['Candidate full name', 'Role interviewed', 'Interview date', 'Interviewer'], [2520, 2520, 2520, 2520]),
            new TableRow({
              children: [
                cell(' ', { width: 2520 }),
                cell('☐ Front-End   ☐ Back-End', { width: 2520 }),
                cell(' ', { width: 2520 }),
                cell(' ', { width: 2520 }),
              ],
            }),
          ],
        }),
        p('', { spacingAfter: 80 }),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [3360, 3360, 3360],
          rows: [
            headerRow(['Meeting quality', 'Materials reviewed before call', 'Project used in deep-dive'], [3360, 3360, 3360]),
            new TableRow({
              children: [
                cell('☐ Good  ☐ Usable  ☐ Poor (note impact below)', { width: 3360 }),
                cell('☐ CV  ☐ Cover letter  ☐ GitHub/portfolio', { width: 3360 }),
                cell('Name/link: ____________________', { width: 3360 }),
              ],
            }),
          ],
        }),

        heading('Scoring rules (mandatory)', HeadingLevel.HEADING_1),
        p('Do not score on “vibe,” charisma, or similarity to yourself. Every score must match one anchor below and be backed by a concrete observation from this interview.', {
          size: 18,
          spacingAfter: 80,
        }),
        check('Score independently before discussing the candidate with anyone else.'),
        check('Circle exactly one score (1–4) per competency. No half-scores. No “3/4”.'),
        check('If evidence is weak, score 2 or leave that competency unscored and mark Confidence = Low — do not invent a 3.'),
        check('A Hard fail on any competency means Recommendation cannot be Yes or Strong Yes.'),
        check('Complete Section C (role checks) for the role you interviewed. Leave the other role blank.'),
        p('Advance rule: Advance only if all scored competencies are ≥ 3, no hard fails, and Confidence is Medium or High.', {
          bold: true,
          size: 18,
          spacingAfter: 160,
        }),

        // A. Shared competencies
        heading('A. Shared competencies (both roles)', HeadingLevel.HEADING_1),

        ...scoreBlock({
          id: 'A1',
          title: 'Ownership of contribution',
          definition:
            'Can the candidate clearly separate what they personally built from team/AI/tutorial work?',
          anchors: [
            'Cannot name their own contribution; answers stay at “we built…”.',
            'Names some work but blurs ownership; cannot point to specific files/features they owned.',
            'States concrete personal deliverables (features, modules, decisions) with clear scope.',
            'Owns outcomes end-to-end; can explain trade-offs they chose and what they would redo.',
          ],
          evidencePrompt: 'Write one feature/module they claimed and how you verified it was theirs.',
          hardFail: 'Claimed authorship of work they clearly could not explain when probed.',
        }),

        ...scoreBlock({
          id: 'A2',
          title: 'Problem-solving process',
          definition:
            'When describing a hard bug or design problem, do they show a structured process?',
          anchors: [
            'No process; guesses or jumps to tools with no diagnosis steps.',
            'Mentions debugging but skips reproduction, isolation, or validation of the fix.',
            'Describes reproduce → isolate → fix → verify; names at least one trade-off.',
            'Also considers side effects, monitoring, or how they would prevent recurrence.',
          ],
          evidencePrompt: 'Name the problem they described and the steps they said they took.',
          hardFail: null,
        }),

        ...scoreBlock({
          id: 'A3',
          title: 'Communication clarity',
          definition:
            'Can a non-author engineer follow their explanation without rephrasing for them?',
          anchors: [
            'Answers are scattered, contradictory, or mostly jargon without meaning.',
            'Understandable only after multiple interviewer clarifications.',
            'Structured answers; defines terms; answers the question asked.',
            'Concise, proactive clarifying questions; adjusts detail when asked.',
          ],
          evidencePrompt: 'Note one explanation that was clear or one that required heavy rescue.',
          hardFail: null,
        }),

        ...scoreBlock({
          id: 'A4',
          title: 'Remote reliability & escalation',
          definition:
            'Will this person deliver and communicate on a flexible remote schedule?',
          anchors: [
            'No concrete habits; vague “I just get it done”.',
            'Mentions tools but no cadence for updates, blockers, or deadlines.',
            'Describes async updates, deadline ownership, and when/how they escalate blockers.',
            'Also gives a real example of early escalation that protected a delivery.',
          ],
          evidencePrompt: 'Quote their remote habit or escalation example.',
          hardFail:
            'States they go silent for days when stuck, or refuses structured reporting/tools.',
        }),

        ...scoreBlock({
          id: 'A5',
          title: 'Feedback & collaboration',
          definition:
            'How do they respond to disagreement in code review or product direction?',
          anchors: [
            'Defensive; dismisses review; blames reviewers or “politics”.',
            'Says they accept feedback but cannot give a real example.',
            'Gives a real example of changing work after feedback or resolving disagreement with evidence.',
            'Separates taste from correctness; documents decisions; mentors or teaches calmly.',
          ],
          evidencePrompt: 'Summarise the feedback example they gave (or note that they had none).',
          hardFail: null,
        }),

        // B. Decision gates
        heading('B. Hard gates (check any that apply)', HeadingLevel.HEADING_1),
        p('If any box below is checked, Recommendation must be No or Strong No (unless you are running a documented second look for a non-integrity issue).', {
          size: 18,
          spacingAfter: 100,
        }),
        check('Integrity: Misrepresented experience, role, or authorship after probing.'),
        check('Security (BE or FE handling auth): Would store passwords/tokens unsafely or skip auth checks “for speed” with no concern.'),
        check('Unreliability: Explicitly rejects deadlines, async updates, or working in AfriVate Portal / Slack-equivalent discipline.'),
        check('Unable to explain own submitted project after two focused probes.'),
        check('Hostile / disrespectful communication during the interview.'),
        fieldLine('If any gate checked, write the exact behaviour:', '_______________________________________________'),

        // C. Role technical
        heading('C. Role-specific technical checks', HeadingLevel.HEADING_1),
        p('Mark each item Observed / Partial / Missing. Then assign the technical score using the conversion table. Do not score the unused role.', {
          size: 18,
          spacingAfter: 120,
        }),

        heading('C1. Front-End only', HeadingLevel.HEADING_2),
        feTable(),
        p('FE technical score conversion:', { bold: true, size: 18, spacingBefore: 80, spacingAfter: 60 }),
        p('4 = Observed on ≥5 items, including API states + Git, and no Missing on hooks/state or TypeScript.', {
          size: 17,
          spacingAfter: 40,
        }),
        p('3 = Observed on ≥4 items; at most one Missing among core items (hooks/state, API states, TypeScript, responsive/a11y, Git).', {
          size: 17,
          spacingAfter: 40,
        }),
        p('2 = Observed on 2–3 items, or Partial on most cores.', { size: 17, spacingAfter: 40 }),
        p('1 = Observed on ≤1 core item, or cannot explain a simple React data-flow when asked.', {
          size: 17,
          spacingAfter: 60,
        }),
        rich(
          [
            { text: 'FE Technical depth score:  ', bold: true },
            { text: '☐ 1   ☐ 2   ☐ 3   ☐ 4', size: 20 },
          ],
          { spacingAfter: 60 },
        ),
        mustNote('Cite the strongest FE answer and the weakest FE gap.'),
        p('___________________________________________________________________________', {
          size: 18,
          color: MUTED,
          spacingAfter: 160,
        }),

        heading('C2. Back-End only', HeadingLevel.HEADING_2),
        beTable(),
        p('BE technical score conversion:', { bold: true, size: 18, spacingBefore: 80, spacingAfter: 60 }),
        p('4 = Observed on ≥5 items, including AuthZ + Security + Postgres, and no Missing on API contract.', {
          size: 17,
          spacingAfter: 40,
        }),
        p('3 = Observed on ≥4 items; at most one Missing among core items (API contract, Postgres, AuthN/AuthZ, Security, Debugging).', {
          size: 17,
          spacingAfter: 40,
        }),
        p('2 = Observed on 2–3 items, or Partial on most cores.', { size: 17, spacingAfter: 40 }),
        p('1 = Observed on ≤1 core item, or treats security as optional.', {
          size: 17,
          spacingAfter: 60,
        }),
        rich(
          [
            { text: 'BE Technical depth score:  ', bold: true },
            { text: '☐ 1   ☐ 2   ☐ 3   ☐ 4', size: 20 },
          ],
          { spacingAfter: 60 },
        ),
        mustNote('Cite the strongest BE answer and the weakest BE gap.'),
        p('___________________________________________________________________________', {
          size: 18,
          color: MUTED,
          spacingAfter: 160,
        }),

        // D. Summary
        heading('D. Score summary', HeadingLevel.HEADING_1),
        summaryTable(),
        p('', { spacingAfter: 80 }),
        rich(
          [
            { text: 'Confidence in this scorecard:  ', bold: true },
            { text: '☐ High (enough signal)   ☐ Medium   ☐ Low (too little evidence — do not Advance)', size: 18 },
          ],
          { spacingAfter: 160 },
        ),

        heading('E. Recommendation (forced choice)', HeadingLevel.HEADING_1),
        p('Choose exactly one. Follow the rule that matches your scores.', {
          size: 18,
          spacingAfter: 80,
        }),
        check('Strong Yes — All scored competencies ≥ 3, technical ≥ 3, no hard fails/gates, Confidence High, and at least two 4s.'),
        check('Yes — All scored competencies ≥ 3, technical ≥ 3, no hard fails/gates, Confidence Medium or High.'),
        check('Hold / second look — Exactly one competency is a 2; name the gap and the single verification step below. No hard fails.'),
        check('No — Two or more competencies ≤ 2, or technical ≤ 2, or Confidence Low without a planned second look.'),
        check('Strong No — Any hard fail / hard gate, or integrity concern.'),
        p('', { spacingAfter: 60 }),
        fieldLine('If Hold: exact gap to verify'),
        fieldLine('If Hold: exact next step (e.g. second call on auth only / take-home X)'),
        fieldLine('If No / Strong No: primary reason (one sentence)'),
        p('', { spacingAfter: 80 }),
        p('One-sentence hiring summary (required):', { bold: true, size: 18, spacingAfter: 40 }),
        p('___________________________________________________________________________', {
          size: 18,
          color: MUTED,
          spacingAfter: 40,
        }),
        p('___________________________________________________________________________', {
          size: 18,
          color: MUTED,
          spacingAfter: 160,
        }),

        heading('F. Interviewer attestation', HeadingLevel.HEADING_1),
        check('I scored using the anchors above and did not inflate scores to be “nice”.'),
        check('I did not discuss my scores with other interviewers before completing this form.'),
        fieldLine('Interviewer name'),
        fieldLine('Signature / date'),
        p('', { spacingAfter: 120 }),
        p('Document code: AFRI-DISC-01 · Pair with AfriVate Developer Interview Kit (questions). Internal use only.', {
          size: 16,
          color: MUTED,
          spacingAfter: 40,
        }),
      ],
    },
  ],
})

function feTable() {
  const w = [5040, 1260, 1260, 1260, 1260]
  const rows = [
    ['Observable check (must be demonstrated in answers or screen-share)', 'Observed', 'Partial', 'Missing', 'N/A'],
    ['Explains when local state vs lifted/shared state is appropriate', '☐', '☐', '☐', '☐'],
    ['Handles API loading, error, empty, and auth-failure UI states', '☐', '☐', '☐', '☐'],
    ['Uses TypeScript practically (props/API types; avoids casual any)', '☐', '☐', '☐', '☐'],
    ['Responsive layout + at least one accessibility practice (labels/focus/semantics)', '☐', '☐', '☐', '☐'],
    ['Describes real Git branch → PR → review → conflict handling', '☐', '☐', '☐', '☐'],
    ['Optional: client vs server state, performance fix, or live code walkthrough', '☐', '☐', '☐', '☐'],
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
            boldHeader: idx === 0,
            center: i > 0,
          }),
        ),
      }),
    ),
  })
}

function beTable() {
  const w = [5040, 1260, 1260, 1260, 1260]
  const rows = [
    ['Observable check (must be demonstrated in answers or screen-share)', 'Observed', 'Partial', 'Missing', 'N/A'],
    ['Defines a clear API contract (status codes, errors, auth, shape for FE)', '☐', '☐', '☐', '☐'],
    ['Models relational data; knows when transactions/migrations matter', '☐', '☐', '☐', '☐'],
    ['Separates authentication vs authorisation; protects an admin route correctly', '☐', '☐', '☐', '☐'],
    ['Names real API abuses + concrete mitigations (validation, hashing, params, secrets)', '☐', '☐', '☐', '☐'],
    ['Describes a structured production 500s / incident debugging approach', '☐', '☐', '☐', '☐'],
    ['Optional: indexes, jobs/webhooks, or live route/schema walkthrough', '☐', '☐', '☐', '☐'],
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
            boldHeader: idx === 0,
            center: i > 0,
          }),
        ),
      }),
    ),
  })
}

function summaryTable() {
  const w = [4200, 1480, 4400]
  const rows = [
    ['Competency', 'Score', 'Hard fail?'],
    ['A1 Ownership of contribution', '☐1 ☐2 ☐3 ☐4', '☐ Yes ☐ No'],
    ['A2 Problem-solving process', '☐1 ☐2 ☐3 ☐4', '☐ Yes ☐ No'],
    ['A3 Communication clarity', '☐1 ☐2 ☐3 ☐4', '☐ Yes ☐ No'],
    ['A4 Remote reliability & escalation', '☐1 ☐2 ☐3 ☐4', '☐ Yes ☐ No'],
    ['A5 Feedback & collaboration', '☐1 ☐2 ☐3 ☐4', '☐ Yes ☐ No'],
    ['C Technical depth (FE or BE)', '☐1 ☐2 ☐3 ☐4', '☐ Yes ☐ No'],
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
            boldHeader: idx === 0,
            center: i > 0,
          }),
        ),
      }),
    ),
  })
}

const buffer = await Packer.toBuffer(doc)
await writeFile(outPath, buffer)
console.log('Wrote', outPath)

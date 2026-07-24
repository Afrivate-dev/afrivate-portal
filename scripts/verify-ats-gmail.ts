/**
 * Automated verification for ATS scoring + Gmail sync helpers (no live Google login).
 * Run: npx tsx scripts/verify-ats-gmail.ts
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  defaultCriteriaForProfile,
  detectSourceFromEmail,
  isPlausiblePersonName,
  screenApplicationText,
  splitApplicationBatch,
} from '../src/utils/atsScoring.ts'
import {
  candidateGmailUrl,
  decodeBodyData,
  defaultGmailAtsQuery,
  fetchGmailApplications,
  isValidGoogleClientId,
  parseGmailApiMessage,
  GMAIL_ATS_LOOKBACK_DAYS,
} from '../src/lib/gmailAtsSync.ts'

function readEnvValue(key: string): string | undefined {
  for (const file of ['.env.local', '.env']) {
    const path = resolve(file)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      if (trimmed.slice(0, eq).trim() !== key) continue
      return trimmed.slice(eq + 1).trim()
    }
  }
  return undefined
}

let failed = 0
function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`  ✓ ${name}`))
    .catch((err: unknown) => {
      failed += 1
      console.error(`  ✗ ${name}`)
      console.error(err)
    })
}

console.log('ATS / Gmail verification\n')

await check('Local .env Google Client ID is well-formed', () => {
  const id = readEnvValue('VITE_GOOGLE_CLIENT_ID')
  assert.ok(id, 'VITE_GOOGLE_CLIENT_ID missing from .env')
  assert.ok(isValidGoogleClientId(id), `Malformed client id: ${id}`)
})

await check('Google client ID validation', () => {
  assert.equal(isValidGoogleClientId('749224478354-abc.apps.googleusercontent.com'), true)
  assert.equal(
    isValidGoogleClientId('749224478354-abc.apps.googleusercontent.com.apps.googleusercontent.com'),
    false,
  )
  assert.equal(isValidGoogleClientId(''), false)
  assert.equal(isValidGoogleClientId(undefined), false)
})

await check('Gmail query includes lookback + inbox scope', () => {
  const q = defaultGmailAtsQuery()
  assert.match(q, new RegExp(`newer_than:${GMAIL_ATS_LOOKBACK_DAYS}d`))
  assert.match(q, /in:inbox/i)
})

await check('URL-safe base64 body decode', () => {
  const text = 'Hello React portfolio'
  const b64 = Buffer.from(text, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  assert.equal(decodeBodyData(b64), text)
})

await check('Candidate Gmail / mailto links', () => {
  const thread = candidateGmailUrl({ gmailThreadId: 'thread123', gmailMessageId: 'msg456' })
  assert.ok(thread?.includes('mail.google.com'))
  assert.ok(thread?.includes('thread123') || thread?.includes('msg456'))
  const mailto = candidateGmailUrl({ email: 'ada@example.com' })
  assert.equal(mailto, 'mailto:ada@example.com')
  assert.equal(candidateGmailUrl({}), null)
})

await check('Parse multipart Gmail message + attachment names', () => {
  const plain = Buffer.from(
    'Dear Afrivate,\nI am writing to apply. React TypeScript GitHub https://github.com/jane\nPortfolio https://jane.vercel.app',
    'utf8',
  ).toString('base64')
  const parsed = parseGmailApiMessage({
    id: 'm1',
    threadId: 't1',
    snippet: 'I am writing to apply',
    payload: {
      mimeType: 'multipart/mixed',
      headers: [
        { name: 'Subject', value: 'APPLICATION FOR FRONT-END DEVELOPER — Jane Doe' },
        { name: 'From', value: 'Jane Doe <jane@email.com>' },
        { name: 'Date', value: 'Fri, 24 Jul 2026 10:00:00 +0000' },
      ],
      parts: [
        { mimeType: 'text/plain', body: { data: plain } },
        {
          mimeType: 'application/pdf',
          filename: 'Jane_Doe_CV.pdf',
          body: { attachmentId: 'att1', size: 12000 },
        },
      ],
    },
  })
  assert.equal(parsed.id, 'm1')
  assert.match(parsed.bodyText, /jane@email.com/i)
  assert.match(parsed.bodyText, /React/)
  assert.match(parsed.bodyText, /Jane_Doe_CV\.pdf/)
  assert.deepEqual(parsed.attachmentNames, ['Jane_Doe_CV.pdf'])
})

await check('Attachment-only email still produces scorable text', () => {
  const parsed = parseGmailApiMessage({
    id: 'm2',
    threadId: 't2',
    snippet: 'Please find my CV attached',
    payload: {
      headers: [
        { name: 'Subject', value: 'APPLICATION FOR FRONT-END DEVELOPER — Sam Okoro' },
        { name: 'From', value: 'Sam Okoro <sam@mail.com>' },
      ],
      parts: [
        {
          mimeType: 'application/pdf',
          filename: 'Sam_Okoro_Resume.pdf',
          body: { attachmentId: 'x' },
        },
      ],
    },
  })
  assert.match(parsed.bodyText, /APPLICATION FOR FRONT-END/)
  assert.match(parsed.bodyText, /Sam_Okoro_Resume\.pdf/)
  assert.match(parsed.bodyText, /Please find my CV attached/)
})

await check('Strong frontend application ranks strong/viable', () => {
  const raw = `Subject: APPLICATION FOR FRONT-END DEVELOPER — Ada Lovelace
From: Ada Lovelace <ada@example.com>

Dear Afrivate hiring team,
I am writing to apply for the Front-End Developer role. I build React and TypeScript apps with Vite, Tailwind, and Git/GitHub.
GitHub: https://github.com/ada
Portfolio: https://ada.vercel.app
I use Jest and Testing Library. Cover letter included here with my experience.`
  const result = screenApplicationText(raw, 'frontend', defaultCriteriaForProfile('frontend'))
  assert.equal(result.name, 'Ada Lovelace')
  assert.equal(result.email, 'ada@example.com')
  assert.ok(result.githubUrl?.includes('github.com/ada'))
  assert.ok(result.portfolioUrl)
  assert.ok(result.coverLetter)
  assert.ok(result.score >= 55, `expected score >= 55, got ${result.score}`)
  assert.ok(
    result.recommendation === 'strong' || result.recommendation === 'viable',
    `got ${result.recommendation}`,
  )
})

await check('Rejects junk names like JavaScript / Yours sincerely', () => {
  assert.equal(isPlausiblePersonName('JavaScript'), false)
  assert.equal(isPlausiblePersonName('#4JavaScript'), false)
  assert.equal(isPlausiblePersonName('Yours sincerely'), false)
  assert.equal(isPlausiblePersonName('Yours sincerely,'), false)
  assert.equal(isPlausiblePersonName('Ada Lovelace'), true)

  const fromSignature = `Subject: APPLICATION FOR FRONT-END DEVELOPER
From: noreply@mail.com

Dear team,
Please find my application for the Front-End role. I use React and TypeScript.

Yours sincerely,
Chioma Adebayo`
  const signed = screenApplicationText(fromSignature, 'frontend')
  assert.equal(signed.name, 'Chioma Adebayo')

  const junkSubject = `Subject: APPLICATION FOR FRONT-END DEVELOPER — JavaScript
From: applicant@mail.com

Dear team,
I am applying. React TypeScript GitHub https://github.com/x Portfolio https://x.dev
Yours sincerely,
JavaScript`
  const junk = screenApplicationText(junkSubject, 'frontend')
  assert.notEqual(junk.name.toLowerCase(), 'javascript')
  assert.notEqual(junk.name.toLowerCase(), 'yours sincerely')
})

await check('Weak application ranks weak/reject', () => {
  const raw = `Subject: hi
From: someone@mail.com
I want a job please.`
  const result = screenApplicationText(raw, 'frontend')
  assert.ok(result.score < 55, `expected low score, got ${result.score}`)
  assert.ok(result.recommendation === 'weak' || result.recommendation === 'reject')
})

await check('Batch split and source detection', () => {
  const batch = splitApplicationBatch(
    `Subject: A\n\nReact developer cover letter with enough text here to pass the filter length requirement for split.\n\n---\n\nSubject: B\n\nAnother application with React TypeScript and more than forty characters of content.`,
  )
  assert.ok(batch.length >= 2)
  assert.equal(detectSourceFromEmail('Indeed <noreply@indeedemail.com>', 'New application'), 'indeed')
  assert.equal(detectSourceFromEmail('Ada <ada@gmail.com>', 'APPLICATION'), 'gmail')
})

await check('fetchGmailApplications paginates beyond 50', async () => {
  const plain = Buffer.from(
    'Cover letter. React TypeScript GitHub https://github.com/mock Portfolio https://mock.vercel.app',
    'utf8',
  ).toString('base64')

  let listCalls = 0
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input)
    if (url.includes('users/me/messages') && !url.includes('/messages/msg')) {
      listCalls += 1
      if (listCalls === 1) {
        return new Response(
          JSON.stringify({
            messages: [{ id: 'msg1', threadId: 'th1' }],
            nextPageToken: 'page2',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return new Response(JSON.stringify({ messages: [{ id: 'msg2', threadId: 'th2' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (url.includes('/messages/msg1') || url.includes('/messages/msg2')) {
      const id = url.includes('msg2') ? 'msg2' : 'msg1'
      return new Response(
        JSON.stringify({
          id,
          threadId: id === 'msg2' ? 'th2' : 'th1',
          snippet: 'Cover letter',
          payload: {
            headers: [
              { name: 'Subject', value: 'APPLICATION FOR FRONT-END DEVELOPER — Mock User' },
              { name: 'From', value: 'Mock User <mock@example.com>' },
              { name: 'Date', value: 'Fri, 24 Jul 2026 12:00:00 +0000' },
            ],
            parts: [{ mimeType: 'text/plain', body: { data: plain } }],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return new Response('not found', { status: 404 })
  }

  const messages = await fetchGmailApplications({
    accessToken: 'test-token',
    fetchImpl,
    extractResumes: false,
  })
  assert.equal(listCalls, 2)
  assert.equal(messages.length, 2)
  assert.equal(messages[0]?.id, 'msg1')
  assert.equal(messages[1]?.id, 'msg2')
  assert.match(messages[0]?.bodyText ?? '', /mock@example.com/i)

  const scored = screenApplicationText(messages[0]!.bodyText, 'frontend')
  assert.ok(scored.score >= 40)
  assert.ok(scored.email === 'mock@example.com')
})

await check('Personal info extraction + Gmail thread URL', async () => {
  const { parseFromAddress } = await import('../src/utils/atsScoring.ts')
  const { gmailThreadUrl, HR_MAILBOX } = await import('../src/lib/gmailAtsSync.ts')

  const from = parseFromAddress('Ada Lovelace <ada@example.com>')
  assert.equal(from.name, 'Ada Lovelace')
  assert.equal(from.email, 'ada@example.com')

  const raw = `Subject: APPLICATION FOR FRONT-END DEVELOPER — Ada Lovelace
From: Ada Lovelace <ada@example.com>
Phone: +234 801 234 5678
Location: Lagos, Nigeria
LinkedIn: https://linkedin.com/in/ada-lovelace
Dear Afrivate, I am writing to apply. React TypeScript 3 years of experience.
GitHub: https://github.com/ada Portfolio: https://ada.vercel.app`

  const scored = screenApplicationText(raw, 'frontend')
  assert.equal(scored.name, 'Ada Lovelace')
  assert.equal(scored.email, 'ada@example.com')
  assert.ok(scored.phone?.includes('801'))
  assert.ok(/Lagos/i.test(scored.location ?? ''))
  assert.ok(scored.linkedinUrl?.includes('linkedin.com/in/ada'))
  assert.match(scored.summary, /Ada Lovelace/)

  const url = gmailThreadUrl('thread123')
  assert.match(url, /mail\.google\.com/)
  assert.match(url, /thread123/)
  assert.ok(url.includes(encodeURIComponent(HR_MAILBOX)))
})

await check('Resume attachment text is downloaded, extracted, and scored', async () => {
  const {
    enrichMessageWithResumeText,
    parseGmailApiMessage,
  } = await import('../src/lib/gmailAtsSync.ts')
  const { classifyResumeFile, isLikelyResumeAttachment } = await import('../src/lib/atsResumeExtract.ts')

  assert.equal(classifyResumeFile('Ada_CV.pdf'), 'pdf')
  assert.equal(classifyResumeFile('Ada.docx'), 'docx')
  assert.equal(classifyResumeFile('scan.png'), 'image')
  assert.equal(isLikelyResumeAttachment('photo.png', 'image/png'), true)
  assert.equal(isLikelyResumeAttachment('Ada_CV.pdf'), true)

  const msg = {
    id: 'm-cv',
    threadId: 't',
    snippet: 'Please find attached',
    payload: {
      headers: [
        { name: 'Subject', value: 'APPLICATION FOR FRONT-END DEVELOPER — Ada' },
        { name: 'From', value: 'Ada <ada@x.com>' },
      ],
      parts: [
        {
          mimeType: 'text/plain',
          body: {
            data: Buffer.from('Please find my CV attached.', 'utf8').toString('base64'),
          },
        },
        {
          filename: 'Ada_Lovelace_CV.pdf',
          mimeType: 'application/pdf',
          body: { attachmentId: 'att-1', size: 1000 },
        },
      ],
    },
  }
  const parsed = parseGmailApiMessage(msg)
  const enriched = await enrichMessageWithResumeText(msg, parsed, {
    accessToken: 'tok',
    fetchImpl: async (input) => {
      const url = String(input)
      if (url.includes('/attachments/att-1')) {
        const payload = Buffer.from('React TypeScript GitHub https://github.com/ada Portfolio https://ada.vercel.app', 'utf8')
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
        return new Response(JSON.stringify({ data: payload }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response('no', { status: 404 })
    },
    extractFn: async (_data, filename) => ({
      kind: 'pdf',
      filename,
      text: 'React TypeScript Vite Tailwind GitHub https://github.com/ada Portfolio https://ada.vercel.app Jest Testing Library',
    }),
  })

  assert.ok(enriched.resumeFilesScanned?.includes('Ada_Lovelace_CV.pdf'))
  assert.match(enriched.bodyText, /--- Resume: Ada_Lovelace_CV\.pdf ---/)
  assert.match(enriched.bodyText, /React TypeScript/)

  const scored = screenApplicationText(enriched.bodyText, 'frontend')
  assert.ok((scored.breakdown.resume_file ?? 0) > 0, 'resume_file criterion should score')
  assert.ok(scored.matched.some((m) => /resume|cv/i.test(m)))
  assert.ok(scored.score >= 55, `expected stronger score with CV text, got ${scored.score}`)
})

await check('Applications are routed to Front-End / Back-End / Designer roles', async () => {
  const { detectAtsRoleFromApplication, labelForAtsRoleProfile, ATS_STANDARD_ROLES } = await import(
    '../src/utils/atsScoring.ts'
  )
  assert.equal(ATS_STANDARD_ROLES[0]?.title, 'Front-End Developer')
  assert.equal(
    detectAtsRoleFromApplication(
      'Subject: APPLICATION FOR FRONT-END DEVELOPER — Jane\nFrom: Jane <j@x.com>\nReact TypeScript',
    ),
    'frontend',
  )
  assert.equal(
    detectAtsRoleFromApplication(
      'Subject: APPLICATION FOR BACK-END DEVELOPER — Sam\nNestJS PostgreSQL Node.js',
    ),
    'backend',
  )
  assert.equal(
    detectAtsRoleFromApplication(
      'Subject: APPLICATION FOR GRAPHIC DESIGNER — Pat\nPhotoshop Illustrator Figma',
    ),
    'designer',
  )
  assert.equal(labelForAtsRoleProfile('frontend'), 'Front-End Developer')
})

await check('Top-10 ranking explanation includes score signals and gaps', async () => {
  const { explainCandidateRanking, defaultCriteriaForProfile } = await import('../src/utils/atsScoring.ts')
  const criteria = defaultCriteriaForProfile('frontend')
  const peers = [
    {
      id: '1',
      requisitionId: 'j',
      name: 'Ada',
      stage: 'screen' as const,
      score: 92,
      recommendation: 'strong' as const,
      scoreBreakdown: { react: 20, typescript: 12, github_url: 8 },
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      requisitionId: 'j',
      name: 'Sam',
      stage: 'screen' as const,
      score: 80,
      recommendation: 'viable' as const,
      scoreBreakdown: { react: 20, portfolio: 10 },
      updatedAt: new Date().toISOString(),
    },
  ]
  const reason = explainCandidateRanking(peers[0]!, 1, peers, criteria)
  assert.match(reason, /#1/)
  assert.match(reason, /92/)
  assert.match(reason, /React/)
  assert.match(reason, /ahead of Sam|#2/)
})

await check('Editable criteria change ranking outcome', () => {
  const raw = `Subject: APPLICATION
From: Dev <dev@x.com>
Dear Afrivate, I know Vue and Angular only. No React. https://github.com/dev`

  const frontend = defaultCriteriaForProfile('frontend')
  const withReactRequired = screenApplicationText(raw, 'frontend', frontend)
  assert.ok(withReactRequired.missing.some((m) => /react/i.test(m)) || withReactRequired.score < 75)

  const relaxed = {
    ...frontend,
    criteria: frontend.criteria.map((c) =>
      c.id === 'react' ? { ...c, mustHave: false, weight: 0, enabled: false } : c,
    ),
  }
  const after = screenApplicationText(raw, 'frontend', relaxed)
  assert.ok(after.score >= 0)
  assert.ok(!after.missing.some((m) => m === 'React'))
})

console.log('')
if (failed) {
  console.error(`FAILED: ${failed} check(s)`)
  process.exit(1)
}
console.log('All ATS/Gmail checks passed.')
console.log('Note: live Gmail OAuth still requires signing in as afrivatehr@gmail.com in the browser.')

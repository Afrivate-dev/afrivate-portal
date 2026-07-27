/**
 * Extensive ATS functionality checks (attachments, admin access, scoring, sync pipeline).
 * Run: npx tsx scripts/verify-ats-functionality.ts
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  isMissingAttachmentsColumnError,
  isMissingCandidateColumnError,
  jobCandidatePatchToRow,
  jobCandidateToRow,
  rowToJobCandidate,
  stripOptionalCandidateColumns,
} from '../src/lib/supabase/hrDataset.ts'
import {
  ATS_STANDARD_ROLES,
  defaultCriteriaForProfile,
  detectAtsRoleFromApplication,
  labelForAtsRoleProfile,
  screenApplicationText,
} from '../src/utils/atsScoring.ts'
import {
  classifyAtsAttachmentKind,
  enrichMessageWithResumeText,
  encodeGmailExternalId,
  fetchGmailApplications,
  parseGmailApiMessage,
  type GmailApiMessage,
} from '../src/lib/gmailAtsSync.ts'
import type { JobCandidate } from '../src/types/hr.ts'
import type { Role } from '../src/types/index.ts'

let failed = 0
async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
  } catch (err) {
    failed += 1
    console.error(`  ✗ ${name}`)
    console.error(err)
  }
}

/** Mirrors src/utils/helpers.ts — avoids @/ path alias issues under tsx. */
function isHR(role: Role) {
  return role === 'hr' || role === 'admin'
}
function isAdmin(role: Role) {
  return role === 'admin'
}

/** Mirrors detectDocumentPreviewKind without pulling mediaUpload (@/ aliases). */
function detectPreviewKind(fileName: string): 'pdf' | 'docx' | 'image' | 'download' {
  const ext = (fileName.split('.').pop() || '').toLowerCase()
  if (ext === 'pdf') return 'pdf'
  if (ext === 'docx') return 'docx'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image'
  return 'download'
}

function sampleCandidate(overrides: Partial<JobCandidate> = {}): JobCandidate {
  return {
    id: 'cand_1',
    requisitionId: 'job_fe',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    stage: 'screen',
    updatedAt: new Date().toISOString(),
    attachments: [
      {
        id: 'att_1',
        filename: 'Ada_CV.pdf',
        mimeType: 'application/pdf',
        storagePath: 'ats/11111111-1111-1111-1111-111111111111/msg-Ada_CV.pdf',
        kind: 'resume',
        size: 12000,
      },
      {
        id: 'att_2',
        filename: 'Ada_Cover.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        storagePath: 'ats/11111111-1111-1111-1111-111111111111/msg-Ada_Cover.docx',
        kind: 'cover_letter',
        size: 8000,
      },
    ],
    ...overrides,
  }
}

console.log('ATS functionality suite\n')

await check('Duplicate role jobs aggregate candidates onto the tab with the most people', async () => {
  const { openJobsMatchingAtsProfile, pickCanonicalAtsJob } = await import('../src/utils/atsJobRoles.ts')
  const jobs = [
    {
      id: 'job_new_empty',
      title: 'Front-End Developer',
      department: 'Tech',
      status: 'open' as const,
      createdAt: '2026-07-25T00:00:00.000Z',
    },
    {
      id: 'job_old_full',
      title: 'Front-End Developer',
      department: 'Tech',
      status: 'open' as const,
      createdAt: '2026-07-01T00:00:00.000Z',
    },
  ]
  const candidates = Array.from({ length: 83 }, (_, i) => ({
    id: `c${i}`,
    requisitionId: 'job_old_full',
    name: `Person ${i}`,
    stage: 'applied' as const,
    updatedAt: '2026-07-25T00:00:00.000Z',
  }))
  candidates.push({
    id: 'c_new',
    requisitionId: 'job_new_empty',
    name: 'Only One',
    stage: 'applied',
    updatedAt: '2026-07-25T00:00:00.000Z',
  })
  const matches = openJobsMatchingAtsProfile(jobs, 'frontend')
  assert.equal(matches.length, 2)
  const canonical = pickCanonicalAtsJob(matches, candidates)
  assert.equal(canonical?.id, 'job_old_full')
  const ids = new Set(matches.map((j) => j.id))
  assert.equal(candidates.filter((c) => ids.has(c.requisitionId)).length, 84)
})

await check('HR and Admin roles can access recruitment (isHR includes both)', () => {
  assert.equal(isHR('hr'), true)
  assert.equal(isHR('admin'), true)
  assert.equal(isAdmin('admin'), true)
  assert.equal(isAdmin('hr'), false)
  assert.equal(isHR('staff'), false)
  assert.equal(isHR('team_lead'), false)
})

await check('AdminPanel source exposes Recruitment for hr/admin and deep-link section', () => {
  const src = readFileSync(resolve('src/pages/AdminPanel.tsx'), 'utf8')
  assert.match(src, /canManageRecruitment/)
  assert.match(src, /isHR\(user\) \|\| isAdmin\(user\)/)
  assert.match(src, /id: 'recruitment'/)
  assert.match(src, /sectionFromUrl|searchParams\.get\('section'\)/)
  assert.match(src, /RecruitmentAtsSection/)
  // Recruitment appears before Users in the tab builder
  const rec = src.indexOf("id: 'recruitment'")
  const users = src.indexOf("id: 'users'")
  assert.ok(rec > 0 && users > 0 && rec < users, 'Recruitment tab should be listed before Users')
})

await check('App AdminRoute allows both hr and admin via isHR', () => {
  const src = readFileSync(resolve('src/App.tsx'), 'utf8')
  assert.match(src, /function AdminRoute/)
  assert.match(src, /if \(!isHR\(user\)\)/)
  const helpers = readFileSync(resolve('src/utils/helpers.ts'), 'utf8')
  assert.match(helpers, /\['hr', 'admin'\]/)
})

await check('Attachment metadata survives identity-column strip (regression)', () => {
  const row = jobCandidateToRow(sampleCandidate())
  assert.ok(Array.isArray(row.attachments))
  assert.equal((row.attachments as unknown[]).length, 2)

  const stripped = stripOptionalCandidateColumns(row)
  assert.ok('attachments' in stripped, 'attachments must NOT be stripped by default')
  assert.equal((stripped.attachments as unknown[]).length, 2)
  assert.equal(stripped.phone, undefined)
  assert.equal(stripped.gmail_message_id, undefined)

  const fullyStripped = stripOptionalCandidateColumns(row, { stripAttachments: true })
  assert.equal(fullyStripped.attachments, undefined)
})

await check('Attachments can be omitted from row when column missing, without dropping identity forever', () => {
  const withAtt = jobCandidateToRow(sampleCandidate(), { includeAttachments: true })
  assert.ok('attachments' in withAtt)
  const withoutAtt = jobCandidateToRow(sampleCandidate(), {
    includeIdentity: true,
    includeAttachments: false,
  })
  assert.equal('attachments' in withoutAtt, false)
  assert.ok('phone' in withoutAtt || withoutAtt.phone === null || withoutAtt.phone === undefined)
})

await check('Patch updates persist attachments without wiping other fields', () => {
  const patch = jobCandidatePatchToRow({
    attachments: sampleCandidate().attachments,
    updatedAt: '2026-07-25T00:00:00.000Z',
  })
  assert.ok(Array.isArray(patch.attachments))
  assert.equal(patch.name, undefined)
  assert.equal(patch.updated_at, '2026-07-25T00:00:00.000Z')

  const noAtt = jobCandidatePatchToRow(
    { attachments: sampleCandidate().attachments, stage: 'interview' },
    { includeAttachments: false },
  )
  assert.equal('attachments' in noAtt, false)
  assert.equal(noAtt.stage, 'interview')
})

await check('rowToJobCandidate round-trips attachment storagePath for preview', () => {
  const c = sampleCandidate()
  const row = jobCandidateToRow(c)
  const back = rowToJobCandidate(row)
  assert.equal(back.attachments?.length, 2)
  assert.ok(back.attachments?.[0]?.storagePath?.startsWith('ats/'))
  assert.equal(back.attachments?.[0]?.filename, 'Ada_CV.pdf')
  assert.equal(back.attachments?.[1]?.kind, 'cover_letter')
})

await check('Missing-column error classifiers separate attachments vs identity', () => {
  assert.equal(
    isMissingAttachmentsColumnError({
      message: 'Could not find the \'attachments\' column of \'portal_job_candidates\' in the schema cache',
    }),
    true,
  )
  assert.equal(
    isMissingCandidateColumnError({ message: 'column portal_job_candidates.gmail_message_id does not exist' }),
    true,
  )
  assert.equal(isMissingCandidateColumnError({ message: 'permission denied' }), false)
})

await check('Preview kind detection for resume/cover letter files', () => {
  assert.equal(detectPreviewKind('Ada_CV.pdf'), 'pdf')
  assert.equal(detectPreviewKind('cover.docx'), 'docx')
  assert.equal(detectPreviewKind('shot.png'), 'image')
  assert.equal(detectPreviewKind('legacy.doc'), 'download')
})

await check('Attachment kind classifier', () => {
  assert.equal(classifyAtsAttachmentKind('Jane_Resume.pdf'), 'resume')
  assert.equal(classifyAtsAttachmentKind('CV_Ogochukwu.pdf'), 'resume')
  assert.equal(classifyAtsAttachmentKind('Cover_Letter.docx'), 'cover_letter')
  assert.equal(classifyAtsAttachmentKind('motivation.pdf'), 'cover_letter')
  assert.equal(classifyAtsAttachmentKind('portfolio.zip'), 'other')
})

await check('Standard roles include Full-Stack and labels are accurate', () => {
  const profiles = ATS_STANDARD_ROLES.map((r) => r.profile)
  assert.deepEqual(profiles, ['frontend', 'backend', 'fullstack', 'designer'])
  assert.equal(labelForAtsRoleProfile('fullstack'), 'Full-Stack Developer')
  assert.equal(labelForAtsRoleProfile('frontend'), 'Front-End Developer')
  assert.equal(labelForAtsRoleProfile('backend'), 'Back-End Developer')
  assert.equal(labelForAtsRoleProfile('designer'), 'Graphic Designer')
})

await check('Role routing accuracy across FE / BE / Full-Stack / Designer', () => {
  assert.equal(
    detectAtsRoleFromApplication(
      'Subject: APPLICATION FOR FRONT-END DEVELOPER — Jane\nReact TypeScript Tailwind',
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
      'Subject: APPLICATION FOR FULL-STACK DEVELOPER — Pat\nReact and NestJS',
    ),
    'fullstack',
  )
  assert.equal(
    detectAtsRoleFromApplication(
      'Subject: Software engineer\nReact Next.js Vue frontend plus Node.js Express PostgreSQL backend APIs',
    ),
    'fullstack',
  )
  assert.equal(
    detectAtsRoleFromApplication(
      'Subject: APPLICATION FOR GRAPHIC DESIGNER — Kim\nPhotoshop Illustrator Figma Behance',
    ),
    'designer',
  )
})

await check('Full-Stack scoring uses fullstack criteria and rewards both sides', () => {
  const raw = `Subject: APPLICATION FOR FULL-STACK DEVELOPER — Pat Okon
From: Pat Okon <pat@example.com>
I am a full-stack developer. React Next.js TypeScript frontend and NestJS Express PostgreSQL Node.js backend APIs.
GitHub: https://github.com/pat Portfolio: https://pat.dev
3 years of experience. Collaboration and ownership. Remote Nigeria.
--- Resume: pat.pdf ---`
  const scored = screenApplicationText(raw, 'fullstack', defaultCriteriaForProfile('fullstack'))
  assert.equal(scored.name, 'Pat Okon')
  assert.ok(scored.score >= 55, `expected fullstack score >= 55, got ${scored.score}`)
  assert.ok(['strong', 'viable', 'weak'].includes(scored.recommendation))
})

await check('Re-sync backfill condition: empty storagePath or missing attachments needs files', () => {
  const needsFiles = (
    attachmentFileCount: number,
    existing?: { attachments?: Array<{ storagePath?: string }> },
  ) =>
    attachmentFileCount > 0 &&
    (!(existing?.attachments?.length) || existing.attachments.some((a) => !a.storagePath))

  assert.equal(needsFiles(2, undefined), true)
  assert.equal(needsFiles(2, { attachments: [] }), true)
  assert.equal(needsFiles(2, { attachments: [{ storagePath: '' }] }), true)
  assert.equal(needsFiles(2, { attachments: [{ storagePath: 'ats/x/y.pdf' }] }), false)
  assert.equal(needsFiles(0, { attachments: [] }), false)
})

await check('Gmail sync downloads attachment bytes for preview storage', async () => {
  const plain = Buffer.from(
    'Dear Afrivate, I am writing to apply for Front-End. React TypeScript GitHub https://github.com/ada',
    'utf8',
  ).toString('base64')
  // Minimal PDF-like bytes (not a real PDF — extract may fail but bytes must be kept)
  const pdfBytes = Buffer.from('%PDF-1.4 fake resume content React TypeScript', 'utf8')
  const pdfB64 = pdfBytes
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const msg: GmailApiMessage = {
    id: 'msg_att',
    threadId: 'th_att',
    snippet: 'I am writing to apply',
    payload: {
      headers: [
        { name: 'Subject', value: 'APPLICATION FOR FRONT-END DEVELOPER — Ada' },
        { name: 'From', value: 'Ada <ada@example.com>' },
      ],
      parts: [
        { mimeType: 'text/plain', body: { data: plain } },
        {
          mimeType: 'application/pdf',
          filename: 'Ada_Resume.pdf',
          body: { attachmentId: 'att_pdf', size: pdfBytes.length },
        },
        {
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          filename: 'Ada_Cover_Letter.docx',
          body: { attachmentId: 'att_docx', size: 100 },
        },
      ],
    },
  }

  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input)
    if (url.includes('/attachments/att_pdf')) {
      return new Response(JSON.stringify({ data: pdfB64 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (url.includes('/attachments/att_docx')) {
      const docxB64 = Buffer.from('PK fake docx cover letter content', 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
      return new Response(JSON.stringify({ data: docxB64 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response('missing', { status: 404 })
  }

  const parsed = parseGmailApiMessage(msg)
  assert.deepEqual(parsed.attachmentNames, ['Ada_Resume.pdf', 'Ada_Cover_Letter.docx'])

  const enriched = await enrichMessageWithResumeText(msg, parsed, {
    accessToken: 'test',
    fetchImpl,
    extractFn: async () => ({ text: 'React TypeScript resume extract', error: undefined }),
  })

  assert.ok(enriched.attachmentFiles?.length === 2, `expected 2 files, got ${enriched.attachmentFiles?.length}`)
  assert.ok((enriched.attachmentFiles?.[0]?.bytes?.byteLength ?? 0) > 0)
  assert.equal(enriched.attachmentFiles?.[0]?.kind, 'resume')
  assert.equal(enriched.attachmentFiles?.[1]?.kind, 'cover_letter')
  assert.ok(enriched.resumeFilesScanned?.includes('Ada_Resume.pdf'))

  // Simulate portal upload payload that RecruitmentAtsSection builds
  const stored = enriched.attachmentFiles!.map((f, i) => ({
    id: `att_${i}`,
    filename: f.filename,
    mimeType: f.mimeType,
    storagePath: `ats/22222222-2222-2222-2222-222222222222/msg_att-${f.filename}`,
    kind: f.kind,
    size: f.bytes?.byteLength ?? f.size ?? 0,
  }))
  const candidateRow = jobCandidateToRow({
    ...sampleCandidate({ attachments: stored }),
  })
  assert.equal((candidateRow.attachments as unknown[]).length, 2)
  const reloaded = rowToJobCandidate(candidateRow)
  assert.ok(reloaded.attachments?.every((a) => a.storagePath.startsWith('ats/')))
})

await check('fetchGmailApplications skips non-apps and enriches real apps with files', async () => {
  const appPlain = Buffer.from(
    'I am writing to apply for the Front-End Developer role. React TypeScript.',
    'utf8',
  ).toString('base64')
  const junkPlain = Buffer.from('Your weekly job alert. Unsubscribe.', 'utf8').toString('base64')
  const pdfB64 = Buffer.from('%PDF fake', 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input)
    if (url.includes('users/me/messages') && !url.includes('/messages/')) {
      return new Response(
        JSON.stringify({
          messages: [
            { id: 'app1', threadId: 't1' },
            { id: 'junk1', threadId: 't2' },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (url.includes('/messages/app1') && !url.includes('/attachments/')) {
      return new Response(
        JSON.stringify({
          id: 'app1',
          threadId: 't1',
          snippet: 'I am writing to apply',
          payload: {
            headers: [
              { name: 'Subject', value: 'APPLICATION FOR FRONT-END DEVELOPER — Ada' },
              { name: 'From', value: 'Ada <ada@example.com>' },
            ],
            parts: [
              { mimeType: 'text/plain', body: { data: appPlain } },
              {
                mimeType: 'application/pdf',
                filename: 'Ada_CV.pdf',
                body: { attachmentId: 'a1', size: 10 },
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (url.includes('/messages/junk1')) {
      return new Response(
        JSON.stringify({
          id: 'junk1',
          threadId: 't2',
          snippet: 'job alert',
          payload: {
            headers: [
              { name: 'Subject', value: 'Your weekly job alert' },
              { name: 'From', value: 'Jobs <noreply@jobs.com>' },
            ],
            parts: [{ mimeType: 'text/plain', body: { data: junkPlain } }],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (url.includes('/attachments/a1')) {
      return new Response(JSON.stringify({ data: pdfB64 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response('no', { status: 404 })
  }

  const result = await fetchGmailApplications({
    accessToken: 'tok',
    fetchImpl,
    extractResumes: true,
    extractFn: async () => ({ text: 'React', error: undefined }),
  })
  assert.equal(result.messages.length, 1)
  assert.equal(result.skippedNonApplications, 1)
  assert.ok(result.messages[0]?.attachmentFiles?.length === 1)
  assert.ok((result.messages[0]?.attachmentFiles?.[0]?.bytes?.byteLength ?? 0) > 0)

  // Upload-first path: persist before extract, storagePath set, bytes dropped
  const order: string[] = []
  const withPersist = await fetchGmailApplications({
    accessToken: 'tok',
    fetchImpl,
    extractResumes: true,
    extractFn: async () => {
      order.push('extract')
      return { text: 'React', error: undefined }
    },
    persistAttachment: async ({ bytes, filename }) => {
      order.push('persist')
      assert.ok(bytes.byteLength > 0)
      return { path: `ats/u/${filename}`, size: bytes.byteLength }
    },
  })
  assert.deepEqual(order, ['persist', 'extract'])
  assert.equal(withPersist.messages[0]?.attachmentFiles?.[0]?.storagePath, 'ats/u/Ada_CV.pdf')
  assert.equal(withPersist.messages[0]?.attachmentFiles?.[0]?.bytes, undefined)
  assert.equal(encodeGmailExternalId('t1', 'app1'), 'gmail:t1:app1')
})

await check('Storage + attachment migration SQL is present and correct', () => {
  const path = resolve('supabase/migrations/20260726_ats_attachments_admin_fix.sql')
  assert.ok(existsSync(path), 'missing 20260726_ats_attachments_admin_fix.sql')
  const sql = readFileSync(path, 'utf8')
  assert.match(sql, /add column if not exists attachments/)
  assert.match(sql, /\(storage\.foldername\(name\)\)\[1\] in \('media', 'avatars', 'ats'\)/)
  assert.match(sql, /public\.is_hr_or_admin\(\)/)
  assert.match(sql, /portal_files: ats hr update/)
  assert.match(sql, /notify pgrst/)

  const earlier = resolve('supabase/migrations/20260725_ats_candidate_attachments.sql')
  assert.ok(existsSync(earlier))
})

await check('fileStorage upload path stays under ats/{uuid}/ for RLS', () => {
  const src = readFileSync(resolve('src/lib/supabase/fileStorage.ts'), 'utf8')
  assert.match(src, /ats\/\$\{safeUser\}\//)
  assert.match(src, /uploadAtsAttachmentBytes/)
  assert.match(src, /downloadPortalFile/)
  assert.match(src, /resolvePortalFilePreviewUrl/)
  assert.match(src, /upsert: false/)
})

await check('Preview UI exposes Download + Open for all devices', () => {
  const preview = readFileSync(resolve('src/components/shared/AtsAttachmentPreview.tsx'), 'utf8')
  assert.match(preview, /downloadPortalFile/)
  assert.match(preview, /Open/)
  assert.match(preview, /Download/)
  assert.match(preview, /isMobileLike|iPhone|Android/)
  const pane = readFileSync(resolve('src/components/shared/AtsEmailReadingPane.tsx'), 'utf8')
  assert.match(pane, /downloadPortalFile/)
  assert.match(pane, /File not saved yet/)
})

await check('Recruitment sync awaits attachment save and reports upload failures', () => {
  const src = readFileSync(resolve('src/pages/admin/RecruitmentAtsSection.tsx'), 'utf8')
  assert.match(src, /uploadFailures/)
  assert.match(src, /reload: false/)
  assert.match(src, /await updateJobCandidate/)
  assert.match(src, /refreshedAttachments/)
  assert.match(src, /uploadAtsAttachmentBytes/)
  assert.match(src, /persistAttachment/)
  assert.match(src, /BEFORE text extract/)
  const gmail = readFileSync(resolve('src/lib/gmailAtsSync.ts'), 'utf8')
  assert.match(gmail, /persistAttachment/)
  assert.match(gmail, /BEFORE any extractor/)
})

await check('Candidate update persistence never strips attachments on identity miss', () => {
  const src = readFileSync(resolve('src/context/HrContext.supabase.tsx'), 'utf8')
  assert.match(src, /omitCandidateAttachmentsColumn/)
  assert.match(src, /stripAttachments: omitCandidateAttachmentsColumn/)
  assert.ok(!src.includes('stripOptionalCandidateColumns(jobCandidateToRow(row, { includeIdentity: false }))'))
})

await check('Recruitment UI wires candidate search helpers', () => {
  const src = readFileSync(resolve('src/pages/admin/RecruitmentAtsSection.tsx'), 'utf8')
  assert.match(src, /filterVisibleCandidates/)
  assert.match(src, /filterTopTenCandidates/)
  assert.match(src, /candidateSearch/)
  assert.match(src, /Search name, email, phone, keyword/)
  assert.match(src, /No candidates match your search/)
  assert.match(src, /Clear search/)
})

await check('Candidate search matches name, email, phone, and keywords (case-insensitive)', async () => {
  const {
    candidateMatchesSearch,
  } = await import('../src/utils/atsCandidateSearch.ts')

  const ada: JobCandidate = {
    id: '1',
    requisitionId: 'fe',
    name: 'Ada Lovelace',
    email: 'ada@Afrivate.com',
    phone: '+234 801 234 5678',
    location: 'Lagos, Nigeria',
    linkedinUrl: 'https://linkedin.com/in/ada',
    githubUrl: 'https://github.com/ada-lovelace',
    portfolioUrl: 'https://ada.dev',
    resumeSummary: 'React TypeScript front-end engineer',
    notes: 'Subject: APPLICATION FOR FRONT-END\nStrong NestJS mention in cover letter',
    source: 'gmail',
    stage: 'screen',
    score: 88,
    recommendation: 'strong',
    updatedAt: new Date().toISOString(),
    attachments: [
      {
        id: 'a1',
        filename: 'Ada_Lovelace_CV.pdf',
        mimeType: 'application/pdf',
        storagePath: 'ats/u/Ada_Lovelace_CV.pdf',
        kind: 'resume',
      },
    ],
  }

  assert.equal(candidateMatchesSearch(ada, ''), true)
  assert.equal(candidateMatchesSearch(ada, '   '), true)
  assert.equal(candidateMatchesSearch(ada, 'ada lovelace'), true)
  assert.equal(candidateMatchesSearch(ada, 'ADA'), true)
  assert.equal(candidateMatchesSearch(ada, 'ada@afrivate.com'), true)
  assert.equal(candidateMatchesSearch(ada, '801 234'), true)
  assert.equal(candidateMatchesSearch(ada, 'lagos'), true)
  assert.equal(candidateMatchesSearch(ada, 'typescript'), true)
  assert.equal(candidateMatchesSearch(ada, 'nestjs'), true)
  assert.equal(candidateMatchesSearch(ada, 'github.com/ada'), true)
  assert.equal(candidateMatchesSearch(ada, 'ada.dev'), true)
  assert.equal(candidateMatchesSearch(ada, 'linkedin.com/in/ada'), true)
  assert.equal(candidateMatchesSearch(ada, 'Ada_Lovelace_CV'), true)
  assert.equal(candidateMatchesSearch(ada, 'gmail'), true)
  assert.equal(candidateMatchesSearch(ada, 'nobody-here'), false)
  assert.equal(candidateMatchesSearch(ada, 'python django'), false)
})

await check('Search returns ALL role candidates including outside Top 10; ignores recommendation filter', async () => {
  const {
    filterVisibleCandidates,
    filterTopTenCandidates,
  } = await import('../src/utils/atsCandidateSearch.ts')

  const make = (
    i: number,
    overrides: Partial<JobCandidate> = {},
  ): JobCandidate => ({
    id: `c${i}`,
    requisitionId: 'fe',
    name: `Candidate ${i}`,
    email: `c${i}@example.com`,
    stage: 'screen',
    score: 100 - i,
    recommendation: i <= 3 ? 'strong' : i <= 8 ? 'viable' : i <= 12 ? 'weak' : 'reject',
    updatedAt: new Date().toISOString(),
    ...overrides,
  })

  // 15 scored candidates — ranks 1..15
  const role = Array.from({ length: 15 }, (_, i) => make(i + 1))
  // Plant searchable people: #2 (in Top 10) and #14 (outside Top 10, reject)
  role[1] = make(2, {
    name: 'Grace Hopper',
    email: 'grace@navy.mil',
    phone: '555-0199',
    recommendation: 'strong',
    score: 98,
  })
  role[13] = make(14, {
    name: 'Grace Lee',
    email: 'glee@example.com',
    phone: '555-0144',
    notes: 'keyword: kubernetes',
    recommendation: 'reject',
    score: 20,
  })

  // Blank search + top10 → only first 10
  const topOnly = filterVisibleCandidates(role, {
    search: '',
    filter: 'top10',
    viableMin: 60,
  })
  assert.equal(topOnly.length, 10)
  assert.ok(topOnly.every((c, i) => c.id === role[i]!.id))

  // Search "grace" with filter still on top10 / strong — must find BOTH (all matches)
  for (const filter of ['top10', 'strong', 'viable', 'reject', 'all'] as const) {
    const hits = filterVisibleCandidates(role, {
      search: 'grace',
      filter,
      viableMin: 60,
    })
    assert.equal(
      hits.length,
      2,
      `expected 2 grace hits with filter=${filter}, got ${hits.length}`,
    )
    assert.ok(hits.some((c) => c.id === 'c2'), 'Top 10 Grace Hopper must be included')
    assert.ok(hits.some((c) => c.id === 'c14'), 'Outside Top 10 Grace Lee must be included')
  }

  // Email / phone / keyword searches
  assert.equal(
    filterVisibleCandidates(role, { search: 'grace@navy.mil', filter: 'top10', viableMin: 60 }).map(
      (c) => c.id,
    ).join(','),
    'c2',
  )
  assert.equal(
    filterVisibleCandidates(role, { search: '555-0144', filter: 'reject', viableMin: 60 }).map(
      (c) => c.id,
    ).join(','),
    'c14',
  )
  assert.equal(
    filterVisibleCandidates(role, { search: 'kubernetes', filter: 'strong', viableMin: 60 }).map(
      (c) => c.id,
    ).join(','),
    'c14',
  )

  // Top 10 card: blank → 10; search grace → only Hopper among true top 10
  assert.equal(filterTopTenCandidates(role, '').length, 10)
  const topHits = filterTopTenCandidates(role, 'grace')
  assert.equal(topHits.length, 1)
  assert.equal(topHits[0]?.id, 'c2')
  assert.equal(filterTopTenCandidates(role, 'kubernetes').length, 0, 'c14 is not in Top 10 card')
  assert.equal(filterTopTenCandidates(role, 'zzz-none').length, 0)
})

await check('Whitespace-only search behaves like empty (Top 10 / filters apply)', async () => {
  const { filterVisibleCandidates } = await import('../src/utils/atsCandidateSearch.ts')
  const role: JobCandidate[] = Array.from({ length: 12 }, (_, i) => ({
    id: `n${i}`,
    requisitionId: 'fe',
    name: `Person ${i}`,
    stage: 'screen' as const,
    score: 90 - i,
    recommendation: (i < 2 ? 'strong' : i < 5 ? 'viable' : 'weak') as JobCandidate['recommendation'],
    updatedAt: new Date().toISOString(),
  }))

  const spaced = filterVisibleCandidates(role, {
    search: '  \t  ',
    filter: 'top10',
    viableMin: 70,
  })
  assert.equal(spaced.length, 10)

  const strongOnly = filterVisibleCandidates(role, {
    search: '',
    filter: 'strong',
    viableMin: 70,
  })
  assert.equal(strongOnly.length, 2)
  assert.ok(strongOnly.every((c) => c.recommendation === 'strong'))
})

await check('Viable filter without search uses score threshold; search still overrides it', async () => {
  const { filterVisibleCandidates, passesRecommendationFilter } =
    await import('../src/utils/atsCandidateSearch.ts')

  const mid: JobCandidate = {
    id: 'mid',
    requisitionId: 'fe',
    name: 'Mid Scorer',
    email: 'mid@x.com',
    stage: 'screen',
    score: 65,
    recommendation: 'weak',
    updatedAt: new Date().toISOString(),
  }
  assert.equal(passesRecommendationFilter(mid, 'viable', 60), true)
  assert.equal(passesRecommendationFilter(mid, 'viable', 70), false)
  assert.equal(passesRecommendationFilter(mid, 'weak', 60), true)
  assert.equal(passesRecommendationFilter(mid, 'strong', 60), false)

  const role = [
    {
      id: 's',
      requisitionId: 'fe',
      name: 'Strong One',
      stage: 'screen' as const,
      score: 90,
      recommendation: 'strong' as const,
      updatedAt: new Date().toISOString(),
    },
    mid,
  ]

  assert.equal(
    filterVisibleCandidates(role, { search: '', filter: 'viable', viableMin: 60 }).length,
    2,
  )
  assert.equal(
    filterVisibleCandidates(role, { search: '', filter: 'viable', viableMin: 70 }).length,
    1,
  )
  // Searching "mid" with viableMin 70 + filter viable still returns mid (search ignores filter)
  assert.deepEqual(
    filterVisibleCandidates(role, { search: 'mid@x.com', filter: 'viable', viableMin: 70 }).map(
      (c) => c.id,
    ),
    ['mid'],
  )
})

console.log('')
if (failed) {
  console.error(`${failed} check(s) failed`)
  process.exit(1)
}
console.log('All functionality checks passed.')

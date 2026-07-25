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
  assert.ok((enriched.attachmentFiles?.[0]?.bytes.byteLength ?? 0) > 0)
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
    size: f.bytes.byteLength,
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
  assert.ok((result.messages[0]?.attachmentFiles?.[0]?.bytes.byteLength ?? 0) > 0)
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
})

await check('Candidate update persistence never strips attachments on identity miss', () => {
  const src = readFileSync(resolve('src/context/HrContext.supabase.tsx'), 'utf8')
  assert.match(src, /omitCandidateAttachmentsColumn/)
  assert.match(src, /stripAttachments: omitCandidateAttachmentsColumn/)
  assert.ok(!src.includes('stripOptionalCandidateColumns(jobCandidateToRow(row, { includeIdentity: false }))'))
})

console.log('')
if (failed) {
  console.error(`${failed} check(s) failed`)
  process.exit(1)
}
console.log('All functionality checks passed.')

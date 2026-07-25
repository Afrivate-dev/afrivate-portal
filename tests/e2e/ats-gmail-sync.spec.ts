import { test, expect } from '@playwright/test'

/**
 * Browser-level check that the ATS module pipeline works when Gmail API is mocked.
 * Does not require admin login — exercises the same helpers Sync uses.
 */
test.describe('Recruitment ATS sync pipeline (mocked Gmail)', () => {
  test('mocked sync → score → rank pipeline', async ({ page }) => {
    await page.goto('/login')

    const result = await page.evaluate(`(async () => {
      const scoring = await import('/src/utils/atsScoring.ts')
      const gmail = await import('/src/lib/gmailAtsSync.ts')

      const plain = btoa(
        'Dear Afrivate, I am writing to apply. React TypeScript Git. GitHub: https://github.com/e2e Portfolio: https://e2e.vercel.app',
      )

      async function fetchImpl(input) {
        const url = String(input)
        if (url.includes('messages?') || url.includes('maxResults=')) {
          return new Response(JSON.stringify({ messages: [{ id: 'e2e1', threadId: 't' }] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        if (url.includes('/messages/e2e1')) {
          return new Response(
            JSON.stringify({
              id: 'e2e1',
              threadId: 't',
              snippet: 'I am writing to apply',
              payload: {
                headers: [
                  { name: 'Subject', value: 'APPLICATION FOR FRONT-END DEVELOPER — E2E Tester' },
                  { name: 'From', value: 'E2E Tester <e2e@example.com>' },
                ],
                parts: [{ mimeType: 'text/plain', body: { data: plain } }],
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        }
        return new Response('missing', { status: 404 })
      }

      const result = await gmail.fetchGmailApplications({
        accessToken: 'fake',
        fetchImpl,
        extractResumes: false,
      })
      const messages = result.messages
      const scored = scoring.screenApplicationText(messages[0].bodyText, 'frontend')
      return {
        count: messages.length,
        email: scored.email,
        score: scored.score,
        recommendation: scored.recommendation,
        configured: gmail.isGmailAtsConfigured(),
      }
    })()`)

    expect(result.count).toBe(1)
    expect(result.email).toBe('e2e@example.com')
    expect(result.score).toBeGreaterThanOrEqual(40)
    expect(['strong', 'viable', 'weak', 'reject']).toContain(result.recommendation)
    expect(result.configured).toBe(true)
  })

  test('mocked sync downloads resume + cover letter bytes for preview', async ({ page }) => {
    await page.goto('/login')

    const result = await page.evaluate(`(async () => {
      const gmail = await import('/src/lib/gmailAtsSync.ts')
      const hr = await import('/src/lib/supabase/hrDataset.ts')
      const helpers = await import('/src/utils/helpers.ts')

      const plain = btoa('I am writing to apply for Front-End. React TypeScript.')
      const pdfB64 = btoa('%PDF-1.4 React resume').replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '')
      const docxB64 = btoa('PK cover letter').replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '')

      async function fetchImpl(input) {
        const url = String(input)
        if (url.includes('messages?') || (url.includes('/messages') && !url.includes('/messages/'))) {
          return new Response(JSON.stringify({ messages: [{ id: 'att1', threadId: 'th' }] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        if (url.includes('/messages/att1') && !url.includes('/attachments/')) {
          return new Response(
            JSON.stringify({
              id: 'att1',
              threadId: 'th',
              snippet: 'apply',
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
                    body: { attachmentId: 'p1', size: 20 },
                  },
                  {
                    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    filename: 'Ada_Cover_Letter.docx',
                    body: { attachmentId: 'd1', size: 20 },
                  },
                ],
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        }
        if (url.includes('/attachments/p1')) {
          return new Response(JSON.stringify({ data: pdfB64 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        if (url.includes('/attachments/d1')) {
          return new Response(JSON.stringify({ data: docxB64 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response('missing', { status: 404 })
      }

      const synced = await gmail.fetchGmailApplications({
        accessToken: 'fake',
        fetchImpl,
        extractResumes: true,
        extractFn: async () => ({ text: 'React TypeScript', error: undefined }),
      })
      const files = synced.messages[0]?.attachmentFiles || []
      const stored = files.map((f, i) => ({
        id: 'a' + i,
        filename: f.filename,
        mimeType: f.mimeType,
        storagePath: 'ats/33333333-3333-3333-3333-333333333333/' + f.filename,
        kind: f.kind,
        size: f.bytes.byteLength,
      }))
      const row = hr.jobCandidateToRow({
        id: 'c1',
        requisitionId: 'j1',
        name: 'Ada',
        email: 'ada@example.com',
        stage: 'applied',
        updatedAt: new Date().toISOString(),
        attachments: stored,
      })
      const stripped = hr.stripOptionalCandidateColumns(row)
      const adminOk = helpers.isHR({
        id: '1',
        email: 'a@x.com',
        name: 'A',
        role: 'admin',
        department: 'Ops',
        jobTitle: 'Admin',
        joinedAt: '2026-01-01',
        active: true,
      })
      return {
        messageCount: synced.messages.length,
        fileCount: files.length,
        kinds: files.map((f) => f.kind),
        bytesOk: files.every((f) => f.bytes && f.bytes.byteLength > 0),
        attachmentsKept: Array.isArray(stripped.attachments) && stripped.attachments.length === 2,
        pathsOk: stored.every((a) => a.storagePath.startsWith('ats/')),
        adminOk,
      }
    })()`)

    expect(result.messageCount).toBe(1)
    expect(result.fileCount).toBe(2)
    expect(result.kinds).toEqual(['resume', 'cover_letter'])
    expect(result.bytesOk).toBe(true)
    expect(result.attachmentsKept).toBe(true)
    expect(result.pathsOk).toBe(true)
    expect(result.adminOk).toBe(true)
  })
})

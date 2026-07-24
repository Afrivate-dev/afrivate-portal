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

      const messages = await gmail.fetchGmailApplications({
        accessToken: 'fake',
        fetchImpl,
      })
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
})

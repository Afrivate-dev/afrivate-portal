import type { OnboardingChecklistItem } from '@/types'

/** Default first-week checklist — seeded locally. Live rows live in portal_onboarding_checklist. */
export const DEFAULT_GETTING_STARTED_CHECKLIST: OnboardingChecklistItem[] = [
  {
    id: 'ck_slack',
    label:
      'Set up your Slack profile and join #annoucements, #all-afrivate and your team channel',
    order: 1,
    description:
      'In Slack, set your real first and last name, your role as your title and a clear professional photo, and turn on notifications for DMs and @mentions. Join #annoucements, #all-afrivate and your team channel, read the Slack House Rules, then say hello to your team and message your Team Lead.',
  },
  {
    id: 'ck_myinfo',
    label: 'Complete every field in My info and click Save my info',
    link: '/people/my-info',
    order: 2,
    autoKey: 'myinfo_complete',
    description:
      'Go to People, then My info. Fill in your names, personal email, phone, work location, country, date of birth, pronouns, LinkedIn, bio, skills, emergency contact and next of kin notes. Check the completeness percentage, leave nothing blank, then click Save my info.',
  },
  {
    id: 'ck_profile',
    label: 'Update your directory card: photo, bio, phone, skills and LinkedIn',
    link: '/people/directory?profile=1',
    order: 3,
    autoKey: 'profile_complete',
    description:
      'Open your own card in the Directory and add your photo, bio, phone, skills and LinkedIn so colleagues can recognise and reach you.',
  },
  {
    id: 'ck_people',
    label: 'Confirm your department, title and Team Lead in the directory',
    link: '/people/directory',
    order: 4,
    autoKey: 'directory_complete',
    description:
      'Check that your department, job title and reports-to line are correct and confirm them with your Team Lead. If anything is wrong, tell Human Resources straight away.',
  },
  {
    id: 'ck_handbook',
    label: 'Read your onboarding pack (start with 00 and 01) in Resources',
    link: '/documents',
    order: 5,
    autoKey: 'handbook_visit',
    description:
      'Read the onboarding pack documents in number order, starting with 00 Start Here New Hire Checklist and 01 Team Member Onboarding Handbook. Document 09 is the Portal User Guide for Staff.',
  },
  {
    id: 'ck_policies',
    label: 'Acknowledge your assigned policies within 7 official work days',
    link: '/documents',
    order: 6,
    description:
      'Open Resources and acknowledge each document assigned to you within seven (7) official work days. A yellow banner stays on Home until you do.',
  },
  {
    id: 'ck_okrs',
    label: 'Meet your Team Lead and record your OKRs in Growth',
    link: '/people/growth?tab=okrs',
    order: 7,
    description:
      'Your Team Lead will brief you on your role and first tasks. Together, agree your Agreed Capacity and 3 to 5 KPIs, then record your OKRs under People, Growth, OKRs.',
  },
  {
    id: 'ck_tasks',
    label: 'Open your tasks in My work and keep their status updated',
    link: '/tasks',
    order: 8,
    description:
      'Keep your tasks in My work and mark them Complete in the Portal, not only on Slack. Ask your Team Lead if an outcome or deadline is unclear.',
  },
  {
    id: 'ck_checkin',
    label: 'Submit your weekly update every week',
    link: '/checkin',
    order: 9,
    autoKey: 'first_checkin',
    description: 'Share what you worked on, what is next and what you need. Submit it every week.',
  },
  {
    id: 'ck_memos',
    label: 'Read the Memos and react to the weekly HR Digest',
    link: '/announcements',
    order: 10,
    description:
      'Read important notices in Memos. The weekly HR Digest is posted in #all-afrivate every Monday morning; read it and react to confirm.',
  },
  {
    id: 'ck_townhall',
    label: 'Join the Monday General Townhall, 8 to 9 PM (Lagos time)',
    link: '/events',
    order: 11,
    description:
      'Everyone attends the General Townhall every Monday, 8:00 PM to 9:00 PM (Lagos time) on Google Meet. If you cannot make it, let Human Resources know before it starts.',
  },
  {
    id: 'ck_videos',
    label: 'Watch the welcome onboarding videos',
    link: '/onboarding',
    order: 12,
    description: 'Short welcome videos explain how we work at AfriVate.',
  },
]

const AUTO_KEYS: NonNullable<OnboardingChecklistItem['autoKey']>[] = [
  'profile_complete',
  'handbook_visit',
  'first_checkin',
  'directory_complete',
  'myinfo_complete',
]

export function parseOnboardingAutoKey(
  value: unknown,
): OnboardingChecklistItem['autoKey'] | undefined {
  if (typeof value !== 'string') return undefined
  const key = value.trim() as NonNullable<OnboardingChecklistItem['autoKey']>
  return AUTO_KEYS.includes(key) ? key : undefined
}

/** Button label for a checklist link. Empty link means no button. */
export function ctaForLink(link?: string): string | null {
  const raw = link?.trim()
  if (!raw) return null

  let pathname: string
  let search: string
  try {
    const url = new URL(raw, 'http://local')
    pathname = url.pathname.replace(/\/$/, '') || '/'
    search = url.search
  } catch {
    pathname = raw
    search = ''
  }

  const full = `${pathname}${search}`
  const exact: Record<string, string> = {
    '/people/my-info': 'Open My info',
    '/people/directory?profile=1': 'Open my card',
    '/people/directory': 'Open directory',
    '/documents': 'Open Resources',
    '/people/growth?tab=okrs': 'Open Growth',
    '/tasks': 'Open My work',
    '/checkin': 'Write weekly update',
    '/announcements': 'Open Memos',
    '/events': 'Open Events',
    '/onboarding': 'Watch videos',
  }
  if (exact[full]) return exact[full]
  if (!search && exact[pathname]) return exact[pathname]
  if (raw.startsWith('/') || pathname.startsWith('/')) return 'Open'
  return 'Open link'
}

/** Hide the welcome-video row when no videos are published. Match by route or auto key, not only ck_videos. */
export function isWelcomeVideoChecklistItem(
  item: Pick<OnboardingChecklistItem, 'id' | 'label' | 'link' | 'autoKey'>,
): boolean {
  const link = item.link?.trim().split('?')[0]?.replace(/\/$/, '') ?? ''
  if (link === '/onboarding') return true
  if (String(item.autoKey ?? '') === 'welcome_videos') return true
  if (item.id === 'ck_videos') return true
  return /welcome video/i.test(item.label)
}

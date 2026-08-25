import type { OnboardingChecklistItem } from '@/types'

/** Default first-week checklist — seeded locally and via SQL migration. Aligned to AFRI-ONB-01 / AFRI-EOH-01. */
export const DEFAULT_GETTING_STARTED_CHECKLIST: OnboardingChecklistItem[] = [
  {
    id: 'ck_profile',
    label: 'Add your photo and contact details',
    link: '/people/directory?profile=1',
    order: 1,
    autoKey: 'profile_complete',
  },
  {
    id: 'ck_myinfo',
    label: 'Complete My Info (including emergency contact)',
    link: '/people/my-info',
    order: 2,
  },
  {
    id: 'ck_people',
    label: 'Find your team lead in the directory',
    link: '/people/directory',
    order: 3,
    autoKey: 'directory_complete',
  },
  {
    id: 'ck_videos',
    label: 'Watch the welcome onboarding videos',
    link: '/onboarding',
    order: 4,
  },
  {
    id: 'ck_slack',
    label: 'Join Slack and set your name and photo',
    order: 5,
  },
  {
    id: 'ck_handbook',
    label: 'Browse the staff resources library',
    link: '/documents',
    order: 6,
    autoKey: 'handbook_visit',
  },
  {
    id: 'ck_policies',
    label: 'Acknowledge required policies in Resources',
    link: '/documents',
    order: 7,
  },
  {
    id: 'ck_tasks',
    label: 'Review your assigned work in My work',
    link: '/tasks',
    order: 8,
  },
  {
    id: 'ck_okrs',
    label: 'Record 3–5 KPIs in Growth',
    link: '/people/growth?tab=okrs',
    order: 9,
  },
  {
    id: 'ck_checkin',
    label: 'Submit your first weekly check-in',
    link: '/checkin',
    order: 10,
    autoKey: 'first_checkin',
  },
  {
    id: 'ck_learning',
    label: 'Complete assigned learning (if any)',
    link: '/people/learning',
    order: 11,
  },
  {
    id: 'ck_memos',
    label: 'Read the latest team memos',
    link: '/announcements',
    order: 12,
  },
]

export type GettingStartedChecklistMeta = {
  description: string
  cta: string
}

const META: Record<string, GettingStartedChecklistMeta> = {
  profile_complete: {
    description: 'Help colleagues recognize you — add a profile photo, phone number, or short bio.',
    cta: 'Open my profile',
  },
  handbook_visit: {
    description: 'Policies, handbooks, and shared files live in Resources. Skim what applies to your role.',
    cta: 'Open resources',
  },
  ck_videos: {
    description: 'Short videos from HR and leadership explain how we work at AfriVate.',
    cta: 'Watch videos',
  },
  first_checkin: {
    description: 'Share what you worked on and what you need — most people send this on the last official work day of the week.',
    cta: 'Write check-in',
  },
  directory_complete: {
    description: 'See who leads your department and how to reach them on work email. Tell People & Culture the same day if title or reports-to is wrong.',
    cta: 'Browse people',
  },
  ck_memos: {
    description: 'Important announcements and urgent updates from leadership appear in Memos.',
    cta: 'View memos',
  },
  ck_myinfo: {
    description: 'People & Culture needs a usable phone number and emergency contact on file.',
    cta: 'Open My info',
  },
  ck_slack: {
    description: 'Set your real name and a professional photo, read the House Rules pin, then message your Team Lead that you are on Slack.',
    cta: 'Mark done',
  },
  ck_policies: {
    description:
      'Acknowledge AFRI-SWP, AFRI-ORG-01, AFRI-LAP-01, AFRI-EOH-01, and AFRI-ICEF-01 if you are an Internal Contributor — within seven official work days.',
    cta: 'Open resources',
  },
  ck_tasks: {
    description: 'Open every task assigned to you. Ask your Team Lead on Slack if the outcome or deadline is unclear, then keep the Portal task accurate.',
    cta: 'Open My work',
  },
  ck_okrs: {
    description: 'Agree 3–5 measurable KPIs with your Team Lead and record them here with a number, date, or verifiable outcome.',
    cta: 'Open Growth',
  },
  ck_learning: {
    description: 'If People & Culture assigned a course, complete it and submit evidence in Learning. Skip this if nothing is assigned yet.',
    cta: 'Open Learning',
  },
}

export function checklistMetaFor(item: OnboardingChecklistItem): GettingStartedChecklistMeta {
  if (item.autoKey && META[item.autoKey]) return META[item.autoKey]
  if (META[item.id]) return META[item.id]
  if (item.link) {
    return {
      description: 'Open the linked page, then come back and tick this off when you are done.',
      cta: 'Go there',
    }
  }
  return {
    description: 'Complete this step at your own pace, then tap to mark it done.',
    cta: 'Mark done',
  }
}

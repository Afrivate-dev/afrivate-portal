import type { OnboardingChecklistItem } from '@/types'

/** Default first-week checklist — seeded locally and via SQL migration. */
export const DEFAULT_GETTING_STARTED_CHECKLIST: OnboardingChecklistItem[] = [
  {
    id: 'ck_profile',
    label: 'Add your photo and contact details',
    link: '/people/directory?profile=1',
    order: 1,
    autoKey: 'profile_complete',
  },
  {
    id: 'ck_handbook',
    label: 'Browse the staff resources library',
    link: '/documents',
    order: 2,
    autoKey: 'handbook_visit',
  },
  {
    id: 'ck_videos',
    label: 'Watch the welcome onboarding videos',
    link: '/onboarding',
    order: 3,
  },
  {
    id: 'ck_checkin',
    label: 'Submit your first weekly check-in',
    link: '/checkin',
    order: 4,
    autoKey: 'first_checkin',
  },
  {
    id: 'ck_people',
    label: 'Find your team lead in the directory',
    link: '/people/directory',
    order: 5,
    autoKey: 'directory_complete',
  },
  {
    id: 'ck_memos',
    label: 'Read the latest team memos',
    link: '/announcements',
    order: 6,
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
    description: 'Share what you worked on and what you need — most people send this on Fridays.',
    cta: 'Write check-in',
  },
  directory_complete: {
    description: 'See who leads your department and how to reach them on work email.',
    cta: 'Browse people',
  },
  ck_memos: {
    description: 'Important announcements and urgent updates from leadership appear in Memos.',
    cta: 'View memos',
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

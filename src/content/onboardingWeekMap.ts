export type OnboardingWeekStep = {
  day: string
  title: string
  items: string[]
}

/** Compact first-week map shown on Getting started. */
export const ONBOARDING_WEEK_MAP: OnboardingWeekStep[] = [
  {
    day: 'Day 1',
    title: 'Access',
    items: [
      'Set up your Slack profile and join your channels',
      'Sign in to the Portal',
      'Complete every field in My info',
      'Update your directory card',
    ],
  },
  {
    day: 'Day 2',
    title: 'Policies',
    items: [
      'Read your onboarding pack, starting with 00 and 01',
      'Acknowledge your assigned policies (within 7 official work days)',
    ],
  },
  {
    day: 'Days 3–4',
    title: 'Goals',
    items: [
      'Meet your Team Lead',
      'Agree your capacity and 3 to 5 KPIs',
      'Record your OKRs in Growth',
    ],
  },
  {
    day: 'Days 5–7',
    title: 'Rhythm',
    items: [
      'Keep your tasks updated in My work',
      'Submit your weekly update',
      'Read Memos and react to the HR Digest',
      'Join the Monday Townhall, 8 to 9 PM (Lagos time)',
      'Email your weekly L&D report to afrivatehr@gmail.com',
      'Submit your monthly appraisal form to your Team Lead',
      "Request leave only in Time off (3 official work days' notice)",
    ],
  },
]

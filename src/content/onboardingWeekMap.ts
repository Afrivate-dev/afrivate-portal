export type OnboardingWeekStep = {
  day: string
  title: string
  items: string[]
}

/** Compact first-week map shown on Getting started — mirrors AFRI-ONB-01 / AFRI-EOH-01. */
export const ONBOARDING_WEEK_MAP: OnboardingWeekStep[] = [
  {
    day: 'Day 1',
    title: 'Access',
    items: ['Sign in and complete My info', 'Watch welcome videos', 'Join Slack and message your lead'],
  },
  {
    day: 'Day 2',
    title: 'Policies',
    items: ['Acknowledge required documents in Resources', 'Open your first tasks in My work'],
  },
  {
    day: 'Days 3–4',
    title: 'Goals',
    items: ['Agree capacity with your lead', 'Record 3–5 KPIs in Growth'],
  },
  {
    day: 'Days 5–7',
    title: 'Rhythm',
    items: ['Submit your first weekly update', 'Start assigned learning if you have any'],
  },
]

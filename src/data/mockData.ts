/**

 * Seed data — used only when VITE_USE_SUPABASE_DATA is not set to true.

 * All arrays are intentionally empty. Add real data via the Admin Panel

 * once connected to Supabase, or populate directly in the database.

 */



import type {

  Announcement,

  DocumentItem,

  EventItem,

  LeaveRequest,

  OnboardingChecklistItem,

  OnboardingProgress,

  OnboardingVideo,

  RecognitionPost,

  Task,

  WeeklyCheckIn,

  WorkspaceNote,

  WorkspaceTeam,

} from '@/types'

import { startOfWeek, addDays } from 'date-fns'



const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString()

const lastWeekStart = startOfWeek(addDays(new Date(), -7), { weekStartsOn: 1 }).toISOString()



/* ------------------------------------------------------------------ */

/* All content arrays — empty by default.                              */

/* Populate through the Admin Panel or directly in Supabase.           */

/* ------------------------------------------------------------------ */



export const seedTasks: Task[] = []

export const seedTeams: WorkspaceTeam[] = []

export const seedWorkspaceNotes: WorkspaceNote[] = []

export const seedCheckIns: WeeklyCheckIn[] = []

export const seedAnnouncements: Announcement[] = []

export const seedLeave: LeaveRequest[] = []

export const seedRecognition: RecognitionPost[] = []

export const seedEvents: EventItem[] = []

export const seedOnboardingProgress: OnboardingProgress[] = []



/* ------------------------------------------------------------------ */

/* Onboarding — structure only, no dummy videos.                       */

/* Add real videos via Admin Panel → Manage content.                   */

/* ------------------------------------------------------------------ */



export const seedOnboardingVideos: OnboardingVideo[] = []



export const seedOnboardingChecklist: OnboardingChecklistItem[] = [

  { id: 'ck_1', label: 'Complete your profile in the directory', order: 1 },

  { id: 'ck_2', label: 'Read the staff handbook', link: '/documents', order: 2 },

  { id: 'ck_3', label: 'Schedule a 1-on-1 with your team lead', order: 3 },

  { id: 'ck_4', label: 'Set up your work tools', order: 4 },

  { id: 'ck_5', label: 'Submit your first weekly check-in', order: 5 },

]



/* ------------------------------------------------------------------ */

/* Documents — empty by default.                                       */

/* Upload real documents via the Resources page.                       */

/* ------------------------------------------------------------------ */



export const seedDocuments: DocumentItem[] = []



export { weekStart, lastWeekStart }


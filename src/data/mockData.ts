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
import { DEFAULT_GETTING_STARTED_CHECKLIST } from '@/content/gettingStartedChecklist'



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



export const seedOnboardingChecklist: OnboardingChecklistItem[] = DEFAULT_GETTING_STARTED_CHECKLIST



/* ------------------------------------------------------------------ */

/* Documents — empty by default.                                       */

/* Upload real documents via the Resources page.                       */

/* ------------------------------------------------------------------ */



export const seedDocuments: DocumentItem[] = []



export { weekStart, lastWeekStart }


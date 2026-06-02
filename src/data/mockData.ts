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
  User,
  WeeklyCheckIn,
  WorkspaceNote,
  WorkspaceTeam,
} from '@/types'
import { startOfWeek, addDays } from 'date-fns'

const isoToday = (offsetDays = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString()
}

const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString()
const lastWeekStart = startOfWeek(addDays(new Date(), -7), { weekStartsOn: 1 }).toISOString()

/* ------------------------------------------------------------------ */
/* Users — replace with your real team once Supabase is connected.     */
/* These are only used in local/mock mode (VITE_USE_SUPABASE_AUTH=false) */
/* ------------------------------------------------------------------ */

export const seedUsers: User[] = [
  {
    id: 'u_admin',
    email: 'admin@afrivate.org',
    password: 'admin123',
    name: 'Portal Admin',
    role: 'admin',
    department: 'Leadership',
    jobTitle: 'Administrator',
    joinedAt: '2024-01-01T00:00:00.000Z',
    avatarUrl:
      'https://ui-avatars.com/api/?name=Portal+Admin&size=128&background=8D4087&color=ffffff&bold=true',
    workLocation: 'Abuja · Nigeria',
    active: true,
  },
  {
    id: 'u_hr',
    email: 'hr@afrivate.org',
    password: 'hr123',
    name: 'People & Culture',
    role: 'hr',
    department: 'People & Culture',
    jobTitle: 'People & Culture Lead',
    joinedAt: '2024-01-01T00:00:00.000Z',
    avatarUrl:
      'https://ui-avatars.com/api/?name=People+Culture&size=128&background=7A3575&color=ffffff&bold=true',
    workLocation: 'Abuja · Nigeria',
    reportsToId: 'u_admin',
    active: true,
  },
  {
    id: 'u_lead',
    email: 'lead@afrivate.org',
    password: 'lead123',
    name: 'Team Lead',
    role: 'team_lead',
    department: 'Engineering',
    jobTitle: 'Team Lead',
    joinedAt: '2024-01-01T00:00:00.000Z',
    avatarUrl:
      'https://ui-avatars.com/api/?name=Team+Lead&size=128&background=1D45CF&color=ffffff&bold=true',
    workLocation: 'Abuja · Nigeria',
    reportsToId: 'u_admin',
    active: true,
  },
  {
    id: 'u_staff',
    email: 'staff@afrivate.org',
    password: 'staff123',
    name: 'Team Member',
    role: 'staff',
    department: 'Engineering',
    jobTitle: 'Team Member',
    joinedAt: isoToday(0),
    avatarUrl:
      'https://ui-avatars.com/api/?name=Team+Member&size=128&background=317D34&color=ffffff&bold=true',
    workLocation: 'Abuja · Nigeria',
    reportsToId: 'u_lead',
    active: true,
  },
]

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
  { id: 'ck_2', label: 'Read the staff handbook', link: '#', order: 2 },
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

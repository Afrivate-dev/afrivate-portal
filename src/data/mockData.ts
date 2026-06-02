/**
 * Seed data for the portal. Every page reads this through DataContext
 * — never import this file directly from a page/component.
 *
 * Replace with Supabase queries in DataContext when the backend is wired.
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

/* --------------------------------- Users --------------------------------- */

export const seedUsers: User[] = [
  {
    id: 'u_admin',
    email: 'admin@afrivate.com',
    password: 'admin123',
    name: 'AfriVate Admin',
    role: 'admin',
    department: 'Leadership',
    jobTitle: 'Founder & CEO',
    joinedAt: '2023-01-01T00:00:00.000Z',
    avatarUrl:
      'https://ui-avatars.com/api/?name=AfriVate+Admin&size=128&background=8D4087&color=ffffff&bold=true',
    bio: 'Building AfriVate — elevating Africa through technology.',
    skills: ['Strategy', 'Product', 'Technology'],
    workLocation: 'Abuja · Hybrid',
    active: true,
  },
  {
    id: 'u_hr',
    email: 'hr@afrivate.com',
    password: 'hr123',
    name: 'People & Culture',
    role: 'hr',
    department: 'People & Culture',
    jobTitle: 'People & Culture Lead',
    joinedAt: '2023-03-01T00:00:00.000Z',
    avatarUrl:
      'https://ui-avatars.com/api/?name=People+Culture&size=128&background=7A3575&color=ffffff&bold=true',
    bio: 'Here to make AfriVate a great place to work.',
    skills: ['People Ops', 'Onboarding', 'Policy'],
    workLocation: 'Abuja · On-site',
    reportsToId: 'u_admin',
    active: true,
  },
  {
    id: 'u_lead',
    email: 'lead@afrivate.com',
    password: 'lead123',
    name: 'Team Lead',
    role: 'team_lead',
    department: 'Engineering',
    jobTitle: 'Engineering Lead',
    joinedAt: '2023-06-01T00:00:00.000Z',
    avatarUrl:
      'https://ui-avatars.com/api/?name=Team+Lead&size=128&background=1D45CF&color=ffffff&bold=true',
    bio: 'Leading delivery and keeping the team unblocked.',
    skills: ['Engineering', 'Mentorship', 'Delivery'],
    workLocation: 'Abuja · Hybrid',
    reportsToId: 'u_admin',
    active: true,
  },
  {
    id: 'u_staff',
    email: 'staff@afrivate.com',
    password: 'staff123',
    name: 'Team Member',
    role: 'staff',
    department: 'Engineering',
    jobTitle: 'Software Engineer',
    joinedAt: isoToday(-14),
    avatarUrl:
      'https://ui-avatars.com/api/?name=Team+Member&size=128&background=317D34&color=ffffff&bold=true',
    bio: 'New to the team — excited to contribute.',
    skills: ['React', 'TypeScript'],
    workLocation: 'Remote · Nigeria',
    reportsToId: 'u_lead',
    active: true,
  },
]

/* --------------------------------- Tasks --------------------------------- */

export const seedTasks: Task[] = []

/* -------------------------------- Teams ---------------------------------- */

export const seedTeams: WorkspaceTeam[] = []

/* ------------------------------ Notes ------------------------------------ */

export const seedWorkspaceNotes: WorkspaceNote[] = []

/* ---------------------------- Check-ins ---------------------------------- */

export const seedCheckIns: WeeklyCheckIn[] = []

/* ----------------------------- Announcements ----------------------------- */

export const seedAnnouncements: Announcement[] = [
  {
    id: 'a_welcome',
    title: 'Welcome to the AfriVate Portal',
    body: 'Your employee portal is live. Use it to manage tasks, submit leave requests, recognise teammates, and stay up to date with company news. Reach out to People & Culture if you need anything.',
    audience: 'all',
    priority: 'info',
    postedById: 'u_admin',
    postedAt: isoToday(0),
    readBy: [],
  },
]

/* ----------------------------- Leave requests ---------------------------- */

export const seedLeave: LeaveRequest[] = []

/* ------------------------------ Onboarding ------------------------------- */

export const seedOnboardingVideos: OnboardingVideo[] = [
  {
    id: 'v_1',
    title: 'Welcome to AfriVate',
    section: 'Welcome & Culture',
    description: 'A short hello from our founder and an intro to who we are — a movement elevating Africa.',
    youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '0:00',
    order: 1,
  },
  {
    id: 'v_2',
    title: 'Our values & how we work',
    section: 'Welcome & Culture',
    description: 'The principles that guide every decision we make.',
    youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '0:00',
    order: 2,
  },
  {
    id: 'v_3',
    title: 'Setting up your tools',
    section: 'Tools & Processes',
    description: 'Everything you need to hit the ground running from day one.',
    youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '0:00',
    order: 3,
  },
  {
    id: 'v_4',
    title: 'How we run weekly check-ins',
    section: 'Tools & Processes',
    description: 'The accountability habit that keeps us aligned.',
    youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '0:00',
    order: 4,
  },
  {
    id: 'v_5',
    title: 'Your first 30 days',
    section: 'Your Role',
    description: 'What we expect, and what you can expect from us.',
    youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '0:00',
    order: 5,
  },
]

export const seedOnboardingChecklist: OnboardingChecklistItem[] = [
  { id: 'ck_1', label: 'Complete your profile in the directory', order: 1 },
  { id: 'ck_2', label: 'Read the staff handbook', link: '#', order: 2 },
  { id: 'ck_3', label: 'Schedule a 1-on-1 with your team lead', order: 3 },
  { id: 'ck_4', label: 'Set up your work tools', order: 4 },
  { id: 'ck_5', label: 'Submit your first weekly check-in', order: 5 },
]

export const seedOnboardingProgress: OnboardingProgress[] = []

/* ------------------------------ Documents ------------------------------- */

export const seedDocuments: DocumentItem[] = [
  {
    id: 'd_1',
    title: 'Staff Handbook',
    description: 'Policies, expectations, and everything you need to know as an AfriVate team member.',
    category: 'policies',
    fileName: 'afrivate-staff-handbook.pdf',
    fileSize: '—',
    uploadedById: 'u_hr',
    uploadedAt: isoToday(0),
  },
  {
    id: 'd_2',
    title: 'Brand Identity Guidelines',
    description: 'Official brand colours, typography, logo usage, and voice.',
    category: 'brand',
    fileName: 'afrivate-brand-guidelines.pdf',
    fileSize: '—',
    uploadedById: 'u_admin',
    uploadedAt: isoToday(0),
  },
]

/* ----------------------------- Recognition ------------------------------ */

export const seedRecognition: RecognitionPost[] = []

/* -------------------------------- Events -------------------------------- */

export const seedEvents: EventItem[] = []

export { weekStart, lastWeekStart }

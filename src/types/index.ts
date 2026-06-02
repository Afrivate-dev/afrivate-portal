export type Role = 'staff' | 'team_lead' | 'hr' | 'admin'

export interface User {
  id: string
  email: string
  /** Mock login only — never persist or send to client session (see AuthContext). */
  password?: string
  name: string
  role: Role
  department: string
  jobTitle: string
  joinedAt: string // ISO date
  /** HTTPS URL to a square headshot; falls back to initials if missing or broken. */
  avatarUrl?: string
  avatarColor?: string
  bio?: string
  skills?: string[]
  phone?: string
  /** e.g. "Lagos · Hybrid", "Remote · Nigeria" */
  workLocation?: string
  pronouns?: string
  linkedinUrl?: string
  /** People lead or line manager (user id). */
  reportsToId?: string
  active: boolean
}

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked'
export type TaskPriority = 'high' | 'medium' | 'low'
export type TaskCategory =
  | 'react'
  | 'wordpress'
  | 'performance'
  | 'nodejs'
  | 'freelance'
  | 'admin'
  | 'other'

export interface TaskActivityEntry {
  at: string
  by: string
  message: string
}

export interface Task {
  id: string
  ownerId: string
  /** Who is responsible for delivery; defaults to owner visually when omitted. */
  assigneeId?: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  category: TaskCategory
  dueDate?: string
  hoursLogged?: number
  estimatedHours?: number
  blockers?: string
  activity: TaskActivityEntry[]
  createdAt: string
  updatedAt: string
}

export interface WeeklyCheckIn {
  id: string
  userId: string
  weekStart: string // ISO date (Monday of that week)
  completed: string
  nextWeek: string
  blockers?: string
  hoursWorked: number
  submittedAt: string
}

export type AnnouncementPriority = 'info' | 'important' | 'urgent'

/** Image or video shown on an update — URLs usually point at afrivate.com uploads. */
export interface AnnouncementMedia {
  kind: 'image' | 'video'
  url: string
  caption?: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  audience: 'all' | string // department key or 'all'
  priority: AnnouncementPriority
  postedById: string
  postedAt: string
  readBy: string[] // user ids who have marked it read
  media?: AnnouncementMedia[]
}

export type LeaveType = 'annual' | 'sick' | 'compassionate'
export type LeaveStatus = 'pending' | 'approved' | 'declined'

export interface LeaveRequest {
  id: string
  userId: string
  type: LeaveType
  startDate: string
  endDate: string
  reason: string
  supportingDocName?: string
  status: LeaveStatus
  submittedAt: string
  reviewedById?: string
  reviewerNote?: string
}

export interface OnboardingVideo {
  id: string
  title: string
  section: string
  description: string
  youtubeUrl: string
  duration: string
  order: number
}

export interface OnboardingChecklistItem {
  id: string
  label: string
  link?: string
  order: number
}

export interface OnboardingProgress {
  userId: string
  watchedVideoIds: string[]
  completedChecklistIds: string[]
}

export interface DocumentItem {
  id: string
  title: string
  description?: string
  category: 'policies' | 'sops' | 'brand' | 'templates' | 'reports'
  fileName: string
  fileSize: string
  uploadedById: string
  uploadedAt: string
  hrOnly?: boolean
  managementOnly?: boolean
}

export interface RecognitionPost {
  id: string
  giverId: string
  receiverId: string
  message: string
  tag: 'great_work' | 'team_player' | 'innovation' | 'above_beyond' | 'leadership'
  createdAt: string
  reactedBy: string[]
}

export type InboxNotificationType = 'recognition' | 'task_mention' | 'task_assigned'

/** In-app inbox item (local mock; replace with server push later). */
export interface InboxNotification {
  id: string
  userId: string
  type: InboxNotificationType
  title: string
  body?: string
  link: string
  read: boolean
  createdAt: string
  fromUserId?: string
  taskId?: string
  recognitionId?: string
}

export interface EventItem {
  id: string
  title: string
  description?: string
  date: string
  startTime?: string
  endTime?: string
  location?: string
  audience: 'all' | string
  /** Workspace-created vs JSON / iCal feed (see hosting ical-json.php). */
  source?: 'workspace' | 'external'
}

export type NoteBlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bullet'
  | 'numbered'
  | 'todo'
  | 'divider'
  | 'quote'
  | 'callout'

export interface NoteBlock {
  id: string
  type: NoteBlockType
  text: string
  checked?: boolean
  /** ISO time when a to-do was marked done (for progress tracking). */
  checkedAt?: string
}

export type NoteShareScope = 'private' | 'workspace' | 'departments' | 'teams' | 'people'

export interface NoteShare {
  scope: NoteShareScope
  /** When scope is `departments`, use org department names (see User.department). */
  departments?: string[]
  teamIds?: string[]
  peopleUserIds?: string[]
  /** Emails allowed to view when they match a signed-in user, or shown as invites. */
  inviteEmails?: string[]
  /** Anyone with /notes?open=<id>&key=<linkToken> can view when enabled. */
  linkEnabled?: boolean
  linkToken?: string
}

/** Cross-functional or delivery groups — used for note sharing. */
export interface WorkspaceTeam {
  id: string
  name: string
  description?: string
  memberIds: string[]
}

/** Shared workspace notes — local-first; optional Supabase Realtime for multi-user sync. */
export interface WorkspaceNote {
  id: string
  title: string
  /** Plain-text export / legacy; kept in sync when `blocks` change. */
  body: string
  /** Notion-style content. */
  blocks: NoteBlock[]
  parentId: string | null
  iconEmoji?: string
  ownerId: string
  createdAt: string
  updatedAt: string
  updatedById: string
  /** Monotonic sync token (e.g. Date.now()) for last-writer-wins merges. */
  version: number
  share: NoteShare
}

/** Shown in directory / presence UI. */
export type UserAvailability = 'online' | 'away' | 'busy' | 'focusing'

/** What you're focused on — mapped to Supabase Realtime presence. */
export interface WorkspaceActivity {
  editingNoteId?: string | null
  viewingDocumentId?: string | null
  readingUpdateId?: string | null
  /** HR drafting a company update */
  composingUpdate?: boolean
}

export interface PresencePeer {
  userId: string
  name: string
  avatarUrl?: string
  availability: UserAvailability
  editingNoteId?: string | null
  viewingDocumentId?: string | null
  readingUpdateId?: string | null
  composingUpdate?: boolean
}

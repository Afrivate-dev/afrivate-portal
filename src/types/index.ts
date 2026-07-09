export type Role = 'staff' | 'assistant_lead' | 'team_lead' | 'hr' | 'admin'

export interface Department {
  id: string
  name: string
  description?: string
  headUserId?: string
  createdAt: string
}

/** Pending signup / access request metadata (HR+ admin view). */
export interface AccessRequest {
  userId: string
  message?: string
  preferredDepartmentId?: string
  jobTitle?: string
  status: 'pending' | 'acknowledged' | 'approved' | 'dismissed'
  requestedAt: string
}

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
  /** Set when HR/admin approves first-time portal access (null = never approved). */
  approvedAt?: string
}

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked'
export type TaskPriority = 'high' | 'medium' | 'low'
/** Open string type — actual values are managed at runtime via DataContext.taskCategories. */
export type TaskCategory = string

/** A label+id pair for task categories, editable by leads and above. */
export interface TaskCategoryItem {
  id: string
  label: string
}

export interface TaskActivityEntry {
  at: string
  by: string
  message: string
}

export interface Task {
  id: string
  ownerId: string
  /** @deprecated — kept for DB backward compat. Use assigneeIds instead. */
  assigneeId?: string
  /** One or more people responsible for delivery; empty means owner only. */
  assigneeIds?: string[]
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
  /** department = visible to dept leads; all = HR/admin org-wide */
  visibility?: 'department' | 'all'
}

export type AnnouncementPriority = 'info' | 'important' | 'urgent'

/** Image, video, or document attachment — used on memos, shout-outs, etc. */
export interface AnnouncementMedia {
  kind: 'image' | 'video' | 'document'
  url: string
  /** YouTube/Vimeo iframe src when link is an embed provider. */
  embedUrl?: string
  /** Display aspect ratio for embed players (defaults to 16:9). */
  embedAspect?: { width: number; height: number }
  fileName?: string
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
  /** general | digest (HR digest mirror) | policy */
  memoCategory?: string
}

export type LeaveType = 'annual' | 'sick' | 'emergency'
export type LeaveStatus = 'pending' | 'approved' | 'declined'

export interface LeaveComment {
  id: string
  leaveId: string
  userId: string
  body: string
  createdAt: string
}

export interface LeaveRequest {
  id: string
  userId: string
  type: LeaveType
  startDate: string
  endDate: string
  reason: string
  supportingDocName?: string
  /** Supabase storage path for supporting document upload */
  supportingDocPath?: string
  status: LeaveStatus
  submittedAt: string
  reviewedById?: string
  reviewerNote?: string
  /** HR may approve fewer days than requested. */
  approvedDays?: number
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
  /** Auto-complete when portal detects the related action. */
  autoKey?: 'profile_complete' | 'handbook_visit' | 'first_checkin' | 'directory_complete'
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
  /** Category id from documentCategories (managed in Resources). */
  category: string
  fileName: string
  fileSize: string
  /** Supabase storage path when file storage is enabled */
  filePath?: string
  uploadedById: string
  uploadedAt: string
  hrOnly?: boolean
  managementOnly?: boolean
  /** Staff must acknowledge reading this policy */
  requiresAcknowledgment?: boolean
}

export interface RecognitionPost {
  id: string
  giverId: string
  receiverId: string
  message: string
  /** Tag id from recognitionTags (managed in Shout-outs). */
  tag: string
  createdAt: string
  reactedBy: string[]
  media?: AnnouncementMedia[]
}

export interface RecognitionComment {
  id: string
  recognitionId: string
  userId: string
  body: string
  createdAt: string
}

/** In-app notification categories — keep in sync with `INBOX_NOTIFICATION_TYPES` in `@/lib/inboxNotifications`. */
export type InboxNotificationType =
  | 'recognition'
  | 'task_mention'
  | 'note_mention'
  | 'task_assigned'
  | 'access_request'
  | 'access_granted'
  | 'leave_update'
  | 'leave_comment'
  | 'recognition_comment'
  | 'survey_reminder'

/** In-app inbox item (local mock; replace with server push later). */
export interface InboxNotification {
  id: string
  userId: string
  /** Known types are listed in `InboxNotificationType`; DB may contain legacy values. */
  type: InboxNotificationType | string
  title: string
  body?: string
  link: string
  read: boolean
  createdAt: string
  fromUserId?: string
  taskId?: string
  noteId?: string
  leaveId?: string
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

/** Cross-functional or delivery groups — used for note sharing and org structure. */
export interface WorkspaceTeam {
  id: string
  name: string
  description?: string
  memberIds: string[]
  departmentId?: string
  leadUserId?: string
  asstLeadUserId?: string
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

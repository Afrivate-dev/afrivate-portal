import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Announcement,
  DocumentItem,
  EventItem,
  InboxNotification,
  LeaveRequest,
  OnboardingChecklistItem,
  OnboardingProgress,
  OnboardingVideo,
  RecognitionPost,
  Role,
  Task,
  TaskActivityEntry,
  User,
  WeeklyCheckIn,
  WorkspaceTeam,
} from '@/types'

function parseRole(raw: unknown): Role {
  const r = String(raw ?? '')
  if (r === 'admin' || r === 'hr' || r === 'team_lead' || r === 'staff') return r
  return 'staff'
}

function skillsFromJson(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out = raw.filter((x): x is string => typeof x === 'string')
  return out.length ? out : undefined
}

/** `profiles` row → `User` (no password). */
export function profileRowToUser(row: Record<string, unknown>): User {
  const joined =
    row.joined_at != null
      ? String(row.joined_at).slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  return {
    id: String(row.id),
    email: String(row.email ?? ''),
    name: String(row.name ?? 'User'),
    role: parseRole(row.role),
    department: String(row.department ?? 'General'),
    jobTitle: String(row.job_title ?? 'Staff'),
    joinedAt: joined,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    avatarColor: row.avatar_color ? String(row.avatar_color) : undefined,
    bio: row.bio ? String(row.bio) : undefined,
    skills: skillsFromJson(row.skills),
    phone: row.phone ? String(row.phone) : undefined,
    workLocation: row.work_location ? String(row.work_location) : undefined,
    pronouns: row.pronouns ? String(row.pronouns) : undefined,
    linkedinUrl: row.linkedin_url ? String(row.linkedin_url) : undefined,
    reportsToId: row.reports_to_id ? String(row.reports_to_id) : undefined,
    active: row.active !== false,
  }
}

export function userToProfilePatch(u: User): Record<string, unknown> {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    department: u.department,
    job_title: u.jobTitle,
    joined_at: u.joinedAt.slice(0, 10),
    avatar_url: u.avatarUrl ?? null,
    avatar_color: u.avatarColor ?? null,
    bio: u.bio ?? null,
    skills: u.skills ?? [],
    phone: u.phone ?? null,
    work_location: u.workLocation ?? null,
    pronouns: u.pronouns ?? null,
    linkedin_url: u.linkedinUrl ?? null,
    reports_to_id: u.reportsToId ?? null,
    active: u.active,
    updated_at: new Date().toISOString(),
  }
}

export function readStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string')
}

export function rowToTask(r: Record<string, unknown>): Task {
  return {
    id: String(r.id),
    ownerId: String(r.owner_id),
    assigneeId: r.assignee_id ? String(r.assignee_id) : undefined,
    title: String(r.title ?? ''),
    description: r.description ? String(r.description) : undefined,
    status: r.status as Task['status'],
    priority: r.priority as Task['priority'],
    category: r.category as Task['category'],
    dueDate: r.due_date ? String(r.due_date) : undefined,
    hoursLogged: r.hours_logged != null ? Number(r.hours_logged) : undefined,
    estimatedHours: r.estimated_hours != null ? Number(r.estimated_hours) : undefined,
    blockers: r.blockers ? String(r.blockers) : undefined,
    activity: Array.isArray(r.activity)
      ? (r.activity as TaskActivityEntry[])
      : [],
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  }
}

export function taskToInsertRow(t: Task): Record<string, unknown> {
  return {
    id: t.id,
    owner_id: t.ownerId,
    assignee_id: t.assigneeId ?? null,
    title: t.title,
    description: t.description ?? null,
    status: t.status,
    priority: t.priority,
    category: t.category,
    due_date: t.dueDate ?? null,
    hours_logged: t.hoursLogged ?? null,
    estimated_hours: t.estimatedHours ?? null,
    blockers: t.blockers ?? null,
    activity: t.activity,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  }
}

export function rowToCheckIn(r: Record<string, unknown>): WeeklyCheckIn {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    weekStart: String(r.week_start),
    completed: String(r.completed ?? ''),
    nextWeek: String(r.next_week ?? ''),
    blockers: r.blockers ? String(r.blockers) : undefined,
    hoursWorked: Number(r.hours_worked ?? 0),
    submittedAt: String(r.submitted_at),
  }
}

export function rowToAnnouncement(r: Record<string, unknown>): Announcement {
  const mediaRaw = r.media
  const media = Array.isArray(mediaRaw) && mediaRaw.length ? (mediaRaw as Announcement['media']) : undefined
  return {
    id: String(r.id),
    title: String(r.title ?? ''),
    body: String(r.body ?? ''),
    audience: String(r.audience ?? 'all') as Announcement['audience'],
    priority: String(r.priority ?? 'info') as Announcement['priority'],
    postedById: String(r.posted_by_id),
    postedAt: String(r.posted_at),
    readBy: readStringArray(r.read_by),
    media,
  }
}

export function rowToLeave(r: Record<string, unknown>): LeaveRequest {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    type: String(r.type) as LeaveRequest['type'],
    startDate: String(r.start_date),
    endDate: String(r.end_date),
    reason: String(r.reason ?? ''),
    supportingDocName: r.supporting_doc_name ? String(r.supporting_doc_name) : undefined,
    status: String(r.status) as LeaveRequest['status'],
    submittedAt: String(r.submitted_at),
    reviewedById: r.reviewed_by_id ? String(r.reviewed_by_id) : undefined,
    reviewerNote: r.reviewer_note ? String(r.reviewer_note) : undefined,
  }
}

export function rowToOnboardingVideo(r: Record<string, unknown>): OnboardingVideo {
  return {
    id: String(r.id),
    title: String(r.title ?? ''),
    section: String(r.section ?? ''),
    description: String(r.description ?? ''),
    youtubeUrl: String(r.youtube_url ?? ''),
    duration: String(r.duration ?? ''),
    order: Number(r.sort_order ?? 0),
  }
}

export function videoToRow(v: OnboardingVideo): Record<string, unknown> {
  return {
    id: v.id,
    title: v.title,
    section: v.section,
    description: v.description,
    youtube_url: v.youtubeUrl,
    duration: v.duration,
    sort_order: v.order,
  }
}

export function rowToChecklistItem(r: Record<string, unknown>): OnboardingChecklistItem {
  return {
    id: String(r.id),
    label: String(r.label ?? ''),
    link: r.link ? String(r.link) : undefined,
    order: Number(r.sort_order ?? 0),
  }
}

export function checklistToRow(c: OnboardingChecklistItem): Record<string, unknown> {
  return {
    id: c.id,
    label: c.label,
    link: c.link ?? null,
    sort_order: c.order,
  }
}

export function rowToOnboardingProgress(r: Record<string, unknown>): OnboardingProgress {
  return {
    userId: String(r.user_id),
    watchedVideoIds: readStringArray(r.watched_video_ids),
    completedChecklistIds: readStringArray(r.completed_checklist_ids),
  }
}

export function rowToDocument(r: Record<string, unknown>): DocumentItem {
  return {
    id: String(r.id),
    title: String(r.title ?? ''),
    description: r.description ? String(r.description) : undefined,
    category: String(r.category) as DocumentItem['category'],
    fileName: String(r.file_name ?? ''),
    fileSize: String(r.file_size ?? ''),
    uploadedById: String(r.uploaded_by_id),
    uploadedAt: String(r.uploaded_at),
    hrOnly: Boolean(r.hr_only),
    managementOnly: Boolean(r.management_only),
  }
}

export function rowToRecognition(r: Record<string, unknown>): RecognitionPost {
  return {
    id: String(r.id),
    giverId: String(r.giver_id),
    receiverId: String(r.receiver_id),
    message: String(r.message ?? ''),
    tag: String(r.tag) as RecognitionPost['tag'],
    createdAt: String(r.created_at),
    reactedBy: readStringArray(r.reacted_by),
  }
}

export function rowToInbox(r: Record<string, unknown>): InboxNotification {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    type: String(r.type) as InboxNotification['type'],
    title: String(r.title ?? ''),
    body: r.body ? String(r.body) : undefined,
    link: String(r.link ?? '/'),
    read: Boolean(r.read),
    createdAt: String(r.created_at),
    fromUserId: r.from_user_id ? String(r.from_user_id) : undefined,
    taskId: r.task_id ? String(r.task_id) : undefined,
    recognitionId: r.recognition_id ? String(r.recognition_id) : undefined,
  }
}

export function rowToEvent(r: Record<string, unknown>): EventItem {
  return {
    id: String(r.id),
    title: String(r.title ?? ''),
    description: r.description ? String(r.description) : undefined,
    date: String(r.event_date),
    startTime: r.start_time ? String(r.start_time) : undefined,
    endTime: r.end_time ? String(r.end_time) : undefined,
    location: r.location ? String(r.location) : undefined,
    audience: String(r.audience ?? 'all') as EventItem['audience'],
    source: (r.source ? String(r.source) : 'workspace') as EventItem['source'],
  }
}

export interface PortalDataset {
  users: User[]
  tasks: Task[]
  checkIns: WeeklyCheckIn[]
  announcements: Announcement[]
  leaveRequests: LeaveRequest[]
  onboardingVideos: OnboardingVideo[]
  onboardingChecklist: OnboardingChecklistItem[]
  onboardingProgress: OnboardingProgress[]
  documents: DocumentItem[]
  recognition: RecognitionPost[]
  inbox: InboxNotification[]
  events: EventItem[]
  teams: WorkspaceTeam[]
}

export async function fetchPortalDataset(client: SupabaseClient): Promise<PortalDataset> {
  const [
    profilesRes,
    tasksRes,
    checkInsRes,
    annRes,
    leaveRes,
    vidRes,
    clRes,
    progRes,
    docRes,
    recRes,
    inboxRes,
    eventsRes,
    teamsRes,
    membersRes,
  ] = await Promise.all([
    client.from('profiles').select('*').order('name'),
    client.from('portal_tasks').select('*').order('updated_at', { ascending: false }),
    client.from('portal_weekly_check_ins').select('*').order('submitted_at', { ascending: false }),
    client.from('portal_announcements').select('*').order('posted_at', { ascending: false }),
    client.from('portal_leave_requests').select('*').order('submitted_at', { ascending: false }),
    client.from('portal_onboarding_videos').select('*').order('sort_order'),
    client.from('portal_onboarding_checklist').select('*').order('sort_order'),
    client.from('portal_onboarding_progress').select('*'),
    client.from('portal_documents').select('*').order('uploaded_at', { ascending: false }),
    client.from('portal_recognition_posts').select('*').order('created_at', { ascending: false }),
    client.from('portal_inbox_notifications').select('*').order('created_at', { ascending: false }),
    client.from('portal_events').select('*').order('event_date'),
    client.from('portal_teams').select('*').order('name'),
    client.from('portal_team_members').select('team_id, user_id'),
  ])

  const err =
    profilesRes.error ||
    tasksRes.error ||
    checkInsRes.error ||
    annRes.error ||
    leaveRes.error ||
    vidRes.error ||
    clRes.error ||
    progRes.error ||
    docRes.error ||
    recRes.error ||
    inboxRes.error ||
    eventsRes.error ||
    teamsRes.error ||
    membersRes.error

  if (err) throw new Error(err.message)

  const memberMap = new Map<string, string[]>()
  for (const m of membersRes.data ?? []) {
    const row = m as Record<string, unknown>
    const tid = String(row.team_id)
    const uid = String(row.user_id)
    const list = memberMap.get(tid) ?? []
    list.push(uid)
    memberMap.set(tid, list)
  }

  const teams: WorkspaceTeam[] = (teamsRes.data ?? []).map((t) => {
    const row = t as Record<string, unknown>
    const id = String(row.id)
    return {
      id,
      name: String(row.name ?? ''),
      description: row.description ? String(row.description) : undefined,
      memberIds: memberMap.get(id) ?? [],
    }
  })

  return {
    users: (profilesRes.data ?? []).map((r) => profileRowToUser(r as Record<string, unknown>)),
    tasks: (tasksRes.data ?? []).map((r) => rowToTask(r as Record<string, unknown>)),
    checkIns: (checkInsRes.data ?? []).map((r) => rowToCheckIn(r as Record<string, unknown>)),
    announcements: (annRes.data ?? []).map((r) => rowToAnnouncement(r as Record<string, unknown>)),
    leaveRequests: (leaveRes.data ?? []).map((r) => rowToLeave(r as Record<string, unknown>)),
    onboardingVideos: (vidRes.data ?? []).map((r) => rowToOnboardingVideo(r as Record<string, unknown>)),
    onboardingChecklist: (clRes.data ?? []).map((r) => rowToChecklistItem(r as Record<string, unknown>)),
    onboardingProgress: (progRes.data ?? []).map((r) => rowToOnboardingProgress(r as Record<string, unknown>)),
    documents: (docRes.data ?? []).map((r) => rowToDocument(r as Record<string, unknown>)),
    recognition: (recRes.data ?? []).map((r) => rowToRecognition(r as Record<string, unknown>)),
    inbox: (inboxRes.data ?? []).map((r) => rowToInbox(r as Record<string, unknown>)),
    events: (eventsRes.data ?? []).map((r) => rowToEvent(r as Record<string, unknown>)),
    teams,
  }
}

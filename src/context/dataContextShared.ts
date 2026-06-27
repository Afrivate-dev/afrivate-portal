import { createContext, useContext } from 'react'
import type {
  AccessRequest,
  Announcement,
  Department,
  DocumentItem,
  EventItem,
  InboxNotification,
  LeaveComment,
  LeaveRequest,
  OnboardingChecklistItem,
  OnboardingProgress,
  OnboardingVideo,
  RecognitionPost,
  RecognitionComment,
  Task,
  TaskCategoryItem,
  User,
  WeeklyCheckIn,
  WorkspaceTeam,
} from '@/types'

/** True when account has never been approved (new signup), vs deactivated staff. */
export function isFirstTimePendingUser(u: User): boolean {
  return !u.active && !u.approvedAt
}

/** Inactive users awaiting first-time approval (not deactivated staff). */
export function usersAwaitingApproval(users: User[]): User[] {
  return users.filter(isFirstTimePendingUser)
}

export interface DataContextValue {
  users: User[]
  updateUser: (id: string, patch: Partial<User>, onError?: (msg: string) => void) => void
  /** Create a new local user with a plaintext password (mock mode only). No-op in Supabase mode. */
  addUser: (email: string, name: string, password: string) => User

  tasks: Task[]
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'activity'>) => Task
  updateTask: (id: string, patch: Partial<Task>, by?: string, note?: string) => void
  deleteTask: (id: string) => void

  checkIns: WeeklyCheckIn[]
  submitCheckIn: (entry: Omit<WeeklyCheckIn, 'id' | 'submittedAt'>) => WeeklyCheckIn
  updateCheckIn: (id: string, patch: Partial<WeeklyCheckIn>) => void

  announcements: Announcement[]
  createAnnouncement: (a: Omit<Announcement, 'id' | 'postedAt' | 'readBy'>) => Announcement
  updateAnnouncement: (id: string, patch: Partial<Announcement>) => void
  deleteAnnouncement: (id: string) => void
  markAnnouncementRead: (id: string, userId: string) => void
  markAllAnnouncementsRead: (userId: string) => void

  leaveRequests: LeaveRequest[]
  leaveComments: LeaveComment[]
  submitLeave: (l: Omit<LeaveRequest, 'id' | 'submittedAt' | 'status'>) => LeaveRequest
  reviewLeave: (
    id: string,
    status: 'approved' | 'declined',
    reviewerId: string,
    note?: string,
    approvedDays?: number,
  ) => void
  addLeaveComment: (leaveId: string, body: string) => void

  onboardingVideos: OnboardingVideo[]
  onboardingChecklist: OnboardingChecklistItem[]
  onboardingProgress: OnboardingProgress[]
  toggleVideoWatched: (userId: string, videoId: string) => void
  toggleChecklistItem: (userId: string, itemId: string) => void
  addOnboardingVideo: (v: Omit<OnboardingVideo, 'id'>) => void
  updateOnboardingVideo: (id: string, patch: Partial<OnboardingVideo>) => void
  deleteOnboardingVideo: (id: string) => void
  addOnboardingChecklistItem: (item: Omit<OnboardingChecklistItem, 'id'>) => void
  updateOnboardingChecklistItem: (id: string, patch: Partial<OnboardingChecklistItem>) => void
  deleteOnboardingChecklistItem: (id: string) => void

  documents: DocumentItem[]
  addDocument: (d: Omit<DocumentItem, 'id' | 'uploadedAt'>) => void
  deleteDocument: (id: string) => void

  recognition: RecognitionPost[]
  recognitionComments: RecognitionComment[]
  giveRecognition: (r: Omit<RecognitionPost, 'id' | 'createdAt' | 'reactedBy'>) => void
  deleteRecognition: (id: string) => void
  toggleRecognitionReaction: (id: string, userId: string) => void
  addRecognitionComment: (recognitionId: string, body: string) => void

  inbox: InboxNotification[]
  markInboxRead: (id: string) => void
  markAllInboxRead: (userId: string) => void
  /** Create inbox rows for mentions, leave updates, etc. */
  sendInboxNotifications: (rows: Omit<InboxNotification, 'read'>[]) => void

  events: EventItem[]
  addEvent: (e: Omit<EventItem, 'id'>) => void

  teams: WorkspaceTeam[]
  addTeam: (t: Omit<WorkspaceTeam, 'id' | 'memberIds'>) => void
  updateTeam: (id: string, patch: Partial<WorkspaceTeam>) => void
  deleteTeam: (id: string) => void

  departments: Department[]
  addDepartment: (d: Omit<Department, 'id' | 'createdAt'>) => void
  updateDepartment: (id: string, patch: Partial<Department>) => void
  deleteDepartment: (id: string) => void

  /** HR/admin or department head — sets department + reports-to (dept head). */
  assignUserToDepartment: (userId: string, departmentId: string) => Promise<{ ok: boolean; error?: string }>
  /** HR/admin or team lead — add/remove team membership. */
  setUserTeamMembership: (
    userId: string,
    teamId: string,
    member: boolean,
  ) => Promise<{ ok: boolean; error?: string }>

  /** Users with active=false awaiting admin approval */
  pendingUsers: User[]
  /** Access request details for pending users (HR+ admin). */
  accessRequests: AccessRequest[]
  approveUser: (
    id: string,
    role: import('@/types').Role,
    department: string,
    jobTitle: string,
  ) => Promise<{ ok: boolean; error?: string; emailSent?: boolean }>

  /** Task categories — managed by assistant_lead and above. */
  taskCategories: TaskCategoryItem[]
  addTaskCategory: (label: string) => void
  updateTaskCategory: (id: string, label: string) => void
  deleteTaskCategory: (id: string) => void

  /** Resources document categories — managed by team leads and above. */
  documentCategories: TaskCategoryItem[]
  addDocumentCategory: (label: string) => void
  updateDocumentCategory: (id: string, label: string) => void
  deleteDocumentCategory: (id: string) => void

  /** Shout-out tags — managed by team leads and above. */
  recognitionTags: TaskCategoryItem[]
  addRecognitionTag: (label: string) => void
  updateRecognitionTag: (id: string, label: string) => void
  deleteRecognitionTag: (id: string) => void

  /** `loading` only in Supabase mode during fetch. Local mode stays `ready`. */
  dataStatus: 'ready' | 'loading' | 'error'
  dataError: string | null
  reloadData: () => Promise<void>
}

export const DataContext = createContext<DataContextValue | null>(null)

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}

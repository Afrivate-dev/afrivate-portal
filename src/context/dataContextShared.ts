import { createContext, useContext } from 'react'
import type {
  AccessRequest,
  Announcement,
  Department,
  DocumentItem,
  EventItem,
  InboxNotification,
  LeaveRequest,
  OnboardingChecklistItem,
  OnboardingProgress,
  OnboardingVideo,
  RecognitionPost,
  Task,
  TaskCategoryItem,
  User,
  WeeklyCheckIn,
  WorkspaceTeam,
} from '@/types'

/** Inactive users who have submitted a pending access request (not deactivated staff). */
export function usersAwaitingApproval(users: User[], accessRequests: AccessRequest[]): User[] {
  const awaitingIds = new Set(
    accessRequests
      .filter((r) => r.status === 'pending' || r.status === 'acknowledged')
      .map((r) => r.userId),
  )
  return users.filter((u) => !u.active && awaitingIds.has(u.id))
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
  submitLeave: (l: Omit<LeaveRequest, 'id' | 'submittedAt' | 'status'>) => LeaveRequest
  reviewLeave: (id: string, status: 'approved' | 'declined', reviewerId: string, note?: string) => void

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
  giveRecognition: (r: Omit<RecognitionPost, 'id' | 'createdAt' | 'reactedBy'>) => void
  toggleRecognitionReaction: (id: string, userId: string) => void

  inbox: InboxNotification[]
  markInboxRead: (id: string) => void
  markAllInboxRead: (userId: string) => void

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

  /** Task categories — managed by assistant_lead and above. Stored client-side. */
  taskCategories: TaskCategoryItem[]
  addTaskCategory: (label: string) => void
  updateTaskCategory: (id: string, label: string) => void
  deleteTaskCategory: (id: string) => void

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

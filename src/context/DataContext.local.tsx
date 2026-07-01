/**
 * Local-first portal data (seed + localStorage). Used when `VITE_USE_SUPABASE_DATA` is off.
 */
import { useCallback, useMemo } from 'react'
import { DataContext, type DataContextValue, usersAwaitingApproval } from '@/context/dataContextShared'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import {
  seedAnnouncements,
  seedCheckIns,
  seedDocuments,
  seedEvents,
  seedLeave,
  seedOnboardingChecklist,
  seedOnboardingProgress,
  seedOnboardingVideos,
  seedRecognition,
  seedTasks,
  seedTeams,
} from '@/data/mockData'
import {
  DEFAULT_AWARD_CATEGORIES,
  DEFAULT_EXIT_REASONS,
  DEFAULT_GRIEVANCE_CATEGORIES,
  DEFAULT_MEMO_CATEGORIES,
  DEFAULT_PULSE_SURVEY_TEMPLATES,
  labelToConfigId,
} from '@/lib/portalConfig'
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
  RecognitionComment,
  Role,
  Task,
  TaskActivityEntry,
  TaskCategoryItem,
  User,
  WeeklyCheckIn,
  WorkspaceTeam,
} from '@/types'
import type { PulseSurveyTemplate } from '@/types/hr'

const DEFAULT_TASK_CATEGORIES: TaskCategoryItem[] = [
  { id: 'react',       label: 'React / Frontend' },
  { id: 'wordpress',   label: 'WordPress' },
  { id: 'performance', label: 'Performance' },
  { id: 'nodejs',      label: 'Node.js' },
  { id: 'freelance',   label: 'Freelance' },
  { id: 'admin',       label: 'Operations' },
  { id: 'other',       label: 'Other' },
]
import { newlyMentionedUserIds, uid } from '@/utils/helpers'
import {
  DEFAULT_DOCUMENT_CATEGORIES,
  DEFAULT_RECOGNITION_TAGS,
} from '@/lib/portalLabelCategories'

export function LocalDataProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useLocalStorage<User[]>('av-users', [])
  const [tasks, setTasks] = useLocalStorage<Task[]>('av-tasks', seedTasks)
  const [checkIns, setCheckIns] = useLocalStorage<WeeklyCheckIn[]>('av-checkins-v2', seedCheckIns)
  const [announcements, setAnnouncements] = useLocalStorage<Announcement[]>(
    'av-announcements',
    seedAnnouncements,
  )
  const [leaveRequests, setLeaveRequests] = useLocalStorage<LeaveRequest[]>('av-leave', seedLeave)
  const [onboardingVideos, setOnboardingVideos] = useLocalStorage<OnboardingVideo[]>(
    'av-onboarding-videos',
    seedOnboardingVideos,
  )
  const [onboardingChecklist, setOnboardingChecklist] = useLocalStorage<OnboardingChecklistItem[]>(
    'av-onboarding-checklist',
    seedOnboardingChecklist,
  )
  const [onboardingProgress, setOnboardingProgress] = useLocalStorage<OnboardingProgress[]>(
    'av-onboarding-progress',
    seedOnboardingProgress,
  )
  const [documents, setDocuments] = useLocalStorage<DocumentItem[]>('av-documents', seedDocuments)
  const [recognition, setRecognition] = useLocalStorage<RecognitionPost[]>(
    'av-recognition',
    seedRecognition,
  )
  const [recognitionComments, setRecognitionComments] = useLocalStorage<RecognitionComment[]>(
    'av-recognition-comments',
    [],
  )
  const [events, setEvents] = useLocalStorage<EventItem[]>('av-events', seedEvents)
  const [inbox, setInbox] = useLocalStorage<InboxNotification[]>('av-inbox', [])

  /* ------------------------------- Users -------------------------------- */
  const updateUser = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (id: string, patch: Partial<User>, _onError?: (msg: string) => void) =>
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u))),
    [setUsers],
  )

  const addUser = useCallback<DataContextValue['addUser']>(
    (email, name, password) => {
      const newUser: User = {
        id: 'u_' + uid(),
        email: email.trim().toLowerCase(),
        name: name.trim() || email.split('@')[0],
        role: 'staff',
        department: 'General',
        jobTitle: 'Staff',
        joinedAt: new Date().toISOString(),
        active: true,
        password,
      }
      setUsers((prev) => [...prev, newUser])
      return newUser
    },
    [setUsers],
  )

  const markInboxRead = useCallback(
    (id: string) =>
      setInbox((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))),
    [setInbox],
  )

  const markAllInboxRead = useCallback(
    (userId: string) =>
      setInbox((prev) =>
        prev.map((n) => (n.userId === userId && !n.read ? { ...n, read: true } : n)),
      ),
    [setInbox],
  )

  const sendInboxNotifications = useCallback<DataContextValue['sendInboxNotifications']>(
    (rows) => {
      const full: InboxNotification[] = rows.map((r) => ({ ...r, read: false }))
      setInbox((prev) => [...full, ...prev])
    },
    [setInbox],
  )

  const [leaveComments, setLeaveComments] = useLocalStorage<import('@/types').LeaveComment[]>(
    'av-leave-comments',
    [],
  )

  /* ------------------------------- Tasks -------------------------------- */
  const createTask: DataContextValue['createTask'] = useCallback(
    (input) => {
      const now = new Date().toISOString()
      const task: Task = {
        ...input,
        id: 't_' + uid(),
        createdAt: now,
        updatedAt: now,
        activity: [{ at: now, by: input.ownerId, message: 'Created task' }],
      }
      setTasks((prev) => [task, ...prev])

      const inboxRows: InboxNotification[] = []
      const actor = input.ownerId
      const newAssigneeIds = [
        ...(input.assigneeIds ?? []),
        ...(input.assigneeId && !input.assigneeIds?.length ? [input.assigneeId] : []),
      ].filter((id) => id !== actor)

      for (const aId of newAssigneeIds) {
        const owner = users.find((u) => u.id === actor)
        inboxRows.push({
          id: 'n_' + uid(),
          userId: aId,
          type: 'task_assigned',
          title: owner ? `${owner.name} assigned you a task` : 'You were assigned a task',
          body: task.title,
          link: `/tasks?open=${task.id}`,
          read: false,
          createdAt: now,
          fromUserId: actor,
          taskId: task.id,
        })
      }

      for (const mid of newlyMentionedUserIds('', input.description, users)) {
        if (mid === actor) continue
        const mentioner = users.find((u) => u.id === actor)
        inboxRows.push({
          id: 'n_' + uid(),
          userId: mid,
          type: 'task_mention',
          title: mentioner ? `${mentioner.name} mentioned you in a task` : 'You were mentioned in a task',
          body: task.title,
          link: `/tasks?open=${task.id}`,
          read: false,
          createdAt: now,
          fromUserId: actor,
          taskId: task.id,
        })
      }

      if (inboxRows.length) setInbox((prev) => [...inboxRows, ...prev])
      return task
    },
    [setTasks, setInbox, users],
  )

  const updateTask: DataContextValue['updateTask'] = useCallback(
    (id, patch, by, note) => {
      const now = new Date().toISOString()
      const pendingInbox: InboxNotification[] = []

      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t
          const log: TaskActivityEntry[] = []
          if (note && by) log.push({ at: now, by, message: note })
          if (patch.status && patch.status !== t.status && by) {
            const label: Record<Task['status'], string> = {
              todo: 'To Do',
              in_progress: 'In Progress',
              done: 'Done',
              blocked: 'Blocked',
            }
            log.push({ at: now, by, message: `Status → ${label[patch.status]}` })
          }

          const nextDescription =
            patch.description !== undefined ? patch.description : t.description

          if (by) {
            if ('assigneeIds' in patch && patch.assigneeIds) {
              const prevIds = t.assigneeIds ?? (t.assigneeId ? [t.assigneeId] : [])
              const newIds = patch.assigneeIds.filter(
                (id) => !prevIds.includes(id) && id !== t.ownerId && id !== by,
              )
              const assigner = users.find((u) => u.id === by)
              for (const aId of newIds) {
                pendingInbox.push({
                  id: 'n_' + uid(),
                  userId: aId,
                  type: 'task_assigned',
                  title: assigner ? `${assigner.name} assigned you a task` : 'You were assigned a task',
                  body: t.title,
                  link: `/tasks?open=${t.id}`,
                  read: false,
                  createdAt: now,
                  fromUserId: by,
                  taskId: t.id,
                })
              }
            }
            for (const mid of newlyMentionedUserIds(t.description, nextDescription, users)) {
              if (mid === by) continue
              const mentioner = users.find((u) => u.id === by)
              pendingInbox.push({
                id: 'n_' + uid(),
                userId: mid,
                type: 'task_mention',
                title: mentioner ? `${mentioner.name} mentioned you in a task` : 'You were mentioned in a task',
                body: t.title,
                link: `/tasks?open=${t.id}`,
                read: false,
                createdAt: now,
                fromUserId: by,
                taskId: t.id,
              })
            }
          }

          const merged: Task = {
            ...t,
            ...patch,
            assigneeIds:
              'assigneeIds' in patch
                ? (patch.assigneeIds ?? [])
                : t.assigneeIds ?? (t.assigneeId ? [t.assigneeId] : []),
            assigneeId:
              'assigneeIds' in patch
                ? patch.assigneeIds?.[0] ?? undefined
                : t.assigneeId,
            updatedAt: now,
            activity: log.length ? [...t.activity, ...log] : t.activity,
          }
          return merged
        }),
      )

      if (pendingInbox.length) setInbox((p) => [...pendingInbox, ...p])
    },
    [setTasks, setInbox, users],
  )

  const deleteTask = useCallback(
    (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id)),
    [setTasks],
  )

  /* ----------------------------- Check-ins ------------------------------ */
  const submitCheckIn: DataContextValue['submitCheckIn'] = useCallback(
    (entry) => {
      const record: WeeklyCheckIn = {
        ...entry,
        id: 'ci_' + uid(),
        submittedAt: new Date().toISOString(),
      }
      setCheckIns((prev) => [record, ...prev])
      return record
    },
    [setCheckIns],
  )

  const updateCheckIn: DataContextValue['updateCheckIn'] = useCallback(
    (id, patch) =>
      setCheckIns((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    [setCheckIns],
  )

  /* --------------------------- Announcements ---------------------------- */
  const createAnnouncement: DataContextValue['createAnnouncement'] = useCallback(
    (input) => {
      const a: Announcement = {
        ...input,
        id: 'a_' + uid(),
        postedAt: new Date().toISOString(),
        readBy: [],
      }
      setAnnouncements((prev) => [a, ...prev])
      return a
    },
    [setAnnouncements],
  )

  const updateAnnouncement: DataContextValue['updateAnnouncement'] = useCallback(
    (id, patch) =>
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a))),
    [setAnnouncements],
  )

  const deleteAnnouncement = useCallback(
    (id: string) => setAnnouncements((prev) => prev.filter((a) => a.id !== id)),
    [setAnnouncements],
  )

  const markAnnouncementRead: DataContextValue['markAnnouncementRead'] = useCallback(
    (id, userId) =>
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === id && !a.readBy.includes(userId) ? { ...a, readBy: [...a.readBy, userId] } : a,
        ),
      ),
    [setAnnouncements],
  )

  const markAllAnnouncementsRead: DataContextValue['markAllAnnouncementsRead'] = useCallback(
    (userId) =>
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.readBy.includes(userId) ? a : { ...a, readBy: [...a.readBy, userId] },
        ),
      ),
    [setAnnouncements],
  )

  /* ------------------------------- Leave -------------------------------- */
  const submitLeave: DataContextValue['submitLeave'] = useCallback(
    (input) => {
      const l: LeaveRequest = {
        ...input,
        id: 'l_' + uid(),
        status: 'pending',
        submittedAt: new Date().toISOString(),
      }
      setLeaveRequests((prev) => [l, ...prev])
      return l
    },
    [setLeaveRequests],
  )

  const reviewLeave: DataContextValue['reviewLeave'] = useCallback(
    (id, status, reviewerId, note, approvedDays) =>
      setLeaveRequests((prev) =>
        prev.map((l) =>
          l.id === id
            ? { ...l, status, reviewedById: reviewerId, reviewerNote: note, approvedDays }
            : l,
        ),
      ),
    [setLeaveRequests],
  )

  const addLeaveComment: DataContextValue['addLeaveComment'] = useCallback(
    (leaveId, body) => {
      if (!body.trim()) return
      setLeaveComments((prev) => [
        ...prev,
        {
          id: 'lc_' + uid(),
          leaveId,
          userId: 'local',
          body: body.trim(),
          createdAt: new Date().toISOString(),
        },
      ])
    },
    [setLeaveComments],
  )

  /* ----------------------------- Onboarding ----------------------------- */
  const toggleVideoWatched: DataContextValue['toggleVideoWatched'] = useCallback(
    (userId, videoId) =>
      setOnboardingProgress((prev) => {
        const existing = prev.find((p) => p.userId === userId)
        if (!existing) {
          return [...prev, { userId, watchedVideoIds: [videoId], completedChecklistIds: [] }]
        }
        const watched = existing.watchedVideoIds.includes(videoId)
          ? existing.watchedVideoIds.filter((v) => v !== videoId)
          : [...existing.watchedVideoIds, videoId]
        return prev.map((p) => (p.userId === userId ? { ...p, watchedVideoIds: watched } : p))
      }),
    [setOnboardingProgress],
  )

  const toggleChecklistItem: DataContextValue['toggleChecklistItem'] = useCallback(
    (userId, itemId) =>
      setOnboardingProgress((prev) => {
        const existing = prev.find((p) => p.userId === userId)
        if (!existing) {
          return [...prev, { userId, watchedVideoIds: [], completedChecklistIds: [itemId] }]
        }
        const done = existing.completedChecklistIds.includes(itemId)
          ? existing.completedChecklistIds.filter((v) => v !== itemId)
          : [...existing.completedChecklistIds, itemId]
        return prev.map((p) => (p.userId === userId ? { ...p, completedChecklistIds: done } : p))
      }),
    [setOnboardingProgress],
  )

  const addOnboardingVideo: DataContextValue['addOnboardingVideo'] = useCallback(
    (v) => setOnboardingVideos((prev) => [...prev, { ...v, id: 'v_' + uid() }]),
    [setOnboardingVideos],
  )

  const updateOnboardingVideo: DataContextValue['updateOnboardingVideo'] = useCallback(
    (id, patch) =>
      setOnboardingVideos((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v))),
    [setOnboardingVideos],
  )

  const deleteOnboardingVideo: DataContextValue['deleteOnboardingVideo'] = useCallback(
    (id) => {
      setOnboardingVideos((prev) => prev.filter((v) => v.id !== id))
      setOnboardingProgress((prev) =>
        prev.map((p) => ({
          ...p,
          watchedVideoIds: p.watchedVideoIds.filter((vid) => vid !== id),
        })),
      )
    },
    [setOnboardingVideos, setOnboardingProgress],
  )

  const addOnboardingChecklistItem: DataContextValue['addOnboardingChecklistItem'] = useCallback(
    (item) => {
      setOnboardingChecklist((prev) => {
        const maxOrder = prev.reduce((m, c) => Math.max(m, c.order), 0)
        return [...prev, { ...item, id: 'ck_' + uid(), order: item.order ?? maxOrder + 1 }]
      })
    },
    [setOnboardingChecklist],
  )

  const updateOnboardingChecklistItem: DataContextValue['updateOnboardingChecklistItem'] =
    useCallback(
      (id, patch) =>
        setOnboardingChecklist((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        ),
      [setOnboardingChecklist],
    )

  const deleteOnboardingChecklistItem: DataContextValue['deleteOnboardingChecklistItem'] =
    useCallback(
      (id) => {
        setOnboardingChecklist((prev) => prev.filter((c) => c.id !== id))
        setOnboardingProgress((prev) =>
          prev.map((p) => ({
            ...p,
            completedChecklistIds: p.completedChecklistIds.filter((cid) => cid !== id),
          })),
        )
      },
      [setOnboardingChecklist, setOnboardingProgress],
    )

  /* ----------------------------- Documents ------------------------------ */
  const addDocument: DataContextValue['addDocument'] = useCallback(
    (d) =>
      setDocuments((prev) => [
        { ...d, id: 'd_' + uid(), uploadedAt: new Date().toISOString() },
        ...prev,
      ]),
    [setDocuments],
  )

  const deleteDocument = useCallback(
    (id: string) => setDocuments((prev) => prev.filter((d) => d.id !== id)),
    [setDocuments],
  )

  const updateDocument: DataContextValue['updateDocument'] = useCallback(
    (id, patch) =>
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...patch, id: d.id, uploadedAt: d.uploadedAt } : d)),
      ),
    [setDocuments],
  )

  /* ---------------------------- Recognition ----------------------------- */
  const giveRecognition: DataContextValue['giveRecognition'] = useCallback(
    (r) => {
      const id = 'r_' + uid()
      const now = new Date().toISOString()
      const post: RecognitionPost = { ...r, id, createdAt: now, reactedBy: [] }
      setRecognition((prev) => [post, ...prev])
      const giver = users.find((u) => u.id === r.giverId)
      setInbox((prev) => [
        {
          id: 'n_' + uid(),
          userId: r.receiverId,
          type: 'recognition',
          title: giver ? `${giver.name} shouted you out` : 'New shout-out',
          body: r.message.length > 120 ? `${r.message.slice(0, 117)}…` : r.message,
          link: `/people/shout-outs?open=${encodeURIComponent(id)}`,
          read: false,
          createdAt: now,
          fromUserId: r.giverId,
          recognitionId: id,
        },
        ...prev,
      ])
    },
    [setRecognition, setInbox, users],
  )

  const deleteRecognition: DataContextValue['deleteRecognition'] = useCallback(
    (id) => {
      setRecognition((prev) => prev.filter((r) => r.id !== id))
      setRecognitionComments((prev) => prev.filter((c) => c.recognitionId !== id))
      setInbox((prev) => prev.filter((n) => n.recognitionId !== id))
    },
    [setRecognition, setRecognitionComments, setInbox],
  )

  const toggleRecognitionReaction: DataContextValue['toggleRecognitionReaction'] = useCallback(
    (id, userId) =>
      setRecognition((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r
          const reactedBy = r.reactedBy.includes(userId)
            ? r.reactedBy.filter((u) => u !== userId)
            : [...r.reactedBy, userId]
          return { ...r, reactedBy }
        }),
      ),
    [setRecognition],
  )

  const addRecognitionComment: DataContextValue['addRecognitionComment'] = useCallback(
    (recognitionId, body) => {
      if (!body.trim()) return
      const row: RecognitionComment = {
        id: 'rc_' + uid(),
        recognitionId,
        userId: users.find((u) => u.active)?.id ?? '',
        body: body.trim(),
        createdAt: new Date().toISOString(),
      }
      setRecognitionComments((prev) => [...prev, row])
    },
    [setRecognitionComments, users],
  )

  /* ------------------------------ Events -------------------------------- */
  const addEvent: DataContextValue['addEvent'] = useCallback(
    (e) => setEvents((prev) => [...prev, { ...e, id: 'e_' + uid() }]),
    [setEvents],
  )

  const [teams, setTeams] = useLocalStorage<WorkspaceTeam[]>('av-teams', seedTeams)
  const [departments, setDepartments] = useLocalStorage<Department[]>('av-departments', [])

  /* ----------------------------- Teams ---------------------------------- */
  const addTeam = useCallback(
    (t: Omit<WorkspaceTeam, 'id' | 'memberIds'>) =>
      setTeams((prev) => [...prev, { ...t, id: 'team_' + uid(), memberIds: [] }]),
    [setTeams],
  )
  const updateTeam = useCallback(
    (id: string, patch: Partial<WorkspaceTeam>) =>
      setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    [setTeams],
  )
  const deleteTeam = useCallback(
    (id: string) => setTeams((prev) => prev.filter((t) => t.id !== id)),
    [setTeams],
  )

  /* -------------------------- Departments ------------------------------- */
  const addDepartment = useCallback(
    (d: Omit<Department, 'id' | 'createdAt'>) =>
      setDepartments((prev) => [
        ...prev,
        { ...d, id: 'dept_' + uid(), createdAt: new Date().toISOString() },
      ]),
    [setDepartments],
  )
  const updateDepartment = useCallback(
    (id: string, patch: Partial<Department>) =>
      setDepartments((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d))),
    [setDepartments],
  )
  const deleteDepartment = useCallback(
    (id: string) => setDepartments((prev) => prev.filter((d) => d.id !== id)),
    [setDepartments],
  )

  const assignUserToDepartment: DataContextValue['assignUserToDepartment'] = useCallback(
    async (userId, departmentId) => {
      const dept = departments.find((d) => d.id === departmentId)
      if (!dept) return { ok: false, error: 'Department not found' }
      updateUser(userId, { department: dept.name, reportsToId: dept.headUserId })
      return { ok: true }
    },
    [departments, updateUser],
  )

  const setUserTeamMembership: DataContextValue['setUserTeamMembership'] = useCallback(
    async (userId, teamId, member) => {
      const team = teams.find((t) => t.id === teamId)
      if (!team) return { ok: false, error: 'Team not found' }
      if (member && !team.departmentId) {
        return { ok: false, error: 'Team must belong to a department first' }
      }
      setTeams((prev) =>
        prev.map((t) => {
          if (t.id !== teamId) return t
          const memberIds = member
            ? [...new Set([...t.memberIds, userId])]
            : t.memberIds.filter((id) => id !== userId)
          return { ...t, memberIds }
        }),
      )
      if (member && team.departmentId) {
        const dept = departments.find((d) => d.id === team.departmentId)
        if (dept) {
          updateUser(userId, { department: dept.name, reportsToId: dept.headUserId })
        }
      }
      return { ok: true }
    },
    [teams, departments, updateUser, setTeams],
  )

  /* -------------------------- Approvals --------------------------------- */
  const accessRequests = useMemo((): AccessRequest[] => {
    try {
      const rows = JSON.parse(
        localStorage.getItem('av-access-requests') ?? '[]',
      ) as {
        userId: string
        message?: string | null
        preferredDepartmentId?: string
        jobTitle?: string
        status: string
        requestedAt: string
      }[]
      return rows
        .filter((r) => r.status === 'pending' || r.status === 'acknowledged')
        .map((r) => ({
          userId: r.userId,
          message: r.message ?? undefined,
          preferredDepartmentId: r.preferredDepartmentId,
          jobTitle: r.jobTitle,
          status: r.status as AccessRequest['status'],
          requestedAt: r.requestedAt,
        }))
    } catch {
      return []
    }
  }, [])

  const pendingUsers = useMemo(
    () => usersAwaitingApproval(users),
    [users],
  )

  const approveUser = useCallback(
    async (id: string, role: Role, department: string, jobTitle: string) => {
      const headUserId = departments.find((d) => d.name === department)?.headUserId
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                role,
                department,
                jobTitle,
                reportsToId: headUserId,
                active: true,
                approvedAt: new Date().toISOString(),
              }
            : u,
        ),
      )
      return { ok: true as const, emailSent: false }
    },
    [setUsers, departments],
  )

  const reloadData = useCallback(async () => {
    /* no-op: local data is always in memory + localStorage */
  }, [])

  /* ----------------------- Task Categories -------------------------------- */
  const [taskCategories, setTaskCategories] = useLocalStorage<TaskCategoryItem[]>(
    'av-task-categories',
    DEFAULT_TASK_CATEGORIES,
  )
  const addTaskCategory = useCallback((label: string) => {
    setTaskCategories((prev) => [...prev, { id: 'cat_' + uid(), label }])
  }, [setTaskCategories])
  const updateTaskCategory = useCallback((id: string, label: string) => {
    setTaskCategories((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)))
  }, [setTaskCategories])
  const deleteTaskCategory = useCallback((id: string) => {
    setTaskCategories((prev) => prev.filter((c) => c.id !== id))
  }, [setTaskCategories])

  const [documentCategories, setDocumentCategories] = useLocalStorage<TaskCategoryItem[]>(
    'av-document-categories',
    DEFAULT_DOCUMENT_CATEGORIES,
  )
  const addDocumentCategory = useCallback((label: string) => {
    setDocumentCategories((prev) => [...prev, { id: 'doccat_' + uid(), label }])
  }, [setDocumentCategories])
  const updateDocumentCategory = useCallback((id: string, label: string) => {
    setDocumentCategories((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)))
  }, [setDocumentCategories])
  const deleteDocumentCategory = useCallback((id: string) => {
    setDocumentCategories((prev) => prev.filter((c) => c.id !== id))
  }, [setDocumentCategories])

  const [recognitionTags, setRecognitionTags] = useLocalStorage<TaskCategoryItem[]>(
    'av-recognition-tags',
    DEFAULT_RECOGNITION_TAGS,
  )
  const addRecognitionTag = useCallback((label: string) => {
    setRecognitionTags((prev) => [...prev, { id: 'tag_' + uid(), label }])
  }, [setRecognitionTags])
  const updateRecognitionTag = useCallback((id: string, label: string) => {
    setRecognitionTags((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)))
  }, [setRecognitionTags])
  const deleteRecognitionTag = useCallback((id: string) => {
    setRecognitionTags((prev) => prev.filter((c) => c.id !== id))
  }, [setRecognitionTags])

  const [awardCategories, setAwardCategories] = useLocalStorage<TaskCategoryItem[]>(
    'av-award-categories',
    DEFAULT_AWARD_CATEGORIES,
  )
  const addAwardCategory = useCallback((label: string) => {
    setAwardCategories((prev) => [...prev, { id: labelToConfigId(label, 'award'), label }])
  }, [setAwardCategories])
  const updateAwardCategory = useCallback((id: string, label: string) => {
    setAwardCategories((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)))
  }, [setAwardCategories])
  const deleteAwardCategory = useCallback((id: string) => {
    setAwardCategories((prev) => prev.filter((c) => c.id !== id))
  }, [setAwardCategories])

  const [grievanceCategories, setGrievanceCategories] = useLocalStorage<TaskCategoryItem[]>(
    'av-grievance-categories',
    DEFAULT_GRIEVANCE_CATEGORIES,
  )
  const addGrievanceCategory = useCallback((label: string) => {
    setGrievanceCategories((prev) => [...prev, { id: labelToConfigId(label, 'griev'), label }])
  }, [setGrievanceCategories])
  const updateGrievanceCategory = useCallback((id: string, label: string) => {
    setGrievanceCategories((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)))
  }, [setGrievanceCategories])
  const deleteGrievanceCategory = useCallback((id: string) => {
    setGrievanceCategories((prev) => prev.filter((c) => c.id !== id))
  }, [setGrievanceCategories])

  const [exitReasons, setExitReasons] = useLocalStorage<TaskCategoryItem[]>(
    'av-exit-reasons',
    DEFAULT_EXIT_REASONS,
  )
  const addExitReason = useCallback((label: string) => {
    setExitReasons((prev) => [...prev, { id: labelToConfigId(label, 'exit'), label }])
  }, [setExitReasons])
  const updateExitReason = useCallback((id: string, label: string) => {
    setExitReasons((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)))
  }, [setExitReasons])
  const deleteExitReason = useCallback((id: string) => {
    setExitReasons((prev) => prev.filter((c) => c.id !== id))
  }, [setExitReasons])

  const [memoCategories, setMemoCategories] = useLocalStorage<TaskCategoryItem[]>(
    'av-memo-categories',
    DEFAULT_MEMO_CATEGORIES,
  )
  const addMemoCategory = useCallback((label: string) => {
    setMemoCategories((prev) => [...prev, { id: labelToConfigId(label, 'memo'), label }])
  }, [setMemoCategories])
  const updateMemoCategory = useCallback((id: string, label: string) => {
    setMemoCategories((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)))
  }, [setMemoCategories])
  const deleteMemoCategory = useCallback((id: string) => {
    setMemoCategories((prev) => prev.filter((c) => c.id !== id))
  }, [setMemoCategories])

  const [pulseSurveyTemplates, setPulseSurveyTemplates] = useLocalStorage<PulseSurveyTemplate[]>(
    'av-pulse-survey-templates',
    DEFAULT_PULSE_SURVEY_TEMPLATES,
  )
  const addPulseSurveyTemplate = useCallback((template: Omit<PulseSurveyTemplate, 'id'>) => {
    setPulseSurveyTemplates((prev) => [
      ...prev,
      { ...template, id: labelToConfigId(template.label, 'tpl') },
    ])
  }, [setPulseSurveyTemplates])
  const updatePulseSurveyTemplate = useCallback((id: string, patch: Partial<PulseSurveyTemplate>) => {
    setPulseSurveyTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }, [setPulseSurveyTemplates])
  const deletePulseSurveyTemplate = useCallback((id: string) => {
    setPulseSurveyTemplates((prev) => prev.filter((t) => t.id !== id))
  }, [setPulseSurveyTemplates])

  const value = useMemo<DataContextValue>(
    () => ({
      users,
      updateUser,
      addUser,
      tasks,
      createTask,
      updateTask,
      deleteTask,
      checkIns,
      submitCheckIn,
      updateCheckIn,
      announcements,
      createAnnouncement,
      updateAnnouncement,
      deleteAnnouncement,
      markAnnouncementRead,
      markAllAnnouncementsRead,
      leaveRequests,
      leaveComments,
      submitLeave,
      reviewLeave,
      addLeaveComment,
      onboardingVideos,
      onboardingChecklist,
      onboardingProgress,
      toggleVideoWatched,
      toggleChecklistItem,
      addOnboardingVideo,
      updateOnboardingVideo,
      deleteOnboardingVideo,
      addOnboardingChecklistItem,
      updateOnboardingChecklistItem,
      deleteOnboardingChecklistItem,
      documents,
      addDocument,
      updateDocument,
      deleteDocument,
      recognition,
      recognitionComments,
      giveRecognition,
      deleteRecognition,
      toggleRecognitionReaction,
      addRecognitionComment,
      inbox,
      markInboxRead,
      markAllInboxRead,
      sendInboxNotifications,
      events,
      addEvent,
      teams,
      addTeam,
      updateTeam,
      deleteTeam,
      departments,
      addDepartment,
      updateDepartment,
      deleteDepartment,
      assignUserToDepartment,
      setUserTeamMembership,
      pendingUsers,
      accessRequests,
      approveUser,
      taskCategories,
      addTaskCategory,
      updateTaskCategory,
      deleteTaskCategory,
      documentCategories,
      addDocumentCategory,
      updateDocumentCategory,
      deleteDocumentCategory,
      recognitionTags,
      addRecognitionTag,
      updateRecognitionTag,
      deleteRecognitionTag,
      awardCategories,
      addAwardCategory,
      updateAwardCategory,
      deleteAwardCategory,
      grievanceCategories,
      addGrievanceCategory,
      updateGrievanceCategory,
      deleteGrievanceCategory,
      exitReasons,
      addExitReason,
      updateExitReason,
      deleteExitReason,
      memoCategories,
      addMemoCategory,
      updateMemoCategory,
      deleteMemoCategory,
      pulseSurveyTemplates,
      addPulseSurveyTemplate,
      updatePulseSurveyTemplate,
      deletePulseSurveyTemplate,
      dataStatus: 'ready',
      dataError: null,
      reloadData,
    }),
    [
      users, updateUser, addUser,
      tasks, createTask, updateTask, deleteTask,
      checkIns, submitCheckIn, updateCheckIn,
      announcements, createAnnouncement, updateAnnouncement, deleteAnnouncement, markAnnouncementRead, markAllAnnouncementsRead,
      leaveRequests, leaveComments, submitLeave, reviewLeave, addLeaveComment,
      onboardingVideos, onboardingChecklist, onboardingProgress,
      toggleVideoWatched, toggleChecklistItem,
      addOnboardingVideo, updateOnboardingVideo, deleteOnboardingVideo,
      addOnboardingChecklistItem, updateOnboardingChecklistItem, deleteOnboardingChecklistItem,
      documents, addDocument, updateDocument, deleteDocument,
      recognition, recognitionComments, giveRecognition, deleteRecognition, toggleRecognitionReaction, addRecognitionComment,
      inbox, markInboxRead, markAllInboxRead,
      events, addEvent,
      teams, addTeam, updateTeam, deleteTeam,
      departments, addDepartment, updateDepartment, deleteDepartment,
      assignUserToDepartment, setUserTeamMembership,
      pendingUsers, accessRequests, approveUser,
      taskCategories, addTaskCategory, updateTaskCategory, deleteTaskCategory,
      documentCategories, addDocumentCategory, updateDocumentCategory, deleteDocumentCategory,
      recognitionTags, addRecognitionTag, updateRecognitionTag, deleteRecognitionTag,
      awardCategories, addAwardCategory, updateAwardCategory, deleteAwardCategory,
      grievanceCategories, addGrievanceCategory, updateGrievanceCategory, deleteGrievanceCategory,
      exitReasons, addExitReason, updateExitReason, deleteExitReason,
      memoCategories, addMemoCategory, updateMemoCategory, deleteMemoCategory,
      pulseSurveyTemplates, addPulseSurveyTemplate, updatePulseSurveyTemplate, deletePulseSurveyTemplate,
      sendInboxNotifications,
      reloadData,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

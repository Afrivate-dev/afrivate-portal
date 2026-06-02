/**
 * Local-first portal data (seed + localStorage). Used when `VITE_USE_SUPABASE_DATA` is off.
 */
import { useCallback, useMemo } from 'react'
import { DataContext, type DataContextValue } from '@/context/dataContextShared'
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
  seedUsers,
} from '@/data/mockData'
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
  Task,
  TaskActivityEntry,
  User,
  WeeklyCheckIn,
} from '@/types'
import { newlyMentionedUserIds, uid } from '@/utils/helpers'

export function LocalDataProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useLocalStorage<User[]>('nf-users', seedUsers)
  const [tasks, setTasks] = useLocalStorage<Task[]>('nf-tasks', seedTasks)
  const [checkIns, setCheckIns] = useLocalStorage<WeeklyCheckIn[]>('nf-checkins-v2', seedCheckIns)
  const [announcements, setAnnouncements] = useLocalStorage<Announcement[]>(
    'nf-announcements',
    seedAnnouncements,
  )
  const [leaveRequests, setLeaveRequests] = useLocalStorage<LeaveRequest[]>('nf-leave', seedLeave)
  const [onboardingVideos, setOnboardingVideos] = useLocalStorage<OnboardingVideo[]>(
    'nf-onboarding-videos',
    seedOnboardingVideos,
  )
  const [onboardingChecklist, setOnboardingChecklist] = useLocalStorage<OnboardingChecklistItem[]>(
    'nf-onboarding-checklist',
    seedOnboardingChecklist,
  )
  const [onboardingProgress, setOnboardingProgress] = useLocalStorage<OnboardingProgress[]>(
    'nf-onboarding-progress',
    seedOnboardingProgress,
  )
  const [documents, setDocuments] = useLocalStorage<DocumentItem[]>('nf-documents', seedDocuments)
  const [recognition, setRecognition] = useLocalStorage<RecognitionPost[]>(
    'nf-recognition',
    seedRecognition,
  )
  const [events, setEvents] = useLocalStorage<EventItem[]>('nf-events', seedEvents)
  const [inbox, setInbox] = useLocalStorage<InboxNotification[]>('nf-inbox', [])

  /* ------------------------------- Users -------------------------------- */
  const updateUser = useCallback(
    (id: string, patch: Partial<User>) =>
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u))),
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

      if (input.assigneeId && input.assigneeId !== actor) {
        const owner = users.find((u) => u.id === actor)
        inboxRows.push({
          id: 'n_' + uid(),
          userId: input.assigneeId,
          type: 'task_assigned',
          title: owner ? `${owner.name} assigned you a task` : 'You were assigned a task',
          body: task.title,
          link: '/tasks',
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
          link: '/tasks',
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
            log.push({ at: now, by, message: `Status \u2192 ${label[patch.status]}` })
          }

          const nextAssignee =
            'assigneeId' in patch
              ? patch.assigneeId === '' || patch.assigneeId == null
                ? undefined
                : patch.assigneeId
              : t.assigneeId
          const nextDescription =
            patch.description !== undefined ? patch.description : t.description

          if (by) {
            if (
              'assigneeId' in patch &&
              nextAssignee &&
              nextAssignee !== t.ownerId &&
              nextAssignee !== by &&
              nextAssignee !== t.assigneeId
            ) {
              const assigner = users.find((u) => u.id === by)
              pendingInbox.push({
                id: 'n_' + uid(),
                userId: nextAssignee,
                type: 'task_assigned',
                title: assigner ? `${assigner.name} assigned you a task` : 'You were assigned a task',
                body: t.title,
                link: '/tasks',
                read: false,
                createdAt: now,
                fromUserId: by,
                taskId: t.id,
              })
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
                link: '/tasks',
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
            assigneeId:
              'assigneeId' in patch
                ? patch.assigneeId === '' || patch.assigneeId == null
                  ? undefined
                  : patch.assigneeId
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
    (id, status, reviewerId, note) =>
      setLeaveRequests((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, status, reviewedById: reviewerId, reviewerNote: note } : l,
        ),
      ),
    [setLeaveRequests],
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
          link: '/recognition',
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

  /* ------------------------------ Events -------------------------------- */
  const addEvent: DataContextValue['addEvent'] = useCallback(
    (e) => setEvents((prev) => [...prev, { ...e, id: 'e_' + uid() }]),
    [setEvents],
  )

  const teams = useMemo(() => seedTeams, [])

  const reloadData = useCallback(async () => {
    /* no-op: local data is always in memory + localStorage */
  }, [])

  const value = useMemo<DataContextValue>(
    () => ({
      users,
      updateUser,
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
      submitLeave,
      reviewLeave,
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
      deleteDocument,
      recognition,
      giveRecognition,
      toggleRecognitionReaction,
      inbox,
      markInboxRead,
      markAllInboxRead,
      events,
      addEvent,
      teams,
      dataStatus: 'ready',
      dataError: null,
      reloadData,
    }),
    [
      users, updateUser,
      tasks, createTask, updateTask, deleteTask,
      checkIns, submitCheckIn, updateCheckIn,
      announcements, createAnnouncement, updateAnnouncement, deleteAnnouncement, markAnnouncementRead, markAllAnnouncementsRead,
      leaveRequests, submitLeave, reviewLeave,
      onboardingVideos, onboardingChecklist, onboardingProgress,
      toggleVideoWatched,
      toggleChecklistItem,
      addOnboardingVideo,
      updateOnboardingVideo,
      deleteOnboardingVideo,
      addOnboardingChecklistItem,
      updateOnboardingChecklistItem,
      deleteOnboardingChecklistItem,
      documents, addDocument, deleteDocument,
      recognition, giveRecognition, toggleRecognitionReaction,
      inbox, markInboxRead, markAllInboxRead,
      events, addEvent,
      teams,
      reloadData,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

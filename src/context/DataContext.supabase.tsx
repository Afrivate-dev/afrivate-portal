/**
 * Loads portal domain data from Supabase (`profiles` + `portal_*` tables).
 * Requires logged-in user (JWT) for RLS. Enable with `VITE_USE_SUPABASE_DATA=true`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { DataContext, type DataContextValue } from '@/context/dataContextShared'
import { approvePortalUser } from '@/lib/approvePortalUser'
import { notifyError } from '@/lib/notify'
import { patchPortalProfile } from '@/lib/patchPortalProfile'
import { supabase } from '@/lib/supabase'
import {
  checklistToRow,
  fetchPortalDataset,
  readStringArray,
  rowToAnnouncement,
  rowToCheckIn,
  rowToChecklistItem,
  rowToOnboardingVideo,
  taskToInsertRow,
  userToSelfProfilePatch,
  userToAdminProfilePatch,
  videoToRow,
} from '@/lib/supabase/portalDataset'
import type {
  AccessRequest,
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
  TaskCategoryItem,
  User,
  WeeklyCheckIn,
} from '@/types'

const DEFAULT_TASK_CATEGORIES: TaskCategoryItem[] = [
  { id: 'react',       label: 'React / Frontend' },
  { id: 'wordpress',   label: 'WordPress' },
  { id: 'performance', label: 'Performance' },
  { id: 'nodejs',      label: 'Node.js' },
  { id: 'freelance',   label: 'Freelance' },
  { id: 'admin',       label: 'Operations' },
  { id: 'other',       label: 'Other' },
]
import { newlyMentionedUserIds, uid, canChangeRoles } from '@/utils/helpers'
import { fetchTaskCategories } from '@/lib/supabase/notesDataset'

function reportDataError(action: string, error: { message: string }): void {
  console.warn(`[data] ${action}`, error.message)
  notifyError(`Could not ${action}: ${error.message}`)
}

export function SupabaseDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const client = supabase!

  const [users, setUsers] = useState<User[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [checkIns, setCheckIns] = useState<WeeklyCheckIn[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [onboardingVideos, setOnboardingVideos] = useState<OnboardingVideo[]>([])
  const [onboardingChecklist, setOnboardingChecklist] = useState<OnboardingChecklistItem[]>([])
  const [onboardingProgress, setOnboardingProgress] = useState<OnboardingProgress[]>([])
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [recognition, setRecognition] = useState<RecognitionPost[]>([])
  const [inbox, setInbox] = useState<InboxNotification[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [teams, setTeams] = useState<DataContextValue['teams']>([])
  const [departments, setDepartments] = useState<DataContextValue['departments']>([])
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([])

  const [dataStatus, setDataStatus] = useState<'ready' | 'loading' | 'error'>('loading')
  const [dataError, setDataError] = useState<string | null>(null)
  const hasLoadedOnceRef = useRef(false)

  const reloadData = useCallback(async () => {
    if (!user) {
      hasLoadedOnceRef.current = false
      setUsers([])
      setTasks([])
      setCheckIns([])
      setAnnouncements([])
      setLeaveRequests([])
      setOnboardingVideos([])
      setOnboardingChecklist([])
      setOnboardingProgress([])
      setDocuments([])
      setRecognition([])
      setInbox([])
      setEvents([])
      setTeams([])
      setDepartments([])
      setAccessRequests([])
      setDataStatus('ready')
      setDataError(null)
      return
    }

    const isInitialLoad = !hasLoadedOnceRef.current
    if (isInitialLoad) setDataStatus('loading')
    setDataError(null)
    try {
      const d = await fetchPortalDataset(client)
      setUsers(d.users)
      setTasks(d.tasks)
      setCheckIns(d.checkIns)
      setAnnouncements(d.announcements)
      setLeaveRequests(d.leaveRequests)
      setOnboardingVideos(d.onboardingVideos)
      setOnboardingChecklist(d.onboardingChecklist)
      setOnboardingProgress(d.onboardingProgress)
      setDocuments(d.documents)
      setRecognition(d.recognition)
      setInbox(d.inbox)
      setEvents(d.events)
      setTeams(d.teams)
      // Load departments
      const { data: depts } = await client.from('portal_departments').select('*').order('name')
      if (depts) setDepartments(depts.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        name: r.name as string,
        description: r.description as string | undefined,
        headUserId: r.head_user_id as string | undefined,
        createdAt: r.created_at as string,
      })))

      const { data: accessRows, error: accessErr } = await client
        .from('portal_access_requests')
        .select('user_id, message, preferred_department_id, job_title, status, requested_at')
        .in('status', ['pending', 'acknowledged'])

      if (accessErr?.message?.includes('preferred_department_id')) {
        const { data: basicRows } = await client
          .from('portal_access_requests')
          .select('user_id, message, status, requested_at')
          .in('status', ['pending', 'acknowledged'])
        setAccessRequests(
          (basicRows ?? []).map((r: Record<string, unknown>) => ({
            userId: String(r.user_id),
            message: r.message ? String(r.message) : undefined,
            status: String(r.status) as AccessRequest['status'],
            requestedAt: String(r.requested_at),
          })),
        )
      } else if (accessRows) {
        setAccessRequests(
          accessRows.map((r: Record<string, unknown>) => ({
            userId: String(r.user_id),
            message: r.message ? String(r.message) : undefined,
            preferredDepartmentId: r.preferred_department_id
              ? String(r.preferred_department_id)
              : undefined,
            jobTitle: r.job_title ? String(r.job_title) : undefined,
            status: String(r.status) as AccessRequest['status'],
            requestedAt: String(r.requested_at),
          })),
        )
      } else {
        setAccessRequests([])
      }
      setDataStatus('ready')
      hasLoadedOnceRef.current = true
    } catch (e) {
      setDataStatus('error')
      setDataError(e instanceof Error ? e.message : 'Failed to load data')
    }
  }, [client, user])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      void reloadData()
    })
    return () => cancelAnimationFrame(id)
  }, [reloadData])

  const updateUser = useCallback<DataContextValue['updateUser']>((id, patch, onError) => {
    // Optimistic update — reflect the change immediately so controlled inputs
    // (role select, active checkbox) don't snap back while the write is in-flight.
    setUsers((prev) => prev.map((u) => (u.id === id ? ({ ...u, ...patch } as User) : u)))

    void (async () => {
      const prev = users.find((u) => u.id === id)
      if (!prev) return
      const merged = { ...prev, ...patch } as User

      // Build the update payload and strip `id` — PostgREST rejects updates that
      // include the primary key in the SET clause.
      const profilePatch =
        user && id === user.id
          ? userToSelfProfilePatch(merged)
          : userToAdminProfilePatch(merged)

      if (user && id !== user.id && !canChangeRoles(user) && 'role' in patch) {
        delete profilePatch.role
      }

      let errorMsg: string | null = null

      if (user && id === user.id) {
        // Own profile — use the regular client (RLS allows own-row updates).
        const { data: updated, error } = await client
          .from('profiles')
          .update(profilePatch)
          .eq('id', id)
          .select('id')
        if (error) errorMsg = error.message
        else if (!updated?.length) errorMsg = 'Own-profile update was blocked. Check RLS policies.'
      } else {
        const result = await patchPortalProfile(client, id, profilePatch)
        if (!result.ok) errorMsg = result.error
      }

      if (errorMsg) {
        console.warn('[data] updateUser failed:', errorMsg)
        notifyError(errorMsg)
        onError?.(errorMsg)
        await reloadData()
        return
      }

      await reloadData()
    })()
  },
  [client, user, users, reloadData],
  )

  const queueInboxInsert = useCallback(
    async (rows: InboxNotification[]) => {
      if (!rows.length) return
      const payloads = rows.map((n) => ({
        id: n.id,
        user_id: n.userId,
        type: n.type,
        title: n.title,
        body: n.body ?? null,
        link: n.link,
        read: n.read,
        created_at: n.createdAt,
        from_user_id: n.fromUserId ?? null,
        task_id: n.taskId ?? null,
        recognition_id: n.recognitionId ?? null,
      }))
      const { error } = await client.from('portal_inbox_notifications').insert(payloads)
      if (error) reportDataError('save notification', error)
    },
    [client],
  )

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
      setTasks((p) => [task, ...p])

      void (async () => {
        const { error } = await client.from('portal_tasks').insert(taskToInsertRow(task))
        if (error) reportDataError('create task', error)

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
        await queueInboxInsert(inboxRows)
        await reloadData()
      })()

      return task
    },
    [client, users, queueInboxInsert, reloadData],
  )

  const updateTask: DataContextValue['updateTask'] = useCallback(
    (id, patch, by, note) => {
      const now = new Date().toISOString()
      const t = tasks.find((x) => x.id === id)
      if (!t) return

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

      const nextDescription = patch.description !== undefined ? patch.description : t.description

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

      setTasks((prev) => prev.map((x) => (x.id === id ? merged : x)))

      void (async () => {
        const pendingInbox: InboxNotification[] = []
        if (by) {
          if ('assigneeIds' in patch && patch.assigneeIds) {
            const prevIds = t.assigneeIds ?? (t.assigneeId ? [t.assigneeId] : [])
            const newIds = patch.assigneeIds.filter(
              (aId) => !prevIds.includes(aId) && aId !== t.ownerId && aId !== by,
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

        const { error } = await client.from('portal_tasks').update(taskToInsertRow(merged)).eq('id', id)
        if (error) reportDataError('update task', error)
        await queueInboxInsert(pendingInbox)
        await reloadData()
      })()
    },
    [client, tasks, users, queueInboxInsert, reloadData],
  )

  const deleteTask = useCallback(
    (id: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== id))
      void (async () => {
        const { error } = await client.from('portal_tasks').delete().eq('id', id)
        if (error) reportDataError('delete task', error)
        await reloadData()
      })()
    },
    [client, reloadData],
  )

  const submitCheckIn: DataContextValue['submitCheckIn'] = useCallback(
    (entry) => {
      const record: WeeklyCheckIn = {
        ...entry,
        id: 'ci_' + uid(),
        submittedAt: new Date().toISOString(),
      }
      setCheckIns((prev) => [record, ...prev])
      void (async () => {
        const { error } = await client.from('portal_weekly_check_ins').insert({
          id: record.id,
          user_id: record.userId,
          week_start: record.weekStart.slice(0, 10),
          completed: record.completed,
          next_week: record.nextWeek,
          blockers: record.blockers ?? null,
          hours_worked: record.hoursWorked,
          submitted_at: record.submittedAt,
        })
        if (error) reportDataError('submit check-in', error)
        await reloadData()
      })()
      return record
    },
    [client, reloadData],
  )

  const updateCheckIn: DataContextValue['updateCheckIn'] = useCallback(
    (id, patch) => {
      setCheckIns((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
      void (async () => {
        const { data, error } = await client
          .from('portal_weekly_check_ins')
          .select('*')
          .eq('id', id)
          .maybeSingle()
        if (error || !data) return
        const cur = rowToCheckIn(data as Record<string, unknown>)
        const next = { ...cur, ...patch }
        const { error: upErr } = await client
          .from('portal_weekly_check_ins')
          .update({
            week_start: next.weekStart.slice(0, 10),
            completed: next.completed,
            next_week: next.nextWeek,
            blockers: next.blockers ?? null,
            hours_worked: next.hoursWorked,
          })
          .eq('id', id)
        if (upErr) reportDataError('update check-in', upErr)
        await reloadData()
      })()
    },
    [client, reloadData],
  )

  const createAnnouncement: DataContextValue['createAnnouncement'] = useCallback(
    (input) => {
      const a: Announcement = {
        ...input,
        id: 'a_' + uid(),
        postedAt: new Date().toISOString(),
        readBy: [],
      }
      setAnnouncements((prev) => [a, ...prev])
      void (async () => {
        const { error } = await client.from('portal_announcements').insert({
          id: a.id,
          title: a.title,
          body: a.body,
          audience: a.audience,
          priority: a.priority,
          posted_by_id: a.postedById,
          posted_at: a.postedAt,
          read_by: [],
          media: a.media ?? [],
        })
        if (error) reportDataError('create announcement', error)
        await reloadData()
      })()
      return a
    },
    [client, reloadData],
  )

  const updateAnnouncement: DataContextValue['updateAnnouncement'] = useCallback(
    (id, patch) => {
      setAnnouncements((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))
      void (async () => {
        const { data, error: selErr } = await client
          .from('portal_announcements')
          .select('*')
          .eq('id', id)
          .maybeSingle()
        if (selErr || !data) return
        const cur = rowToAnnouncement(data as Record<string, unknown>)
        const next = { ...cur, ...patch }
        const { error } = await client
          .from('portal_announcements')
          .update({
            title: next.title,
            body: next.body,
            audience: next.audience,
            priority: next.priority,
            media: next.media ?? [],
          })
          .eq('id', id)
        if (error) reportDataError('update announcement', error)
        await reloadData()
      })()
    },
    [client, reloadData],
  )

  const deleteAnnouncement = useCallback(
    (id: string) => {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id))
      void (async () => {
        const { error } = await client.from('portal_announcements').delete().eq('id', id)
        if (error) reportDataError('delete announcement', error)
        await reloadData()
      })()
    },
    [client, reloadData],
  )

  const markAnnouncementRead: DataContextValue['markAnnouncementRead'] = useCallback(
    (id, userId) => {
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === id && !a.readBy.includes(userId) ? { ...a, readBy: [...a.readBy, userId] } : a,
        ),
      )
      void (async () => {
        const { error } = await client.rpc('mark_announcement_read', { p_id: id })
        if (error) {
          const rpcMissing =
            error.message.includes('mark_announcement_read') ||
            error.message.includes('Could not find the function') ||
            error.code === 'PGRST202'
          if (rpcMissing) {
            const current = announcements.find((a) => a.id === id)
            if (current && !current.readBy.includes(userId)) {
              const { error: directErr } = await client
                .from('portal_announcements')
                .update({ read_by: [...current.readBy, userId] })
                .eq('id', id)
              if (directErr) reportDataError('mark announcement read', directErr)
            }
          } else {
            reportDataError('mark announcement read', error)
          }
        }
        await reloadData()
      })()
    },
    [client, reloadData, announcements],
  )

  const markAllAnnouncementsRead: DataContextValue['markAllAnnouncementsRead'] = useCallback(
    (userId) => {
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.readBy.includes(userId) ? a : { ...a, readBy: [...a.readBy, userId] },
        ),
      )
      void (async () => {
        const { error } = await client.rpc('mark_all_announcements_read')
        if (error) {
          const rpcMissing =
            error.message.includes('mark_all_announcements_read') ||
            error.message.includes('Could not find the function') ||
            error.code === 'PGRST202'
          if (rpcMissing) {
            for (const a of announcements) {
              if (a.readBy.includes(userId)) continue
              await client
                .from('portal_announcements')
                .update({ read_by: [...a.readBy, userId] })
                .eq('id', a.id)
            }
          } else {
            reportDataError('mark all announcements read', error)
          }
        }
        await reloadData()
      })()
    },
    [client, reloadData, announcements],
  )

  const submitLeave: DataContextValue['submitLeave'] = useCallback(
    (input) => {
      const l: LeaveRequest = {
        ...input,
        id: 'l_' + uid(),
        status: 'pending',
        submittedAt: new Date().toISOString(),
      }
      setLeaveRequests((prev) => [l, ...prev])
      void (async () => {
        const { error } = await client.from('portal_leave_requests').insert({
          id: l.id,
          user_id: l.userId,
          type: l.type,
          start_date: l.startDate,
          end_date: l.endDate,
          reason: l.reason,
          supporting_doc_name: l.supportingDocName ?? null,
          supporting_doc_path: l.supportingDocPath ?? null,
          status: l.status,
          submitted_at: l.submittedAt,
        })
        if (error) reportDataError('submit leave request', error)
        await reloadData()
      })()
      return l
    },
    [client, reloadData],
  )

  const reviewLeave: DataContextValue['reviewLeave'] = useCallback(
    (id, status, reviewerId, note) => {
      setLeaveRequests((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status, reviewedById: reviewerId, reviewerNote: note } : l)),
      )
      void (async () => {
        const { error } = await client
          .from('portal_leave_requests')
          .update({
            status,
            reviewed_by_id: reviewerId,
            reviewer_note: note ?? null,
          })
          .eq('id', id)
        if (error) reportDataError('review leave request', error)
        await reloadData()
      })()
    },
    [client, reloadData],
  )

  const toggleVideoWatched: DataContextValue['toggleVideoWatched'] = useCallback(
    (userId, videoId) => {
      setOnboardingProgress((prev) => {
        const existing = prev.find((p) => p.userId === userId)
        if (!existing) {
          return [...prev, { userId, watchedVideoIds: [videoId], completedChecklistIds: [] }]
        }
        const watched = existing.watchedVideoIds.includes(videoId)
          ? existing.watchedVideoIds.filter((v) => v !== videoId)
          : [...existing.watchedVideoIds, videoId]
        return prev.map((p) => (p.userId === userId ? { ...p, watchedVideoIds: watched } : p))
      })
      void (async () => {
        const row = onboardingProgress.find((p) => p.userId === userId) ?? {
          userId,
          watchedVideoIds: [] as string[],
          completedChecklistIds: [] as string[],
        }
        const watched = row.watchedVideoIds.includes(videoId)
          ? row.watchedVideoIds.filter((v) => v !== videoId)
          : [...row.watchedVideoIds, videoId]
        const completed = row.completedChecklistIds
        const { error } = await client.from('portal_onboarding_progress').upsert(
          {
            user_id: userId,
            watched_video_ids: watched,
            completed_checklist_ids: completed,
          },
          { onConflict: 'user_id' },
        )
        if (error) reportDataError('save onboarding progress', error)
        await reloadData()
      })()
    },
    [client, onboardingProgress, reloadData],
  )

  const toggleChecklistItem: DataContextValue['toggleChecklistItem'] = useCallback(
    (userId, itemId) => {
      setOnboardingProgress((prev) => {
        const existing = prev.find((p) => p.userId === userId)
        if (!existing) {
          return [...prev, { userId, watchedVideoIds: [], completedChecklistIds: [itemId] }]
        }
        const done = existing.completedChecklistIds.includes(itemId)
          ? existing.completedChecklistIds.filter((v) => v !== itemId)
          : [...existing.completedChecklistIds, itemId]
        return prev.map((p) => (p.userId === userId ? { ...p, completedChecklistIds: done } : p))
      })
      void (async () => {
        const row = onboardingProgress.find((p) => p.userId === userId) ?? {
          userId,
          watchedVideoIds: [] as string[],
          completedChecklistIds: [] as string[],
        }
        const done = row.completedChecklistIds.includes(itemId)
          ? row.completedChecklistIds.filter((v) => v !== itemId)
          : [...row.completedChecklistIds, itemId]
        const { error } = await client.from('portal_onboarding_progress').upsert(
          {
            user_id: userId,
            watched_video_ids: row.watchedVideoIds,
            completed_checklist_ids: done,
          },
          { onConflict: 'user_id' },
        )
        if (error) reportDataError('save onboarding progress', error)
        await reloadData()
      })()
    },
    [client, onboardingProgress, reloadData],
  )

  const addOnboardingVideo: DataContextValue['addOnboardingVideo'] = useCallback(
    (v) => {
      const vid: OnboardingVideo = { ...v, id: 'v_' + uid() }
      setOnboardingVideos((prev) => [...prev, vid])
      void (async () => {
        await client.from('portal_onboarding_videos').insert(videoToRow(vid))
        await reloadData()
      })()
    },
    [client, reloadData],
  )

  const updateOnboardingVideo: DataContextValue['updateOnboardingVideo'] = useCallback(
    (id, patch) => {
      setOnboardingVideos((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)))
      void (async () => {
        const { data, error: selErr } = await client
          .from('portal_onboarding_videos')
          .select('*')
          .eq('id', id)
          .maybeSingle()
        if (selErr || !data) return
        const v = rowToOnboardingVideo(data as Record<string, unknown>)
        const next = { ...v, ...patch }
        await client.from('portal_onboarding_videos').update(videoToRow(next)).eq('id', id)
        await reloadData()
      })()
    },
    [client, reloadData],
  )

  const deleteOnboardingVideo: DataContextValue['deleteOnboardingVideo'] = useCallback(
    (id) => {
      setOnboardingVideos((prev) => prev.filter((v) => v.id !== id))
      void (async () => {
        await client.from('portal_onboarding_videos').delete().eq('id', id)
        await reloadData()
      })()
    },
    [client, reloadData],
  )

  const addOnboardingChecklistItem: DataContextValue['addOnboardingChecklistItem'] = useCallback(
    (item) => {
      const maxOrder = onboardingChecklist.reduce((m, c) => Math.max(m, c.order), 0)
      const c: OnboardingChecklistItem = { ...item, id: 'ck_' + uid(), order: item.order ?? maxOrder + 1 }
      setOnboardingChecklist((prev) => [...prev, c])
      void (async () => {
        await client.from('portal_onboarding_checklist').insert(checklistToRow(c))
        await reloadData()
      })()
    },
    [client, onboardingChecklist, reloadData],
  )

  const updateOnboardingChecklistItem: DataContextValue['updateOnboardingChecklistItem'] = useCallback(
    (id, patch) => {
      setOnboardingChecklist((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
      void (async () => {
        const { data, error: selErr } = await client
          .from('portal_onboarding_checklist')
          .select('*')
          .eq('id', id)
          .maybeSingle()
        if (selErr || !data) return
        const c = rowToChecklistItem(data as Record<string, unknown>)
        const next = { ...c, ...patch }
        await client.from('portal_onboarding_checklist').update(checklistToRow(next)).eq('id', id)
        await reloadData()
      })()
    },
    [client, reloadData],
  )

  const deleteOnboardingChecklistItem: DataContextValue['deleteOnboardingChecklistItem'] = useCallback(
    (id) => {
      setOnboardingChecklist((prev) => prev.filter((c) => c.id !== id))
      void (async () => {
        await client.from('portal_onboarding_checklist').delete().eq('id', id)
        await reloadData()
      })()
    },
    [client, reloadData],
  )

  const addDocument: DataContextValue['addDocument'] = useCallback(
    (d) => {
      const doc: DocumentItem = { ...d, id: 'd_' + uid(), uploadedAt: new Date().toISOString() }
      setDocuments((prev) => [doc, ...prev])
      void (async () => {
        const { error } = await client.from('portal_documents').insert({
          id: doc.id,
          title: doc.title,
          description: doc.description ?? null,
          category: doc.category,
          file_name: doc.fileName,
          file_size: doc.fileSize,
          file_path: doc.filePath ?? null,
          uploaded_by_id: doc.uploadedById,
          uploaded_at: doc.uploadedAt,
          hr_only: doc.hrOnly ?? false,
          management_only: doc.managementOnly ?? false,
        })
        if (error) reportDataError('upload document', error)
        await reloadData()
      })()
    },
    [client, reloadData],
  )

  const deleteDocument = useCallback(
    (id: string) => {
      setDocuments((prev) => prev.filter((d) => d.id !== id))
      void (async () => {
        const { error } = await client.from('portal_documents').delete().eq('id', id)
        if (error) reportDataError('delete document', error)
        await reloadData()
      })()
    },
    [client, reloadData],
  )

  const giveRecognition: DataContextValue['giveRecognition'] = useCallback(
    (r) => {
      const id = 'r_' + uid()
      const now = new Date().toISOString()
      const post: RecognitionPost = { ...r, id, createdAt: now, reactedBy: [] }
      setRecognition((prev) => [post, ...prev])
      void (async () => {
        const { error } = await client.from('portal_recognition_posts').insert({
          id: post.id,
          giver_id: post.giverId,
          receiver_id: post.receiverId,
          message: post.message,
          tag: post.tag,
          created_at: post.createdAt,
          reacted_by: [],
        })
        if (error) {
          reportDataError('send recognition', error)
          await reloadData()
          return
        }
        const giver = users.find((u) => u.id === r.giverId)
        await queueInboxInsert([
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
        ])
        await reloadData()
      })()
      return post
    },
    [client, users, queueInboxInsert, reloadData],
  )

  const toggleRecognitionReaction: DataContextValue['toggleRecognitionReaction'] = useCallback(
    (id, userId) => {
      setRecognition((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r
          const reactedBy = r.reactedBy.includes(userId)
            ? r.reactedBy.filter((u) => u !== userId)
            : [...r.reactedBy, userId]
          return { ...r, reactedBy }
        }),
      )
      void (async () => {
        const { data, error: selErr } = await client
          .from('portal_recognition_posts')
          .select('reacted_by')
          .eq('id', id)
          .maybeSingle()
        if (selErr || !data) return
        const cur = readStringArray(data.reacted_by)
        const reactedBy = cur.includes(userId)
          ? cur.filter((u) => u !== userId)
          : [...cur, userId]
        await client.from('portal_recognition_posts').update({ reacted_by: reactedBy }).eq('id', id)
        await reloadData()
      })()
    },
    [client, reloadData],
  )

  const markInboxRead = useCallback(
    (id: string) => {
      setInbox((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      void (async () => {
        await client.from('portal_inbox_notifications').update({ read: true }).eq('id', id)
        await reloadData()
      })()
    },
    [client, reloadData],
  )

  const markAllInboxRead = useCallback(
    (userId: string) => {
      void (async () => {
        await client
          .from('portal_inbox_notifications')
          .update({ read: true })
          .eq('user_id', userId)
          .eq('read', false)
        await reloadData()
      })()
    },
    [client, reloadData],
  )

  const addEvent: DataContextValue['addEvent'] = useCallback(
    (e) => {
      const ev: EventItem = { ...e, id: 'e_' + uid() }
      setEvents((prev) => [...prev, ev])
      void (async () => {
        await client.from('portal_events').insert({
          id: ev.id,
          title: ev.title,
          description: ev.description ?? null,
          event_date: ev.date,
          start_time: ev.startTime ?? null,
          end_time: ev.endTime ?? null,
          location: ev.location ?? null,
          audience: ev.audience,
          source: ev.source ?? 'workspace',
        })
        await reloadData()
      })()
    },
    [client, reloadData],
  )

  const [taskCategories, setTaskCategories] = useState<TaskCategoryItem[]>(DEFAULT_TASK_CATEGORIES)

  useEffect(() => {
    void fetchTaskCategories(client)
      .then((rows) => {
        if (rows.length) setTaskCategories(rows)
      })
      .catch((e) => reportDataError('load task categories', e instanceof Error ? e : { message: String(e) }))
  }, [client])

  const addTaskCategory = useCallback(
    (label: string) => {
      const id = 'cat_' + uid()
      void (async () => {
        const { error } = await client.from('portal_task_categories').insert({
          id,
          label,
          sort_order: taskCategories.length + 1,
        })
        if (error) reportDataError('add task category', error)
        else setTaskCategories((prev) => [...prev, { id, label }])
      })()
    },
    [client, taskCategories.length],
  )

  const updateTaskCategory = useCallback(
    (id: string, label: string) => {
      setTaskCategories((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)))
      void client.from('portal_task_categories').update({ label }).eq('id', id).then(({ error }) => {
        if (error) reportDataError('update task category', error)
      })
    },
    [client],
  )

  const deleteTaskCategory = useCallback(
    (id: string) => {
      setTaskCategories((prev) => prev.filter((c) => c.id !== id))
      void client.from('portal_task_categories').delete().eq('id', id).then(({ error }) => {
        if (error) reportDataError('delete task category', error)
      })
    },
    [client],
  )

  const value = useMemo<DataContextValue>(
    () => ({
      users,
      updateUser,
      addUser: () => { throw new Error('Use Supabase invite in Supabase mode') },
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
      addTeam: async (t) => {
        const id = 'team_' + uid()
        await client.from('portal_teams').insert({ id, name: t.name, description: t.description, department_id: t.departmentId, lead_user_id: t.leadUserId, asst_lead_user_id: t.asstLeadUserId })
        setTeams((prev) => [...prev, { ...t, id, memberIds: [] }])
      },
      updateTeam: async (id, patch) => {
        await client.from('portal_teams').update({ name: patch.name, description: patch.description, department_id: patch.departmentId, lead_user_id: patch.leadUserId, asst_lead_user_id: patch.asstLeadUserId }).eq('id', id)
        setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
      },
      deleteTeam: async (id) => {
        await client.from('portal_teams').delete().eq('id', id)
        setTeams((prev) => prev.filter((t) => t.id !== id))
      },
      departments,
      addDepartment: async (d) => {
        const id = 'dept_' + uid()
        const now = new Date().toISOString()
        await client.from('portal_departments').insert({ id, name: d.name, description: d.description, head_user_id: d.headUserId, created_at: now })
        setDepartments((prev) => [...prev, { ...d, id, createdAt: now }])
      },
      updateDepartment: async (id, patch) => {
        await client.from('portal_departments').update({ name: patch.name, description: patch.description, head_user_id: patch.headUserId }).eq('id', id)
        setDepartments((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)))
      },
      deleteDepartment: async (id) => {
        await client.from('portal_departments').delete().eq('id', id)
        setDepartments((prev) => prev.filter((d) => d.id !== id))
      },
      pendingUsers: users.filter((u) => !u.active),
      accessRequests,
      approveUser: async (id, role, department, jobTitle) => {
        const result = await approvePortalUser(client, id, role, department, jobTitle)
        if (!result.ok) {
          notifyError(result.error ?? 'Could not approve this account.')
          await reloadData()
          return { ok: false as const, error: result.error }
        }
        setUsers((prev) =>
          prev.map((u) => (u.id === id ? { ...u, role, department, jobTitle, active: true } : u)),
        )
        void reloadData()
        return { ok: true as const, emailSent: result.emailSent }
      },
      taskCategories,
      addTaskCategory,
      updateTaskCategory,
      deleteTaskCategory,
      dataStatus,
      dataError,
      reloadData,
    }),
    [
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
      departments,
      accessRequests,
      taskCategories,
      addTaskCategory,
      updateTaskCategory,
      deleteTaskCategory,
      dataStatus,
      dataError,
      reloadData,
      client,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

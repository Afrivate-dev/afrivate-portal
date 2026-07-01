import { useMemo, useState } from 'react'
import {
  Users as UsersIcon,
  Megaphone,
  CalendarDays,
  GraduationCap,
  ClipboardList,
  Pencil,
  Trash2,
  Check,
  X,
  Plus,
  Eye,
  Building2,
  UsersRound,
  BarChart3,
  UserCheck,
} from 'lucide-react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import { useConfirm } from '@/context/useConfirm'
import { useData } from '@/context/DataContext'
import { isFirstTimePendingUser } from '@/context/dataContextShared'
import { confirms } from '@/content/copy'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/shared/EmptyState'
import { LeaveSupportingDoc } from '@/components/shared/LeaveSupportingDoc'
import { HrDashboardSection } from '@/pages/admin/HrDashboardSection'
import { useHr } from '@/context/HrContext'
import { MediaAttachmentEditor } from '@/components/shared/AnnouncementAttachments'
import { TabBar, type TabBarItem } from '@/components/ui/TabBar'
import { cn, fmtDate, firstName, relativeTime, uid, weekLabel, canChangeRoles, roleLabel } from '@/utils/helpers'
import { invitePortalUser } from '@/lib/invitePortalUser'
import { supabase } from '@/lib/supabase'
import type {
  Announcement,
  AnnouncementMedia,
  AnnouncementPriority,
  Department,
  LeaveRequest,
  LeaveType,
  OnboardingChecklistItem,
  OnboardingVideo,
  Role,
  User,
  WorkspaceTeam,
} from '@/types'

type Section = 'approvals' | 'users' | 'departments' | 'teams' | 'announcements' | 'leave' | 'onboarding' | 'checkins' | 'hr'

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'staff', label: 'Staff' },
  { value: 'assistant_lead', label: 'Assistant Lead' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'hr', label: 'People & Culture' },
  { value: 'admin', label: 'Administrator' },
]

const LEAVE_TYPE: Record<LeaveType, string> = {
  annual: 'Annual',
  sick: 'Sick',
  emergency: 'Emergency',
}

function sameWeek(a: string, b: string) {
  return (
    startOfWeek(parseISO(a), { weekStartsOn: 1 }).toISOString() ===
    startOfWeek(parseISO(b), { weekStartsOn: 1 }).toISOString()
  )
}

function dayCountLeave(startISO: string, endISO: string) {
  const s = parseISO(startISO)
  const e = parseISO(endISO)
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

export function AdminPanelPage() {
  const { user, updateProfile } = useAuth()
  const { getMetrics } = useHr()
  const confirm = useConfirm()
  const {
    users,
    updateUser,
    addUser,
    announcements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    leaveRequests,
    reviewLeave,
    onboardingVideos,
    onboardingChecklist,
    addOnboardingVideo,
    updateOnboardingVideo,
    deleteOnboardingVideo,
    addOnboardingChecklistItem,
    updateOnboardingChecklistItem,
    deleteOnboardingChecklistItem,
    checkIns,
    pendingUsers,
    accessRequests,
    approveUser,
    departments,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    teams,
    addTeam,
    updateTeam,
    deleteTeam,
    memoCategories,
  } = useData()

  const [section, setSection] = useState<Section>('approvals')

  // Generic confirm dialog state
  const [confirmState, setConfirmState] = useState<{
    title: string
    message: string
    onConfirm: () => void
  } | null>(null)
  // Generic alert dialog state (informational, no cancel)
  const [alertMessage, setAlertMessage] = useState<string | null>(null)

  // Departments & teams state
  const [deptDraft, setDeptDraft] = useState<Partial<Department> & { id?: string } | null>(null)
  const [teamDraft, setTeamDraft] = useState<Partial<WorkspaceTeam> & { id?: string } | null>(null)

  // Approval state
  const [approvingUser, setApprovingUser] = useState<User | null>(null)
  const [approvalRole, setApprovalRole] = useState<Role>('staff')
  const [approvalDeptId, setApprovalDeptId] = useState('')
  const [approvalTitle, setApprovalTitle] = useState('')
  const [approving, setApproving] = useState(false)

  const adminUser = canChangeRoles(user)

  const openApprovalForUser = (u: User) => {
    const req = accessRequests.find((r) => r.userId === u.id)
    setApprovingUser(u)
    setApprovalRole('staff')
    setApprovalDeptId(req?.preferredDepartmentId ?? departments[0]?.id ?? '')
    setApprovalTitle(req?.jobTitle ?? u.jobTitle ?? '')
  }

  const resolveDepartmentName = (deptId: string) =>
    departments.find((d) => d.id === deptId)?.name ?? ''

  const saveDept = async () => {
    if (!deptDraft?.name?.trim()) return
    const ok = await confirm({
      title: confirms.saveDepartmentTitle,
      message: confirms.saveDepartment,
      confirmLabel: 'Save',
    })
    if (!ok) return
    if (deptDraft.id) {
      updateDepartment(deptDraft.id, { name: deptDraft.name.trim(), description: deptDraft.description, headUserId: deptDraft.headUserId })
    } else {
      addDepartment({ name: deptDraft.name.trim(), description: deptDraft.description, headUserId: deptDraft.headUserId })
    }
    setDeptDraft(null)
  }

  const saveTeam = async () => {
    if (!teamDraft?.name?.trim()) return
    if (!teamDraft.departmentId) {
      setAlertMessage('Please select a department for this team. Every team must belong to one department.')
      return
    }
    const ok = await confirm({
      title: confirms.saveTeamTitle,
      message: confirms.saveTeam,
      confirmLabel: 'Save',
    })
    if (!ok) return
    if (teamDraft.id) {
      updateTeam(teamDraft.id, { name: teamDraft.name.trim(), description: teamDraft.description, departmentId: teamDraft.departmentId, leadUserId: teamDraft.leadUserId, asstLeadUserId: teamDraft.asstLeadUserId })
    } else {
      addTeam({ name: teamDraft.name.trim(), description: teamDraft.description, departmentId: teamDraft.departmentId, leadUserId: teamDraft.leadUserId, asstLeadUserId: teamDraft.asstLeadUserId })
    }
    setTeamDraft(null)
  }

  const confirmApproval = async () => {
    if (!approvingUser || approving) return
    const deptName = resolveDepartmentName(approvalDeptId)
    if (!deptName) {
      setAlertMessage('Please select a department.')
      return
    }
    const ok = await confirm({
      title: confirms.approveAccountTitle,
      message: confirms.approveAccount,
      confirmLabel: 'Approve',
    })
    if (!ok) return
    setApproving(true)
    const roleToApply = adminUser ? approvalRole : 'staff'
    const result = await approveUser(
      approvingUser.id,
      roleToApply,
      deptName,
      approvalTitle.trim() || 'Staff',
    )
    setApproving(false)
    if (!result.ok) {
      setAlertMessage(result.error ?? 'Could not approve this account. Try again.')
      return
    }
    setApprovingUser(null)
    const emailNote = result.emailSent
      ? ' They have been emailed.'
      : ' They were notified in the portal.'
    setAlertMessage(`${approvingUser.name} is now active.${emailNote}`)
  }

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [inviteError, setInviteError] = useState('')
  const [localPassword, setLocalPassword] = useState('')

  const sendInvite = async () => {
    if (!inviteEmail.trim() || inviteStatus === 'sending') return
    const ok = await confirm({
      title: confirms.inviteUserTitle,
      message: confirms.inviteUser(inviteEmail.trim()),
      confirmLabel: supabase ? 'Send invite' : 'Create account',
    })
    if (!ok) return
    if (!supabase) {
      // Local mode: create the account directly and surface credentials
      const pwd = uid()
      setLocalPassword(pwd)
      addUser(inviteEmail.trim(), inviteName.trim() || inviteEmail.split('@')[0], pwd)
      setInviteStatus('sent')
      return
    }
    setInviteStatus('sending')
    setInviteError('')
    try {
      const result = await invitePortalUser(supabase, inviteEmail.trim(), inviteName.trim())
      if (!result.ok) throw new Error(result.error)
      setInviteStatus('sent')
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite')
      setInviteStatus('error')
    }
  }

  const closeInvite = () => {
    setInviteOpen(false)
    setInviteEmail('')
    setInviteName('')
    setInviteStatus('idle')
    setInviteError('')
    setLocalPassword('')
  }
  const [leaveMonth, setLeaveMonth] = useState(() => startOfMonth(new Date()))
  const [annDraft, setAnnDraft] = useState<{
    id?: string
    title: string
    body: string
    audience: string
    priority: AnnouncementPriority
    memoCategory: string
    media: AnnouncementMedia[]
  } | null>(null)
  const [reviewing, setReviewing] = useState<{ req: LeaveRequest; status: 'approved' | 'declined' } | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [videoDraft, setVideoDraft] = useState<
    (Omit<OnboardingVideo, 'id'> & { id?: string }) | null
  >(null)
  const [checklistDraft, setChecklistDraft] = useState<
    (Omit<OnboardingChecklistItem, 'id'> & { id?: string }) | null
  >(null)



  const currentWeekStart = useMemo(
    () => startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString(),
    [],
  )

  const weekDigest = useMemo(
    () =>
      checkIns
        .filter((c) => sameWeek(c.weekStart, currentWeekStart))
        .sort((a, b) => (a.submittedAt > b.submittedAt ? -1 : 1)),
    [checkIns, currentWeekStart],
  )

  const pendingLeave = useMemo(
    () => leaveRequests.filter((l) => l.status === 'pending'),
    [leaveRequests],
  )

  const adminSectionTabs = useMemo((): TabBarItem<Section>[] => {
    const tabs: TabBarItem<Section>[] = [
      {
        id: 'approvals',
        label: (
          <span className="inline-flex items-center gap-2">
            <UserCheck className="h-4 w-4" /> Approvals
          </span>
        ),
        count: pendingUsers.length > 0 ? pendingUsers.length : undefined,
      },
      {
        id: 'users',
        label: (
          <span className="inline-flex items-center gap-2">
            <UsersIcon className="h-4 w-4" /> Users
          </span>
        ),
      },
    ]
    if (adminUser) {
      tabs.push(
        {
          id: 'departments',
          label: (
            <span className="inline-flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Departments
            </span>
          ),
        },
        {
          id: 'teams',
          label: (
            <span className="inline-flex items-center gap-2">
              <UsersRound className="h-4 w-4" /> Teams
            </span>
          ),
        },
      )
    }
    tabs.push(
      {
        id: 'announcements',
        label: (
          <span className="inline-flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Announcements
          </span>
        ),
      },
      {
        id: 'leave',
        label: (
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Leave
          </span>
        ),
        count: pendingLeave.length > 0 ? pendingLeave.length : undefined,
      },
      {
        id: 'onboarding',
        label: (
          <span className="inline-flex items-center gap-2">
            <GraduationCap className="h-4 w-4" /> Onboarding
          </span>
        ),
      },
      {
        id: 'checkins',
        label: (
          <span className="inline-flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> Check-ins
          </span>
        ),
      },
      {
        id: 'hr',
        label: (
          <span className="inline-flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> HR dashboard
          </span>
        ),
      },
    )
    return tabs
  }, [adminUser, pendingLeave.length, pendingUsers.length])

  const patchUser = (id: string, patch: Partial<User>) => {
    if ('role' in patch && !adminUser) {
      setAlertMessage('Only administrators can change roles.')
      return
    }
    if (user?.id === id && patch.active === false) {
      setAlertMessage('You cannot deactivate your own account while signed in.')
      return
    }
    updateUser(id, patch, (errMsg) => {
      setAlertMessage(errMsg)
    })
    if (user?.id === id) updateProfile(patch)
  }

  const handleRoleChange = async (u: User, newRole: Role) => {
    if (newRole === u.role) return
    const label = ROLE_OPTIONS.find((o) => o.value === newRole)?.label ?? newRole
    const ok = await confirm({
      title: confirms.changeRoleTitle,
      message: confirms.changeRole(u.name, label),
      confirmLabel: 'Change role',
    })
    if (ok) patchUser(u.id, { role: newRole })
  }

  const handleActiveChange = async (u: User, active: boolean) => {
    if (active === u.active) return
    if (active && isFirstTimePendingUser(u)) {
      setSection('approvals')
      openApprovalForUser(u)
      setAlertMessage('New signups must be approved from the Approvals tab — choose a department and role, then confirm.')
      return
    }
    if (active) {
      const ok = await confirm({
        title: confirms.activateUserTitle,
        message: confirms.activateUser,
        confirmLabel: 'Activate',
      })
      if (!ok) return
    } else {
      const ok = await confirm({
        title: confirms.deactivateUserTitle,
        message: confirms.deactivateUser,
        confirmLabel: 'Deactivate',
        destructive: true,
      })
      if (!ok) return
    }
    patchUser(u.id, { active })
  }

  const openAnn = (a: Announcement) => {
    setAnnDraft({
      id: a.id,
      title: a.title,
      body: a.body,
      audience: a.audience,
      priority: a.priority,
      memoCategory: a.memoCategory ?? 'general',
      media: a.media ? [...a.media] : [],
    })
  }

  const saveAnn = async () => {
    if (!annDraft?.title.trim() || !annDraft.body.trim() || !user) return
    const ok = await confirm({
      title: confirms.postUpdateTitle,
      message: confirms.postUpdate,
      confirmLabel: annDraft.id ? 'Save changes' : 'Publish',
    })
    if (!ok) return
    const payload = {
      title: annDraft.title.trim(),
      body: annDraft.body.trim(),
      audience: annDraft.audience,
      priority: annDraft.priority,
      memoCategory: annDraft.memoCategory,
      media: annDraft.media.length > 0 ? annDraft.media : [],
    }
    if (annDraft.id) {
      updateAnnouncement(annDraft.id, payload)
    } else {
      createAnnouncement({ ...payload, postedById: user.id })
    }
    setAnnDraft(null)
  }

  const confirmReview = async () => {
    if (!reviewing || !user) return
    const ok = await confirm({
      title: reviewing.status === 'approved' ? confirms.approveLeaveTitle : confirms.declineLeaveTitle,
      message: reviewing.status === 'approved' ? confirms.approveLeave : confirms.declineLeave,
      confirmLabel: reviewing.status === 'approved' ? 'Approve' : 'Decline',
      destructive: reviewing.status === 'declined',
    })
    if (!ok) return
    reviewLeave(reviewing.req.id, reviewing.status, user.id, reviewNote.trim() || undefined)
    setReviewing(null)
    setReviewNote('')
  }

  const saveVideo = () => {
    if (!videoDraft?.title.trim() || !videoDraft.youtubeUrl.trim()) return
    if (videoDraft.id) {
      updateOnboardingVideo(videoDraft.id, {
        title: videoDraft.title.trim(),
        section: videoDraft.section.trim(),
        description: videoDraft.description.trim(),
        youtubeUrl: videoDraft.youtubeUrl.trim(),
        duration: videoDraft.duration.trim(),
        order: Number(videoDraft.order) || 0,
      })
    } else {
      addOnboardingVideo({
        title: videoDraft.title.trim(),
        section: videoDraft.section.trim() || 'Other',
        description: videoDraft.description.trim(),
        youtubeUrl: videoDraft.youtubeUrl.trim(),
        duration: videoDraft.duration.trim() || '—',
        order: Number(videoDraft.order) || onboardingVideos.length + 1,
      })
    }
    setVideoDraft(null)
  }

  const saveChecklist = () => {
    if (!checklistDraft?.label.trim()) return
    if (checklistDraft.id) {
      updateOnboardingChecklistItem(checklistDraft.id, {
        label: checklistDraft.label.trim(),
        link: checklistDraft.link?.trim() || undefined,
        order: Number(checklistDraft.order) || 0,
      })
    } else {
      addOnboardingChecklistItem({
        label: checklistDraft.label.trim(),
        link: checklistDraft.link?.trim() || undefined,
        order: Number(checklistDraft.order) || onboardingChecklist.length + 1,
      })
    }
    setChecklistDraft(null)
  }

  if (!user) return null

  return (
    <div className="av-contain space-y-6">
      <PageHeader
        title="Admin"
        description="User management, content moderation, and operational overview."
      />

      <TabBar tabs={adminSectionTabs} active={section} onChange={setSection} variant="pill" />

      {/* APPROVALS */}
      {section === 'approvals' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <Plus className="h-4 w-4" /> Invite member
            </Button>
          </div>
          {pendingUsers.length === 0 ? (
            <EmptyState icon={UserCheck} title="No pending approvals" description="When someone requests access, they'll appear here for you to review." />
          ) : (
            pendingUsers.map((u) => {
              const req = accessRequests.find((r) => r.userId === u.id)
              const reqDept = req?.preferredDepartmentId
                ? departments.find((d) => d.id === req.preferredDepartmentId)?.name
                : undefined
              return (
              <Card key={u.id} padding="md" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium text-fg">{u.name}</div>
                  <div className="text-sm text-muted">{u.email}</div>
                  {reqDept || req?.jobTitle ? (
                    <div className="mt-1 text-xs text-muted">
                      {reqDept ? `Department: ${reqDept}` : null}
                      {reqDept && req?.jobTitle ? ' · ' : null}
                      {req?.jobTitle ? `Role: ${req.jobTitle}` : null}
                    </div>
                  ) : null}
                  {req?.message ? (
                    <p className="mt-1 text-xs text-muted italic">“{req.message}”</p>
                  ) : null}
                </div>
                <Button size="sm" onClick={() => openApprovalForUser(u)}>
                  Review & approve
                </Button>
              </Card>
            )})
          )}
        </div>
      ) : null}

      {/* DEPARTMENTS */}
      {section === 'departments' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setDeptDraft({ name: '', description: '' })}>
              <Plus className="h-4 w-4" /> New department
            </Button>
          </div>
          {departments.length === 0 ? (
            <EmptyState icon={Building2} title="No departments yet" description="Create departments to organise your team structure." />
          ) : (
            <Card padding="none" className="av-scroll-x">
              <div className="hidden min-w-[640px] lg:block">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-surface-2">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted">Department</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Head</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Teams</th>
                    <th className="px-4 py-3 text-right font-medium text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((d) => {
                    const head = users.find((u) => u.id === d.headUserId)
                    const deptTeams = teams.filter((t) => t.departmentId === d.id)
                    return (
                      <tr key={d.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          <div className="font-medium text-fg">{d.name}</div>
                          {d.description ? <div className="text-xs text-muted">{d.description}</div> : null}
                        </td>
                        <td className="px-4 py-3 text-muted">{head?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-muted">{deptTeams.length}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setDeptDraft(d)} className="rounded p-1 hover:bg-surface-2 text-muted">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              aria-label={`Delete department ${d.name}`}
                              onClick={() => setConfirmState({
                                title: 'Delete department',
                                message: `Delete "${d.name}"? This cannot be undone.`,
                                onConfirm: () => deleteDepartment(d.id),
                              })}
                              className="rounded p-1 hover:bg-surface-2 text-danger"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
              <ul className="divide-y divide-border lg:hidden">
                {departments.map((d) => {
                  const head = users.find((u) => u.id === d.headUserId)
                  const deptTeams = teams.filter((t) => t.departmentId === d.id)
                  return (
                    <li key={d.id} className="space-y-2 p-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-fg">{d.name}</p>
                        {d.description ? <p className="text-xs text-muted">{d.description}</p> : null}
                      </div>
                      <p className="text-xs text-muted">
                        Head: {head?.name ?? '—'} · {deptTeams.length} team{deptTeams.length === 1 ? '' : 's'}
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setDeptDraft(d)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-danger"
                          onClick={() => setConfirmState({
                            title: 'Delete department',
                            message: `Delete "${d.name}"? This cannot be undone.`,
                            onConfirm: () => deleteDepartment(d.id),
                          })}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}
        </div>
      ) : null}

      {/* TEAMS */}
      {section === 'teams' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setTeamDraft({ name: '', description: '' })}>
              <Plus className="h-4 w-4" /> New team
            </Button>
          </div>
          {teams.length === 0 ? (
            <EmptyState icon={UsersRound} title="No teams yet" description="Create teams and assign team leads to manage your people." />
          ) : (
            <Card padding="none" className="av-scroll-x">
              <div className="hidden min-w-[720px] lg:block">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-surface-2">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted">Team</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Department</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Team Lead</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Asst Lead</th>
                    <th className="px-4 py-3 text-right font-medium text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t) => {
                    const dept = departments.find((d) => d.id === t.departmentId)
                    const lead = users.find((u) => u.id === t.leadUserId)
                    const asst = users.find((u) => u.id === t.asstLeadUserId)
                    return (
                      <tr key={t.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          <div className="font-medium text-fg">{t.name}</div>
                          {t.description ? <div className="text-xs text-muted">{t.description}</div> : null}
                        </td>
                        <td className="px-4 py-3 text-muted">{dept?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-muted">{lead?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-muted">{asst?.name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setTeamDraft(t)} className="rounded p-1 hover:bg-surface-2 text-muted">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              aria-label={`Delete team ${t.name}`}
                              onClick={() => setConfirmState({
                                title: 'Delete team',
                                message: `Delete "${t.name}"? This cannot be undone.`,
                                onConfirm: () => deleteTeam(t.id),
                              })}
                              className="rounded p-1 hover:bg-surface-2 text-danger"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
              <ul className="divide-y divide-border lg:hidden">
                {teams.map((t) => {
                  const dept = departments.find((d) => d.id === t.departmentId)
                  const lead = users.find((u) => u.id === t.leadUserId)
                  const asst = users.find((u) => u.id === t.asstLeadUserId)
                  return (
                    <li key={t.id} className="space-y-2 p-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-fg">{t.name}</p>
                        {t.description ? <p className="text-xs text-muted">{t.description}</p> : null}
                      </div>
                      <p className="text-xs text-muted">
                        {dept?.name ?? 'No department'} · Lead: {lead?.name ?? '—'}
                        {asst ? ` · Asst: ${asst.name}` : ''}
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setTeamDraft(t)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-danger"
                          onClick={() => setConfirmState({
                            title: 'Delete team',
                            message: `Delete "${t.name}"? This cannot be undone.`,
                            onConfirm: () => deleteTeam(t.id),
                          })}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}
        </div>
      ) : null}

      {/* USERS */}
      {section === 'users' ? (
        <Card padding="none" className="av-scroll-x">
          <div className="hidden min-w-[720px] lg:block">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/60 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="p-3 font-medium">Person</th>
                  <th className="p-3 font-medium">Role</th>
                  <th className="p-3 font-medium">Department</th>
                  <th className="p-3 font-medium">Joined</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...users]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((u) => (
                    <tr key={u.id} className="border-t border-border hover:bg-surface-2/30">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} src={u.avatarUrl} size="sm" />
                          <div>
                            <p className="font-medium text-fg">{u.name}</p>
                            <p className="text-xs text-muted">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {adminUser ? (
                          <select
                            aria-label={`Change role for ${u.name}`}
                            value={u.role}
                            onChange={(e) => void handleRoleChange(u, e.target.value as Role)}
                            className="w-full max-w-[140px] rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-fg"
                          >
                            {ROLE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-muted">{roleLabel[u.role]}</span>
                        )}
                      </td>
                      <td className="p-3 text-muted">{u.department}</td>
                      <td className="p-3 text-muted">{fmtDate(u.joinedAt)}</td>
                      <td className="p-3">
                        {isFirstTimePendingUser(u) ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setSection('approvals')
                              openApprovalForUser(u)
                            }}
                          >
                            Approve in Approvals
                          </Button>
                        ) : (
                          <label className="flex cursor-pointer items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={u.active}
                              disabled={u.id === user.id}
                              onChange={(e) => void handleActiveChange(u, e.target.checked)}
                              className="h-4 w-4 rounded border-border"
                            />
                            <span className={u.active ? 'text-emerald-600' : 'text-muted'}>
                              {u.active ? 'Active' : 'Inactive'}
                            </span>
                          </label>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-border lg:hidden">
            {[...users]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((u) => (
                <li key={u.id} className="space-y-2 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} src={u.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-fg">{u.name}</p>
                      <p className="truncate text-xs text-muted">{u.email}</p>
                    </div>
                  </div>
                  {adminUser ? (
                    <Select
                      label="Role"
                      value={u.role}
                      onChange={(e) => void handleRoleChange(u, e.target.value as Role)}
                      options={ROLE_OPTIONS}
                    />
                  ) : (
                    <p className="text-xs text-muted">Role: {roleLabel[u.role]}</p>
                  )}
                  <p className="text-xs text-muted">
                    {u.department} · joined {fmtDate(u.joinedAt)}
                  </p>
                  <label className="flex items-center gap-2 text-sm">
                    {isFirstTimePendingUser(u) ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full"
                        onClick={() => {
                          setSection('approvals')
                          openApprovalForUser(u)
                        }}
                      >
                        Approve in Approvals
                      </Button>
                    ) : (
                      <>
                        <input
                          type="checkbox"
                          checked={u.active}
                          disabled={u.id === user.id}
                          onChange={(e) => void handleActiveChange(u, e.target.checked)}
                        />
                        Active account
                      </>
                    )}
                  </label>
                </li>
              ))}
          </ul>
        </Card>
      ) : null}

      {/* ANNOUNCEMENTS */}
      {section === 'announcements' ? (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() =>
                setAnnDraft({
                  title: '',
                  body: '',
                  audience: 'all',
                  priority: 'info',
                  memoCategory: 'general',
                  media: [],
                })
              }
            >
              <Plus className="h-4 w-4" /> New announcement
            </Button>
          </div>
          {announcements.length === 0 ? (
            <EmptyState icon={Megaphone} title="No announcements" />
          ) : (
            announcements.map((a) => {
              const author = users.find((x) => x.id === a.postedById)
              return (
                <Card key={a.id} padding="md">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-fg">{a.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{a.body}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span>{author?.name ?? 'Unknown'}</span>
                        <span>·</span>
                        <span>{fmtDate(a.postedAt)}</span>
                        <Badge tone="info">{a.priority}</Badge>
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {a.readBy.length} read
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="sm" variant="secondary" onClick={() => openAnn(a)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger hover:bg-danger/10"
                        onClick={() => setConfirmState({
                          title: 'Delete announcement',
                          message: 'Delete this announcement? It will be removed for all staff.',
                          onConfirm: () => deleteAnnouncement(a.id),
                        })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>
      ) : null}

      {/* LEAVE */}
      {section === 'leave' ? (
        <div className="space-y-6">
          <Card padding="md">
            <h3 className="mb-3 text-sm font-semibold text-fg">Approval queue</h3>
            {pendingLeave.length === 0 ? (
              <p className="text-sm text-muted">No pending leave requests.</p>
            ) : (
              <ul className="space-y-2">
                {pendingLeave.map((l) => {
                  const u = users.find((x) => x.id === l.userId)
                  return (
                    <li
                      key={l.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface-2/30 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-fg">
                          {u?.name ?? 'Unknown'} · {LEAVE_TYPE[l.type]}
                        </p>
                        <p className="text-xs text-muted">
                          {fmtDate(l.startDate)} → {fmtDate(l.endDate)} ·{' '}
                          {dayCountLeave(l.startDate, l.endDate)} days
                        </p>
                        {user ? <LeaveSupportingDoc request={l} viewer={user} /> : null}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => setReviewing({ req: l, status: 'approved' })}>
                          <Check className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReviewing({ req: l, status: 'declined' })}
                        >
                          <X className="h-3.5 w-3.5" /> Decline
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card padding="md">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold text-fg">Leave calendar (approved & pending)</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLeaveMonth((m) => addMonths(m, -1))}
                  className="rounded-md p-1.5 hover:bg-surface-2"
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <span className="text-xs font-medium">{format(leaveMonth, 'MMM yyyy')}</span>
                <button
                  type="button"
                  onClick={() => setLeaveMonth((m) => addMonths(m, 1))}
                  className="rounded-md p-1.5 hover:bg-surface-2"
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>
            </div>
            <LeaveAdminGrid
              month={leaveMonth}
              requests={leaveRequests.filter((l) => l.status !== 'declined')}
              users={users}
            />
          </Card>
        </div>
      ) : null}

      {/* ONBOARDING */}
      {section === 'onboarding' ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button
              onClick={() =>
                setVideoDraft({
                  title: '',
                  section: 'Welcome & Culture',
                  description: '',
                  youtubeUrl: '',
                  duration: '',
                  order: onboardingVideos.length + 1,
                })
              }
            >
              <Plus className="h-4 w-4" /> Add video
            </Button>
          </div>
          <Card padding="none" className="av-scroll-x">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface-2/60 text-left text-xs uppercase text-muted">
                <tr>
                  <th className="p-3 font-medium">Title</th>
                  <th className="p-3 font-medium">Section</th>
                  <th className="p-3 font-medium">Duration</th>
                  <th className="p-3 font-medium">Order</th>
                  <th className="p-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {[...onboardingVideos]
                  .sort((a, b) => a.order - b.order)
                  .map((v) => (
                    <tr key={v.id} className="border-t border-border">
                      <td className="p-3 font-medium text-fg">{v.title}</td>
                      <td className="p-3 text-muted">{v.section}</td>
                      <td className="p-3 text-muted">{v.duration}</td>
                      <td className="p-3 text-muted">{v.order}</td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setVideoDraft({ ...v })}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger"
                          onClick={() => setConfirmState({
                            title: 'Remove video',
                            message: 'Remove this video? Watching progress for this video will be cleared.',
                            onConfirm: () => deleteOnboardingVideo(v.id),
                          })}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Card>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fg">Checklist items</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setChecklistDraft({
                  label: '',
                  link: '',
                  order: onboardingChecklist.length + 1,
                })
              }
            >
              <Plus className="h-4 w-4" /> Add item
            </Button>
          </div>
          <Card padding="none" className="av-scroll-x">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface-2/60 text-left text-xs uppercase text-muted">
                <tr>
                  <th className="p-3 font-medium">Label</th>
                  <th className="p-3 font-medium">Link</th>
                  <th className="p-3 font-medium">Order</th>
                  <th className="p-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {[...onboardingChecklist]
                  .sort((a, b) => a.order - b.order)
                  .map((c) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="p-3">{c.label}</td>
                      <td className="p-3 text-muted">{c.link ?? '—'}</td>
                      <td className="p-3 text-muted">{c.order}</td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setChecklistDraft({ ...c })}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger"
                          onClick={() => setConfirmState({
                            title: 'Delete checklist item',
                            message: 'Delete this checklist item? Staff completion records for it will be removed.',
                            onConfirm: () => deleteOnboardingChecklistItem(c.id),
                          })}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Card>
        </div>
      ) : null}

      {/* CHECK-INS */}
      {section === 'checkins' ? (
        <Card padding="md">
          <h3 className="mb-1 text-sm font-semibold text-fg">{weekLabel(currentWeekStart)}</h3>
          <p className="mb-4 text-xs text-muted">All submissions for the current week.</p>
          {weekDigest.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No check-ins yet this week" />
          ) : (
            <>
            <div className="hidden av-scroll-x lg:block">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Completed</th>
                    <th className="pb-2 font-medium">Next week</th>
                    <th className="pb-2 font-medium">Blockers</th>
                    <th className="pb-2 font-medium">Hours</th>
                    <th className="pb-2 font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {weekDigest.map((c) => {
                    const u = users.find((x) => x.id === c.userId)
                    return (
                      <tr key={c.id} className="border-t border-border align-top">
                        <td className="py-3 pr-3 font-medium">{u?.name ?? c.userId}</td>
                        <td className="max-w-[200px] py-3 pr-3 text-muted">
                          <span className="line-clamp-3 whitespace-pre-line">{c.completed}</span>
                        </td>
                        <td className="max-w-[200px] py-3 pr-3 text-muted">
                          <span className="line-clamp-3 whitespace-pre-line">{c.nextWeek}</span>
                        </td>
                        <td className="max-w-[160px] py-3 pr-3 text-muted">{c.blockers ?? '—'}</td>
                        <td className="py-3 pr-3">{c.hoursWorked}</td>
                        <td className="py-3 text-xs text-muted">{relativeTime(c.submittedAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <ul className="space-y-3 lg:hidden">
              {weekDigest.map((c) => {
                const u = users.find((x) => x.id === c.userId)
                return (
                  <li key={c.id} className="rounded-md border border-border p-3">
                    <p className="font-semibold text-fg">{u?.name}</p>
                    <p className="text-xs text-muted">{c.hoursWorked}h · {relativeTime(c.submittedAt)}</p>
                    <p className="mt-2 text-sm whitespace-pre-line">{c.completed}</p>
                    {c.nextWeek ? (
                      <p className="mt-2 text-sm text-muted">
                        <span className="font-medium text-fg">Next week: </span>
                        {c.nextWeek}
                      </p>
                    ) : null}
                    {c.blockers ? (
                      <p className="mt-1 text-sm text-muted">
                        <span className="font-medium text-fg">Blockers: </span>
                        {c.blockers}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
            </>
          )}
        </Card>
      ) : null}

      {section === 'hr' ? <HrDashboardSection metrics={getMetrics()} /> : null}

      {/* Modals */}

      {/* Invite modal */}
      <Modal
        open={inviteOpen}
        onClose={closeInvite}
        title="Invite team member"
        footer={
          inviteStatus === 'sent' ? (
            <Button onClick={closeInvite}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={closeInvite}>Cancel</Button>
              <Button
                onClick={sendInvite}
                loading={inviteStatus === 'sending'}
                disabled={!inviteEmail.trim()}
              >
                {supabase ? 'Send invite' : 'Create account'}
              </Button>
            </>
          )
        }
      >
        {inviteStatus === 'sent' ? (
          supabase ? (
            <div className="space-y-2 text-center py-4">
              <p className="font-semibold text-fg">Invite sent!</p>
              <p className="text-sm text-muted">
                An invite email has been dispatched to <strong>{inviteEmail}</strong>. Once
                they set their password their account will appear in the Approvals tab.
              </p>
              <p className="text-xs text-muted">
                If they don&apos;t receive it within a few minutes, ask them to check their spam folder.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <p className="font-semibold text-fg">Account created!</p>
              <p className="text-sm text-muted">
                Email delivery is not set up yet. Share the sign-in details below with{' '}
                <strong>{inviteEmail}</strong> directly.
              </p>
              <div className="rounded-md border border-border bg-surface-2 p-4 space-y-2 text-sm font-mono">
                <div><span className="text-muted">Email: </span><span className="text-fg select-all">{inviteEmail}</span></div>
                <div><span className="text-muted">Password: </span><span className="text-fg select-all font-semibold">{localPassword}</span></div>
              </div>
              <p className="text-xs text-muted">They can change their password after signing in via their profile.</p>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {supabase ? (
              <p className="text-sm text-muted">
                Enter the person's details. They'll receive an email with a link to set their
                password — you'll then approve their account from the Approvals tab.
              </p>
            ) : (
              <div className="rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-fg">
                Invites are sent by email when your organisation has email delivery configured.
                Until then, create the account here and share the sign-in details directly.
              </div>
            )}
            <Input
              label="Full name (optional)"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="e.g. Jane Smith"
            />
            <Input
              label="Email address"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@afrivate.org"
            />
            {inviteStatus === 'error' && (
              <div role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {inviteError}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Approval modal */}
      <Modal
        open={!!approvingUser}
        onClose={() => setApprovingUser(null)}
        title="Approve account"
        footer={
          <>
            <Button variant="ghost" onClick={() => setApprovingUser(null)} disabled={approving}>
              Cancel
            </Button>
            <Button onClick={() => void confirmApproval()} disabled={!approvalDeptId || approving} loading={approving}>
              Approve & activate
            </Button>
          </>
        }
      >
        {approvingUser ? (
          <div className="space-y-3">
            <div className="rounded-md bg-surface-2 px-3 py-2">
              <div className="font-medium text-fg">{approvingUser.name}</div>
              <div className="text-sm text-muted">{approvingUser.email}</div>
            </div>
            {adminUser ? (
              <Select
                label="Role"
                value={approvalRole}
                onChange={(e) => setApprovalRole(e.target.value as Role)}
                options={ROLE_OPTIONS}
              />
            ) : (
              <p className="text-sm text-muted">
                Role: Staff (only administrators can assign other roles)
              </p>
            )}
            <Select
              label="Department"
              value={approvalDeptId}
              onChange={(e) => setApprovalDeptId(e.target.value)}
              options={[
                { value: '', label: 'Select department…' },
                ...departments.map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
            <Input
              label="Job title"
              value={approvalTitle}
              onChange={(e) => setApprovalTitle(e.target.value)}
              placeholder="e.g. Software Engineer"
            />
          </div>
        ) : null}
      </Modal>

      {/* Department modal */}
      <Modal
        open={!!deptDraft}
        onClose={() => setDeptDraft(null)}
        title={deptDraft?.id ? 'Edit department' : 'New department'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeptDraft(null)}>Cancel</Button>
            <Button onClick={() => void saveDept()} disabled={!deptDraft?.name?.trim()}>Save</Button>
          </>
        }
      >
        {deptDraft !== null ? (
          <div className="space-y-3">
            <Input
              label="Department name"
              value={deptDraft.name ?? ''}
              onChange={(e) => setDeptDraft({ ...deptDraft, name: e.target.value })}
              placeholder="e.g. Engineering"
            />
            <Input
              label="Description (optional)"
              value={deptDraft.description ?? ''}
              onChange={(e) => setDeptDraft({ ...deptDraft, description: e.target.value })}
              placeholder="What this department does"
            />
            <Select
              label="Department head (optional)"
              value={deptDraft.headUserId ?? ''}
              onChange={(e) => setDeptDraft({ ...deptDraft, headUserId: e.target.value || undefined })}
              options={[
                { value: '', label: 'No head assigned' },
                ...users.filter((u) => u.active).map((u) => ({ value: u.id, label: u.name })),
              ]}
            />
          </div>
        ) : null}
      </Modal>

      {/* Team modal */}
      <Modal
        open={!!teamDraft}
        onClose={() => setTeamDraft(null)}
        title={teamDraft?.id ? 'Edit team' : 'New team'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setTeamDraft(null)}>Cancel</Button>
            <Button
              onClick={() => void saveTeam()}
              disabled={!teamDraft?.name?.trim() || !teamDraft?.departmentId}
            >
              Save
            </Button>
          </>
        }
      >
        {teamDraft !== null ? (
          <div className="space-y-3">
            <Input
              label="Team name"
              value={teamDraft.name ?? ''}
              onChange={(e) => setTeamDraft({ ...teamDraft, name: e.target.value })}
              placeholder="e.g. Frontend squad"
            />
            <Input
              label="Description (optional)"
              value={teamDraft.description ?? ''}
              onChange={(e) => setTeamDraft({ ...teamDraft, description: e.target.value })}
              placeholder="What this team works on"
            />
            <Select
              label="Department"
              value={teamDraft.departmentId ?? ''}
              onChange={(e) => setTeamDraft({ ...teamDraft, departmentId: e.target.value || undefined })}
              options={[
                { value: '', label: 'Select a department…' },
                ...departments.map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
            {!teamDraft.departmentId ? (
              <p className="text-xs text-muted">
                Teams must belong to a department before members can be assigned.
              </p>
            ) : null}
            <Select
              label="Team lead (optional)"
              value={teamDraft.leadUserId ?? ''}
              onChange={(e) => setTeamDraft({ ...teamDraft, leadUserId: e.target.value || undefined })}
              options={[
                { value: '', label: 'No lead assigned' },
                ...users.filter((u) => u.active).map((u) => ({ value: u.id, label: u.name })),
              ]}
            />
            <Select
              label="Assistant team lead (optional)"
              value={teamDraft.asstLeadUserId ?? ''}
              onChange={(e) => setTeamDraft({ ...teamDraft, asstLeadUserId: e.target.value || undefined })}
              options={[
                { value: '', label: 'No assistant lead' },
                ...users.filter((u) => u.active && u.id !== teamDraft.leadUserId).map((u) => ({ value: u.id, label: u.name })),
              ]}
            />
          </div>
        ) : null}
      </Modal>

      <Modal
        open={!!annDraft}
        onClose={() => setAnnDraft(null)}
        title={annDraft?.id ? 'Edit announcement' : 'Announcement'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAnnDraft(null)}>
              Cancel
            </Button>
            <Button onClick={() => void saveAnn()}>Save</Button>
          </>
        }
      >
        {annDraft ? (
          <div className="space-y-3">
            <Input
              label="Title"
              value={annDraft.title}
              onChange={(e) => setAnnDraft({ ...annDraft, title: e.target.value })}
            />
            <Textarea
              label="Body"
              rows={5}
              value={annDraft.body}
              onChange={(e) => setAnnDraft({ ...annDraft, body: e.target.value })}
            />
            <MediaAttachmentEditor
              items={annDraft.media}
              onChange={(media) => setAnnDraft({ ...annDraft, media })}
            />
            <Select
              label="Audience"
              value={annDraft.audience}
              onChange={(e) => setAnnDraft({ ...annDraft, audience: e.target.value })}
              options={[
                { value: 'all', label: 'Everyone' },
                ...departments.map((d) => ({ value: d.name, label: d.name })),
              ]}
            />
            <Select
              label="Memo type"
              value={annDraft.memoCategory}
              onChange={(e) =>
                setAnnDraft({
                  ...annDraft,
                  memoCategory: e.target.value,
                })
              }
              options={memoCategories.map((c) => ({ value: c.id, label: c.label }))}
            />
            <Select
              label="Priority"
              value={annDraft.priority}
              onChange={(e) =>
                setAnnDraft({ ...annDraft, priority: e.target.value as AnnouncementPriority })
              }
              options={[
                { value: 'info', label: 'Info' },
                { value: 'important', label: 'Important' },
                { value: 'urgent', label: 'Urgent' },
              ]}
            />
          </div>
        ) : null}
      </Modal>

      <Modal
        open={!!reviewing}
        onClose={() => setReviewing(null)}
        title={reviewing?.status === 'approved' ? 'Approve leave' : 'Decline leave'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReviewing(null)}>
              Cancel
            </Button>
            <Button variant={reviewing?.status === 'declined' ? 'danger' : 'primary'} onClick={() => void confirmReview()}>
              Confirm
            </Button>
          </>
        }
      >
        {reviewing && user ? (
          <div className="space-y-3">
            <LeaveSupportingDoc request={reviewing.req} viewer={user} />
            <Textarea
              label="Note (optional)"
              rows={3}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
            />
          </div>
        ) : null}
      </Modal>

      <Modal
        open={!!videoDraft}
        onClose={() => setVideoDraft(null)}
        title={videoDraft?.id ? 'Edit video' : 'Add video'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setVideoDraft(null)}>
              Cancel
            </Button>
            <Button onClick={saveVideo}>Save</Button>
          </>
        }
      >
        {videoDraft ? (
          <div className="space-y-3">
            <Input
              label="Title"
              value={videoDraft.title}
              onChange={(e) => setVideoDraft({ ...videoDraft, title: e.target.value })}
            />
            <Input
              label="Section"
              value={videoDraft.section}
              onChange={(e) => setVideoDraft({ ...videoDraft, section: e.target.value })}
            />
            <Textarea
              label="Description"
              value={videoDraft.description}
              onChange={(e) => setVideoDraft({ ...videoDraft, description: e.target.value })}
            />
            <Input
              label="YouTube URL"
              value={videoDraft.youtubeUrl}
              onChange={(e) => setVideoDraft({ ...videoDraft, youtubeUrl: e.target.value })}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Duration"
                value={videoDraft.duration}
                onChange={(e) => setVideoDraft({ ...videoDraft, duration: e.target.value })}
              />
              <Input
                label="Order"
                type="number"
                value={String(videoDraft.order)}
                onChange={(e) =>
                  setVideoDraft({ ...videoDraft, order: Number(e.target.value) || 0 })
                }
              />
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Generic confirm dialog — replaces window.confirm() */}
      <Modal
        open={!!confirmState}
        onClose={() => setConfirmState(null)}
        title={confirmState?.title ?? 'Confirm'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmState(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                confirmState?.onConfirm()
                setConfirmState(null)
              }}
            >
              Confirm
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg">{confirmState?.message}</p>
      </Modal>

      {/* Generic alert dialog — replaces window.alert() */}
      <Modal
        open={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        title="Notice"
        footer={
          <Button onClick={() => setAlertMessage(null)}>OK</Button>
        }
      >
        <p className="text-sm text-fg">{alertMessage}</p>
      </Modal>

      <Modal
        open={!!checklistDraft}
        onClose={() => setChecklistDraft(null)}
        title={checklistDraft?.id ? 'Edit checklist item' : 'Add checklist item'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setChecklistDraft(null)}>
              Cancel
            </Button>
            <Button onClick={saveChecklist}>Save</Button>
          </>
        }
      >
        {checklistDraft ? (
          <div className="space-y-3">
            <Input
              label="Label"
              value={checklistDraft.label}
              onChange={(e) => setChecklistDraft({ ...checklistDraft, label: e.target.value })}
            />
            <Input
              label="Link (optional)"
              value={checklistDraft.link ?? ''}
              onChange={(e) => setChecklistDraft({ ...checklistDraft, link: e.target.value })}
            />
            <Input
              label="Order"
              type="number"
              value={String(checklistDraft.order)}
              onChange={(e) =>
                setChecklistDraft({ ...checklistDraft, order: Number(e.target.value) || 0 })
              }
            />
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

const LEAVE_COLORS: Record<LeaveType, string> = {
  annual: '#3e8cff',
  sick: '#f59e0b',
  emergency: '#ec4899',
}

function LeaveAdminGrid({
  month,
  requests,
  users,
}: {
  month: Date
  requests: LeaveRequest[]
  users: User[]
}) {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const onDay = (d: Date) =>
    requests.filter((r) => isWithinInterval(d, { start: parseISO(r.startDate), end: parseISO(r.endDate) }))

  return (
    <>
      <div className="hidden lg:block">
      <div className="grid grid-cols-7 border border-border text-[11px] uppercase tracking-wide text-muted">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="border-b border-border px-1 py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-x border-b border-border">
        {days.map((d) => {
          const inMonth = isSameMonth(d, monthStart)
          const items = onDay(d)
          return (
            <div
              key={d.toISOString()}
              className={cn(
                'min-h-[88px] border-b border-r border-border p-1 text-xs last:border-r-0',
                !inMonth && 'bg-surface-2/20',
              )}
            >
              <span className={cn('font-medium', inMonth ? 'text-fg' : 'text-muted')}>
                {format(d, 'd')}
              </span>
              <div className="mt-1 space-y-0.5">
                {items.slice(0, 3).map((l) => {
                  const u = users.find((x) => x.id === l.userId)
                  return (
                    <div
                      key={l.id}
                      className="truncate rounded px-1 py-0.5 text-[10px] text-white"
                      style={{ background: LEAVE_COLORS[l.type], opacity: l.status === 'pending' ? 0.6 : 1 }}
                      title={`${u?.name} · ${l.type}`}
                    >
                      {firstName(u?.name)}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      </div>
      <div className="space-y-2 lg:hidden">
        {days
          .filter((d) => isSameMonth(d, monthStart))
          .map((d) => {
            const items = onDay(d)
            if (items.length === 0) return null
            return (
              <div key={d.toISOString()} className="rounded-md border border-border bg-surface p-3">
                <p className="text-xs font-semibold text-fg">{format(d, 'EEE d MMM')}</p>
                <ul className="mt-2 space-y-1">
                  {items.map((l) => {
                    const u = users.find((x) => x.id === l.userId)
                    return (
                      <li
                        key={l.id}
                        className={cn(
                          'flex items-center gap-2 rounded px-2 py-1 text-xs text-white',
                          l.status === 'pending' && 'opacity-60',
                        )}
                        style={{ background: LEAVE_COLORS[l.type] }}
                      >
                        <span className="min-w-0 flex-1 truncate font-medium">{u?.name ?? 'Unknown'}</span>
                        <span className="shrink-0 capitalize">{l.type}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        {days.filter((d) => isSameMonth(d, monthStart) && onDay(d).length > 0).length === 0 ? (
          <EmptyState icon={CalendarDays} title="No leave booked this month" />
        ) : null}
      </div>
    </>
  )
}

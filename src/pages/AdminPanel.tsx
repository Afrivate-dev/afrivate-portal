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
import { useData } from '@/context/DataContext'
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
import { MediaAttachmentEditor } from '@/components/shared/AnnouncementAttachments'
import { cn, fmtDate, relativeTime, weekLabel } from '@/utils/helpers'
import type {
  Announcement,
  AnnouncementMedia,
  AnnouncementPriority,
  LeaveRequest,
  LeaveType,
  OnboardingChecklistItem,
  OnboardingVideo,
  Role,
  User,
} from '@/types'

type Section = 'users' | 'announcements' | 'leave' | 'onboarding' | 'checkins'

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'staff', label: 'Staff' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'hr', label: 'HR' },
  { value: 'admin', label: 'Administrator' },
]

const LEAVE_TYPE: Record<LeaveType, string> = {
  annual: 'Annual',
  sick: 'Sick',
  compassionate: 'Compassionate',
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
  const {
    users,
    updateUser,
    announcements,
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
  } = useData()

  const [section, setSection] = useState<Section>('users')
  const [leaveMonth, setLeaveMonth] = useState(() => startOfMonth(new Date()))
  const [annDraft, setAnnDraft] = useState<{
    id?: string
    title: string
    body: string
    audience: string
    priority: AnnouncementPriority
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

  const departments = useMemo(() => {
    const set = new Set(users.map((u) => u.department))
    return ['all', ...Array.from(set).sort()]
  }, [users])

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

  const patchUser = (id: string, patch: Partial<User>) => {
    if (user?.id === id && patch.active === false) {
      window.alert('You cannot deactivate your own account while signed in.')
      return
    }
    updateUser(id, patch)
    if (user?.id === id) updateProfile(patch)
  }

  const openAnn = (a: Announcement) => {
    setAnnDraft({
      id: a.id,
      title: a.title,
      body: a.body,
      audience: a.audience,
      priority: a.priority,
      media: a.media ? [...a.media] : [],
    })
  }

  const saveAnn = () => {
    if (!annDraft?.title.trim() || !annDraft.body.trim()) return
    if (annDraft.id) {
      updateAnnouncement(annDraft.id, {
        title: annDraft.title.trim(),
        body: annDraft.body.trim(),
        audience: annDraft.audience,
        priority: annDraft.priority,
        media: annDraft.media.length > 0 ? annDraft.media : [],
      })
    }
    setAnnDraft(null)
  }

  const confirmReview = () => {
    if (!reviewing || !user) return
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
    <div className="space-y-6">
      <PageHeader
        title="Admin"
        description="User management, content moderation, and operational overview."
      />

      <div className="flex flex-wrap gap-2 border-b border-border pb-1">
        <SectionTab active={section === 'users'} onClick={() => setSection('users')}>
          <UsersIcon className="h-4 w-4" /> Users
        </SectionTab>
        <SectionTab active={section === 'announcements'} onClick={() => setSection('announcements')}>
          <Megaphone className="h-4 w-4" /> Announcements
        </SectionTab>
        <SectionTab active={section === 'leave'} onClick={() => setSection('leave')}>
          <CalendarDays className="h-4 w-4" /> Leave
          {pendingLeave.length > 0 ? (
            <Badge tone="warning" className="ml-1">
              {pendingLeave.length}
            </Badge>
          ) : null}
        </SectionTab>
        <SectionTab active={section === 'onboarding'} onClick={() => setSection('onboarding')}>
          <GraduationCap className="h-4 w-4" /> Onboarding
        </SectionTab>
        <SectionTab active={section === 'checkins'} onClick={() => setSection('checkins')}>
          <ClipboardList className="h-4 w-4" /> Check-ins
        </SectionTab>
      </div>

      {/* USERS */}
      {section === 'users' ? (
        <Card padding="none" className="overflow-x-auto">
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
                        <select
                          value={u.role}
                          onChange={(e) =>
                            patchUser(u.id, { role: e.target.value as Role })
                          }
                          className="w-full max-w-[140px] rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-fg"
                        >
                          {ROLE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-muted">{u.department}</td>
                      <td className="p-3 text-muted">{fmtDate(u.joinedAt)}</td>
                      <td className="p-3">
                        <label className="flex cursor-pointer items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={u.active}
                            disabled={u.id === user.id}
                            onChange={(e) => patchUser(u.id, { active: e.target.checked })}
                            className="h-4 w-4 rounded border-border"
                          />
                          <span className={u.active ? 'text-emerald-600' : 'text-muted'}>
                            {u.active ? 'Active' : 'Inactive'}
                          </span>
                        </label>
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
                  <Select
                    label="Role"
                    value={u.role}
                    onChange={(e) => patchUser(u.id, { role: e.target.value as Role })}
                    options={ROLE_OPTIONS}
                  />
                  <p className="text-xs text-muted">
                    {u.department} · joined {fmtDate(u.joinedAt)}
                  </p>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={u.active}
                      disabled={u.id === user.id}
                      onChange={(e) => patchUser(u.id, { active: e.target.checked })}
                    />
                    Active account
                  </label>
                </li>
              ))}
          </ul>
        </Card>
      ) : null}

      {/* ANNOUNCEMENTS */}
      {section === 'announcements' ? (
        <div className="space-y-3">
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
                        onClick={() => {
                          if (window.confirm('Delete this announcement?')) deleteAnnouncement(a.id)
                        }}
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
            <div className="mb-4 flex items-center justify-between">
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
          <Card padding="none" className="overflow-x-auto">
            <table className="min-w-full text-sm">
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
                          onClick={() => {
                            if (window.confirm('Remove this video? Progress links will be cleaned up.'))
                              deleteOnboardingVideo(v.id)
                          }}
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
          <Card padding="none" className="overflow-x-auto">
            <table className="min-w-full text-sm">
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
                          onClick={() => {
                            if (window.confirm('Delete this checklist item?')) {
                              deleteOnboardingChecklistItem(c.id)
                            }
                          }}
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
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-sm">
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
          )}
          <ul className="space-y-3 lg:hidden">
            {weekDigest.map((c) => {
              const u = users.find((x) => x.id === c.userId)
              return (
                <li key={c.id} className="rounded-md border border-border p-3">
                  <p className="font-semibold text-fg">{u?.name}</p>
                  <p className="text-xs text-muted">{c.hoursWorked}h · {relativeTime(c.submittedAt)}</p>
                  <p className="mt-2 text-sm">{c.completed}</p>
                </li>
              )
            })}
          </ul>
        </Card>
      ) : null}

      {/* Modals */}
      <Modal
        open={!!annDraft}
        onClose={() => setAnnDraft(null)}
        title={annDraft?.id ? 'Edit announcement' : 'Announcement'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAnnDraft(null)}>
              Cancel
            </Button>
            <Button onClick={saveAnn}>Save</Button>
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
              options={departments.map((d) => ({ value: d, label: d === 'all' ? 'Everyone' : d }))}
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
            <Button variant={reviewing?.status === 'declined' ? 'danger' : 'primary'} onClick={confirmReview}>
              Confirm
            </Button>
          </>
        }
      >
        {reviewing ? (
          <div className="space-y-3">
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
            <div className="grid grid-cols-2 gap-3">
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

function SectionTab({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active ? 'bg-accent text-white' : 'text-muted hover:bg-surface-2 hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}

const LEAVE_COLORS: Record<LeaveType, string> = {
  annual: '#3e8cff',
  sick: '#f59e0b',
  compassionate: '#ec4899',
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
                      {u?.name?.split(' ')[0]}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search,
  Mail,
  Phone,
  Calendar,
  Pencil,
  Save,
  X,
  Users as UsersIcon,
  MapPin,
  Linkedin,
  Building2,
  Copy,
  Check,
  ChevronRight,
  Upload,
  Loader2,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useCollab } from '@/context/CollabContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { PresenceDot } from '@/components/shared/PresenceDot'
import { EmptyState } from '@/components/shared/EmptyState'
import { brand, pages } from '@/content/copy'
import { MediaUploadError, uploadHostedMediaFile } from '@/utils/mediaUpload'
import { fmtDate, mailtoHref, roleLabel, cn, availabilityFromPeer } from '@/utils/helpers'
import type { User } from '@/types'

const P = pages.people

interface ProfileDraft {
  bio: string
  phone: string
  skills: string
  workLocation: string
  pronouns: string
  linkedinUrl: string
  avatarUrl: string
}

function firstName(full: string) {
  return full.trim().split(/\s+/)[0] ?? full
}

export function StaffDirectoryPage() {
  const { user, updateProfile } = useAuth()
  const { users, updateUser, dataStatus } = useData()
  const { peers, multiplayerLive, myAvailability } = useCollab()
  const [searchParams, setSearchParams] = useSearchParams()
  const peerById = useMemo(() => new Map(peers.map((p) => [p.userId, p])), [peers])
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ProfileDraft>({
    bio: '',
    phone: '',
    skills: '',
    workLocation: '',
    pronouns: '',
    linkedinUrl: '',
    avatarUrl: '',
  })
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null)
  const [avatarUploadBusy, setAvatarUploadBusy] = useState(false)
  const [avatarUploadError, setAvatarUploadError] = useState('')

  useEffect(() => {
    if (searchParams.get('profile') !== '1' || !user?.id) return
    if (dataStatus !== 'ready') return
    if (!users.some((u) => u.id === user.id)) {
      const id = requestAnimationFrame(() => setSearchParams({}, { replace: true }))
      return () => cancelAnimationFrame(id)
    }
    const id = requestAnimationFrame(() => {
      setOpenId(user.id)
      setEditing(false)
      setSearchParams({}, { replace: true })
    })
    return () => cancelAnimationFrame(id)
  }, [searchParams, setSearchParams, user?.id, users, dataStatus])

  const departments = useMemo(() => {
    const set = new Set(users.map((u) => u.department))
    return ['all', ...Array.from(set).sort()]
  }, [users])

  const visibleUsers = useMemo(() => {
    return users
      .filter((u) => u.active)
      .filter((u) => departmentFilter === 'all' || u.department === departmentFilter)
      .filter((u) => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.jobTitle.toLowerCase().includes(q) ||
          u.department.toLowerCase().includes(q) ||
          (u.workLocation ?? '').toLowerCase().includes(q) ||
          (u.skills ?? []).some((s) => s.toLowerCase().includes(q))
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [users, departmentFilter, search])

  const opened = openId ? users.find((u) => u.id === openId) ?? null : null
  const manager = opened?.reportsToId ? users.find((u) => u.id === opened.reportsToId) : undefined
  const isOwnProfile = opened && user && opened.id === user.id

  if (!user) return null

  const copyEmail = async (target: User) => {
    try {
      await navigator.clipboard.writeText(target.email)
      setCopiedUserId(target.id)
      window.setTimeout(() => setCopiedUserId(null), 2000)
    } catch {
      window.prompt('Copy this address:', target.email)
    }
  }

  const mailFor = (target: User) =>
    mailtoHref(target.email, {
      subject: P.emailSubject(firstName(target.name)),
      body: P.emailBody(firstName(target.name), user.name),
    })

  const startEdit = () => {
    if (!opened) return
    setAvatarUploadError('')
    setDraft({
      bio: opened.bio ?? '',
      phone: opened.phone ?? '',
      skills: (opened.skills ?? []).join(', '),
      workLocation: opened.workLocation ?? '',
      pronouns: opened.pronouns ?? '',
      linkedinUrl: opened.linkedinUrl ?? '',
      avatarUrl: opened.avatarUrl ?? '',
    })
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setAvatarUploadError('')
    setDraft({
      bio: '',
      phone: '',
      skills: '',
      workLocation: '',
      pronouns: '',
      linkedinUrl: '',
      avatarUrl: '',
    })
  }

  const saveEdit = () => {
    if (!opened) return
    const patch: Partial<User> = {
      bio: draft.bio.trim(),
      phone: draft.phone.trim(),
      skills: draft.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      workLocation: draft.workLocation.trim() || undefined,
      pronouns: draft.pronouns.trim() || undefined,
      linkedinUrl: draft.linkedinUrl.trim() || undefined,
      avatarUrl: draft.avatarUrl.trim() || undefined,
    }
    updateUser(opened.id, patch)
    if (opened.id === user.id) updateProfile(patch)
    setEditing(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={P.title}
        description={P.subtitle}
      />

      <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="font-medium text-fg/80">{brand.tagline}</span>
        <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
        <span>{brand.headOffice}</span>
      </p>

      <Card padding="md">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Input
              leadingIcon={<Search className="h-4 w-4" />}
              placeholder={P.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-52">
            <Select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              options={departments.map((d) => ({
                value: d,
                label: d === 'all' ? P.allDepartments : d,
              }))}
            />
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">{P.directoryNote}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">{P.presenceNote}</p>
      </Card>

      {visibleUsers.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={P.noMatches}
          description={P.noMatchesHint}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleUsers.map((u) => {
            const isMe = u.id === user.id
            const peer = peerById.get(u.id)
            const presenceVis = isMe
              ? myAvailability
              : availabilityFromPeer(peer, multiplayerLive)
            return (
              <li key={u.id}>
                <Card
                  padding="none"
                  hoverable
                  onClick={() => {
                    setOpenId(u.id)
                    setEditing(false)
                  }}
                  className={cn('overflow-hidden', isMe && 'ring-2 ring-accent/35')}
                >
                  <div className="border-b border-border bg-gradient-to-br from-accent/[0.07] to-transparent px-4 py-4 sm:px-5">
                    <div className="flex gap-4">
                      <Avatar name={u.name} src={u.avatarUrl} size="lg" className="ring-2 ring-white/80 shadow-sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <PresenceDot availability={presenceVis} />
                          <p className="font-semibold text-fg">{u.name}</p>
                          {isMe ? (
                            <Badge tone="brand" className="text-[10px]">
                              You
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-sm text-fg/85">{u.jobTitle}</p>
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                          <Building2 className="h-3.5 w-3.5 shrink-0" />
                          {u.department}
                        </p>
                        {u.workLocation ? (
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            {u.workLocation}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 px-4 py-3 sm:px-5">
                    <p className="truncate text-xs text-muted">
                      <Mail className="mr-1 inline h-3 w-3 align-text-bottom" />
                      {u.email}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={mailFor(u)}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-center text-xs font-medium text-white shadow-sm transition-colors hover:bg-accent-hover min-w-[7rem] ring-focus"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {P.sendEmail}
                      </a>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          void copyEmail(u)
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-fg transition-colors hover:bg-surface-2 ring-focus"
                      >
                        {copiedUserId === u.id ? (
                          <Check className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {copiedUserId === u.id ? P.copied : P.copyEmail}
                      </button>
                    </div>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <Modal
        open={!!opened}
        onClose={() => {
          setOpenId(null)
          setEditing(false)
          setAvatarUploadError('')
        }}
        title={opened ? (editing ? P.editProfile : opened.name) : undefined}
        size="lg"
        footer={
          isOwnProfile ? (
            editing ? (
              <>
                <Button variant="ghost" type="button" onClick={cancelEdit}>
                  <X className="h-4 w-4" /> Cancel
                </Button>
                <Button type="button" onClick={saveEdit}>
                  <Save className="h-4 w-4" /> Save changes
                </Button>
              </>
            ) : (
              <Button variant="secondary" type="button" onClick={startEdit}>
                <Pencil className="h-4 w-4" /> {P.editProfile}
              </Button>
            )
          ) : undefined
        }
      >
        {opened ? (
          editing ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                saveEdit()
              }}
            >
              <p className="rounded-md border border-border bg-surface-2/25 px-3 py-2 text-xs leading-relaxed text-muted">
                {P.profileEditIntro}
              </p>

              <div className="rounded-md border border-border bg-surface-2/20 p-3">
                <p className="text-sm font-medium text-fg">{P.profilePhotoSection}</p>
                <p className="mt-1 text-xs text-muted">{P.profilePhotoHelp}</p>
                <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                  <Avatar
                    name={opened.name}
                    src={draft.avatarUrl.trim() || undefined}
                    size="lg"
                    className="ring-2 ring-border"
                  />
                  <div className="flex w-full flex-1 flex-col gap-2">
                    <label className="inline-flex cursor-pointer justify-center sm:justify-start">
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={avatarUploadBusy}
                        onChange={async (ev) => {
                          const file = ev.target.files?.[0]
                          ev.target.value = ''
                          if (!file) return
                          if (!file.type.startsWith('image/')) {
                            setAvatarUploadError('Choose an image file.')
                            return
                          }
                          setAvatarUploadBusy(true)
                          setAvatarUploadError('')
                          try {
                            const row = await uploadHostedMediaFile(file)
                            if (row.kind === 'video') {
                              setAvatarUploadError('Use an image file for your profile photo.')
                              return
                            }
                            setDraft((d) => ({ ...d, avatarUrl: row.url }))
                          } catch (err) {
                            setAvatarUploadError(err instanceof MediaUploadError ? err.message : 'Upload failed.')
                          } finally {
                            setAvatarUploadBusy(false)
                          }
                        }}
                      />
                      <span className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-2">
                        {avatarUploadBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Upload className="h-4 w-4" aria-hidden />
                        )}
                        {avatarUploadBusy ? P.profilePhotoUploading : P.profilePhotoUpload}
                      </span>
                    </label>
                    <Input
                      label={P.profilePhotoUrlLabel}
                      value={draft.avatarUrl}
                      onChange={(e) => {
                        setDraft({ ...draft, avatarUrl: e.target.value })
                        setAvatarUploadError('')
                      }}
                      placeholder={P.profilePhotoUrlPlaceholder}
                    />
                  </div>
                </div>
                {avatarUploadError ? <p className="mt-2 text-xs text-danger">{avatarUploadError}</p> : null}
              </div>

              <Textarea
                label={P.about}
                hint={P.profileAboutHelp}
                rows={4}
                value={draft.bio}
                onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
              />
              <Input
                label={P.workLocation}
                value={draft.workLocation}
                onChange={(e) => setDraft({ ...draft, workLocation: e.target.value })}
              />
              <Input
                label={P.pronouns}
                value={draft.pronouns}
                onChange={(e) => setDraft({ ...draft, pronouns: e.target.value })}
                placeholder="e.g. she/her"
              />
              <Input
                label={P.phoneLabel}
                hint={P.phoneHint}
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              />
              <Input
                label={P.linkedin}
                hint={P.linkedinHint}
                value={draft.linkedinUrl}
                onChange={(e) => setDraft({ ...draft, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/…"
              />
              <Input
                label={P.skills}
                hint={P.skillsHint}
                value={draft.skills}
                onChange={(e) => setDraft({ ...draft, skills: e.target.value })}
              />
            </form>
          ) : (
            <div className="space-y-0 overflow-hidden rounded-lg border border-border">
              <div className="bg-gradient-to-br from-accent/15 via-accent/5 to-surface-2 px-6 pb-8 pt-6">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end">
                  <Avatar name={opened.name} src={opened.avatarUrl} size="xl" className="ring-4 ring-white/90 shadow-lg" />
                  <div className="flex-1 text-center sm:pb-1 sm:text-left">
                    <h2 className="text-2xl font-bold text-fg">{opened.name}</h2>
                    <p className="mt-1 text-sm font-medium text-fg/85">{opened.jobTitle}</p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                      <Badge tone="brand">{roleLabel[opened.role]}</Badge>
                      <Badge tone="muted">{opened.department}</Badge>
                      {isOwnProfile ? (
                        <Badge tone="success" className="text-[10px]">
                          You
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6 bg-surface p-6">
                <div>
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    <Building2 className="h-3.5 w-3.5" />
                    {P.organization}
                  </h4>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {manager ? (
                      <div className="rounded-md border border-border bg-surface-2/50 px-3 py-2.5">
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">{P.reportsTo}</dt>
                        <dd className="mt-1 flex items-center gap-2 text-sm font-medium text-fg">
                          <Avatar name={manager.name} src={manager.avatarUrl} size="xs" />
                          {manager.name} · {manager.jobTitle}
                        </dd>
                      </div>
                    ) : (
                      <div className="rounded-md border border-border bg-surface-2/50 px-3 py-2.5">
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">{P.reportsTo}</dt>
                        <dd className="mt-1 text-sm text-muted">—</dd>
                      </div>
                    )}
                    <div className="rounded-md border border-border bg-surface-2/50 px-3 py-2.5">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">{P.accessRole}</dt>
                      <dd className="mt-1 text-sm text-fg">{roleLabel[opened.role]}</dd>
                    </div>
                    <div className="rounded-md border border-border bg-surface-2/50 px-3 py-2.5">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">{P.workLocation}</dt>
                      <dd className="mt-1 text-sm text-fg">{opened.workLocation ?? '—'}</dd>
                    </div>
                    <div className="rounded-md border border-border bg-surface-2/50 px-3 py-2.5">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">{P.memberSince}</dt>
                      <dd className="mt-1 text-sm text-fg">
                        {format(parseISO(opened.joinedAt), 'MMMM yyyy')} ({fmtDate(opened.joinedAt)})
                      </dd>
                    </div>
                    {opened.pronouns ? (
                      <div className="rounded-md border border-border bg-surface-2/50 px-3 py-2.5 sm:col-span-2">
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">{P.pronouns}</dt>
                        <dd className="mt-1 text-sm text-fg">{opened.pronouns}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>

                {opened.bio ? (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{P.about}</h4>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-fg/90">{opened.bio}</p>
                  </div>
                ) : null}

                {opened.skills && opened.skills.length > 0 ? (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{P.skills}</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {opened.skills.map((s) => (
                        <Badge key={s} tone="default">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{P.contact}</h4>
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <a
                      href={mailFor(opened)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover sm:flex-initial ring-focus"
                    >
                      <Mail className="h-4 w-4" />
                      {P.sendEmail}
                    </a>
                    <button
                      type="button"
                      onClick={() => void copyEmail(opened)}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-surface-2 px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-surface-3 sm:flex-initial ring-focus"
                    >
                      {copiedUserId === opened.id ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {copiedUserId === opened.id ? P.copied : P.copyEmail}
                    </button>
                  </div>
                  <ul className="mt-4 space-y-2.5 text-sm">
                    <li className="flex items-center gap-2.5 text-fg/90">
                      <Mail className="h-4 w-4 shrink-0 text-muted" />
                      <a href={mailtoHref(opened.email)} className="break-all hover:text-accent hover:underline">
                        {opened.email}
                      </a>
                    </li>
                    {opened.phone ? (
                      <li className="flex items-center gap-2.5 text-fg/90">
                        <Phone className="h-4 w-4 shrink-0 text-muted" />
                        <a href={`tel:${opened.phone}`} className="hover:text-accent hover:underline">
                          {opened.phone}
                        </a>
                      </li>
                    ) : null}
                    {opened.linkedinUrl ? (
                      <li className="flex items-center gap-2.5 text-fg/90">
                        <Linkedin className="h-4 w-4 shrink-0 text-muted" />
                        <a
                          href={opened.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all hover:text-accent hover:underline"
                        >
                          {P.linkedin}
                        </a>
                      </li>
                    ) : null}
                    <li className="flex items-center gap-2.5 text-muted">
                      <Calendar className="h-4 w-4 shrink-0" />
                      {P.memberSince}: {fmtDate(opened.joinedAt)}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )
        ) : null}
      </Modal>
    </div>
  )
}

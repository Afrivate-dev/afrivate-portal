import { useMemo, useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Download,
  Trash2,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  File as FileIcon,
  Lock,
  FolderOpen,
} from 'lucide-react'
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
import { EmptyState } from '@/components/shared/EmptyState'
import { cn, fmtDate, isHR } from '@/utils/helpers'
import type { DocumentItem } from '@/types'

type Category = DocumentItem['category']
type CategoryFilter = 'all' | Category

const CATEGORY_META: Record<
  Category,
  { label: string; tone: 'info' | 'success' | 'warning' | 'brand' | 'default' }
> = {
  policies: { label: 'Policies', tone: 'info' },
  sops: { label: 'SOPs', tone: 'success' },
  brand: { label: 'Brand Assets', tone: 'brand' },
  templates: { label: 'Templates', tone: 'warning' },
  reports: { label: 'Reports', tone: 'default' },
}

const CATEGORIES: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'policies', label: 'Policies' },
  { value: 'sops', label: 'SOPs' },
  { value: 'brand', label: 'Brand Assets' },
  { value: 'templates', label: 'Templates' },
  { value: 'reports', label: 'Reports' },
]

interface UploadDraft {
  title: string
  description: string
  category: Category
  fileName: string
  hrOnly: boolean
  managementOnly: boolean
}

const emptyDraft: UploadDraft = {
  title: '',
  description: '',
  category: 'policies',
  fileName: '',
  hrOnly: false,
  managementOnly: false,
}

function fileIconFor(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) return FileText
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return FileImage
  if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet
  if (['js', 'ts', 'tsx', 'jsx', 'json', 'html', 'css'].includes(ext)) return FileCode
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return FileArchive
  return FileIcon
}

function fileTone(name: string): 'brand' | 'success' | 'warning' | 'danger' | 'muted' {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['pdf'].includes(ext)) return 'danger'
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'brand'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'success'
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'warning'
  return 'muted'
}

const toneStyles = {
  brand: 'bg-brand/10 text-brand',
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  danger: 'bg-red-500/15 text-red-600 dark:text-red-300',
  muted: 'bg-surface-2 text-muted',
}

export function DocumentLibraryPage() {
  const { user } = useAuth()
  const { documents, users, addDocument, deleteDocument } = useData()
  const { viewersForDocument, setActivity, multiplayerLive } = useCollab()
  const canManage = isHR(user)

  const [surfaceDocId, setSurfaceDocId] = useState<string | null>(null)

  const [category, setCategory] = useState<CategoryFilter>('all')
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [draft, setDraft] = useState<UploadDraft>(emptyDraft)

  useEffect(() => {
    if (!surfaceDocId) {
      setActivity({ viewingDocumentId: undefined })
      return
    }
    setActivity({ viewingDocumentId: surfaceDocId })
    return () => setActivity({ viewingDocumentId: undefined })
  }, [surfaceDocId, setActivity])

  const visible = useMemo(() => {
    if (!user) return []
    return documents
      .filter((d) => {
        // Access control
        if (d.hrOnly && user.role !== 'hr' && user.role !== 'admin') return false
        if (
          d.managementOnly &&
          user.role !== 'team_lead' &&
          user.role !== 'hr' &&
          user.role !== 'admin'
        ) {
          return false
        }
        if (category !== 'all' && d.category !== category) return false
        if (search.trim()) {
          const q = search.toLowerCase()
          if (
            !d.title.toLowerCase().includes(q) &&
            !(d.description ?? '').toLowerCase().includes(q) &&
            !d.fileName.toLowerCase().includes(q)
          )
            return false
        }
        return true
      })
      .sort((a, b) => (a.uploadedAt > b.uploadedAt ? -1 : 1))
  }, [documents, user, category, search])

  const counts = useMemo(() => {
    const c: Record<CategoryFilter, number> = {
      all: 0,
      policies: 0,
      sops: 0,
      brand: 0,
      templates: 0,
      reports: 0,
    }
    documents.forEach((d) => {
      // Apply access control to counts so users only see counts of what they can access
      if (!user) return
      if (d.hrOnly && user.role !== 'hr' && user.role !== 'admin') return
      if (
        d.managementOnly &&
        user.role !== 'team_lead' &&
        user.role !== 'hr' &&
        user.role !== 'admin'
      )
        return
      c.all += 1
      c[d.category] += 1
    })
    return c
  }, [documents, user])

  if (!user) return null

  const openUpload = () => {
    setDraft(emptyDraft)
    setUploadOpen(true)
  }

  const submitUpload = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.title.trim() || !draft.fileName.trim()) return
    addDocument({
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      category: draft.category,
      fileName: draft.fileName.trim(),
      fileSize: '\u2014',
      uploadedById: user.id,
      hrOnly: draft.hrOnly,
      managementOnly: draft.managementOnly,
    })
    setUploadOpen(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document library"
        description="Policies, SOPs, brand assets, templates and reports \u2014 all in one place."
        actions={
          canManage ? (
            <Button onClick={openUpload}>
              <Plus className="h-4 w-4" /> Upload document
            </Button>
          ) : undefined
        }
      />

      {/* Search */}
      <Card padding="md">
        <Input
          leadingIcon={<Search className="h-4 w-4" />}
          placeholder="Search by title, description, filename..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      {/* Category tabs */}
      <div className="-mx-1 flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
        {CATEGORIES.map((c) => {
          const active = category === c.value
          return (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ring-focus',
                active
                  ? 'border-accent bg-accent text-white'
                  : 'border-border bg-surface text-fg hover:bg-surface-2',
              )}
            >
              {c.label}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  active ? 'bg-white/20' : 'bg-surface-2 text-muted',
                )}
              >
                {counts[c.value]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={search || category !== 'all' ? 'No matches' : 'No documents yet'}
          description={
            search || category !== 'all'
              ? 'Try a different search or clear the filter.'
              : canManage
                ? 'Upload the first document to get started.'
                : 'When HR or admin uploads documents, they\u2019ll appear here.'
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((d) => {
            const Icon = fileIconFor(d.fileName)
            const tone = fileTone(d.fileName)
            const uploader = users.find((u) => u.id === d.uploadedById)
            const docViewers = multiplayerLive ? viewersForDocument(d.id) : []
            return (
              <li key={d.id}>
                <Card
                  padding="md"
                  hoverable
                  className={cn(
                    'flex h-full cursor-pointer flex-col',
                    surfaceDocId === d.id && 'ring-2 ring-accent/40',
                  )}
                  onClick={() =>
                    setSurfaceDocId((prev) => (prev === d.id ? null : d.id))
                  }
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
                        toneStyles[tone],
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-fg">{d.title}</h3>
                      <p className="mt-0.5 truncate text-xs text-muted">{d.fileName}</p>
                    </div>
                    {canManage ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (window.confirm('Delete this document?')) deleteDocument(d.id)
                        }}
                        aria-label="Delete document"
                        className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger ring-focus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>

                  {d.description ? (
                    <p className="mt-3 line-clamp-2 text-sm text-fg/90">{d.description}</p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge tone={CATEGORY_META[d.category].tone}>
                      {CATEGORY_META[d.category].label}
                    </Badge>
                    {docViewers.length > 0 ? (
                      <Badge tone="brand">{docViewers.length} viewing</Badge>
                    ) : null}
                    {d.hrOnly ? (
                      <Badge tone="danger">
                        <Lock className="h-3 w-3" /> HR only
                      </Badge>
                    ) : null}
                    {d.managementOnly ? (
                      <Badge tone="warning">
                        <Lock className="h-3 w-3" /> Management
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
                    <span>
                      {uploader?.name ?? 'Unknown'} \u00b7 {fmtDate(d.uploadedAt)}
                    </span>
                    <span className="font-medium">{d.fileSize}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.alert(
                        `Preview only — "${d.fileName}"\n\nFile downloads will be available once document storage is fully enabled for this workspace.`,
                      )
                    }}
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-fg hover:bg-surface-2 ring-focus"
                  >
                    <Download className="h-4 w-4" /> Download
                  </button>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {/* Upload modal */}
      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload document"
        description="For now this saves the document details in the library. Full file storage and downloads are coming soon."
        size="lg"
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitUpload}>
              Save document
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={submitUpload}>
          <Input
            label="Title"
            required
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Staff Handbook 2026"
          />
          <Textarea
            label="Description"
            rows={3}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="What this document is for and when to use it."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Category"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })}
              options={CATEGORIES.filter((c) => c.value !== 'all').map((c) => ({
                value: c.value,
                label: c.label,
              }))}
            />
            <Input
              label="File name"
              required
              value={draft.fileName}
              onChange={(e) => setDraft({ ...draft, fileName: e.target.value })}
              placeholder="staff-handbook-2026.pdf"
            />
          </div>
          <div className="space-y-2 rounded-md border border-border bg-surface-2/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Visibility</p>
            <label className="flex items-center gap-2 text-sm text-fg">
              <input
                type="checkbox"
                checked={draft.hrOnly}
                onChange={(e) => setDraft({ ...draft, hrOnly: e.target.checked })}
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
              />
              HR only \u2014 hidden from team leads & staff
            </label>
            <label className="flex items-center gap-2 text-sm text-fg">
              <input
                type="checkbox"
                checked={draft.managementOnly}
                onChange={(e) => setDraft({ ...draft, managementOnly: e.target.checked })}
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
              />
              Management only \u2014 hidden from staff
            </label>
          </div>
        </form>
      </Modal>
    </div>
  )
}

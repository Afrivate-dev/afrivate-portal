import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  File as FileIcon,
  Lock,
  FolderOpen,
  Settings2,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useConfirm } from '@/context/useConfirm'
import { useData } from '@/context/DataContext'
import { confirms } from '@/content/copy'
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
import { TabBar } from '@/components/ui/TabBar'
import { cn, fmtDate, isHR, isLead } from '@/utils/helpers'
import { managesPeople } from '@/lib/orgStructure'
import { ManageLabelCategoriesModal } from '@/components/shared/ManageLabelCategoriesModal'
import { GoogleDrivePickerButton } from '@/components/shared/GoogleDrivePickerButton'
import { useHr } from '@/context/HrContext'
import { isSupabaseAuthEnabled } from '@/lib/authMode'
import { supabase } from '@/lib/supabase'
import { getPortalFileDownloadUrl, uploadPortalFile } from '@/lib/supabase/fileStorage'
import { notifyError, notifySuccess } from '@/lib/notify'
import { DocumentPreviewModal } from '@/components/shared/DocumentPreviewModal'
import { pages } from '@/content/copy'
import type { DocumentItem } from '@/types'

type CategoryFilter = 'all' | string

const CATEGORY_TONES: Array<'info' | 'success' | 'warning' | 'brand' | 'default'> = [
  'info',
  'success',
  'warning',
  'brand',
  'default',
]

const LEGACY_CATEGORY_TONES: Record<string, 'info' | 'success' | 'warning' | 'brand' | 'default'> = {
  policies: 'info',
  sops: 'success',
  brand: 'brand',
  templates: 'warning',
  reports: 'default',
}

function categoryTone(id: string, index: number) {
  return LEGACY_CATEGORY_TONES[id] ?? CATEGORY_TONES[index % CATEGORY_TONES.length]
}

function categoryLabel(id: string, categories: { id: string; label: string }[]) {
  return categories.find((c) => c.id === id)?.label ?? id.replace(/_/g, ' ')
}

interface UploadDraft {
  title: string
  description: string
  category: string
  fileName: string
  hrOnly: boolean
  managementOnly: boolean
  requiresAcknowledgment: boolean
}

function emptyDraft(defaultCategory: string): UploadDraft {
  return {
    title: '',
    description: '',
    category: defaultCategory,
    fileName: '',
    hrOnly: false,
    managementOnly: false,
    requiresAcknowledgment: false,
  }
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
  const confirm = useConfirm()
  const { documents, users, teams, departments, addDocument, updateDocument, deleteDocument, documentCategories, addDocumentCategory, updateDocumentCategory, deleteDocumentCategory } = useData()
  const canSeeManagementDocs = isLead(user) || managesPeople(user, teams, departments)
  const { documentAcknowledgments, acknowledgeDocument } = useHr()
  const { viewersForDocument, setActivity, multiplayerLive } = useCollab()
  const [searchParams] = useSearchParams()
  const [surfaceDocId, setSurfaceDocId] = useState<string | null>(null)

  useEffect(() => {
    sessionStorage.setItem('av-visited-handbook', '1')
  }, [])

  useEffect(() => {
    const docId = searchParams.get('doc')
    if (docId && documents.some((d) => d.id === docId)) {
      setSurfaceDocId(docId)
    }
  }, [searchParams, documents])

  const canManage = isHR(user)

  const [category, setCategory] = useState<CategoryFilter>('all')
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editDocId, setEditDocId] = useState<string | null>(null)
  const [manageCatsOpen, setManageCatsOpen] = useState(false)
  const [draft, setDraft] = useState<UploadDraft>(() => emptyDraft(documentCategories[0]?.id ?? 'policies'))
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [downloadInfoDoc, setDownloadInfoDoc] = useState<DocumentItem | null>(null)
  const [previewDoc, setPreviewDoc] = useState<{ doc: DocumentItem; url: string } | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

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
        if (d.hrOnly && !isHR(user)) return false
        if (d.managementOnly && !canSeeManagementDocs) return false
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
  }, [documents, user, category, search, canSeeManagementDocs])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0 }
    documentCategories.forEach((cat) => {
      c[cat.id] = 0
    })
    documents.forEach((d) => {
      if (!user) return
      if (d.hrOnly && !isHR(user)) return
      if (d.managementOnly && !canSeeManagementDocs) return
      c.all += 1
      c[d.category] = (c[d.category] ?? 0) + 1
    })
    return c
  }, [documents, user, documentCategories, canSeeManagementDocs])

  const categoryTabs = useMemo(
    () => [
      { id: 'all' as CategoryFilter, label: 'All' },
      ...documentCategories.map((cat) => ({ id: cat.id as CategoryFilter, label: cat.label })),
    ],
    [documentCategories],
  )

  if (!user) return null

  const openUpload = () => {
    setDraft(emptyDraft(documentCategories[0]?.id ?? 'policies'))
    setUploadFile(null)
    setEditDocId(null)
    setUploadOpen(true)
  }

  const openEdit = (doc: DocumentItem) => {
    setDraft({
      title: doc.title,
      description: doc.description ?? '',
      category: doc.category,
      fileName: doc.fileName,
      hrOnly: doc.hrOnly ?? false,
      managementOnly: doc.managementOnly ?? false,
      requiresAcknowledgment: doc.requiresAcknowledgment ?? false,
    })
    setEditDocId(doc.id)
    setUploadFile(null)
    setUploadOpen(true)
  }

  const submitUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.title.trim()) return
    if (editDocId) {
      updateDocument(editDocId, {
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        category: draft.category,
        hrOnly: draft.hrOnly,
        managementOnly: draft.managementOnly,
        requiresAcknowledgment: draft.requiresAcknowledgment,
      })
      setUploadOpen(false)
      setEditDocId(null)
      return
    }
    if (!draft.fileName.trim() && !uploadFile) return
    const ok = await confirm({
      title: confirms.uploadDocumentTitle,
      message: confirms.uploadDocument,
      confirmLabel: 'Upload',
    })
    if (!ok) return
    setUploading(true)
    let filePath: string | undefined
    let fileSize = '—'
    let fileName = draft.fileName.trim() || uploadFile?.name || 'document'
    if (uploadFile) {
      if (!isSupabaseAuthEnabled() || !supabase) {
        notifyError('File upload requires Supabase. Connect your portal or ask an administrator.')
        setUploading(false)
        return
      }
      const uploaded = await uploadPortalFile(supabase, 'documents', uploadFile, user.id)
      if ('error' in uploaded) {
        notifyError(uploaded.error)
        setUploading(false)
        return
      }
      filePath = uploaded.path
      fileSize = uploaded.sizeLabel
      fileName = uploadFile.name
    }
    addDocument({
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      category: draft.category,
      fileName,
      fileSize,
      filePath,
      uploadedById: user.id,
      hrOnly: draft.hrOnly,
      managementOnly: draft.managementOnly,
      requiresAcknowledgment: draft.requiresAcknowledgment,
    })
    setUploadOpen(false)
    setUploadFile(null)
    setUploading(false)
  }

  const openDocument = async (doc: DocumentItem) => {
    if (doc.filePath && supabase) {
      const url = await getPortalFileDownloadUrl(supabase, doc.filePath)
      if (url) {
        setPreviewDoc({ doc, url })
        return
      }
    }
    setDownloadInfoDoc(doc)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={pages.resources.title}
        description={pages.resources.subtitle}
        actions={
          canManage ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button variant="secondary" onClick={() => setManageCatsOpen(true)} className="w-full sm:w-auto">
                <Settings2 className="h-4 w-4" /> Manage categories
              </Button>
              <Button onClick={openUpload} className="w-full sm:w-auto">
                <Plus className="h-4 w-4" /> Upload document
              </Button>
            </div>
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

      <TabBar
        variant="chip"
        scrollable
        active={category}
        onChange={setCategory}
        tabs={categoryTabs.map((c) => ({
          id: c.id,
          label: c.label,
          count: counts[c.id] ?? 0,
        }))}
      />

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
                : 'When HR or admin uploads documents, they’ll appear here.'
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((d) => {
            const Icon = fileIconFor(d.fileName)
            const tone = fileTone(d.fileName)
            const uploader = users.find((u) => u.id === d.uploadedById)
            const docViewers = multiplayerLive ? viewersForDocument(d.id) : []
            const catIndex = documentCategories.findIndex((c) => c.id === d.category)
            const catTone = categoryTone(d.category, catIndex >= 0 ? catIndex : 0)
            const catLabel = categoryLabel(d.category, documentCategories)
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
                      <div className="flex shrink-0 gap-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEdit(d)
                          }}
                          aria-label="Edit document"
                          className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg ring-focus"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteConfirmId(d.id)
                          }}
                          aria-label="Delete document"
                          className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger ring-focus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {d.description ? (
                    <p className="mt-3 line-clamp-2 text-sm text-fg/90">{d.description}</p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge tone={catTone}>
                      {catLabel}
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

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-border pt-3 text-xs text-muted">
                    <span className="min-w-0 truncate">
                      {uploader?.name ?? 'Unknown'} · {fmtDate(d.uploadedAt)}
                    </span>
                    <span className="shrink-0 font-medium">{d.fileSize}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      void openDocument(d)
                    }}
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-fg hover:bg-surface-2 ring-focus"
                  >
                    {d.filePath ? 'Preview' : 'View details'}
                  </button>
                  {d.requiresAcknowledgment && user ? (
                    documentAcknowledgments.some((a) => a.documentId === d.id && a.userId === user.id) ? (
                      <p className="mt-2 text-xs font-medium text-success">Policy acknowledged ✓</p>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          acknowledgeDocument(d.id, user.id)
                          notifySuccess('Policy acknowledged.')
                        }}
                        className="mt-2 w-full rounded-md bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent-hover ring-focus"
                      >
                        I have read this policy
                      </button>
                    )
                  ) : null}
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {/* Upload modal */}
      <Modal
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false)
          setEditDocId(null)
        }}
        title={editDocId ? 'Edit document' : 'Upload document'}
        description={
          editDocId
            ? 'Update title, category, access, and policy acknowledgment settings.'
            : 'Upload a file or enter document details. Files are stored securely when storage is configured.'
        }
        size="lg"
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => { setUploadOpen(false); setEditDocId(null) }}>
              Cancel
            </Button>
            <Button type="submit" form="upload-document-form" loading={uploading}>
              {editDocId ? 'Save changes' : 'Save document'}
            </Button>
          </>
        }
      >
        <form id="upload-document-form" className="space-y-4" onSubmit={(e) => void submitUpload(e)}>
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
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              options={documentCategories.map((c) => ({
                value: c.id,
                label: c.label,
              }))}
            />
            {!editDocId ? (
              <Input
                label="File name"
                value={draft.fileName}
                onChange={(e) => setDraft({ ...draft, fileName: e.target.value })}
                placeholder="staff-handbook-2026.pdf"
              />
            ) : null}
          </div>
          <label className="flex items-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              checked={draft.requiresAcknowledgment}
              onChange={(e) => setDraft({ ...draft, requiresAcknowledgment: e.target.checked })}
              className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
            />
            Require staff to acknowledge reading (policies)
          </label>
          {!editDocId ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-fg">Attach file (optional)</label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  className="block text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:font-medium file:text-fg"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                />
                <GoogleDrivePickerButton onPicked={(file) => setUploadFile(file)} />
              </div>
            </div>
          ) : null}
          <div className="space-y-2 rounded-md border border-border bg-surface-2/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Visibility</p>
            <label className="flex items-center gap-2 text-sm text-fg">
              <input
                type="checkbox"
                checked={draft.hrOnly}
                onChange={(e) => setDraft({ ...draft, hrOnly: e.target.checked })}
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
              />
              HR only — hidden from team leads & staff
            </label>
            <label className="flex items-center gap-2 text-sm text-fg">
              <input
                type="checkbox"
                checked={draft.managementOnly}
                onChange={(e) => setDraft({ ...draft, managementOnly: e.target.checked })}
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
              />
              Management only — hidden from staff
            </label>
          </div>
        </form>
      </Modal>

      {/* Delete document confirmation */}
      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete document"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteConfirmId) deleteDocument(deleteConfirmId)
                setDeleteConfirmId(null)
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg">Delete this document? This cannot be undone.</p>
      </Modal>

      {/* Document details modal (file storage not yet enabled) */}
      <Modal
        open={!!downloadInfoDoc}
        onClose={() => setDownloadInfoDoc(null)}
        title="Document details"
        footer={<Button onClick={() => setDownloadInfoDoc(null)}>OK</Button>}
      >
        {downloadInfoDoc ? (
          <div className="space-y-2 text-sm text-fg">
            <p className="font-medium">{downloadInfoDoc.fileName}</p>
            <p className="text-muted">
              This library stores document metadata only. File downloads will be available when storage
              is configured. Contact your admin if you need this file right away.
            </p>
          </div>
        ) : null}
      </Modal>

      <DocumentPreviewModal
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.doc.title ?? 'Document'}
        fileName={previewDoc?.doc.fileName ?? 'file'}
        url={previewDoc?.url ?? null}
      />

      <ManageLabelCategoriesModal
        open={manageCatsOpen}
        onClose={() => setManageCatsOpen(false)}
        title="Manage document categories"
        description="Create and edit categories for the resources library. Team leads and above can manage these."
        items={documentCategories}
        onAdd={addDocumentCategory}
        onUpdate={updateDocumentCategory}
        onDelete={deleteDocumentCategory}
      />
    </div>
  )
}

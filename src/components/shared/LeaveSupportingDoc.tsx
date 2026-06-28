import { useState } from 'react'
import { Eye, Paperclip } from 'lucide-react'
import { DocumentPreviewModal } from '@/components/shared/DocumentPreviewModal'
import { isSupabaseAuthEnabled } from '@/lib/authMode'
import { supabase } from '@/lib/supabase'
import { getPortalFileSignedUrl } from '@/lib/supabase/fileStorage'
import { notifyError } from '@/lib/notify'
import { isHR, isLead } from '@/utils/helpers'
import type { LeaveRequest, User } from '@/types'

export function canViewLeaveSupportingDoc(viewer: User, request: LeaveRequest): boolean {
  if (request.userId === viewer.id) return true
  return isHR(viewer) || isLead(viewer)
}

export function LeaveSupportingDoc({
  request,
  viewer,
}: {
  request: LeaveRequest
  viewer: User
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!request.supportingDocName && !request.supportingDocPath) return null
  if (!canViewLeaveSupportingDoc(viewer, request)) return null

  const openPreview = async () => {
    if (!request.supportingDocPath) {
      notifyError('This attachment was recorded by name only — no file is stored yet.')
      return
    }
    if (!isSupabaseAuthEnabled() || !supabase) {
      notifyError('File preview requires Supabase storage.')
      return
    }
    setLoading(true)
    const url = await getPortalFileSignedUrl(supabase, request.supportingDocPath)
    setLoading(false)
    if (!url) {
      notifyError('Could not load this document. Try again or contact an administrator.')
      return
    }
    setPreviewUrl(url)
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void openPreview()}
        disabled={loading}
        className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-fg hover:bg-surface-2 ring-focus disabled:opacity-60"
      >
        <Paperclip className="h-3 w-3 shrink-0" />
        <span className="truncate">{request.supportingDocName ?? 'Supporting document'}</span>
        {request.supportingDocPath ? (
          <>
            <span className="text-muted">·</span>
            <Eye className="h-3 w-3 shrink-0" />
            <span>{loading ? 'Loading…' : 'View'}</span>
          </>
        ) : null}
      </button>

      <DocumentPreviewModal
        open={open}
        onClose={() => {
          setOpen(false)
          setPreviewUrl(null)
        }}
        title="Supporting document"
        fileName={request.supportingDocName ?? 'attachment'}
        url={previewUrl}
      />
    </>
  )
}

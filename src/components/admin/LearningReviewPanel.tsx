import { useState } from 'react'
import { GraduationCap, ExternalLink } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useHr } from '@/context/HrContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { fmtDate, isHR } from '@/utils/helpers'
import { isSupabaseAuthEnabled } from '@/lib/authMode'
import { supabase } from '@/lib/supabase'
import { getPortalFileDownloadUrl } from '@/lib/supabase/fileStorage'

/** HR panel to approve or reject pending Alison course submissions. */
export function LearningReviewPanel() {
  const { user } = useAuth()
  const { users } = useData()
  const { learningSubmissions, reviewLearningSubmission } = useHr()
  const [notes, setNotes] = useState<Record<string, string>>({})

  if (!user || !isHR(user)) return null

  const pending = learningSubmissions.filter((s) => s.status === 'pending')
  if (pending.length === 0) return null

  const openCertificate = async (path: string) => {
    if (!isSupabaseAuthEnabled() || !supabase) return
    const url = await getPortalFileDownloadUrl(supabase, path)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Card padding="md">
      <div className="mb-3 flex items-center gap-2">
        <GraduationCap className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-fg">Pending learning reviews ({pending.length})</h3>
      </div>
      <ul className="space-y-3">
        {pending.map((s) => {
          const submitter = users.find((u) => u.id === s.userId)
          return (
            <li key={s.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-fg">{s.courseName}</p>
                  <p className="text-xs text-muted">
                    {submitter?.name ?? 'Team member'} · completed {fmtDate(s.completedAt)}
                  </p>
                </div>
                <Badge tone="warning">Pending</Badge>
              </div>
              {s.certificatePath ? (
                <button
                  type="button"
                  onClick={() => void openCertificate(s.certificatePath!)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  View certificate <ExternalLink className="h-3 w-3" />
                </button>
              ) : (
                <p className="mt-2 text-xs text-muted">No certificate uploaded.</p>
              )}
              <Textarea
                className="mt-2"
                rows={2}
                placeholder="Optional note to the employee"
                value={notes[s.id] ?? ''}
                onChange={(e) => setNotes((prev) => ({ ...prev, [s.id]: e.target.value }))}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => reviewLearningSubmission(s.id, 'approved', user.id, notes[s.id]?.trim() || undefined)}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => reviewLearningSubmission(s.id, 'rejected', user.id, notes[s.id]?.trim() || undefined)}
                >
                  Reject
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

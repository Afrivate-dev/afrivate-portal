import { useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useHr } from '@/context/HrContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { isLead, isHR } from '@/utils/helpers'
import { directReportIds } from '@/utils/hrMetrics'
import { notifyError, notifySuccess } from '@/lib/notify'

/** Managers and HR can review submitted IDPs for direct reports. */
export function IdpReviewPanel() {
  const { user } = useAuth()
  const { users } = useData()
  const { idps, reviewIdp } = useHr()
  const [notes, setNotes] = useState<Record<string, string>>({})

  const pending = useMemo(() => {
    if (!user) return []
    const submitted = idps.filter((i) => i.status === 'submitted')
    if (isHR(user)) return submitted
    if (isLead(user)) {
      const reportIds = directReportIds(users, user.id)
      return submitted.filter((i) => reportIds.has(i.userId))
    }
    return []
  }, [idps, user, users])

  if (!user || (!isHR(user) && !isLead(user))) return null
  if (pending.length === 0) return null

  return (
    <Card padding="md">
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-fg">IDP reviews ({pending.length})</h3>
      </div>
      <ul className="space-y-3">
        {pending.map((idp) => {
          const person = users.find((u) => u.id === idp.userId)
          return (
            <li key={idp.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-fg">{person?.name ?? 'Team member'}</p>
                <Badge tone="warning">Submitted</Badge>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-muted">{idp.content}</p>
              <Textarea
                className="mt-2"
                rows={2}
                placeholder="Manager feedback"
                value={notes[idp.id] ?? ''}
                onChange={(e) => setNotes((prev) => ({ ...prev, [idp.id]: e.target.value }))}
              />
              <Button
                size="sm"
                className="mt-2"
                onClick={() => {
                  const ok = reviewIdp(idp.userId, notes[idp.id]?.trim() ?? '')
                  if (!ok) {
                    notifyError('Could not review this plan — it may have been withdrawn.')
                    return
                  }
                  notifySuccess('IDP marked as reviewed.')
                }}
              >
                Mark reviewed
              </Button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

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
import { managedReportIds } from '@/utils/hrMetrics'
import { managesPeople } from '@/lib/orgStructure'
import { notifyError, notifySuccess } from '@/lib/notify'

/** Managers and HR can review submitted IDPs for the people they manage. */
export function IdpReviewPanel() {
  const { user } = useAuth()
  const { users, teams, departments } = useData()
  const { idps, reviewIdp } = useHr()
  const [notes, setNotes] = useState<Record<string, string>>({})

  const canManage = !!user && (isLead(user) || managesPeople(user, teams, departments))

  const pending = useMemo(() => {
    if (!user) return []
    const submitted = idps.filter((i) => i.status === 'submitted')
    if (isHR(user)) return submitted
    if (canManage) {
      const reportIds = managedReportIds(user, users, teams, departments)
      return submitted.filter((i) => reportIds.has(i.userId))
    }
    return []
  }, [idps, user, users, teams, departments, canManage])

  if (!user || (!isHR(user) && !canManage)) return null
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 font-medium text-fg">{person?.name ?? 'Team member'}</p>
                <Badge tone="warning" className="shrink-0">Submitted</Badge>
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

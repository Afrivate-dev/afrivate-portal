import { useMemo } from 'react'
import { FileCheck } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { useHr } from '@/context/HrContext'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export function PolicyAcknowledgmentPanel() {
  const { users, documents } = useData()
  const { documentAcknowledgments } = useHr()

  const requiredDocs = useMemo(
    () => documents.filter((d) => d.requiresAcknowledgment),
    [documents],
  )

  const pendingByUser = useMemo(() => {
    const active = users.filter((u) => u.active)
    return active
      .map((u) => {
        const missing = requiredDocs.filter(
          (doc) =>
            !documentAcknowledgments.some((a) => a.userId === u.id && a.documentId === doc.id),
        )
        return { user: u, missing }
      })
      .filter((row) => row.missing.length > 0)
  }, [users, requiredDocs, documentAcknowledgments])

  if (requiredDocs.length === 0) {
    return (
      <Card padding="md">
        <div className="mb-2 flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-fg">Policy acknowledgments</h3>
        </div>
        <p className="text-sm text-muted">No documents require acknowledgment yet.</p>
      </Card>
    )
  }

  return (
    <Card padding="md">
      <div className="mb-3 flex items-center gap-2">
        <FileCheck className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-fg">Policy acknowledgments</h3>
        <Badge tone="warning">{pendingByUser.length} pending</Badge>
      </div>
      <p className="mb-4 text-xs text-muted">
        {requiredDocs.length} required document{requiredDocs.length === 1 ? '' : 's'} — staff must ack in Resources.
      </p>

      {pendingByUser.length === 0 ? (
        <p className="text-sm text-success">All active staff have acknowledged every required policy.</p>
      ) : (
        <ul className="max-h-56 space-y-2 overflow-y-auto text-sm">
          {pendingByUser.map(({ user, missing }) => (
            <li key={user.id} className="rounded-md border border-border px-3 py-2">
              <p className="font-medium text-fg">{user.name}</p>
              <p className="mt-1 text-xs text-muted">
                Missing: {missing.map((d) => d.title).join(', ')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

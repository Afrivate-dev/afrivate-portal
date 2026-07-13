import { useMemo, useState } from 'react'
import { UserPlus, Trash2 } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { useHr } from '@/context/HrContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import type { FeedbackRelationship } from '@/types/hr'

const RELATIONSHIP_LABELS: Record<FeedbackRelationship, string> = {
  self: 'Self',
  manager: 'Manager',
  peer: 'Peer',
  report: 'Upward',
}

export function FeedbackAssignmentPanel() {
  const { users } = useData()
  const { feedbackCycles, feedbackAssignments, addFeedbackAssignment, removeFeedbackAssignment } = useHr()
  const [subjectId, setSubjectId] = useState('')
  const [reviewerId, setReviewerId] = useState('')
  const [relationship, setRelationship] = useState<FeedbackRelationship>('peer')

  const openCycle = feedbackCycles.find((c) => c.status === 'open')
  const activeUsers = useMemo(() => users.filter((u) => u.active), [users])

  const cycleAssignments = useMemo(
    () => (openCycle ? feedbackAssignments.filter((a) => a.cycleId === openCycle.id) : []),
    [feedbackAssignments, openCycle],
  )

  const peerAssignments = cycleAssignments.filter((a) => a.relationship === 'peer')

  const addPeerAssignment = () => {
    if (!openCycle || !subjectId || !reviewerId || subjectId === reviewerId) return
    const duplicate = cycleAssignments.some(
      (a) =>
        a.subjectUserId === subjectId &&
        a.reviewerId === reviewerId &&
        a.relationship === relationship,
    )
    if (duplicate) return
    addFeedbackAssignment({
      cycleId: openCycle.id,
      subjectUserId: subjectId,
      reviewerId,
      relationship,
    })
    setSubjectId('')
    setReviewerId('')
  }

  if (!openCycle) {
    return (
      <Card padding="md">
        <h3 className="text-sm font-semibold text-fg">360° peer assignments</h3>
        <p className="mt-2 text-sm text-muted">Open a feedback cycle to assign peer reviewers.</p>
      </Card>
    )
  }

  return (
    <Card padding="md">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <UserPlus className="h-4 w-4 shrink-0 text-accent" />
        <h3 className="min-w-0 flex-1 text-sm font-semibold text-fg">360° assignments — {openCycle.title}</h3>
      </div>
      <p className="mb-4 text-xs text-muted">
        Self, manager, upward, and peer reviews are auto-assigned when a cycle opens (peers from the
        same department or shared teams, up to 8). Add or adjust peer reviewers here if needed.
      </p>

      <div className="flex flex-wrap gap-2">
        <div className="w-full min-w-[min(100%,12rem)] sm:flex-1">
        <Select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          options={[
            { value: '', label: 'Subject (reviewee)…' },
            ...activeUsers.map((u) => ({ value: u.id, label: u.name })),
          ]}
        />
        </div>
        <div className="w-full min-w-[min(100%,12rem)] sm:flex-1">
        <Select
          value={reviewerId}
          onChange={(e) => setReviewerId(e.target.value)}
          options={[
            { value: '', label: 'Reviewer…' },
            ...activeUsers.filter((u) => u.id !== subjectId).map((u) => ({ value: u.id, label: u.name })),
          ]}
        />
        </div>
        <div className="w-full min-w-[min(100%,12rem)] sm:flex-1">
        <Select
          value={relationship}
          onChange={(e) => setRelationship(e.target.value as FeedbackRelationship)}
          options={[
            { value: 'peer', label: 'Peer' },
            { value: 'manager', label: 'Manager (manual)' },
            { value: 'report', label: 'Upward (manual)' },
          ]}
        />
        </div>
        <Button size="sm" className="w-full sm:w-auto" disabled={!subjectId || !reviewerId} onClick={addPeerAssignment}>
          Add assignment
        </Button>
      </div>

      {peerAssignments.length > 0 ? (
        <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto text-sm">
          {peerAssignments.map((a) => {
            const subject = users.find((u) => u.id === a.subjectUserId)
            const reviewer = users.find((u) => u.id === a.reviewerId)
            return (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-fg">
                  {reviewer?.name ?? 'Reviewer'} → {subject?.name ?? 'Subject'}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone="info">{RELATIONSHIP_LABELS[a.relationship]}</Badge>
                  <button
                    type="button"
                    onClick={() => removeFeedbackAssignment(a.id)}
                    className="rounded p-1 text-muted hover:text-danger ring-focus"
                    aria-label="Remove assignment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-muted">No peer assignments yet.</p>
      )}

      <p className="mt-3 text-xs text-muted">
        {cycleAssignments.length} total assignment{cycleAssignments.length === 1 ? '' : 's'} in this cycle
      </p>
    </Card>
  )
}

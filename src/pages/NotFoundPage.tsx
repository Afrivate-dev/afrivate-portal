import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Page not found" description="That URL doesn’t match anything in the portal." />
      <EmptyState
        icon={FileQuestion}
        title="404 — not found"
        description="The page may have moved or the link is incorrect."
      />
      <div className="flex justify-center">
        <Link to="/">
          <Button type="button">Back to dashboard</Button>
        </Link>
      </div>
    </div>
  )
}

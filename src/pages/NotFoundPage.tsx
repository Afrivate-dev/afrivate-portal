import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="av-contain space-y-6">
      <PageHeader title="Page not found" description="That link doesn’t match any page in Team space." />
      <EmptyState
        icon={FileQuestion}
        title="Page not found"
        description="The page may have moved, or the link may be incorrect."
      />
      <div className="flex justify-center">
        <Link to="/">
          <Button type="button">Back to home</Button>
        </Link>
      </div>
    </div>
  )
}

import { Hammer } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'

interface ComingSoonProps {
  title: string
  phase: string
  description?: string
}

export function ComingSoon({ title, phase, description }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={`Planned in ${phase}.`} />
      <EmptyState
        icon={Hammer}
        title="Under construction"
        description={
          description ??
          'This page is on the build roadmap. Section specs are in the project plan and the data layer is already wired up \u2014 the UI is the only thing left.'
        }
      />
    </div>
  )
}

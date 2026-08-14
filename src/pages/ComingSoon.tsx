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
    <div className="av-contain space-y-6">
      <PageHeader title={title} description={`Planned in ${phase}.`} />
      <EmptyState
        icon={Hammer}
        title="Under construction"
        description={
          description ??
          'This page is still being built. Specs are in the project plan — the screen is the last piece.'
        }
      />
    </div>
  )
}

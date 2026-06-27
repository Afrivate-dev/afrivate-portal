import { cn } from '@/utils/helpers'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-start sm:justify-between md:mb-6',
        'animate-fade-in-up motion-reduce:animate-none',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className="av-title break-words">{title}</h1>
        {description ? <p className="av-subtitle mt-1 max-w-2xl">{description}</p> : null}
      </div>
      {actions ? (
        <div className="av-action-row shrink-0 [&>*]:w-full sm:[&>*]:w-auto">{actions}</div>
      ) : null}
    </div>
  )
}

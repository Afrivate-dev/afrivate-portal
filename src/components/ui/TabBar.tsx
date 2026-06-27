import type { ReactNode } from 'react'
import { cn } from '@/utils/helpers'

export type TabBarVariant = 'underline' | 'pill' | 'chip'

export interface TabBarItem<T extends string = string> {
  id: T
  label: ReactNode
  count?: number
  disabled?: boolean
}

interface TabBarProps<T extends string> {
  tabs: TabBarItem<T>[]
  active: T
  onChange: (id: T) => void
  variant?: TabBarVariant
  className?: string
  /** Horizontal scroll on narrow screens (default true for underline/pill). */
  scrollable?: boolean
}

const variantStyles: Record<TabBarVariant, { list: string; btn: string; active: string; idle: string }> = {
  underline: {
    list: 'border-b border-border gap-0',
    btn: 'relative shrink-0 px-3 py-2.5 text-sm font-medium sm:px-4',
    active: 'text-accent',
    idle: 'text-muted hover:text-fg',
  },
  pill: {
    list: 'gap-1 rounded-lg bg-surface-2/50 p-1',
    btn: 'relative shrink-0 rounded-md px-3 py-2 text-sm font-medium sm:px-4',
    active: 'bg-accent text-white shadow-sm',
    idle: 'text-muted hover:bg-surface-2 hover:text-fg',
  },
  chip: {
    list: 'gap-1.5',
    btn: 'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium sm:px-3.5 sm:text-sm',
    active: 'border-accent bg-accent text-white',
    idle: 'border-border bg-surface text-fg hover:bg-surface-2',
  },
}

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  variant = 'underline',
  className,
  scrollable = variant !== 'chip',
}: TabBarProps<T>) {
  const v = variantStyles[variant]

  return (
    <div
      className={cn(
        scrollable && 'av-scroll-x w-full max-w-full',
        className,
      )}
      role="tablist"
    >
      <div className={cn('inline-flex w-max max-w-none', v.list)}>
        {tabs.map((tab) => {
          const isActive = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={cn(
                'ring-focus transition-all duration-200 motion-reduce:transition-none',
                'min-h-[44px] touch-manipulation disabled:opacity-50',
                v.btn,
                isActive ? v.active : v.idle,
              )}
            >
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                {tab.label}
                {tab.count != null ? (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                      isActive && variant === 'chip'
                        ? 'bg-white/20'
                        : isActive && variant === 'pill'
                          ? 'bg-white/20'
                          : 'bg-surface-2 text-muted',
                    )}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </span>
              {variant === 'underline' && isActive ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent animate-scale-in motion-reduce:animate-none" />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Animated panel wrapper for tab content. */
export function TabPanel({
  active,
  children,
  className,
}: {
  active: boolean
  children: ReactNode
  className?: string
}) {
  if (!active) return null
  return (
    <div
      role="tabpanel"
      className={cn('av-contain animate-fade-in-up motion-reduce:animate-none', className)}
    >
      {children}
    </div>
  )
}

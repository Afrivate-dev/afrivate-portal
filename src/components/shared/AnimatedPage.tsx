import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/utils/helpers'

function AnimatedPageInner({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      className={cn(
        'av-page transition-all duration-300 ease-out motion-reduce:transition-none',
        visible ? 'animate-page-enter opacity-100' : 'opacity-0 translate-y-2',
      )}
    >
      {children}
    </div>
  )
}

/** Wraps route content with enter animation and consistent responsive page spacing. */
export function AnimatedPage({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  return <AnimatedPageInner key={location.pathname}>{children}</AnimatedPageInner>
}

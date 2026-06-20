import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { actions, confirms } from '@/content/copy'

export type ConfirmOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(
    null,
  )

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise((resolve) => {
      setState({ ...options, resolve })
    })
  }, [])

  const close = useCallback((result: boolean) => {
    state?.resolve(result)
    setState(null)
  }, [state])

  const value = useMemo(() => confirm, [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        title={state?.title ?? confirms.defaultTitle}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>
              {state?.cancelLabel ?? actions.cancel}
            </Button>
            <Button
              variant={state?.destructive ? 'danger' : 'primary'}
              onClick={() => close(true)}
            >
              {state?.confirmLabel ?? confirms.defaultConfirm}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg">{state?.message}</p>
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}

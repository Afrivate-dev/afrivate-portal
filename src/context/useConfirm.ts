import { useContext } from 'react'
import { ConfirmContext, type ConfirmFn } from '@/context/confirmContextShared'

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}

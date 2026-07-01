/* eslint-disable react-refresh/only-export-components */
import { isSupabaseDataEnabled } from '@/lib/dataMode'
import { LocalHrProvider } from '@/context/HrContext.local'
import { SupabaseHrProvider } from '@/context/HrContext.supabase'

export { useHr, type HrContextValue, type HrMetrics } from '@/context/hrContextShared'

export function HrProvider({ children }: { children: React.ReactNode }) {
  if (isSupabaseDataEnabled()) {
    return <SupabaseHrProvider>{children}</SupabaseHrProvider>
  }
  return <LocalHrProvider>{children}</LocalHrProvider>
}

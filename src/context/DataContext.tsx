/**
 * Chooses localStorage-backed data or Supabase (`VITE_USE_SUPABASE_DATA=true`).
 */
/* eslint-disable react-refresh/only-export-components -- barrel: Provider + re-exports for stable import path */
import { isSupabaseDataEnabled } from '@/lib/dataMode'
import { LocalDataProvider } from '@/context/DataContext.local'
import { SupabaseDataProvider } from '@/context/DataContext.supabase'

export { useData, type DataContextValue } from '@/context/dataContextShared'

export function DataProvider({ children }: { children: React.ReactNode }) {
  if (isSupabaseDataEnabled()) {
    return <SupabaseDataProvider>{children}</SupabaseDataProvider>
  }
  return <LocalDataProvider>{children}</LocalDataProvider>
}

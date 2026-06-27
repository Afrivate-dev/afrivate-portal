import { useEffect } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isSupabaseDataEnabled } from '@/lib/dataMode'
import { supabase } from '@/lib/supabase'

const LIVE_TABLES = [
  'portal_inbox_notifications',
  'portal_announcements',
  'portal_leave_requests',
  'portal_leave_comments',
  'portal_events',
  'portal_documents',
  'portal_weekly_check_ins',
  'portal_tasks',
  'portal_recognition_posts',
  'portal_recognition_comments',
  'portal_onboarding_progress',
] as const

/** Reload portal data when shared tables change — keeps UI live without manual refresh. */
export function usePortalRealtime(
  userId: string | undefined,
  reloadData: () => Promise<void>,
  client: SupabaseClient | null = supabase,
) {
  useEffect(() => {
    if (!userId || !client || !isSupabaseDataEnabled()) return

    let timer: ReturnType<typeof setTimeout> | null = null
    const scheduleReload = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        void reloadData()
      }, 400)
    }

    const channel = client.channel(`portal-live-${userId}`)
    for (const table of LIVE_TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        scheduleReload,
      )
    }
    void channel.subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      void client.removeChannel(channel)
    }
  }, [userId, reloadData, client])
}

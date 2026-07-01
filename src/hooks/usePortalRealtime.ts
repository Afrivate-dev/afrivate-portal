import { useEffect } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isSupabaseDataEnabled } from '@/lib/dataMode'
import { supabase } from '@/lib/supabase'

export const PORTAL_CONFIG_LIVE_TABLES = [
  'portal_task_categories',
  'portal_document_categories',
  'portal_recognition_tags',
  'portal_award_categories',
  'portal_grievance_categories',
  'portal_exit_reasons',
  'portal_memo_categories',
  'portal_pulse_survey_templates',
] as const

export const PORTAL_DATA_LIVE_TABLES = [
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

export const PORTAL_HR_LIVE_TABLES = [
  'portal_pulse_surveys',
  'portal_pulse_responses',
  'portal_learning_assignments',
  'portal_learning_submissions',
  'portal_document_acknowledgments',
  'portal_okrs',
  'portal_one_on_one_logs',
  'portal_idps',
  'portal_feedback_cycles',
  'portal_feedback_entries',
  'portal_feedback_templates',
  'portal_feedback_assignments',
  'portal_job_requisitions',
  'portal_job_candidates',
  'portal_grievances',
  'portal_onboarding_milestones',
  'portal_quarterly_awards',
  'portal_exit_interviews',
] as const

/** Reload when shared tables change — keeps UI live without manual refresh. */
export function usePortalRealtime(
  userId: string | undefined,
  reload: () => Promise<void>,
  client: SupabaseClient | null = supabase,
  tables: readonly string[] = PORTAL_DATA_LIVE_TABLES,
  channelKey = 'data',
) {
  useEffect(() => {
    if (!userId || !client || !isSupabaseDataEnabled()) return

    let timer: ReturnType<typeof setTimeout> | null = null
    const scheduleReload = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        void reload()
      }, 400)
    }

    const channel = client.channel(`portal-live-${channelKey}-${userId}`)
    for (const table of tables) {
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
  }, [userId, reload, client, tables, channelKey])
}

/** Subscribe to HR table changes and reload HR context. */
export function useHrPortalRealtime(
  userId: string | undefined,
  reloadHr: () => Promise<void>,
  client: SupabaseClient | null = supabase,
) {
  usePortalRealtime(userId, reloadHr, client, PORTAL_HR_LIVE_TABLES, 'hr')
}

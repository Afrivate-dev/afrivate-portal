import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useData } from '@/context/DataContext'
import { useHr } from '@/context/HrContext'
import { useAuth } from '@/context/AuthContext'
import { REVIVAL_AUTO_RULES } from '@/content/revivalLaunchChecklist'
import {
  detectAutoCompletedTaskIds,
  type RevivalAutoContext,
} from '@/lib/revivalLaunchAutoComplete'
import { supabase } from '@/lib/supabase'

const LOCAL_KEY = 'av-revival-launch-progress'

export type RevivalTaskProgress = {
  completedAt: string
  completedBy?: string
  autoCompleted: boolean
}

export type RevivalProgressMap = Record<string, RevivalTaskProgress>

function readLocalProgress(): RevivalProgressMap {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as RevivalProgressMap
  } catch {
    return {}
  }
}

function writeLocalProgress(map: RevivalProgressMap) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(map))
  } catch {
    /* ignore quota errors */
  }
}

function rowToProgress(
  rows: {
    task_id: string
    completed_at: string
    completed_by: string | null
    auto_completed: boolean
  }[],
): RevivalProgressMap {
  return Object.fromEntries(
    rows.map((r) => [
      r.task_id,
      {
        completedAt: r.completed_at,
        completedBy: r.completed_by ?? undefined,
        autoCompleted: r.auto_completed,
      },
    ]),
  )
}

export function useRevivalLaunchChecklist() {
  const { user } = useAuth()
  const { users, documents, announcements, events, recognition } = useData()
  const { pulseSurveys, learningAssignments } = useHr()
  const [progress, setProgress] = useState<RevivalProgressMap>(() => readLocalProgress())
  const [loading, setLoading] = useState(Boolean(supabase))
  const autoAppliedRef = useRef<Set<string>>(new Set())

  const autoContext = useMemo<RevivalAutoContext>(
    () => ({
      users,
      documents,
      announcements,
      pulseSurveys,
      learningAssignments,
      events,
      recognition,
    }),
    [users, documents, announcements, pulseSurveys, learningAssignments, events, recognition],
  )

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('portal_launch_checklist_progress')
        .select('task_id, completed_at, completed_by, auto_completed')
      if (cancelled) return
      if (!error && data) {
        const remote = rowToProgress(data as Parameters<typeof rowToProgress>[0])
        setProgress((local) => {
          // Prefer remote for shared truth; keep local-only keys until synced
          const merged = { ...local, ...remote }
          writeLocalProgress(merged)
          return merged
        })
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const persistTask = useCallback(
    async (taskId: string, entry: RevivalTaskProgress) => {
      const previous = readLocalProgress()
      setProgress((prev) => {
        const next = { ...prev, [taskId]: entry }
        writeLocalProgress(next)
        return next
      })
      if (!supabase) return
      const { error } = await supabase.from('portal_launch_checklist_progress').upsert(
        {
          task_id: taskId,
          completed_at: entry.completedAt,
          completed_by: entry.completedBy ?? null,
          auto_completed: entry.autoCompleted,
        },
        { onConflict: 'task_id' },
      )
      if (error) {
        setProgress(previous)
        writeLocalProgress(previous)
      }
    },
    [],
  )

  const clearTask = useCallback(async (taskId: string) => {
    const previous = readLocalProgress()
    setProgress((prev) => {
      const next = { ...prev }
      delete next[taskId]
      writeLocalProgress(next)
      return next
    })
    if (!supabase) return
    const { error } = await supabase
      .from('portal_launch_checklist_progress')
      .delete()
      .eq('task_id', taskId)
    if (error) {
      setProgress(previous)
      writeLocalProgress(previous)
    }
  }, [])

  const toggleTask = useCallback(
    async (taskId: string) => {
      if (progress[taskId]) {
        await clearTask(taskId)
        return
      }
      await persistTask(taskId, {
        completedAt: new Date().toISOString(),
        completedBy: user?.id,
        autoCompleted: false,
      })
    },
    [progress, persistTask, clearTask, user?.id],
  )

  useEffect(() => {
    const detected = detectAutoCompletedTaskIds(REVIVAL_AUTO_RULES, autoContext)
    for (const taskId of detected) {
      if (progress[taskId] || autoAppliedRef.current.has(taskId)) continue
      autoAppliedRef.current.add(taskId)
      void persistTask(taskId, {
        completedAt: new Date().toISOString(),
        autoCompleted: true,
      })
    }
  }, [autoContext, progress, persistTask])

  const completedIds = useMemo(() => new Set(Object.keys(progress)), [progress])

  return {
    progress,
    completedIds,
    loading,
    toggleTask,
  }
}

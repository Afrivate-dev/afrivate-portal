import type { Announcement, DocumentItem, EventItem, RecognitionPost, User } from '@/types'
import type { LearningAssignment, PulseSurvey } from '@/types/hr'
import { findRevivalPersonUser } from '@/lib/revivalLaunchAccess'
import type { RevivalAutoRule } from '@/content/revivalLaunchChecklist'

export interface RevivalAutoContext {
  users: User[]
  documents: DocumentItem[]
  announcements: Announcement[]
  pulseSurveys: PulseSurvey[]
  learningAssignments: LearningAssignment[]
  events: EventItem[]
  recognition: RecognitionPost[]
}

function docByTitleFragment(docs: DocumentItem[], fragment: string): DocumentItem | undefined {
  const q = fragment.toLowerCase()
  return docs.find((d) => d.title.toLowerCase().includes(q))
}

function activeApprovedUsers(users: User[]): User[] {
  return users.filter((u) => u.active && u.approvedAt)
}

export function evaluateRevivalAutoRule(
  rule: RevivalAutoRule,
  ctx: RevivalAutoContext,
): boolean {
  switch (rule) {
    case 'team_portal_ready':
      return (
        evaluateRevivalAutoRule('daniel_hr_access', ctx) &&
        evaluateRevivalAutoRule('opemipo_portal_access', ctx)
      )
    case 'daniel_hr_access': {
      const daniel = findRevivalPersonUser(ctx.users, 'd')
      return Boolean(daniel?.active && (daniel.role === 'hr' || daniel.role === 'admin'))
    }
    case 'opemipo_portal_access': {
      const opemipo = findRevivalPersonUser(ctx.users, 'o')
      return Boolean(opemipo?.active && opemipo.approvedAt)
    }
    case 'staff_directory_complete': {
      const active = ctx.users.filter((u) => u.active)
      if (active.length === 0) return false
      const complete = active.filter(
        (u) =>
          u.department &&
          u.department.toLowerCase() !== 'unassigned' &&
          Boolean(u.reportsToId || u.role === 'admin' || u.role === 'hr'),
      )
      return complete.length >= active.length * 0.9
    }
    case 'doc_afrivate_way': {
      const doc = docByTitleFragment(ctx.documents, 'afrivate way')
      return Boolean(doc?.requiresAcknowledgment)
    }
    case 'doc_leave_policy': {
      const doc = docByTitleFragment(ctx.documents, 'leave')
      return Boolean(doc?.requiresAcknowledgment)
    }
    case 'hr_digest_memo':
      return ctx.announcements.some((a) => a.memoCategory === 'digest')
    case 'active_pulse_survey':
      return ctx.pulseSurveys.some((s) => s.active)
    case 'alison_course_assigned':
      return ctx.learningAssignments.some(
        (a) =>
          a.active &&
          (a.alisonUrl.includes('alison.com') ||
            a.title.toLowerCase().includes('business writing') ||
            a.title.toLowerCase().includes('writing')),
      )
    case 'town_hall_posted': {
      const inEvents = ctx.events.some((e) => e.title.toLowerCase().includes('town hall'))
      const inMemos = ctx.announcements.some((a) =>
        a.title.toLowerCase().includes('town hall'),
      )
      return inEvents || inMemos
    }
    case 'recognition_by_daniel': {
      const daniel = findRevivalPersonUser(ctx.users, 'd')
      if (!daniel) return false
      return ctx.recognition.some((r) => r.giverId === daniel.id)
    }
    case 'recognition_volume_3':
      return ctx.recognition.length >= 3
    case 'portal_registrations_majority': {
      const active = ctx.users.filter((u) => u.active)
      if (active.length === 0) return false
      const registered = activeApprovedUsers(ctx.users)
      return registered.length >= active.length * 0.5
    }
    case 'portal_registrations_target': {
      const active = ctx.users.filter((u) => u.active)
      if (active.length === 0) return false
      const registered = activeApprovedUsers(ctx.users)
      return registered.length >= active.length * 0.8
    }
    default:
      return false
  }
}

export function detectAutoCompletedTaskIds(
  taskRules: Record<string, RevivalAutoRule | undefined>,
  ctx: RevivalAutoContext,
): string[] {
  const done: string[] = []
  for (const [taskId, rule] of Object.entries(taskRules)) {
    if (!rule) continue
    if (evaluateRevivalAutoRule(rule, ctx)) done.push(taskId)
  }
  return done
}

import type { Announcement, DocumentItem, EventItem, RecognitionPost, User } from '@/types'
import type { LearningAssignment, PulseSurvey } from '@/types/hr'
import { findRevivalPersonUser } from '@/lib/revivalLaunchAccess'
import type { RevivalAutoRule } from '@/content/revivalLaunchChecklist'
import { REVIVAL_ALISON_COURSE } from '@/content/revivalLaunchChecklist'

export interface RevivalAutoContext {
  users: User[]
  documents: DocumentItem[]
  announcements: Announcement[]
  pulseSurveys: PulseSurvey[]
  learningAssignments: LearningAssignment[]
  events: EventItem[]
  recognition: RecognitionPost[]
}

const STUB_DIGEST_SNIPPET = 'Add your bi-weekly digest content here'

function titleMatches(doc: DocumentItem, ...needles: string[]): boolean {
  const t = doc.title.toLowerCase()
  return needles.every((n) => t.includes(n.toLowerCase()))
}

function realDigestMemo(a: Announcement): boolean {
  if (a.memoCategory !== 'digest') return false
  const body = a.body.trim()
  if (body.length < 80) return false
  if (body.includes(STUB_DIGEST_SNIPPET)) return false
  return true
}

function welcomeDigestMemo(a: Announcement): boolean {
  if (!realDigestMemo(a)) return false
  const hay = `${a.title}\n${a.body}`.toLowerCase()
  return /welcome|revival|new era|day 1|launch/.test(hay)
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
      const doc = ctx.documents.find(
        (d) =>
          (titleMatches(d, 'afrivate way') || titleMatches(d, 'afri', 'way')) &&
          d.requiresAcknowledgment,
      )
      return Boolean(doc)
    }
    case 'doc_leave_policy': {
      const doc = ctx.documents.find(
        (d) =>
          (titleMatches(d, 'leave policy') ||
            (titleMatches(d, 'leave') && titleMatches(d, 'policy'))) &&
          d.requiresAcknowledgment,
      )
      return Boolean(doc)
    }
    case 'welcome_hr_digest_memo':
      return ctx.announcements.some(welcomeDigestMemo)
    case 'hr_digest_memo':
      return ctx.announcements.some(realDigestMemo)
    case 'active_pulse_survey':
      return ctx.pulseSurveys.some((s) => s.active && s.surveyType === 'pulse')
    case 'alison_course_assigned': {
      const courseNeedle = REVIVAL_ALISON_COURSE.title.toLowerCase()
      return ctx.learningAssignments.some((a) => {
        if (!a.active) return false
        const url = a.alisonUrl.toLowerCase()
        const title = a.title.toLowerCase()
        const isAlison = url.includes('alison.com')
        const isBusinessWriting =
          title.includes(courseNeedle) ||
          title.includes('business writing') ||
          url.includes('fundamentals-of-business-writing')
        return isAlison && isBusinessWriting
      })
    }
    case 'town_hall_posted': {
      const match = (s: string) => /\btown\s*hall\b/i.test(s)
      return (
        ctx.events.some((e) => match(e.title)) ||
        ctx.announcements.some((a) => match(a.title))
      )
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

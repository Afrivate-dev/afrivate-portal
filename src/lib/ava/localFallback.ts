import type { AvaChatMessage, AvaResponse, AvaSuggestedAction, AvaUserContext } from '@/lib/ava/types'

function includesAny(text: string, words: string[]) {
  const t = text.toLowerCase()
  return words.some((w) => t.includes(w))
}

function personalSummary(ctx: AvaUserContext): string {
  const p = ctx.personal
  if (!p) return ''
  const lines = [
    `Open tasks: ${p.openTasks} (${p.overdueTasks} overdue).`,
    `Pending leave requests: ${p.pendingLeave}.`,
    `Weekly check-in for this week: ${p.checkInThisWeek ? 'submitted' : 'not yet submitted'}.`,
    `Learning items pending: ${p.learningPending}.`,
    `Open surveys: ${p.openSurveys}.`,
  ]
  if (typeof p.myInfoCompleteness === 'number') {
    lines.push(`My info completeness: ${p.myInfoCompleteness}%.`)
  }
  if (p.recentLeave.length) {
    lines.push(
      'Recent leave: ' +
        p.recentLeave
          .map((l) => `${l.type} ${l.startDate}–${l.endDate} (${l.status})`)
          .join('; ') +
        '.',
    )
  }
  return lines.join('\n')
}

/** Offline / no-Gemini fallback — still useful for mock mode and outages. */
export function localAvaRespond(
  messages: AvaChatMessage[],
  ctx: AvaUserContext,
): AvaResponse {
  const last = messages.filter((m) => m.role === 'user').at(-1)?.content ?? ''
  const q = last.toLowerCase()
  const actions: AvaSuggestedAction[] = []
  const links: AvaResponse['links'] = []
  const citations: string[] = []

  if (includesAny(q, ['leave', 'time off', 'annual leave', 'sick'])) {
    citations.push('Leave and Absence Policy', 'Portal User Guide')
    links.push({ label: 'Time off', path: '/people/leave' })
    if (includesAny(q, ['draft', 'request', 'apply', 'submit', 'help me'])) {
      const start = new Date()
      start.setDate(start.getDate() + 5)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      actions.push({
        type: 'draft_leave',
        label: 'Review leave draft',
        payload: {
          leaveType: includesAny(q, ['sick'])
            ? 'sick'
            : includesAny(q, ['emergency'])
              ? 'emergency'
              : 'annual',
          startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
          reason: 'Draft prepared by AVA — please edit before submitting.',
        },
      })
    }
    return {
      source: 'local',
      citations,
      links,
      suggestedActions: actions,
      reply: [
        'Leave must be requested through **People → Time off** in the AfriVate Portal.',
        '',
        '1. Open Time off and select **Request leave**.',
        '2. Enter the dates, leave type, and a clear reason.',
        '3. Attach supporting documentation when required.',
        '4. Submit and track the status under **My requests**.',
        '',
        'Provide at least three (3) official work days’ notice except for accepted emergencies. A request is not approved until the decision is recorded in the Portal. Slack or WhatsApp messages alone are not valid leave requests.',
        '',
        personalSummary(ctx) ? `Your current leave picture:\n${personalSummary(ctx)}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    }
  }

  if (includesAny(q, ['alison', 'learning', 'certificate', 'course'])) {
    citations.push('Portal User Guide')
    links.push({ label: 'Learning', path: '/people/learning' })
    return {
      source: 'local',
      citations,
      links,
      reply: [
        'Learning assignments are managed under **People → Learning**.',
        '',
        '1. Open the assigned Alison course.',
        '2. Complete the course.',
        '3. Submit the course name, completion date, and certificate in the Portal.',
        '4. Await People & Culture review (pending / approved / rejected).',
        '',
        `Learning items pending for you: ${ctx.personal?.learningPending ?? 0}.`,
      ].join('\n'),
    }
  }

  if (includesAny(q, ['slack', '4-hour', 'four-hour', 'four hour', 'whatsapp', 'communication'])) {
    citations.push('Standard Work Process', 'Portal User Guide')
    return {
      source: 'local',
      citations,
      reply: [
        '**Official communication rules**',
        '',
        '- **Slack** is AfriVate’s official internal messaging channel. Acknowledge official Slack messages within **four (4) hours** on official work days.',
        '- **Portal** is the system of record for leave, tasks, check-ins, learning, surveys, appraisals, and related workflows.',
        '- **WhatsApp** is for informal or emergency contact only — never for leave, policy acknowledgements, or formal HR processes.',
        '- A Slack message does not replace a required Portal submission or approval.',
      ].join('\n'),
    }
  }

  if (includesAny(q, ['task', 'my work', 'overdue', 'open tasks'])) {
    links.push({ label: 'My work', path: '/tasks' })
    return {
      source: 'local',
      links,
      reply: [
        'Your work is tracked under **My work**.',
        '',
        personalSummary(ctx) || 'I could not load task totals right now. Open My work to review assignments.',
        '',
        'Update status there, and mark tasks **Complete** so completion time and actor are recorded.',
      ].join('\n'),
    }
  }

  if (includesAny(q, ['check-in', 'checkin', 'weekly update', 'weekly report'])) {
    links.push({ label: 'Weekly update', path: '/checkin' })
    if (includesAny(q, ['draft', 'help me', 'write', 'prepare'])) {
      actions.push({
        type: 'draft_checkin',
        label: 'Review check-in draft',
        payload: {
          completed: 'Summarise completed work for this week.',
          nextWeek: 'Summarise priorities for next week.',
          blockers: '',
          hoursWorked: 0,
        },
      })
    }
    return {
      source: 'local',
      links,
      suggestedActions: actions,
      reply: [
        'Submit your weekly update under **Weekly update**.',
        '',
        'Include completed work, next-week priorities, blockers, and hours worked.',
        `This week’s check-in: ${ctx.personal?.checkInThisWeek ? 'already submitted' : 'not yet submitted'}.`,
      ].join('\n'),
    }
  }

  if (includesAny(q, ['survey', 'pulse', 'enps'])) {
    links.push({ label: 'Surveys', path: '/people/surveys' })
    return {
      source: 'local',
      links,
      reply: `Open surveys are under **People → Surveys**. You currently have ${ctx.personal?.openSurveys ?? 0} open survey(s).`,
    }
  }

  if (includesAny(q, ['my info', 'emergency contact', 'profile completeness'])) {
    links.push({ label: 'My info', path: '/people/my-info' })
    return {
      source: 'local',
      links,
      reply: [
        'Update personal details under **People → My info**.',
        typeof ctx.personal?.myInfoCompleteness === 'number'
          ? `Current completeness: ${ctx.personal.myInfoCompleteness}%.`
          : 'Complete emergency contact and personal fields, then save.',
        'Employment status and other HR-only fields are managed under Admin → Employees.',
      ].join('\n'),
    }
  }

  if (
    (ctx.role === 'hr' || ctx.role === 'admin') &&
    includesAny(q, ['pip', 'discipline', 'appraisal', 'employee hub', 'recruitment', 'approvals'])
  ) {
    links.push({ label: 'Admin', path: '/admin' })
    citations.push('Portal User Guide', 'Standard Work Process')
    const hr = ctx.hr
    return {
      source: 'local',
      citations,
      links,
      reply: [
        'People & Culture tools live under **Admin**.',
        '',
        '- **Approvals** — access requests',
        '- **Leave** — organisation leave queue',
        '- **HR dashboard** — metrics and reviews',
        '- **Employees** — dossiers, discipline, PIPs, appraisals, probation, offboarding',
        '- **Recruitment** — applicant tracking',
        '',
        hr
          ? `Current snapshot: ${hr.pendingApprovals} pending approvals; ${hr.pendingLeaveOrg} pending leave; ${hr.activePips} active PIPs; ${hr.pendingDiscipline} pending discipline; ${hr.pendingLearningReviews} learning reviews.`
          : 'Open Admin for live queues and metrics.',
        '',
        'AVA can explain process. Final HR decisions remain with authorised personnel in the Portal.',
      ].join('\n'),
    }
  }

  links.push({ label: 'Home', path: '/' }, { label: 'People', path: '/people' })
  return {
    source: 'local',
    links,
    citations: ['Portal User Guide'],
    reply: [
      `Hello ${ctx.name.split(' ')[0] || 'there'} — I am AVA, the AfriVate Virtual Assistant.`,
      '',
      'I can help with leave, learning, weekly updates, tasks, Slack/Portal rules, My info, and (for HR) Admin navigation.',
      '',
      personalSummary(ctx) ? `Your current snapshot:\n${personalSummary(ctx)}` : '',
      '',
      'Ask a specific question, or try: “How do I request leave?”',
    ]
      .filter(Boolean)
      .join('\n'),
  }
}

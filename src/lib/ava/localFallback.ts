import type { AvaChatMessage, AvaInsertDraftAction, AvaResponse, AvaSuggestedAction, AvaUserContext } from '@/lib/ava/types'

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

function afterCue(text: string, cues: string[]): string {
  const lower = text.toLowerCase()
  for (const cue of cues) {
    const i = lower.indexOf(cue)
    if (i < 0) continue
    const rest = text.slice(i + cue.length).replace(/^[\s:;,\-–—]+/, '').trim()
    if (rest.length >= 8) return rest
  }
  return ''
}

function wantsDraft(q: string) {
  return includesAny(q, [
    'draft',
    'write my',
    'write a',
    'insert',
    'fill in',
    'fill out',
    'revamp',
    'refine',
    'rewrite',
    'rephrase',
    'polish',
    'make this',
    'help me write',
    'help me draft',
  ])
}

function insertDraft(
  kind: AvaInsertDraftAction['kind'],
  label: string,
  path: string,
  fields: Record<string, string>,
  mode: AvaInsertDraftAction['mode'] = 'insert',
): AvaInsertDraftAction {
  return { type: 'insert_draft', label, path, kind, mode, fields }
}

function draftFromPage(ctx: AvaUserContext, kind: AvaInsertDraftAction['kind']): Record<string, string> {
  if (ctx.pageDraft?.kind === kind) return { ...ctx.pageDraft.fields }
  return {}
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
  const refine = includesAny(q, ['revamp', 'refine', 'rewrite', 'rephrase', 'polish', 'make this'])

  if (wantsDraft(q) && includesAny(q, ['check-in', 'checkin', 'weekly update', 'weekly report'])) {
    const fromPage = draftFromPage(ctx, 'weekly_update')
    const body = afterCue(last, [
      'weekly update',
      'weekly report',
      'check-in',
      'checkin',
      'completed',
      ':',
    ])
    const fields: Record<string, string> = { ...fromPage }
    if (body) {
      if (!fields.completed || refine) fields.completed = body
    }
    if (!fields.completed && !fields.nextWeek) {
      links.push({ label: 'Weekly update', path: '/checkin' })
      actions.push({ type: 'navigate', label: 'Go to Weekly update', path: '/checkin' })
      return {
        source: 'local',
        links,
        suggestedActions: actions,
        reply: [
          'I can insert a weekly update draft for you, then you review and send it.',
          '',
          'Tell me what you completed, what is next, any blockers, and hours worked — or open Weekly update and ask me to refine the text already in the form.',
        ].join('\n'),
      }
    }
    links.push({ label: 'Weekly update', path: '/checkin' })
    actions.push(
      insertDraft(
        'weekly_update',
        'Review weekly update draft',
        '/checkin',
        fields,
        refine || Object.keys(fromPage).length ? 'refine' : 'insert',
      ),
    )
    return {
      source: 'local',
      links,
      suggestedActions: actions,
      reply: [
        'I have prepared a **weekly update draft**. It is in the form for you to review.',
        '',
        'I cannot send it. Open Weekly update, check the wording, then press **Send weekly update**.',
      ].join('\n'),
    }
  }

  if (wantsDraft(q) && includesAny(q, ['leave', 'time off', 'annual leave', 'sick'])) {
    const fromPage = draftFromPage(ctx, 'leave')
    const reason =
      afterCue(last, ['because', 'reason', 'for', ':']) || fromPage.reason || last.trim()
    const fields: Record<string, string> = { ...fromPage }
    if (reason && reason.length >= 8) fields.reason = reason
    if (includesAny(q, ['sick'])) fields.type = 'sick'
    else if (includesAny(q, ['emergency'])) fields.type = 'emergency'
    else if (!fields.type) fields.type = 'annual'
    const dates = last.match(/\d{4}-\d{2}-\d{2}/g)
    if (dates?.[0]) fields.startDate = dates[0]
    if (dates?.[1]) fields.endDate = dates[1]
    if (!fields.reason) {
      links.push({ label: 'Time off', path: '/people/leave' })
      actions.push({ type: 'navigate', label: 'Go to Time off', path: '/people/leave' })
      return {
        source: 'local',
        citations: ['Leave and Absence Policy'],
        links,
        suggestedActions: actions,
        reply: 'Tell me the dates, leave type, and reason. I will insert a draft on Time off — you still submit it yourself.',
      }
    }
    links.push({ label: 'Time off', path: '/people/leave' })
    actions.push(insertDraft('leave', 'Review leave request draft', '/people/leave', fields, refine ? 'refine' : 'insert'))
    return {
      source: 'local',
      citations: ['Leave and Absence Policy'],
      links,
      suggestedActions: actions,
      reply: [
        'I have inserted a **leave request draft**. Review the dates and reason, attach documents if required, then press **Submit request**.',
        '',
        'AVA cannot submit or approve leave for anyone.',
      ].join('\n'),
    }
  }

  if (wantsDraft(q) && includesAny(q, ['task', 'my work'])) {
    const fromPage = draftFromPage(ctx, 'task')
    const title = afterCue(last, ['task', 'titled', 'called', ':']) || fromPage.title
    const fields: Record<string, string> = { ...fromPage }
    if (title) fields.title = title.slice(0, 120)
    if (!fields.description && title) fields.description = afterCue(last, ['description', 'about']) || ''
    if (!fields.title) {
      links.push({ label: 'My work', path: '/tasks' })
      actions.push({ type: 'navigate', label: 'Go to My work', path: '/tasks' })
      return {
        source: 'local',
        links,
        suggestedActions: actions,
        reply: 'Tell me the task title and details. I will insert a draft on My work — you create it yourself. I will not mark it complete.',
      }
    }
    fields.status = 'todo'
    links.push({ label: 'My work', path: '/tasks' })
    actions.push(insertDraft('task', 'Review task draft', '/tasks', fields, refine ? 'refine' : 'insert'))
    return {
      source: 'local',
      links,
      suggestedActions: actions,
      reply: 'I have inserted a **task draft**. Review it on My work, then create it yourself. AVA cannot complete tasks.',
    }
  }

  if (wantsDraft(q) && includesAny(q, ['shout-out', 'shout out', 'shoutout', 'recognition'])) {
    const fromPage = draftFromPage(ctx, 'shoutout')
    const message = afterCue(last, ['shout-out', 'shout out', 'shoutout', 'message', ':']) || fromPage.message
    if (!message) {
      links.push({ label: 'Shout-outs', path: '/people/shout-outs' })
      actions.push({ type: 'navigate', label: 'Go to Shout-outs', path: '/people/shout-outs' })
      return {
        source: 'local',
        links,
        suggestedActions: actions,
        reply: 'Tell me who to recognise and why. I will insert a shout-out draft — you send it yourself.',
      }
    }
    links.push({ label: 'Shout-outs', path: '/people/shout-outs' })
    actions.push(
      insertDraft('shoutout', 'Review shout-out draft', '/people/shout-outs', { ...fromPage, message }, refine ? 'refine' : 'insert'),
    )
    return {
      source: 'local',
      links,
      suggestedActions: actions,
      reply: 'I have inserted a **shout-out draft**. Choose the recipient, review the wording, then send it yourself.',
    }
  }

  if (wantsDraft(q) && includesAny(q, ['memo', 'announcement'])) {
    const fromPage = draftFromPage(ctx, 'memo')
    const body = afterCue(last, ['memo', 'announcement', 'body', ':']) || fromPage.body
    const fields = { ...fromPage }
    if (body) fields.body = body
    if (!fields.title) fields.title = afterCue(last, ['titled', 'title']) || fields.title
    if (!fields.body && !fields.title) {
      links.push({ label: 'Memos', path: '/announcements' })
      actions.push({ type: 'navigate', label: 'Go to Memos', path: '/announcements' })
      return {
        source: 'local',
        links,
        suggestedActions: actions,
        reply: 'Share the memo title and body. I will insert a draft — you publish it yourself if you are allowed to.',
      }
    }
    links.push({ label: 'Memos', path: '/announcements' })
    actions.push(insertDraft('memo', 'Review memo draft', '/announcements', fields, refine ? 'refine' : 'insert'))
    return {
      source: 'local',
      links,
      suggestedActions: actions,
      reply: 'I have inserted a **memo draft**. Review it, then publish it yourself. AVA cannot publish memos.',
    }
  }

  if (wantsDraft(q) && includesAny(q, ['bio', 'my info', 'emergency contact', 'profile'])) {
    const fromPage = draftFromPage(ctx, 'my_info')
    const bio = afterCue(last, ['bio', 'about me', ':']) || fromPage.bio
    const fields = { ...fromPage }
    if (bio) fields.bio = bio
    if (!Object.keys(fields).length) {
      links.push({ label: 'My info', path: '/people/my-info' })
      actions.push({ type: 'navigate', label: 'Go to My info', path: '/people/my-info' })
      return {
        source: 'local',
        links,
        suggestedActions: actions,
        reply: 'Tell me which My info fields to draft (bio, emergency contact, skills). I will insert them — you save them yourself.',
      }
    }
    links.push({ label: 'My info', path: '/people/my-info' })
    actions.push(insertDraft('my_info', 'Review my info draft', '/people/my-info', fields, refine ? 'refine' : 'insert'))
    return {
      source: 'local',
      links,
      suggestedActions: actions,
      reply: 'I have inserted draft text on **My info**. Review it, then press **Save my info**. AVA cannot save your profile for you.',
    }
  }

  if (includesAny(q, ['leave', 'time off', 'annual leave', 'sick'])) {
    citations.push('Leave and Absence Policy', 'Portal User Guide')
    links.push({ label: 'Time off', path: '/people/leave' })
    actions.push({ type: 'navigate', label: 'Go to Time off', path: '/people/leave' })
    return {
      source: 'local',
      citations,
      links,
      suggestedActions: actions,
      reply: [
        'I can take you to **People → Time off**, or draft the request if you give me dates and a reason. AVA cannot submit leave for anyone.',
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
    actions.push({ type: 'navigate', label: 'Go to Learning', path: '/people/learning' })
    return {
      source: 'local',
      citations,
      links,
      suggestedActions: actions,
      reply: [
        'I can take you to **People → Learning**, where you upload certificates yourself. AVA cannot submit learning records for anyone.',
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
    actions.push({ type: 'navigate', label: 'Go to My work', path: '/tasks' })
    return {
      source: 'local',
      links,
      suggestedActions: actions,
      reply: [
        'I can take you to **My work**, or insert a task draft if you give me a title. AVA cannot complete tasks for anyone.',
        '',
        personalSummary(ctx) || 'I could not load task totals right now. Open My work to review assignments.',
        '',
        'Update status there, and mark tasks **Complete** so completion time and actor are recorded.',
      ].join('\n'),
    }
  }

  if (includesAny(q, ['check-in', 'checkin', 'weekly update', 'weekly report'])) {
    links.push({ label: 'Weekly update', path: '/checkin' })
    actions.push({ type: 'navigate', label: 'Go to Weekly update', path: '/checkin' })
    return {
      source: 'local',
      links,
      suggestedActions: actions,
      reply: [
        'I can take you to **Weekly update**, or draft the wording if you tell me what you completed. AVA cannot submit check-ins for anyone.',
        '',
        'Include completed work, next-week priorities, blockers, and hours worked.',
        `This week’s check-in: ${ctx.personal?.checkInThisWeek ? 'already submitted' : 'not yet submitted'}.`,
      ].join('\n'),
    }
  }

  if (includesAny(q, ['survey', 'pulse', 'enps'])) {
    links.push({ label: 'Surveys', path: '/people/surveys' })
    actions.push({ type: 'navigate', label: 'Go to Surveys', path: '/people/surveys' })
    return {
      source: 'local',
      links,
      suggestedActions: actions,
      reply: `I can take you to **People → Surveys**. You currently have ${ctx.personal?.openSurveys ?? 0} open survey(s). AVA cannot complete surveys for anyone.`,
    }
  }

  if (includesAny(q, ['my info', 'emergency contact', 'profile completeness'])) {
    links.push({ label: 'My info', path: '/people/my-info' })
    actions.push({ type: 'navigate', label: 'Go to My info', path: '/people/my-info' })
    return {
      source: 'local',
      links,
      suggestedActions: actions,
      reply: [
        'I can take you to **People → My info**, or draft bio and contact wording for you to save.',
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
    actions.push({ type: 'navigate', label: 'Go to Admin', path: '/admin' })
    citations.push('Portal User Guide', 'Standard Work Process')
    const hr = ctx.hr
    return {
      source: 'local',
      citations,
      links,
      suggestedActions: actions,
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
        'AVA explains process and takes you to the right Admin screen. Final HR decisions remain with authorised personnel in the Portal — AVA never completes those actions.',
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
      'I can explain Team Space, take you to the right page, and insert or refine drafts. I never submit leave, check-ins, learning, approvals, or any other record for anyone — you review and send it yourself.',
      '',
      personalSummary(ctx) ? `Your current snapshot:\n${personalSummary(ctx)}` : '',
      '',
      'Ask a specific question, or try: “Help me draft my weekly update.”',
    ]
      .filter(Boolean)
      .join('\n'),
  }
}

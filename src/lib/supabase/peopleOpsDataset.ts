import type { SupabaseClient } from '@supabase/supabase-js'
import { pauseHrRealtime, resumeHrRealtime } from '@/hooks/usePortalRealtime'
import type {
  DisciplineCase,
  EmployeeProfile,
  FormalAppraisal,
  HrAuditEntry,
  OffboardingChecklist,
  PerformanceImprovementPlan,
} from '@/types/hr'

let peopleOpsWriteDepth = 0

export function beginPeopleOpsWrite(): void {
  peopleOpsWriteDepth += 1
}

export function endPeopleOpsWrite(): void {
  peopleOpsWriteDepth = Math.max(0, peopleOpsWriteDepth - 1)
}

export function isPeopleOpsWriting(): boolean {
  return peopleOpsWriteDepth > 0
}

export { pauseHrRealtime, resumeHrRealtime }

export interface PeopleOpsDataset {
  employeeProfiles: EmployeeProfile[]
  disciplineCases: DisciplineCase[]
  performanceImprovementPlans: PerformanceImprovementPlan[]
  formalAppraisals: FormalAppraisal[]
  hrAuditLog: HrAuditEntry[]
  offboardingChecklists: OffboardingChecklist[]
}

function asString(v: unknown, fallback = ''): string {
  return v == null ? fallback : String(v)
}

function asIso(v: unknown): string | undefined {
  return v == null || v === '' ? undefined : String(v)
}

export function rowToEmployeeProfile(r: Record<string, unknown>): EmployeeProfile {
  const ec = r.emergency_contact
  return {
    id: asString(r.id),
    userId: asString(r.user_id),
    preferredName: asIso(r.preferred_name),
    legalName: asIso(r.legal_name),
    personalEmail: asIso(r.personal_email),
    phone: asIso(r.phone),
    workLocation: asIso(r.work_location),
    addressCountry: asIso(r.address_country),
    dateOfBirth: asIso(r.date_of_birth)?.slice(0, 10),
    pronouns: asIso(r.pronouns),
    linkedinUrl: asIso(r.linkedin_url),
    bio: asIso(r.bio),
    skills: Array.isArray(r.skills) ? r.skills.filter((x): x is string => typeof x === 'string') : [],
    emergencyContact:
      ec && typeof ec === 'object'
        ? {
            name: asString((ec as Record<string, unknown>).name),
            phone: asString((ec as Record<string, unknown>).phone),
            relationship: asString((ec as Record<string, unknown>).relationship),
          }
        : undefined,
    nextOfKinNotes: asIso(r.next_of_kin_notes),
    engagementType: asString(r.engagement_type, 'employee') as EmployeeProfile['engagementType'],
    employmentStatus: asString(r.employment_status, 'active') as EmployeeProfile['employmentStatus'],
    startDate: asIso(r.start_date)?.slice(0, 10),
    probationEndDate: asIso(r.probation_end_date)?.slice(0, 10),
    confirmationDate: asIso(r.confirmation_date)?.slice(0, 10),
    confirmedAt: asIso(r.confirmed_at),
    confirmedById: asIso(r.confirmed_by_id),
    contractTermsSummary: asIso(r.contract_terms_summary),
    payrollSetupComplete: Boolean(r.payroll_setup_complete),
    hrPrivateNotes: asIso(r.hr_private_notes),
    hrRequestsUpdate: Boolean(r.hr_requests_update),
    archived: Boolean(r.archived),
    profileCompleteness: Number(r.profile_completeness ?? 0),
    lastEmployeeUpdateAt: asIso(r.last_employee_update_at),
    lastHrUpdateAt: asIso(r.last_hr_update_at),
    createdAt: asString(r.created_at),
    updatedAt: asString(r.updated_at),
  }
}

export function employeeProfileToRow(p: EmployeeProfile): Record<string, unknown> {
  return {
    id: p.id,
    user_id: p.userId,
    preferred_name: p.preferredName ?? null,
    legal_name: p.legalName ?? null,
    personal_email: p.personalEmail ?? null,
    phone: p.phone ?? null,
    work_location: p.workLocation ?? null,
    address_country: p.addressCountry ?? null,
    date_of_birth: p.dateOfBirth || null,
    pronouns: p.pronouns ?? null,
    linkedin_url: p.linkedinUrl ?? null,
    bio: p.bio ?? null,
    skills: p.skills ?? [],
    emergency_contact: p.emergencyContact ?? null,
    next_of_kin_notes: p.nextOfKinNotes ?? null,
    engagement_type: p.engagementType,
    employment_status: p.employmentStatus,
    start_date: p.startDate || null,
    probation_end_date: p.probationEndDate || null,
    confirmation_date: p.confirmationDate || null,
    confirmed_at: p.confirmedAt ?? null,
    confirmed_by_id: p.confirmedById ?? null,
    contract_terms_summary: p.contractTermsSummary ?? null,
    payroll_setup_complete: p.payrollSetupComplete,
    hr_private_notes: p.hrPrivateNotes ?? null,
    hr_requests_update: p.hrRequestsUpdate,
    archived: p.archived,
    profile_completeness: p.profileCompleteness,
    last_employee_update_at: p.lastEmployeeUpdateAt ?? null,
    last_hr_update_at: p.lastHrUpdateAt ?? null,
    created_at: p.createdAt || new Date().toISOString(),
    updated_at: p.updatedAt || new Date().toISOString(),
  }
}

export function rowToDisciplineCase(r: Record<string, unknown>): DisciplineCase {
  return {
    id: asString(r.id),
    subjectUserId: asString(r.subject_user_id),
    step: asString(r.step) as DisciplineCase['step'],
    severity: asString(r.severity) as DisciplineCase['severity'],
    employeeLevel: asString(r.employee_level) as DisciplineCase['employeeLevel'],
    triggers: Array.isArray(r.triggers) ? (r.triggers as DisciplineCase['triggers']) : [],
    reason: asString(r.reason),
    evidence: Array.isArray(r.evidence) ? (r.evidence as DisciplineCase['evidence']) : [],
    status: asString(r.status) as DisciplineCase['status'],
    deliveryMode: asString(r.delivery_mode) as DisciplineCase['deliveryMode'],
    issuedById: asString(r.issued_by_id),
    recommendedById: asIso(r.recommended_by_id),
    approvedById: asIso(r.approved_by_id),
    deliveredAt: asIso(r.delivered_at),
    acknowledgementRequired: r.acknowledgement_required !== false,
    acknowledgedAt: asIso(r.acknowledged_at),
    pipId: asIso(r.pip_id),
    createdAt: asString(r.created_at),
    updatedAt: asString(r.updated_at),
  }
}

export function disciplineCaseToRow(c: DisciplineCase): Record<string, unknown> {
  return {
    id: c.id,
    subject_user_id: c.subjectUserId,
    step: c.step,
    severity: c.severity,
    employee_level: c.employeeLevel,
    triggers: c.triggers,
    reason: c.reason,
    evidence: c.evidence,
    status: c.status,
    delivery_mode: c.deliveryMode,
    issued_by_id: c.issuedById,
    recommended_by_id: c.recommendedById ?? null,
    approved_by_id: c.approvedById ?? null,
    delivered_at: c.deliveredAt ?? null,
    acknowledgement_required: c.acknowledgementRequired,
    acknowledged_at: c.acknowledgedAt ?? null,
    pip_id: c.pipId ?? null,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  }
}

export function rowToPip(r: Record<string, unknown>): PerformanceImprovementPlan {
  return {
    id: asString(r.id),
    caseId: asString(r.case_id),
    subjectUserId: asString(r.subject_user_id),
    goals: Array.isArray(r.goals) ? (r.goals as PerformanceImprovementPlan['goals']) : [],
    startDate: asString(r.start_date).slice(0, 10),
    endDate: asString(r.end_date).slice(0, 10),
    durationDays: Number(r.duration_days ?? 0),
    reviews: Array.isArray(r.reviews) ? (r.reviews as PerformanceImprovementPlan['reviews']) : [],
    outcome: r.outcome ? (asString(r.outcome) as PerformanceImprovementPlan['outcome']) : undefined,
    outcomeNote: asIso(r.outcome_note),
    outcomeAt: asIso(r.outcome_at),
    outcomeById: asIso(r.outcome_by_id),
    templateKey: asIso(r.template_key),
    createdAt: asString(r.created_at),
    updatedAt: asString(r.updated_at),
  }
}

export function pipToRow(p: PerformanceImprovementPlan): Record<string, unknown> {
  return {
    id: p.id,
    case_id: p.caseId,
    subject_user_id: p.subjectUserId,
    goals: p.goals,
    start_date: p.startDate,
    end_date: p.endDate,
    duration_days: p.durationDays,
    reviews: p.reviews,
    outcome: p.outcome ?? null,
    outcome_note: p.outcomeNote ?? null,
    outcome_at: p.outcomeAt ?? null,
    outcome_by_id: p.outcomeById ?? null,
    template_key: p.templateKey ?? null,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }
}

export function rowToAppraisal(r: Record<string, unknown>): FormalAppraisal {
  return {
    id: asString(r.id),
    subjectUserId: asString(r.subject_user_id),
    reviewerId: asString(r.reviewer_id),
    periodLabel: asString(r.period_label),
    cadence: asString(r.cadence) as FormalAppraisal['cadence'],
    status: asString(r.status) as FormalAppraisal['status'],
    scores: {
      outputScore: Number(r.output_score ?? 0),
      softSkillsScore: Number(r.soft_skills_score ?? 0),
    },
    overallScore: Number(r.overall_score ?? 0),
    band: asString(r.band) as FormalAppraisal['band'],
    outputNotes: asIso(r.output_notes),
    softSkillsNotes: asIso(r.soft_skills_notes),
    evidenceLinks: Array.isArray(r.evidence_links)
      ? (r.evidence_links as FormalAppraisal['evidenceLinks'])
      : [],
    onActivePip: Boolean(r.on_active_pip),
    createdAt: asString(r.created_at),
    updatedAt: asString(r.updated_at),
    finalizedAt: asIso(r.finalized_at),
  }
}

export function appraisalToRow(a: FormalAppraisal): Record<string, unknown> {
  return {
    id: a.id,
    subject_user_id: a.subjectUserId,
    reviewer_id: a.reviewerId,
    period_label: a.periodLabel,
    cadence: a.cadence,
    status: a.status,
    output_score: a.scores.outputScore,
    soft_skills_score: a.scores.softSkillsScore,
    overall_score: a.overallScore,
    band: a.band,
    output_notes: a.outputNotes ?? null,
    soft_skills_notes: a.softSkillsNotes ?? null,
    evidence_links: a.evidenceLinks,
    on_active_pip: a.onActivePip,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
    finalized_at: a.finalizedAt ?? null,
  }
}

export function rowToHrAudit(r: Record<string, unknown>): HrAuditEntry {
  return {
    id: asString(r.id),
    actorId: asString(r.actor_id),
    entityType: asString(r.entity_type) as HrAuditEntry['entityType'],
    entityId: asString(r.entity_id),
    action: asString(r.action),
    summary: asString(r.summary),
    createdAt: asString(r.created_at),
  }
}

export function hrAuditToRow(e: HrAuditEntry): Record<string, unknown> {
  return {
    id: e.id,
    actor_id: e.actorId,
    entity_type: e.entityType,
    entity_id: e.entityId,
    action: e.action,
    summary: e.summary,
    created_at: e.createdAt,
  }
}

export function rowToOffboarding(r: Record<string, unknown>): OffboardingChecklist {
  return {
    id: asString(r.id),
    userId: asString(r.user_id),
    reason: asString(r.reason),
    lastDay: asIso(r.last_day)?.slice(0, 10),
    volunteerBridgeNotice: Boolean(r.volunteer_bridge_notice),
    items: Array.isArray(r.items) ? (r.items as OffboardingChecklist['items']) : [],
    status: asString(r.status, 'open') as OffboardingChecklist['status'],
    createdById: asString(r.created_by_id),
    createdAt: asString(r.created_at),
    updatedAt: asString(r.updated_at),
  }
}

export function offboardingToRow(c: OffboardingChecklist): Record<string, unknown> {
  return {
    id: c.id,
    user_id: c.userId,
    reason: c.reason,
    last_day: c.lastDay || null,
    volunteer_bridge_notice: c.volunteerBridgeNotice,
    items: c.items,
    status: c.status,
    created_by_id: c.createdById,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  }
}

function mapRows<T>(rows: unknown[] | null, fn: (r: Record<string, unknown>) => T): T[] {
  return (rows ?? []).map((r) => fn(r as Record<string, unknown>))
}

export async function fetchPeopleOpsDataset(client: SupabaseClient): Promise<PeopleOpsDataset | null> {
  const [profiles, cases, pips, appraisals, audit, offboarding] = await Promise.all([
    client.from('portal_employee_profiles').select('*').order('updated_at', { ascending: false }),
    client.from('portal_discipline_cases').select('*').order('updated_at', { ascending: false }),
    client.from('portal_pips').select('*').order('updated_at', { ascending: false }),
    client.from('portal_appraisals').select('*').order('updated_at', { ascending: false }),
    client.from('portal_hr_audit_log').select('*').order('created_at', { ascending: false }).limit(200),
    client.from('portal_offboarding_checklists').select('*').order('updated_at', { ascending: false }),
  ])

  const firstErr =
    profiles.error || cases.error || pips.error || appraisals.error || audit.error || offboarding.error
  if (firstErr) {
    console.warn('[hr] people ops fetch:', firstErr.message)
    return null
  }

  return {
    employeeProfiles: mapRows(profiles.data, rowToEmployeeProfile),
    disciplineCases: mapRows(cases.data, rowToDisciplineCase),
    performanceImprovementPlans: mapRows(pips.data, rowToPip),
    formalAppraisals: mapRows(appraisals.data, rowToAppraisal),
    hrAuditLog: mapRows(audit.data, rowToHrAudit),
    offboardingChecklists: mapRows(offboarding.data, rowToOffboarding),
  }
}

export async function upsertPeopleOpsRow(
  client: SupabaseClient,
  table: string,
  row: Record<string, unknown>,
): Promise<{ error: { message: string } | null }> {
  const { error } = await client.from(table).upsert(row)
  return { error }
}

export function isPeopleOpsDatasetEmpty(d: PeopleOpsDataset): boolean {
  return (
    d.employeeProfiles.length === 0 &&
    d.disciplineCases.length === 0 &&
    d.performanceImprovementPlans.length === 0 &&
    d.formalAppraisals.length === 0 &&
    d.hrAuditLog.length === 0 &&
    d.offboardingChecklists.length === 0
  )
}

export async function seedPeopleOpsDataset(
  client: SupabaseClient,
  data: PeopleOpsDataset,
): Promise<{ error: { message: string } | null }> {
  for (const p of data.employeeProfiles) {
    const { error } = await upsertPeopleOpsRow(client, 'portal_employee_profiles', employeeProfileToRow(p))
    if (error) return { error }
  }
  for (const c of data.disciplineCases) {
    const { error } = await upsertPeopleOpsRow(client, 'portal_discipline_cases', {
      ...disciplineCaseToRow(c),
      pip_id: null,
    })
    if (error) return { error }
  }
  for (const p of data.performanceImprovementPlans) {
    const { error } = await upsertPeopleOpsRow(client, 'portal_pips', pipToRow(p))
    if (error) return { error }
  }
  for (const c of data.disciplineCases) {
    if (!c.pipId) continue
    const { error } = await upsertPeopleOpsRow(client, 'portal_discipline_cases', disciplineCaseToRow(c))
    if (error) return { error }
  }
  for (const a of data.formalAppraisals) {
    const { error } = await upsertPeopleOpsRow(client, 'portal_appraisals', appraisalToRow(a))
    if (error) return { error }
  }
  for (const e of data.hrAuditLog) {
    const { error } = await upsertPeopleOpsRow(client, 'portal_hr_audit_log', hrAuditToRow(e))
    if (error) return { error }
  }
  for (const o of data.offboardingChecklists) {
    const { error } = await upsertPeopleOpsRow(client, 'portal_offboarding_checklists', offboardingToRow(o))
    if (error) return { error }
  }
  return { error: null }
}

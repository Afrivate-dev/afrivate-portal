import type {
  AppraisalBand,
  AppraisalScores,
  DisciplineEmployeeLevel,
  DisciplineSeverity,
  EmployeePersonalFields,
  EmployeeProfile,
  PipTemplate,
} from '@/types/hr'

export function computeAppraisalOverall(scores: AppraisalScores): number {
  return Math.round(scores.outputScore * 0.6 + scores.softSkillsScore * 0.4)
}

export function appraisalBandFromOverall(overall: number): AppraisalBand {
  if (overall >= 70) return 'exceptional'
  if (overall >= 60) return 'good'
  if (overall >= 50) return 'concern'
  if (overall >= 40) return 'disciplinary'
  return 'termination_risk'
}

export function appraisalBandLabel(band: AppraisalBand): string {
  switch (band) {
    case 'exceptional':
      return 'Exceptional (≥70%)'
    case 'good':
      return 'Good (60–69%)'
    case 'concern':
      return 'Performance concern (50–59%) — coaching'
    case 'disciplinary':
      return 'Disciplinary / corrective (40–49%)'
    case 'termination_risk':
      return 'Termination consideration (<40%)'
  }
}

const PERSONAL_KEYS: (keyof EmployeePersonalFields)[] = [
  'preferredName',
  'legalName',
  'personalEmail',
  'phone',
  'workLocation',
  'addressCountry',
  'pronouns',
  'linkedinUrl',
  'bio',
  'skills',
  'emergencyContact',
  'nextOfKinNotes',
]

export function computeProfileCompleteness(profile: Partial<EmployeeProfile>): number {
  let filled = 0
  let total = PERSONAL_KEYS.length + 5
  for (const key of PERSONAL_KEYS) {
    const v = profile[key]
    if (key === 'skills' && Array.isArray(v) && v.length > 0) filled += 1
    else if (key === 'emergencyContact' && v && typeof v === 'object') {
      const ec = v as EmployeeProfile['emergencyContact']
      if (ec?.name && ec?.phone) filled += 1
    } else if (typeof v === 'string' && v.trim()) filled += 1
  }
  if (profile.engagementType) filled += 1
  if (profile.employmentStatus) filled += 1
  if (profile.startDate) filled += 1
  if (profile.contractTermsSummary?.trim()) filled += 1
  if (profile.payrollSetupComplete) filled += 1
  return Math.round((filled / total) * 100)
}

export function defaultPipDurationDays(
  severity: DisciplineSeverity,
  level: DisciplineEmployeeLevel,
): number {
  if (severity === 'critical') return 90
  if (severity === 'high' || level === 'team_lead') return 60
  if (severity === 'medium') return 45
  return 30
}

export const DEFAULT_PIP_TEMPLATES: PipTemplate[] = [
  {
    id: 'tpl_staff_performance',
    key: 'staff_performance',
    label: 'Staff — Performance',
    employeeLevel: 'staff',
    category: 'performance',
    defaultDurationDays: 30,
    defaultDeliveryMode: 'meeting',
    goalTemplates: [
      {
        description: 'Meet agreed weekly KPIs consistently',
        successMetric: '≥80% of weekly KPIs marked complete for 4 consecutive weeks',
      },
      {
        description: 'Keep Portal tasks and weekly check-ins accurate and on time',
        successMetric: 'Zero missed check-in submissions; tasks updated within SLA',
      },
    ],
    reviewCadenceDays: [7, 14, 21, 30],
  },
  {
    id: 'tpl_staff_attendance',
    key: 'staff_attendance',
    label: 'Staff — Attendance / leave pattern',
    employeeLevel: 'staff',
    category: 'attendance',
    defaultDurationDays: 45,
    defaultDeliveryMode: 'written_letter',
    goalTemplates: [
      {
        description: 'Comply with leave notice and handover requirements',
        successMetric: 'All leave requests use Portal with ≥3 official work days notice (non-emergency)',
      },
      {
        description: 'Reduce avoidable impromptu absences',
        successMetric: 'No more than one unplanned absence without valid emergency documentation',
      },
    ],
    reviewCadenceDays: [14, 28, 45],
  },
  {
    id: 'tpl_staff_conduct',
    key: 'staff_conduct',
    label: 'Staff — Conduct / communication',
    employeeLevel: 'staff',
    category: 'conduct',
    defaultDurationDays: 45,
    defaultDeliveryMode: 'meeting',
    goalTemplates: [
      {
        description: 'Communicate professionally via Slack within the 4-hour rule',
        successMetric: 'Manager confirms timely, respectful responses on sampled threads',
      },
      {
        description: 'Escalate blockers early instead of silent delay',
        successMetric: 'Blockers logged in Portal within 1 work day of discovery',
      },
    ],
    reviewCadenceDays: [14, 30, 45],
  },
  {
    id: 'tpl_lead_performance',
    key: 'lead_performance',
    label: 'Team Lead — Operational delivery',
    employeeLevel: 'team_lead',
    category: 'performance',
    defaultDurationDays: 60,
    defaultDeliveryMode: 'meeting',
    goalTemplates: [
      {
        description: 'Improve team delivery consistency and KPI completion',
        successMetric: 'Team on-time task rate ≥85% over the PIP window',
      },
      {
        description: 'Escalate critical risks within one hour per SWP',
        successMetric: 'No late critical escalations; evidence in Portal/Slack trail',
      },
    ],
    reviewCadenceDays: [14, 28, 42, 60],
  },
  {
    id: 'tpl_volunteer_reliability',
    key: 'volunteer_reliability',
    label: 'Volunteer — Reliability & KPIs',
    employeeLevel: 'volunteer',
    category: 'performance',
    defaultDurationDays: 30,
    defaultDeliveryMode: 'portal_notice',
    goalTemplates: [
      {
        description: 'Meet agreed volunteer KPIs and Portal recording duties',
        successMetric: 'Agreed KPIs completed; Portal records kept current',
      },
    ],
    reviewCadenceDays: [10, 20, 30],
  },
]

export const DISCIPLINE_STEP_LABELS: Record<string, string> = {
  coaching_verbal: 'Coaching / verbal warning',
  written_warning: 'Written warning',
  pip: 'Performance Improvement Plan',
  restricted_duties: 'Restricted responsibilities',
  termination_case: 'Termination case',
}

export const DISCIPLINE_TRIGGER_LABELS: Record<string, string> = {
  missed_deadlines: 'Missed deadlines',
  inaccurate_reporting: 'Inaccurate reporting',
  poor_communication: 'Poor communication',
  unauthorised_absence: 'Unauthorised absence',
  misconduct: 'Misconduct',
  underperformance: 'Repeated underperformance',
  security: 'Security violation',
  systems_non_use: 'Failure to use approved systems',
  leave_pattern: 'Leave / attendance pattern',
}

export function emptyEmployeeProfile(userId: string): Omit<EmployeeProfile, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    userId,
    engagementType: 'employee',
    employmentStatus: 'active',
    payrollSetupComplete: false,
    hrRequestsUpdate: false,
    archived: false,
    profileCompleteness: 0,
  }
}

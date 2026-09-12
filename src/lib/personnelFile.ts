import type { User } from '@/types'
import type {
  EducationRecord,
  EmployeePersonalFields,
  EmployeeProfile,
  LanguageRecord,
  PersonnelQuestionnaire,
  ReferenceRecord,
  StaffEmploymentType,
  WorkExperienceRecord,
} from '@/types/hr'
import { uid } from '@/utils/helpers'

export function emptyPersonnelQuestionnaire(): PersonnelQuestionnaire {
  return {
    education: [],
    workExperience: [],
    references: [],
    languages: [],
  }
}

export function parsePersonnelQuestionnaire(raw: unknown): PersonnelQuestionnaire {
  const empty = emptyPersonnelQuestionnaire()
  if (!raw || typeof raw !== 'object') return empty
  const q = raw as Record<string, unknown>
  const str = (k: string) => (typeof q[k] === 'string' && q[k] ? String(q[k]) : undefined)
  const bool = (k: string) => (typeof q[k] === 'boolean' ? q[k] : undefined)
  return {
    gender: str('gender'),
    maritalStatus: str('maritalStatus'),
    nationality: str('nationality'),
    residentialAddress: str('residentialAddress'),
    altPhone: str('altPhone'),
    staffEmploymentType: parseStaffType(q.staffEmploymentType),
    statedJobTitle: str('statedJobTitle'),
    statedDepartment: str('statedDepartment'),
    statedManagerName: str('statedManagerName'),
    bankName: str('bankName'),
    bankAccountNumber: str('bankAccountNumber'),
    bankAccountHolder: str('bankAccountHolder'),
    paymentMethod: str('paymentMethod'),
    highestEducation: str('highestEducation'),
    professionalCertifications: str('professionalCertifications'),
    education: parseEducation(q.education),
    workExperience: parseExperience(q.workExperience),
    references: parseReferences(q.references),
    languages: parseLanguages(q.languages),
    softwareTools: str('softwareTools'),
    specialization: str('specialization'),
    signedContract: bool('signedContract'),
    receivedHandbook: bool('receivedHandbook'),
    completedOnboardingTraining: bool('completedOnboardingTraining'),
    acknowledgementName: str('acknowledgementName'),
    acknowledgementSignedAt: str('acknowledgementSignedAt'),
  }
}

function parseStaffType(v: unknown): StaffEmploymentType | undefined {
  if (v === 'full_time' || v === 'part_time' || v === 'contract' || v === 'intern') return v
  return undefined
}

function asRecordArray(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
}

function parseEducation(v: unknown): EducationRecord[] {
  return asRecordArray(v).map((r) => ({
    id: String(r.id || `edu_${uid()}`),
    institution: String(r.institution ?? ''),
    qualification: String(r.qualification ?? ''),
    level: r.level ? String(r.level) : undefined,
    yearCompleted: r.yearCompleted ? String(r.yearCompleted) : undefined,
  }))
}

function parseExperience(v: unknown): WorkExperienceRecord[] {
  return asRecordArray(v).map((r) => ({
    id: String(r.id || `wx_${uid()}`),
    employer: String(r.employer ?? ''),
    jobTitle: String(r.jobTitle ?? ''),
    startDate: r.startDate ? String(r.startDate) : undefined,
    endDate: r.endDate ? String(r.endDate) : undefined,
    reasonForLeaving: r.reasonForLeaving ? String(r.reasonForLeaving) : undefined,
  }))
}

function parseReferences(v: unknown): ReferenceRecord[] {
  return asRecordArray(v).map((r) => ({
    id: String(r.id || `ref_${uid()}`),
    name: String(r.name ?? ''),
    relationship: String(r.relationship ?? ''),
    contact: String(r.contact ?? ''),
  }))
}

function parseLanguages(v: unknown): LanguageRecord[] {
  return asRecordArray(v).map((r) => ({
    id: String(r.id || `lang_${uid()}`),
    language: String(r.language ?? ''),
    proficiency: String(r.proficiency ?? ''),
  }))
}

export function newEducationRow(): EducationRecord {
  return { id: `edu_${uid()}`, institution: '', qualification: '' }
}

export function newExperienceRow(): WorkExperienceRecord {
  return { id: `wx_${uid()}`, employer: '', jobTitle: '' }
}

export function newReferenceRow(): ReferenceRecord {
  return { id: `ref_${uid()}`, name: '', relationship: '', contact: '' }
}

export function newLanguageRow(): LanguageRecord {
  return { id: `lang_${uid()}`, language: '', proficiency: '' }
}

function filled(v: unknown): boolean {
  if (typeof v === 'boolean') return true
  if (Array.isArray(v)) return v.some((item) => (typeof item === 'object' && item ? Object.values(item).some(filled) : Boolean(item)))
  return typeof v === 'string' && v.trim().length > 0
}

export function computeQuestionnaireCompleteness(profile: Partial<EmployeeProfile>): number {
  const q = profile.questionnaire ?? emptyPersonnelQuestionnaire()
  const checks: boolean[] = [
    filled(profile.legalName),
    filled(profile.dateOfBirth),
    filled(profile.phone),
    filled(profile.personalEmail),
    filled(profile.emergencyContact?.name) && filled(profile.emergencyContact?.phone),
    filled(q.nationality),
    filled(q.residentialAddress),
    filled(profile.startDate),
    filled(q.staffEmploymentType) || filled(q.statedJobTitle),
    filled(q.bankName) && filled(q.bankAccountNumber),
    filled(q.highestEducation) || q.education.some((e) => filled(e.institution)),
    filled(profile.skills) && (profile.skills?.length ?? 0) > 0,
    Boolean(q.signedContract),
    Boolean(q.receivedHandbook),
  ]
  const done = checks.filter(Boolean).length
  return Math.round((done / checks.length) * 100)
}

export const STAFF_EMPLOYMENT_TYPE_LABEL: Record<StaffEmploymentType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  intern: 'Intern',
}

function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value)
  return `"${s.replace(/"/g, '""')}"`
}

function joinRecords(rows: Array<{ [key: string]: unknown } | object>, keys: string[]): string {
  return rows
    .map((r) => {
      const rec = r as Record<string, unknown>
      return keys
        .map((k) => String(rec[k] ?? '').trim())
        .filter(Boolean)
        .join(' | ')
    })
    .filter(Boolean)
    .join(' ; ')
}

export const PERSONNEL_EXPORT_HEADERS = [
  'Preferred name',
  'Legal name',
  'Work email',
  'Date of birth',
  'Gender',
  'Marital status',
  'Nationality',
  'Pronouns',
  'Residential address',
  'Country',
  'Personal phone',
  'Alternative phone',
  'Personal email',
  'LinkedIn',
  'Emergency contact name',
  'Emergency relationship',
  'Emergency phone',
  'Emergency address',
  'Next of kin notes',
  'Job title (stated)',
  'Job title (portal)',
  'Department (stated)',
  'Department (portal)',
  'Reporting manager (stated)',
  'Reporting manager (portal)',
  'Date of hire',
  'Employment type',
  'Engagement type',
  'Employment status',
  'Work location',
  'Probation end',
  'Bank name',
  'Account number',
  'Account holder',
  'Payment method',
  'Highest education',
  'Professional certifications',
  'Education history',
  'Work experience',
  'References',
  'Skills',
  'Languages',
  'Software / tools',
  'Specialization',
  'Bio',
  'Signed contract',
  'Received handbook',
  'Completed onboarding training',
  'Acknowledgement name',
  'Acknowledgement signed at',
  'Questionnaire completeness %',
] as const

export function personnelExportRow(
  profile: EmployeeProfile,
  person: User | undefined,
  managerName?: string,
): string[] {
  const q = profile.questionnaire ?? emptyPersonnelQuestionnaire()
  const yesNo = (v?: boolean) => (v == null ? '' : v ? 'Yes' : 'No')
  return [
    profile.preferredName ?? '',
    profile.legalName || person?.name || '',
    person?.email ?? '',
    profile.dateOfBirth ?? '',
    q.gender ?? '',
    q.maritalStatus ?? '',
    q.nationality ?? '',
    profile.pronouns ?? '',
    q.residentialAddress ?? '',
    profile.addressCountry ?? '',
    profile.phone ?? '',
    q.altPhone ?? '',
    profile.personalEmail ?? '',
    profile.linkedinUrl ?? '',
    profile.emergencyContact?.name ?? '',
    profile.emergencyContact?.relationship ?? '',
    profile.emergencyContact?.phone ?? '',
    profile.emergencyContact?.address ?? '',
    profile.nextOfKinNotes ?? '',
    q.statedJobTitle ?? '',
    person?.jobTitle ?? '',
    q.statedDepartment ?? '',
    person?.department ?? '',
    q.statedManagerName ?? '',
    managerName ?? '',
    profile.startDate ?? '',
    q.staffEmploymentType ? STAFF_EMPLOYMENT_TYPE_LABEL[q.staffEmploymentType] : '',
    profile.engagementType,
    profile.employmentStatus,
    profile.workLocation ?? '',
    profile.probationEndDate ?? '',
    q.bankName ?? '',
    q.bankAccountNumber ?? '',
    q.bankAccountHolder ?? '',
    q.paymentMethod ?? '',
    q.highestEducation ?? '',
    q.professionalCertifications ?? '',
    joinRecords(q.education, ['level', 'institution', 'qualification', 'yearCompleted']),
    joinRecords(q.workExperience, ['employer', 'jobTitle', 'startDate', 'endDate', 'reasonForLeaving']),
    joinRecords(q.references, ['name', 'relationship', 'contact']),
    (profile.skills ?? []).join('; '),
    joinRecords(q.languages, ['language', 'proficiency']),
    q.softwareTools ?? '',
    q.specialization ?? '',
    profile.bio ?? '',
    yesNo(q.signedContract),
    yesNo(q.receivedHandbook),
    yesNo(q.completedOnboardingTraining),
    q.acknowledgementName ?? '',
    q.acknowledgementSignedAt ?? '',
    String(profile.profileCompleteness ?? 0),
  ]
}

export function buildPersonnelCsv(
  rows: Array<{ profile: EmployeeProfile; user?: User; managerName?: string }>,
): string {
  const header = PERSONNEL_EXPORT_HEADERS.map(csvCell).join(',')
  const body = rows.map(({ profile, user, managerName }) =>
    personnelExportRow(profile, user, managerName).map(csvCell).join(','),
  )
  return [header, ...body].join('\n')
}

export function downloadPersonnelCsv(csv: string, filename: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function personalFieldsFromProfile(profile: EmployeeProfile): EmployeePersonalFields {
  return {
    preferredName: profile.preferredName,
    legalName: profile.legalName,
    personalEmail: profile.personalEmail,
    phone: profile.phone,
    workLocation: profile.workLocation,
    addressCountry: profile.addressCountry,
    dateOfBirth: profile.dateOfBirth,
    pronouns: profile.pronouns,
    linkedinUrl: profile.linkedinUrl,
    bio: profile.bio,
    skills: profile.skills,
    emergencyContact: profile.emergencyContact,
    nextOfKinNotes: profile.nextOfKinNotes,
    questionnaire: profile.questionnaire ?? emptyPersonnelQuestionnaire(),
    startDate: profile.startDate,
    probationEndDate: profile.probationEndDate,
  }
}

export function personnelCsvFilename(label: string): string {
  const date = new Date().toISOString().slice(0, 10)
  const slug =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'export'
  return `Afrivate-personnel-${slug}-${date}.csv`
}

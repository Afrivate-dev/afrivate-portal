import type { EmployeeProfile } from '@/types/hr'
import { emptyPersonnelQuestionnaire, STAFF_EMPLOYMENT_TYPE_LABEL } from '@/lib/personnelFile'

function dash(v?: string) {
  return v && v.trim() ? v : '—'
}

function yesNo(v?: boolean) {
  return v == null ? '—' : v ? 'Yes' : 'No'
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="break-words text-sm text-fg">{value}</dd>
    </div>
  )
}

/** Read-only My info questionnaire as stored on the employee file. */
export function PersonnelQuestionnaireReadout({ profile }: { profile: EmployeeProfile }) {
  const q = profile.questionnaire ?? emptyPersonnelQuestionnaire()
  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface-2/40 p-3 text-sm">
      <div>
        <p className="font-medium text-fg">Personnel questionnaire (My info)</p>
        <p className="text-xs text-muted">
          Saved by the person on People → My info. Export CSV or PDF for the full file. Completeness{' '}
          {profile.profileCompleteness}%.
        </p>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Row label="Legal name" value={dash(profile.legalName)} />
        <Row label="Preferred name" value={dash(profile.preferredName)} />
        <Row label="Date of birth" value={dash(profile.dateOfBirth)} />
        <Row label="Gender" value={dash(q.gender)} />
        <Row label="Marital status" value={dash(q.maritalStatus)} />
        <Row label="Nationality" value={dash(q.nationality)} />
        <Row label="Phone" value={dash(profile.phone)} />
        <Row label="Alternative phone" value={dash(q.altPhone)} />
        <Row label="Personal email" value={dash(profile.personalEmail)} />
        <Row label="Residential address" value={dash(q.residentialAddress)} />
        <Row label="Country" value={dash(profile.addressCountry)} />
        <Row label="LinkedIn" value={dash(profile.linkedinUrl)} />
        <Row label="Emergency contact" value={dash(profile.emergencyContact?.name)} />
        <Row
          label="Emergency relationship"
          value={dash(profile.emergencyContact?.relationship)}
        />
        <Row label="Emergency phone" value={dash(profile.emergencyContact?.phone)} />
        <Row label="Emergency address" value={dash(profile.emergencyContact?.address)} />
        <Row label="Next of kin notes" value={dash(profile.nextOfKinNotes)} />
        <Row label="Job title (stated)" value={dash(q.statedJobTitle)} />
        <Row label="Department (stated)" value={dash(q.statedDepartment)} />
        <Row label="Reporting manager (stated)" value={dash(q.statedManagerName)} />
        <Row
          label="Employment type"
          value={q.staffEmploymentType ? STAFF_EMPLOYMENT_TYPE_LABEL[q.staffEmploymentType] : '—'}
        />
        <Row label="Work location" value={dash(profile.workLocation)} />
        <Row label="Bank name" value={dash(q.bankName)} />
        <Row label="Account number" value={dash(q.bankAccountNumber)} />
        <Row label="Account holder" value={dash(q.bankAccountHolder)} />
        <Row label="Payment method" value={dash(q.paymentMethod)} />
        <Row label="Highest education" value={dash(q.highestEducation)} />
        <Row label="Certifications" value={dash(q.professionalCertifications)} />
        <Row
          label="Education history"
          value={
            q.education
              .map((e) => [e.institution, e.qualification, e.yearCompleted].filter(Boolean).join(' · '))
              .filter(Boolean)
              .join('; ') || '—'
          }
        />
        <Row
          label="Work experience"
          value={
            q.workExperience
              .map((e) => [e.employer, e.jobTitle].filter(Boolean).join(' · '))
              .filter(Boolean)
              .join('; ') || '—'
          }
        />
        <Row
          label="References"
          value={
            q.references
              .map((e) => [e.name, e.contact].filter(Boolean).join(' · '))
              .filter(Boolean)
              .join('; ') || '—'
          }
        />
        <Row label="Skills" value={(profile.skills ?? []).join(', ') || '—'} />
        <Row
          label="Languages"
          value={
            q.languages
              .map((e) => [e.language, e.proficiency].filter(Boolean).join(' · '))
              .filter(Boolean)
              .join('; ') || '—'
          }
        />
        <Row label="Software / tools" value={dash(q.softwareTools)} />
        <Row label="Specialization" value={dash(q.specialization)} />
        <Row label="Signed contract" value={yesNo(q.signedContract)} />
        <Row label="Received handbook" value={yesNo(q.receivedHandbook)} />
        <Row label="Onboarding training" value={yesNo(q.completedOnboardingTraining)} />
        <Row label="Signature" value={dash(q.acknowledgementName)} />
        <Row label="Signed at" value={dash(q.acknowledgementSignedAt)} />
      </dl>
      {profile.bio ? <p className="text-sm text-fg">Bio: {profile.bio}</p> : null}
    </div>
  )
}

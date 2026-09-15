import { Link } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import type { User } from '@/types'
import type {
  EmployeeEmergencyContact,
  EmployeePersonalFields,
  PersonnelQuestionnaire,
  StaffEmploymentType,
} from '@/types/hr'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import {
  emptyPersonnelQuestionnaire,
  newEducationRow,
  newExperienceRow,
  newLanguageRow,
  newReferenceRow,
  STAFF_EMPLOYMENT_TYPE_LABEL,
} from '@/lib/personnelFile'

const GENDER_OPTIONS = [
  { value: '', label: 'Select…' },
  { value: 'Female', label: 'Female' },
  { value: 'Male', label: 'Male' },
  { value: 'Non-binary', label: 'Non-binary' },
  { value: 'Prefer not to say', label: 'Prefer not to say' },
  { value: 'Other', label: 'Other' },
]

const MARITAL_OPTIONS = [
  { value: '', label: 'Select…' },
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married' },
  { value: 'Divorced', label: 'Divorced' },
  { value: 'Widowed', label: 'Widowed' },
  { value: 'Prefer not to say', label: 'Prefer not to say' },
]

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: '', label: 'Select…' },
  ...(Object.entries(STAFF_EMPLOYMENT_TYPE_LABEL) as [StaffEmploymentType, string][]).map(
    ([value, label]) => ({ value, label }),
  ),
]

const EDUCATION_LEVEL_OPTIONS = [
  { value: '', label: 'Select…' },
  { value: 'Secondary', label: 'Secondary' },
  { value: 'Diploma', label: 'Diploma / National diploma' },
  { value: "Bachelor's", label: "Bachelor's" },
  { value: "Master's", label: "Master's" },
  { value: 'Doctorate', label: 'Doctorate' },
  { value: 'Professional qualification', label: 'Professional qualification' },
  { value: 'Other', label: 'Other' },
]

const PAYMENT_OPTIONS = [
  { value: '', label: 'Select…' },
  { value: 'Bank transfer', label: 'Bank transfer' },
  { value: 'Mobile money', label: 'Mobile money' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Other', label: 'Other' },
]

const PROFICIENCY_OPTIONS = [
  { value: '', label: 'Select…' },
  { value: 'Native', label: 'Native' },
  { value: 'Fluent', label: 'Fluent' },
  { value: 'Intermediate', label: 'Intermediate' },
  { value: 'Basic', label: 'Basic' },
]

const YES_NO_OPTIONS = [
  { value: '', label: 'Select…' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

type Props = {
  user: User
  managerName?: string
  draft: EmployeePersonalFields
  skillsText: string
  completeness: number
  hrRequestsUpdate?: boolean
  onChangeDraft: (next: EmployeePersonalFields | ((prev: EmployeePersonalFields) => EmployeePersonalFields)) => void
  onChangeSkillsText: (value: string) => void
  onSave: () => void
}

export function PersonnelQuestionnaireForm({
  user,
  managerName,
  draft,
  skillsText,
  completeness,
  hrRequestsUpdate,
  onChangeDraft,
  onChangeSkillsText,
  onSave,
}: Props) {
  const q = draft.questionnaire ?? emptyPersonnelQuestionnaire()

  const setQ = (patch: Partial<PersonnelQuestionnaire>) => {
    onChangeDraft((d) => ({
      ...d,
      questionnaire: { ...(d.questionnaire ?? emptyPersonnelQuestionnaire()), ...patch },
    }))
  }

  const setField = <K extends keyof EmployeePersonalFields>(key: K, value: EmployeePersonalFields[K]) => {
    onChangeDraft((d) => ({ ...d, [key]: value }))
  }

  const setEmergency = (patch: Partial<EmployeeEmergencyContact>) => {
    onChangeDraft((d) => ({
      ...d,
      emergencyContact: {
        name: d.emergencyContact?.name ?? '',
        phone: d.emergencyContact?.phone ?? '',
        relationship: d.emergencyContact?.relationship ?? '',
        address: d.emergencyContact?.address,
        ...patch,
      },
    }))
  }

  return (
    <div className="space-y-6 pb-32">
      {hrRequestsUpdate ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          People & Culture has asked you to review and update this questionnaire.
        </div>
      ) : null}

      <nav
        aria-label="Questionnaire sections"
        className="av-scroll-x sticky top-16 z-10 -mx-1 bg-bg/95 py-1.5 backdrop-blur-md"
      >
        <div className="flex w-max gap-1.5 px-1">
          {(
            [
              ['my-info-personal', '1. Personal'],
              ['my-info-contact', '2. Contact'],
              ['my-info-emergency', '3. Emergency'],
              ['my-info-employment', '4. Employment'],
              ['my-info-banking', '5. Banking'],
              ['my-info-education', '6. Education'],
              ['my-info-experience', '7. Experience'],
              ['my-info-skills', '8. Skills'],
              ['my-info-compliance', '9. Compliance'],
            ] as const
          ).map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="inline-flex min-h-[36px] shrink-0 items-center rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg ring-focus"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      <Card id="my-info-personal" className="space-y-4 scroll-mt-24">
        <SectionHead n={1} title="Personal information" />
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface-2/60 p-3">
          <Avatar name={user.name} src={user.avatarUrl} size="lg" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg">Photograph</p>
            <p className="text-xs text-muted">
              Add or update your photo on your directory profile. It is not uploaded on this form.
            </p>
            <Link
              to="/people/directory?profile=1"
              className="mt-1 inline-flex text-sm font-medium text-accent hover:underline"
            >
              Open directory profile
            </Link>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Full legal name"
            required
            value={draft.legalName ?? ''}
            onChange={(e) => setField('legalName', e.target.value)}
          />
          <Input
            label="Preferred name (if different)"
            value={draft.preferredName ?? ''}
            onChange={(e) => setField('preferredName', e.target.value)}
          />
          <Input
            label="Date of birth"
            type="date"
            required
            hint="Required. Used for the team birthday calendar."
            value={draft.dateOfBirth ?? ''}
            onChange={(e) => setField('dateOfBirth', e.target.value)}
          />
          <Select
            label="Gender (optional)"
            options={GENDER_OPTIONS}
            value={q.gender ?? ''}
            onChange={(e) => setQ({ gender: e.target.value || undefined })}
          />
          <Select
            label="Marital status"
            options={MARITAL_OPTIONS}
            value={q.maritalStatus ?? ''}
            onChange={(e) => setQ({ maritalStatus: e.target.value || undefined })}
          />
          <Input
            label="Nationality"
            value={q.nationality ?? ''}
            onChange={(e) => setQ({ nationality: e.target.value })}
          />
          <Input
            label="Pronouns (optional)"
            value={draft.pronouns ?? ''}
            onChange={(e) => setField('pronouns', e.target.value)}
          />
        </div>
      </Card>

      <Card id="my-info-contact" className="space-y-4 scroll-mt-20">
        <SectionHead n={2} title="Contact details" />
        <Textarea
          label="Residential address"
          rows={2}
          value={q.residentialAddress ?? ''}
          onChange={(e) => setQ({ residentialAddress: e.target.value })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Personal phone number"
            required
            value={draft.phone ?? ''}
            onChange={(e) => setField('phone', e.target.value)}
          />
          <Input
            label="Alternative contact number"
            value={q.altPhone ?? ''}
            onChange={(e) => setQ({ altPhone: e.target.value })}
          />
          <Input
            label="Personal email address"
            type="email"
            value={draft.personalEmail ?? ''}
            onChange={(e) => setField('personalEmail', e.target.value)}
          />
          <Input
            label="Country"
            value={draft.addressCountry ?? ''}
            onChange={(e) => setField('addressCountry', e.target.value)}
          />
          <div className="sm:col-span-2">
            <Input
              label="LinkedIn URL"
              value={draft.linkedinUrl ?? ''}
              onChange={(e) => setField('linkedinUrl', e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-muted">Work email on file: {user.email}</p>
      </Card>

      <Card id="my-info-emergency" className="space-y-4 scroll-mt-20">
        <SectionHead n={3} title="Emergency contact" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Full name of emergency contact"
            required
            value={draft.emergencyContact?.name ?? ''}
            onChange={(e) => setEmergency({ name: e.target.value })}
          />
          <Input
            label="Relationship to employee"
            value={draft.emergencyContact?.relationship ?? ''}
            onChange={(e) => setEmergency({ relationship: e.target.value })}
          />
          <Input
            label="Phone number"
            required
            value={draft.emergencyContact?.phone ?? ''}
            onChange={(e) => setEmergency({ phone: e.target.value })}
          />
          <Input
            label="Address (optional)"
            value={draft.emergencyContact?.address ?? ''}
            onChange={(e) => setEmergency({ address: e.target.value })}
          />
        </div>
        <Textarea
          label="Next of kin notes (optional)"
          rows={2}
          value={draft.nextOfKinNotes ?? ''}
          onChange={(e) => setField('nextOfKinNotes', e.target.value)}
        />
      </Card>

      <Card id="my-info-employment" className="space-y-4 scroll-mt-20">
        <SectionHead n={4} title="Employment details" />
        <div className="rounded-lg border border-border bg-surface-2/60 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">On file in Portal</p>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            <Hint label="Job title" value={user.jobTitle} />
            <Hint label="Department" value={user.department} />
            <Hint label="Reporting manager" value={managerName || '—'} />
            <Hint label="Work email" value={user.email} />
          </dl>
          <p className="mt-2 text-xs text-muted">
            These come from People & Culture. Confirm or correct them below if they are wrong — that does
            not change your Portal role until HR updates the directory.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Job title / position"
            value={q.statedJobTitle ?? ''}
            onChange={(e) => setQ({ statedJobTitle: e.target.value })}
          />
          <Input
            label="Department / unit"
            value={q.statedDepartment ?? ''}
            onChange={(e) => setQ({ statedDepartment: e.target.value })}
          />
          <Input
            label="Date of hire"
            type="date"
            hint="Used for work anniversary and new-hire check-ins."
            value={draft.startDate ?? ''}
            onChange={(e) => setField('startDate', e.target.value)}
          />
          <Select
            label="Employment type"
            options={EMPLOYMENT_TYPE_OPTIONS}
            value={q.staffEmploymentType ?? ''}
            onChange={(e) =>
              setQ({
                staffEmploymentType: (e.target.value || undefined) as StaffEmploymentType | undefined,
              })
            }
          />
          <Input
            label="Reporting manager"
            value={q.statedManagerName ?? ''}
            onChange={(e) => setQ({ statedManagerName: e.target.value })}
          />
          <Input
            label="Work location (office / remote / hybrid)"
            value={draft.workLocation ?? ''}
            onChange={(e) => setField('workLocation', e.target.value)}
          />
          <Input
            label="Probation period end date"
            type="date"
            value={draft.probationEndDate ?? ''}
            onChange={(e) => setField('probationEndDate', e.target.value)}
          />
        </div>
      </Card>

      <Card id="my-info-banking" className="space-y-4 scroll-mt-20">
        <SectionHead n={5} title="Compensation & banking" />
        <p className="text-xs text-muted">
          Visible to you and to HR/Admin only. Used for payroll — not shown on the staff directory.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Bank name" value={q.bankName ?? ''} onChange={(e) => setQ({ bankName: e.target.value })} />
          <Input
            label="Account number"
            autoComplete="off"
            value={q.bankAccountNumber ?? ''}
            onChange={(e) => setQ({ bankAccountNumber: e.target.value })}
          />
          <Input
            label="Account holder name (if different)"
            value={q.bankAccountHolder ?? ''}
            onChange={(e) => setQ({ bankAccountHolder: e.target.value })}
          />
          <Select
            label="Preferred payment method"
            options={PAYMENT_OPTIONS}
            value={q.paymentMethod ?? ''}
            onChange={(e) => setQ({ paymentMethod: e.target.value || undefined })}
          />
        </div>
      </Card>

      <Card id="my-info-education" className="space-y-4 scroll-mt-20">
        <SectionHead n={6} title="Education & qualifications" />
        <Select
          label="Highest level of education completed"
          options={EDUCATION_LEVEL_OPTIONS}
          value={q.highestEducation ?? ''}
          onChange={(e) => setQ({ highestEducation: e.target.value || undefined })}
        />
        <ListHead
          title="Institutions and qualifications"
          onAdd={() => setQ({ education: [...q.education, newEducationRow()] })}
        />
        {q.education.length === 0 ? (
          <p className="text-sm text-muted">Add each school or programme.</p>
        ) : (
          <ul className="space-y-3">
            {q.education.map((row) => (
              <li key={row.id} className="rounded-lg border border-border p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Institution"
                    value={row.institution}
                    onChange={(e) =>
                      setQ({
                        education: q.education.map((r) =>
                          r.id === row.id ? { ...r, institution: e.target.value } : r,
                        ),
                      })
                    }
                  />
                  <Input
                    label="Degree / certification"
                    value={row.qualification}
                    onChange={(e) =>
                      setQ({
                        education: q.education.map((r) =>
                          r.id === row.id ? { ...r, qualification: e.target.value } : r,
                        ),
                      })
                    }
                  />
                  <Select
                    label="Level"
                    options={EDUCATION_LEVEL_OPTIONS}
                    value={row.level ?? ''}
                    onChange={(e) =>
                      setQ({
                        education: q.education.map((r) =>
                          r.id === row.id ? { ...r, level: e.target.value || undefined } : r,
                        ),
                      })
                    }
                  />
                  <Input
                    label="Year of completion"
                    value={row.yearCompleted ?? ''}
                    onChange={(e) =>
                      setQ({
                        education: q.education.map((r) =>
                          r.id === row.id ? { ...r, yearCompleted: e.target.value } : r,
                        ),
                      })
                    }
                  />
                </div>
                <RemoveRow onClick={() => setQ({ education: q.education.filter((r) => r.id !== row.id) })} />
              </li>
            ))}
          </ul>
        )}
        <Textarea
          label="Professional certifications (if any)"
          rows={2}
          value={q.professionalCertifications ?? ''}
          onChange={(e) => setQ({ professionalCertifications: e.target.value })}
        />
      </Card>

      <Card id="my-info-experience" className="space-y-4 scroll-mt-20">
        <SectionHead n={7} title="Work experience" />
        <ListHead
          title="Previous employers"
          onAdd={() => setQ({ workExperience: [...q.workExperience, newExperienceRow()] })}
        />
        {q.workExperience.length === 0 ? (
          <p className="text-sm text-muted">Add prior roles if you have them.</p>
        ) : (
          <ul className="space-y-3">
            {q.workExperience.map((row) => (
              <li key={row.id} className="rounded-lg border border-border p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Employer"
                    value={row.employer}
                    onChange={(e) =>
                      setQ({
                        workExperience: q.workExperience.map((r) =>
                          r.id === row.id ? { ...r, employer: e.target.value } : r,
                        ),
                      })
                    }
                  />
                  <Input
                    label="Job title"
                    value={row.jobTitle}
                    onChange={(e) =>
                      setQ({
                        workExperience: q.workExperience.map((r) =>
                          r.id === row.id ? { ...r, jobTitle: e.target.value } : r,
                        ),
                      })
                    }
                  />
                  <Input
                    label="Start date"
                    type="date"
                    value={row.startDate ?? ''}
                    onChange={(e) =>
                      setQ({
                        workExperience: q.workExperience.map((r) =>
                          r.id === row.id ? { ...r, startDate: e.target.value } : r,
                        ),
                      })
                    }
                  />
                  <Input
                    label="End date"
                    type="date"
                    value={row.endDate ?? ''}
                    onChange={(e) =>
                      setQ({
                        workExperience: q.workExperience.map((r) =>
                          r.id === row.id ? { ...r, endDate: e.target.value } : r,
                        ),
                      })
                    }
                  />
                  <div className="sm:col-span-2">
                    <Textarea
                      label="Reason for leaving (optional)"
                      rows={2}
                      value={row.reasonForLeaving ?? ''}
                      onChange={(e) =>
                        setQ({
                          workExperience: q.workExperience.map((r) =>
                            r.id === row.id ? { ...r, reasonForLeaving: e.target.value } : r,
                          ),
                        })
                      }
                    />
                  </div>
                </div>
                <RemoveRow
                  onClick={() => setQ({ workExperience: q.workExperience.filter((r) => r.id !== row.id) })}
                />
              </li>
            ))}
          </ul>
        )}
        <ListHead
          title="References"
          onAdd={() => setQ({ references: [...q.references, newReferenceRow()] })}
        />
        {q.references.length === 0 ? (
          <p className="text-sm text-muted">Add name, relationship, and contact for each referee.</p>
        ) : (
          <ul className="space-y-3">
            {q.references.map((row) => (
              <li key={row.id} className="rounded-lg border border-border p-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input
                    label="Name"
                    value={row.name}
                    onChange={(e) =>
                      setQ({
                        references: q.references.map((r) =>
                          r.id === row.id ? { ...r, name: e.target.value } : r,
                        ),
                      })
                    }
                  />
                  <Input
                    label="Relationship"
                    value={row.relationship}
                    onChange={(e) =>
                      setQ({
                        references: q.references.map((r) =>
                          r.id === row.id ? { ...r, relationship: e.target.value } : r,
                        ),
                      })
                    }
                  />
                  <Input
                    label="Contact"
                    value={row.contact}
                    onChange={(e) =>
                      setQ({
                        references: q.references.map((r) =>
                          r.id === row.id ? { ...r, contact: e.target.value } : r,
                        ),
                      })
                    }
                  />
                </div>
                <RemoveRow onClick={() => setQ({ references: q.references.filter((r) => r.id !== row.id) })} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card id="my-info-skills" className="space-y-4 scroll-mt-20">
        <SectionHead n={8} title="Skills & competencies" />
        <Input
          label="Key technical skills (comma-separated)"
          value={skillsText}
          onChange={(e) => onChangeSkillsText(e.target.value)}
        />
        <ListHead
          title="Languages spoken"
          onAdd={() => setQ({ languages: [...q.languages, newLanguageRow()] })}
        />
        {q.languages.length === 0 ? (
          <p className="text-sm text-muted">Add each language and proficiency.</p>
        ) : (
          <ul className="space-y-3">
            {q.languages.map((row) => (
              <li key={row.id} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <Input
                  label="Language"
                  value={row.language}
                  onChange={(e) =>
                    setQ({
                      languages: q.languages.map((r) =>
                        r.id === row.id ? { ...r, language: e.target.value } : r,
                      ),
                    })
                  }
                />
                <Select
                  label="Proficiency"
                  options={PROFICIENCY_OPTIONS}
                  value={row.proficiency}
                  onChange={(e) =>
                    setQ({
                      languages: q.languages.map((r) =>
                        r.id === row.id ? { ...r, proficiency: e.target.value } : r,
                      ),
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mb-0.5 text-danger"
                  onClick={() => setQ({ languages: q.languages.filter((r) => r.id !== row.id) })}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Textarea
          label="Software / tools proficiency"
          rows={2}
          value={q.softwareTools ?? ''}
          onChange={(e) => setQ({ softwareTools: e.target.value })}
        />
        <Textarea
          label="Areas of specialization"
          rows={2}
          value={q.specialization ?? ''}
          onChange={(e) => setQ({ specialization: e.target.value })}
        />
        <Textarea label="Bio (optional)" rows={3} value={draft.bio ?? ''} onChange={(e) => setField('bio', e.target.value)} />
      </Card>

      <Card id="my-info-compliance" className="space-y-4 scroll-mt-20">
        <SectionHead n={9} title="Compliance & acknowledgements" />
        <div className="grid gap-4 sm:grid-cols-3">
          <YesNo
            label="Signed the employment contract?"
            value={q.signedContract}
            onChange={(v) => setQ({ signedContract: v })}
          />
          <YesNo
            label="Received the employee handbook?"
            value={q.receivedHandbook}
            onChange={(v) => setQ({ receivedHandbook: v })}
          />
          <YesNo
            label="Completed required onboarding training?"
            value={q.completedOnboardingTraining}
            onChange={(v) => setQ({ completedOnboardingTraining: v })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Signature (type your full legal name)"
            value={q.acknowledgementName ?? ''}
            onChange={(e) => setQ({ acknowledgementName: e.target.value })}
          />
          <Input
            label="Signature date"
            type="date"
            value={q.acknowledgementSignedAt ?? ''}
            onChange={(e) => setQ({ acknowledgementSignedAt: e.target.value })}
          />
        </div>
      </Card>

      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 rounded-xl border border-border bg-surface/95 p-3 shadow-elevated backdrop-blur-md lg:bottom-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">Questionnaire completeness: {completeness}%</p>
          <Button type="button" onClick={onSave} className="w-full sm:w-auto">
            Save questionnaire
          </Button>
        </div>
      </div>
    </div>
  )
}

function SectionHead({ n, title }: { n: number; title: string }) {
  return (
    <CardTitle>
      <span className="text-muted">{n}.</span> {title}
    </CardTitle>
  )
}

function Hint({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-medium text-fg">{value || '—'}</dd>
    </div>
  )
}

function ListHead({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-medium text-fg">{title}</p>
      <Button type="button" variant="secondary" size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Add
      </Button>
    </div>
  )
}

function RemoveRow({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="sm" className="mt-2 text-danger" onClick={onClick}>
      <Trash2 className="h-4 w-4" />
      Remove
    </Button>
  )
}

function YesNo({
  label,
  value,
  onChange,
}: {
  label: string
  value?: boolean
  onChange: (v: boolean | undefined) => void
}) {
  return (
    <Select
      label={label}
      options={YES_NO_OPTIONS}
      value={value === true ? 'yes' : value === false ? 'no' : ''}
      onChange={(e) => {
        const v = e.target.value
        onChange(v === 'yes' ? true : v === 'no' ? false : undefined)
      }}
    />
  )
}

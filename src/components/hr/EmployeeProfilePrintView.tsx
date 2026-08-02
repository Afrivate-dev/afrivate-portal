import type { User } from '@/types'
import type {
  DisciplineCase,
  EmployeeProfile,
  FormalAppraisal,
  PerformanceImprovementPlan,
} from '@/types/hr'
import { DISCIPLINE_STEP_LABELS, DISCIPLINE_TRIGGER_LABELS } from '@/lib/hrPeopleOps'

type Props = {
  user: User
  profile: EmployeeProfile
  disciplineCases: DisciplineCase[]
  pips: PerformanceImprovementPlan[]
  appraisals: FormalAppraisal[]
  includeDiscipline: boolean
}

export function EmployeeProfilePrintView({
  user,
  profile,
  disciplineCases,
  pips,
  appraisals,
  includeDiscipline,
}: Props) {
  const displayName = profile.preferredName || profile.legalName || user.name

  return (
    <div className="employee-print-sheet mx-auto max-w-[800px] bg-white p-8 text-[#1f1f1f]">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .employee-print-sheet, .employee-print-sheet * { visibility: visible !important; }
          .employee-print-sheet {
            position: absolute; left: 0; top: 0; width: 100%;
            box-shadow: none !important; margin: 0 !important; padding: 12mm !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="mb-6 flex items-center justify-between border-b-2 border-[#8d4087] pb-4">
        <img src="/afrivate-icon.svg" alt="AfriVate" className="h-10 object-contain" />
        <div className="text-right text-[10px] leading-relaxed text-[#5f5f5f]">
          Official employee record
          <br />
          AfriVate Technologies Ltd · RC: 9210092
        </div>
      </div>
      <h1 className="mb-1 text-center text-lg font-semibold uppercase tracking-wide">{displayName}</h1>
      <p className="mb-6 text-center text-sm text-[#5f5f5f]">
        {user.jobTitle} · {user.department} · {profile.engagementType} · {profile.employmentStatus}
      </p>

      <Section title="Identity & contact">
        <Grid
          rows={[
            ['Legal name', profile.legalName || user.name],
            ['Preferred name', profile.preferredName || '—'],
            ['Work email', user.email],
            ['Personal email', profile.personalEmail || '—'],
            ['Phone', profile.phone || user.phone || '—'],
            ['Location', profile.workLocation || user.workLocation || '—'],
            ['Country', profile.addressCountry || '—'],
            ['Pronouns', profile.pronouns || '—'],
            ['LinkedIn', profile.linkedinUrl || '—'],
          ]}
        />
      </Section>

      <Section title="Emergency contact">
        <Grid
          rows={[
            ['Name', profile.emergencyContact?.name || '—'],
            ['Phone', profile.emergencyContact?.phone || '—'],
            ['Relationship', profile.emergencyContact?.relationship || '—'],
            ['Next of kin notes', profile.nextOfKinNotes || '—'],
          ]}
        />
      </Section>

      <Section title="Employment">
        <Grid
          rows={[
            ['Engagement', profile.engagementType],
            ['Status', profile.employmentStatus],
            ['Start date', profile.startDate || user.joinedAt?.slice(0, 10) || '—'],
            ['Probation end', profile.probationEndDate || '—'],
            ['Confirmation', profile.confirmationDate || '—'],
            ['Payroll setup', profile.payrollSetupComplete ? 'Complete' : 'Pending'],
            ['Contract / terms', profile.contractTermsSummary || '—'],
            ['Skills', (profile.skills ?? []).join(', ') || '—'],
          ]}
        />
      </Section>

      {profile.bio ? (
        <Section title="Bio">
          <p className="text-sm leading-relaxed">{profile.bio}</p>
        </Section>
      ) : null}

      {appraisals.length > 0 ? (
        <Section title="Recent appraisals">
          <ul className="space-y-2 text-sm">
            {appraisals.slice(0, 4).map((a) => (
              <li key={a.id}>
                <strong>{a.periodLabel}</strong> — overall {a.overallScore}% ({a.band}) ·{' '}
                {a.status}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {includeDiscipline ? (
        <Section title="Discipline summary (internal)">
          {disciplineCases.length === 0 ? (
            <p className="text-sm text-[#5f5f5f]">No discipline cases on record.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {disciplineCases.map((c) => (
                <li key={c.id}>
                  <strong>{DISCIPLINE_STEP_LABELS[c.step] ?? c.step}</strong> · {c.status} ·{' '}
                  {c.severity}
                  <br />
                  <span className="text-[#5f5f5f]">
                    {c.triggers.map((t) => DISCIPLINE_TRIGGER_LABELS[t] ?? t).join(', ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {pips.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm">
              {pips.map((p) => (
                <li key={p.id}>
                  PIP {p.startDate} → {p.endDate}
                  {p.outcome ? ` · outcome: ${p.outcome}` : ' · active'}
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
      ) : null}

      <p className="mt-8 text-[10px] text-[#5f5f5f]">
        Generated from the AfriVate Portal employee hub. Slack messages do not replace Portal
        records. Profile completeness: {profile.profileCompleteness}%.
      </p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 border-b border-[#ebdceb] pb-1 text-xs font-semibold uppercase tracking-wider text-[#8d4087]">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Grid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <div className="font-medium text-[#5f5f5f]">{k}</div>
          <div>{v}</div>
        </div>
      ))}
    </div>
  )
}

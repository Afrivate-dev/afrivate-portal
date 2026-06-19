import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { ArrowLeft } from 'lucide-react'

export function PrivacyNoticePage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

        <Card padding="lg" className="space-y-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              AfriVate Technologies Ltd · RC 9210092
            </p>
            <h1 className="mt-2 text-2xl font-bold text-fg">Employee Portal Privacy Notice</h1>
            <p className="mt-2 text-sm text-muted">
              Last updated: June 2026 · In compliance with the Nigeria Data Protection Regulation
              (NDPR) and the Nigeria Data Protection Act (NDPA) 2023.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-fg">1. Who we are</h2>
            <p className="text-sm leading-relaxed text-fg/80">
              AfriVate Technologies Ltd (RC 9210092), registered in Nigeria with offices in Abuja,
              is the data controller for all personal data processed through this employee portal.
              For data protection enquiries, contact{' '}
              <a href="mailto:hr@afrivate.org" className="text-accent hover:underline">
                hr@afrivate.org
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-fg">2. What data we collect</h2>
            <p className="text-sm leading-relaxed text-fg/80">
              Through this portal we collect and process the following categories of employee data:
            </p>
            <ul className="ml-4 list-disc space-y-1 text-sm text-fg/80">
              <li>Identity data — full name, work email address, job title, department, and role</li>
              <li>Employment data — date of joining, leave records (type, dates, reason), and leave balances</li>
              <li>Work activity data — weekly check-in entries, task assignments, and hours logged</li>
              <li>Communication data — inbox notifications, @mentions in tasks, and shout-outs (recognition posts)</li>
              <li>Document access data — records of which onboarding materials have been viewed</li>
              <li>Account security data — sign-in credentials stored securely by our hosting provider</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-fg">3. Why we collect it (legal basis)</h2>
            <p className="text-sm leading-relaxed text-fg/80">
              We process your data on the following legal bases under the NDPR/NDPA:
            </p>
            <ul className="ml-4 list-disc space-y-1 text-sm text-fg/80">
              <li>
                <strong>Contract performance</strong> — managing your employment, leave entitlement, task
                assignments, and team coordination
              </li>
              <li>
                <strong>Legitimate interest</strong> — maintaining operational records, facilitating
                team communication, and improving workplace efficiency
              </li>
              <li>
                <strong>Legal obligation</strong> — retaining employment records as required by Nigerian
                labour law
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-fg">4. Who can see your data</h2>
            <ul className="ml-4 list-disc space-y-1 text-sm text-fg/80">
              <li>Your name, job title, and department are visible to all active portal users</li>
              <li>Your leave requests and weekly check-ins are visible to your team leads and HR</li>
              <li>Task details you create or are assigned to are visible to other team members</li>
              <li>Administrators can view all data within the portal for operational purposes</li>
              <li>
                Data is stored on secure cloud servers. Our hosting provider processes data on our
                behalf under a Data Processing Agreement
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-fg">5. How long we keep it</h2>
            <p className="text-sm leading-relaxed text-fg/80">
              Employee portal data is retained for the duration of your employment and for a period
              of two (2) years after your departure, unless a longer retention period is required by
              Nigerian law. Leave records are retained for six (6) years for payroll audit purposes.
              You may request deletion of non-statutory data at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-fg">6. Your rights</h2>
            <p className="text-sm leading-relaxed text-fg/80">
              Under the NDPA 2023 you have the right to:
            </p>
            <ul className="ml-4 list-disc space-y-1 text-sm text-fg/80">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Request deletion of your data (subject to legal retention obligations)</li>
              <li>Object to processing based on legitimate interest</li>
              <li>Lodge a complaint with the Nigeria Data Protection Commission (NDPC)</li>
            </ul>
            <p className="text-sm leading-relaxed text-fg/80">
              To exercise any of these rights, contact{' '}
              <a href="mailto:hr@afrivate.org" className="text-accent hover:underline">
                hr@afrivate.org
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-fg">7. Security</h2>
            <p className="text-sm leading-relaxed text-fg/80">
              Access to the portal is protected by password authentication and role-based access
              controls. All data in transit is encrypted via TLS. We regularly review access
              permissions and security configurations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-fg">8. Changes to this notice</h2>
            <p className="text-sm leading-relaxed text-fg/80">
              We may update this notice from time to time. Material changes will be communicated
              via the portal announcements. The current version is always available at this page.
            </p>
          </section>

          <div className="border-t border-border pt-4 text-center">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-sm text-accent hover:underline"
            >
              Back
            </button>
          </div>
        </Card>
    </div>
  )
}

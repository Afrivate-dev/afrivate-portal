import { Link } from 'react-router-dom'
import {
  CalendarDays,
  Heart,
  GraduationCap,
  BarChart3,
  TrendingUp,
  Megaphone,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useHr } from '@/context/HrContext'
import { PeopleActionBanners } from '@/components/people/PeopleActionBanners'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { isHR, isLead } from '@/utils/helpers'
import { directReportIds } from '@/utils/hrMetrics'

const quickLinks = [
  { to: '/people/leave', label: 'Time off', icon: CalendarDays, desc: 'Request and track leave' },
  { to: '/people/shout-outs', label: 'Shout-outs', icon: Heart, desc: 'Celebrate great work' },
  { to: '/people/learning', label: 'Learning', icon: GraduationCap, desc: 'Alison courses & submissions' },
  { to: '/people/surveys', label: 'Surveys', icon: BarChart3, desc: 'Pulse & eNPS feedback' },
  { to: '/people/growth', label: 'Growth', icon: TrendingUp, desc: 'OKRs, 1:1s, IDPs & more' },
]

export function PeopleOverviewPage() {
  const { user } = useAuth()
  const { announcements, leaveRequests, users } = useData()
  const {
    getMetrics,
  } = useHr()

  if (!user) return null

  const teamScope = isLead(user) && !isHR(user)
  const metrics = teamScope ? getMetrics({ teamScope: true }) : getMetrics()
  const directReports = teamScope ? directReportIds(users, user.id).size : 0
  const digestMemos = announcements.filter((a) => a.memoCategory === 'digest').slice(0, 3)
  const myLeavePending = leaveRequests.filter((l) => l.userId === user.id && l.status === 'pending').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="People"
        description="Time off, learning, feedback, and culture — all in one place."
      />

      <PeopleActionBanners />

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {quickLinks.map((link) => (
          <Link key={link.to} to={link.to} className="group ring-focus">
            <Card padding="md" hoverable className="h-full">
              <link.icon className="h-5 w-5 text-accent" />
              <p className="mt-2 text-sm font-semibold text-fg group-hover:text-accent">{link.label}</p>
              <p className="mt-0.5 text-xs text-muted">{link.desc}</p>
            </Card>
          </Link>
        ))}
      </div>

      {digestMemos.length > 0 ? (
        <Card padding="md">
          <div className="mb-3 flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-fg">HR digest</h2>
            <Badge tone="brand">Memos</Badge>
          </div>
          <ul className="space-y-2">
            {digestMemos.map((m) => (
              <li key={m.id}>
                <Link to="/announcements" className="text-sm font-medium text-fg hover:text-accent hover:underline">
                  {m.title}
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/announcements" className="mt-3 inline-flex text-xs font-medium text-accent hover:underline">
            View all memos →
          </Link>
        </Card>
      ) : null}

      {(isHR(user) || isLead(user)) && (
        <Card padding="md">
          <h2 className="text-sm font-semibold text-fg">
            {isHR(user) ? 'Team snapshot' : 'My team snapshot'}
          </h2>
          {!isHR(user) ? (
            <p className="mt-1 text-xs text-muted">
              Aggregated pulse and eNPS for your direct reports only. Individual responses stay with HR.
              {directReports === 0
                ? ' Assign reports-to in the directory so team metrics can populate.'
                : null}
            </p>
          ) : null}
          <div className="mt-3 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-md bg-surface-2/50 px-3 py-2">
              <p className="text-xs text-muted">Headcount</p>
              <p className="text-lg font-bold text-fg">{metrics.headcount}</p>
            </div>
            <div className="rounded-md bg-surface-2/50 px-3 py-2">
              <p className="text-xs text-muted">Engagement</p>
              <p className="text-lg font-bold text-fg">{metrics.engagementScore?.toFixed(1) ?? '—'}</p>
            </div>
            <div className="rounded-md bg-surface-2/50 px-3 py-2">
              <p className="text-xs text-muted">eNPS</p>
              <p className="text-lg font-bold text-fg">{metrics.enpsScore ?? '—'}</p>
            </div>
            <div className="rounded-md bg-surface-2/50 px-3 py-2">
              <p className="text-xs text-muted">L&D completion</p>
              <p className="text-lg font-bold text-fg">{metrics.ldCompletionRate != null ? `${metrics.ldCompletionRate}%` : '—'}</p>
            </div>
            <div className="rounded-md bg-surface-2/50 px-3 py-2">
              <p className="text-xs text-muted">Pending leave</p>
              <p className="text-lg font-bold text-fg">{metrics.pendingLeave}</p>
            </div>
          </div>
          {isHR(user) ? (
            <Link to="/admin" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
              Open HR dashboard <ArrowRight className="h-3 w-3" />
            </Link>
          ) : null}
        </Card>
      )}

      {myLeavePending > 0 ? (
        <p className="flex items-center gap-2 text-xs text-muted">
          <AlertCircle className="h-3.5 w-3.5" />
          You have {myLeavePending} leave request{myLeavePending === 1 ? '' : 's'} awaiting review.
        </p>
      ) : null}
    </div>
  )
}

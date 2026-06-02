import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, Users, Megaphone, ListChecks } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Avatar } from '@/components/ui/Avatar'
import { userSeesAnnouncement } from '@/utils/helpers'
import { pages } from '@/content/copy'

const S = pages.search

export function SearchPage() {
  const { user } = useAuth()
  const { users, announcements, tasks } = useData()
  const [params, setParams] = useSearchParams()
  const qRaw = params.get('q') ?? ''
  const setQ = (value: string) => {
    if (value) setParams({ q: value }, { replace: true })
    else setParams({}, { replace: true })
  }

  const q = qRaw.trim().toLowerCase()

  const personHits = useMemo(() => {
    if (!user || !q) return []
    return users.filter((u) => {
      if (!u.active) return false
      const hay = `${u.name} ${u.email} ${u.department} ${u.jobTitle}`.toLowerCase()
      return hay.includes(q)
    })
  }, [users, user, q])

  const announcementHits = useMemo(() => {
    if (!user || !q) return []
    return announcements.filter((a) => {
      if (!userSeesAnnouncement(user, a)) return false
      const hay = `${a.title} ${a.body}`.toLowerCase()
      return hay.includes(q)
    })
  }, [announcements, user, q])

  const taskHits = useMemo(() => {
    if (!user || !q) return []
    return tasks.filter((t) => {
      const visible = t.ownerId === user.id || t.assigneeId === user.id
      if (!visible) return false
      const hay = `${t.title} ${t.description ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [tasks, user, q])

  const totalHits = personHits.length + announcementHits.length + taskHits.length

  if (!user) return null

  return (
    <div className="space-y-6">
      <PageHeader title={S.title} description={S.subtitle} />
      <Card padding="md">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={qRaw}
            onChange={(e) => setQ(e.target.value)}
            placeholder={S.placeholder}
            className="pl-9"
            aria-label={S.placeholder}
          />
        </div>
      </Card>

      {!q ? (
        <p className="text-center text-sm text-muted">{S.hint}</p>
      ) : totalHits === 0 ? (
        <EmptyState icon={SearchIcon} title={S.noResults} description={S.hint} />
      ) : (
        <div className="space-y-8">
          {personHits.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <Users className="h-4 w-4 text-muted" /> {S.people}
                <Badge tone="muted">{personHits.length}</Badge>
              </h2>
              <ul className="space-y-2">
                {personHits.map((p) => (
                  <li key={p.id}>
                    <Link to={`/directory`}>
                      <Card
                        padding="md"
                        className="flex items-center gap-3 transition-colors hover:border-accent/40"
                      >
                        <Avatar name={p.name} src={p.avatarUrl} size="md" />
                        <div className="min-w-0">
                          <p className="font-medium text-fg">{p.name}</p>
                          <p className="truncate text-xs text-muted">
                            {p.jobTitle} · {p.department}
                          </p>
                        </div>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {announcementHits.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <Megaphone className="h-4 w-4 text-muted" /> {S.updates}
                <Badge tone="muted">{announcementHits.length}</Badge>
              </h2>
              <ul className="space-y-2">
                {announcementHits.map((a) => (
                  <li key={a.id}>
                    <Link to="/announcements">
                      <Card padding="md" className="transition-colors hover:border-accent/40">
                        <p className="font-medium text-fg">{a.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted">{a.body}</p>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {taskHits.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <ListChecks className="h-4 w-4 text-muted" /> {S.tasks}
                <Badge tone="muted">{taskHits.length}</Badge>
              </h2>
              <ul className="space-y-2">
                {taskHits.map((t) => (
                  <li key={t.id}>
                    <Link to="/tasks">
                      <Card padding="md" className="transition-colors hover:border-accent/40">
                        <p className="font-medium text-fg">{t.title}</p>
                        {t.description ? (
                          <p className="mt-1 line-clamp-2 text-sm text-muted">{t.description}</p>
                        ) : null}
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}

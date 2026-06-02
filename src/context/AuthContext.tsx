import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { seedUsers } from '@/data/mockData'
import { isSupabaseAuthEnabled } from '@/lib/authMode'
import { supabase } from '@/lib/supabase'
import type { Role, User } from '@/types'

/** Row shape for `public.profiles` (see SUPABASE_SETUP §4.1). */
interface ProfileRow {
  id: string
  email: string | null
  name: string
  role: string
  department: string | null
  job_title: string | null
  avatar_url: string | null
  active: boolean
}

/** Never persist passwords — mock login compares against seed data only. */
function stripPasswordForSession(u: User): User {
  const { password: _drop, ...safe } = u
  void _drop
  return safe as User
}

/** Map Auth session → portal `User` (until `profiles` table is the source of truth). */
function sessionToPortalUser(session: Session | null): User | null {
  if (!session?.user) return null
  const su = session.user
  const md = (su.user_metadata ?? {}) as Record<string, unknown>
  const name =
    typeof md.name === 'string' && md.name.trim()
      ? md.name.trim()
      : (su.email?.split('@')[0] ?? 'User')
  const roleRaw = md.role
  const role: Role =
    roleRaw === 'admin' || roleRaw === 'hr' || roleRaw === 'team_lead' || roleRaw === 'staff'
      ? roleRaw
      : 'staff'
  return {
    id: su.id,
    email: su.email ?? '',
    name,
    role,
    department: typeof md.department === 'string' ? md.department : 'General',
    jobTitle: typeof md.job_title === 'string' ? md.job_title : 'Staff',
    joinedAt:
      typeof md.joined_at === 'string'
        ? md.joined_at
        : new Date().toISOString().slice(0, 10),
    avatarUrl: typeof md.avatar_url === 'string' ? md.avatar_url : undefined,
    avatarColor: typeof md.avatar_color === 'string' ? md.avatar_color : undefined,
    bio: typeof md.bio === 'string' ? md.bio : undefined,
    skills: Array.isArray(md.skills) ? (md.skills as string[]) : undefined,
    phone: typeof md.phone === 'string' ? md.phone : undefined,
    workLocation: typeof md.work_location === 'string' ? md.work_location : undefined,
    pronouns: typeof md.pronouns === 'string' ? md.pronouns : undefined,
    linkedinUrl: typeof md.linkedin_url === 'string' ? md.linkedin_url : undefined,
    reportsToId: typeof md.reports_to_id === 'string' ? md.reports_to_id : undefined,
    active: md.active !== false,
  }
}

function parseRole(raw: string | undefined | null): Role {
  if (raw === 'admin' || raw === 'hr' || raw === 'team_lead' || raw === 'staff') return raw
  return 'staff'
}

/** Prefer `profiles` over JWT user_metadata when a row exists (§8 week 1). */
function mergeProfileWithSessionUser(base: User, row: ProfileRow): User {
  return {
    ...base,
    email: row.email?.trim() || base.email,
    name: row.name?.trim() || base.name,
    role: parseRole(row.role),
    department: row.department?.trim() || base.department,
    jobTitle: row.job_title?.trim() || base.jobTitle,
    avatarUrl: row.avatar_url?.trim() || base.avatarUrl,
    active: row.active,
  }
}

async function loadSupabasePortalUser(
  client: SupabaseClient,
  session: Session | null,
): Promise<User | null> {
  const base = sessionToPortalUser(session)
  if (!base) return null
  const { data: row, error } = await client
    .from('profiles')
    .select('id, email, name, role, department, job_title, avatar_url, active')
    .eq('id', base.id)
    .maybeSingle()
  if (error) {
    console.warn('[auth] profiles read:', error.message)
    return base
  }
  if (row) return mergeProfileWithSessionUser(base, row as ProfileRow)
  return base
}

async function upsertProfileRow(client: SupabaseClient, user: User): Promise<void> {
  const { error } = await client.from('profiles').upsert(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      job_title: user.jobTitle,
      avatar_url: user.avatarUrl ?? null,
      active: user.active,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )
  if (error) console.warn('[auth] profiles upsert:', error.message)
}

function userPatchToSupabaseMetadata(patch: Partial<User>): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  if (patch.name !== undefined) data.name = patch.name
  if (patch.role !== undefined) data.role = patch.role
  if (patch.department !== undefined) data.department = patch.department
  if (patch.jobTitle !== undefined) data.job_title = patch.jobTitle
  if (patch.avatarUrl !== undefined) data.avatar_url = patch.avatarUrl
  if (patch.avatarColor !== undefined) data.avatar_color = patch.avatarColor
  if (patch.bio !== undefined) data.bio = patch.bio
  if (patch.skills !== undefined) data.skills = patch.skills
  if (patch.phone !== undefined) data.phone = patch.phone
  if (patch.workLocation !== undefined) data.work_location = patch.workLocation
  if (patch.pronouns !== undefined) data.pronouns = patch.pronouns
  if (patch.linkedinUrl !== undefined) data.linkedin_url = patch.linkedinUrl
  if (patch.reportsToId !== undefined) data.reports_to_id = patch.reportsToId
  if (patch.active !== undefined) data.active = patch.active
  return data
}

interface AuthContextValue {
  user: User | null
  role: Role | null
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  updateProfile: (patch: Partial<User>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'nf-auth-user'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabaseMode = isSupabaseAuthEnabled()
  const [storedUser, setStoredUser] = useLocalStorage<User | null>(STORAGE_KEY, null)
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null)

  /** Drop legacy mock sessions that stored password in localStorage. */
  useEffect(() => {
    if (supabaseMode) return
    if (storedUser && storedUser.password !== undefined) {
      setStoredUser(stripPasswordForSession(storedUser))
    }
  }, [supabaseMode, storedUser, setStoredUser])

  useEffect(() => {
    if (!supabaseMode || !supabase) return
    const sb = supabase

    void sb.auth.getSession().then(({ data: { session } }) => {
      void loadSupabasePortalUser(sb, session).then(setSupabaseUser)
    })

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      void loadSupabasePortalUser(sb, session).then(setSupabaseUser)
    })
    return () => sub.subscription.unsubscribe()
  }, [supabaseMode])

  const mockUser = useMemo(
    () => (storedUser ? stripPasswordForSession(storedUser) : null),
    [storedUser],
  )
  const user = supabaseMode ? supabaseUser : mockUser

  const setSessionUser = useCallback(
    (next: User | null) => {
      setStoredUser(next ? stripPasswordForSession(next) : null)
    },
    [setStoredUser],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      if (supabaseMode && supabase) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) {
          return { ok: false as const, error: error.message }
        }
        return { ok: true as const }
      }
      const match = seedUsers.find(
        (u) =>
          u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
      )
      if (!match) {
        return { ok: false as const, error: 'Invalid email or password' }
      }
      if (!match.active) {
        return { ok: false as const, error: 'This account is inactive. Contact HR.' }
      }
      setSessionUser(match)
      return { ok: true as const }
    },
    [supabaseMode, setSessionUser],
  )

  const logout = useCallback(() => {
    if (supabaseMode && supabase) {
      void supabase.auth.signOut()
      return
    }
    setStoredUser(null)
  }, [supabaseMode, setStoredUser])

  const updateProfile = useCallback(
    (patch: Partial<User>) => {
      if (supabaseMode && supabase) {
        const client = supabase
        setSupabaseUser((prev) => {
          if (!prev) return prev
          const next = { ...prev, ...patch } as User
          void upsertProfileRow(client, next)
          const data = userPatchToSupabaseMetadata(patch)
          if (Object.keys(data).length > 0) {
            void client.auth.updateUser({ data }).then(({ error }) => {
              if (error) console.warn('[auth] updateUser', error.message)
            })
          }
          return next
        })
        return
      }
      setStoredUser((prev) => {
        if (!prev) return prev
        const merged = { ...prev, ...patch }
        return stripPasswordForSession(merged as User)
      })
    },
    [supabaseMode, setStoredUser],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      login,
      logout,
      updateProfile,
    }),
    [user, login, logout, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

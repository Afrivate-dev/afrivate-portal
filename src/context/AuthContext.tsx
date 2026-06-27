import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { useSessionStorage } from '@/hooks/useSessionStorage'
import { useAutoLogout } from '@/hooks/useAutoLogout'
import { isSupabaseAuthEnabled } from '@/lib/authMode'
import { supabase } from '@/lib/supabase'
import {
  SESSION_USER_STORAGE_KEY,
  clearSessionActivity,
  recordSessionActivity,
} from '@/lib/sessionPolicy'
import { validatePortalPassword } from '@/utils/passwordPolicy'
import type { Role, User } from '@/types'

/** Core profile columns guaranteed by migrations (no optional directory fields). */
const PROFILE_CORE_SELECT = 'id, email, name, role, department, job_title, active' as const

/** Row shape for `public.profiles` (see SUPABASE_SETUP §4.1). */
interface ProfileRow {
  id: string
  email: string | null
  name: string
  role: string
  department: string | null
  job_title: string | null
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
    roleRaw === 'admin' ||
    roleRaw === 'hr' ||
    roleRaw === 'team_lead' ||
    roleRaw === 'assistant_lead' ||
    roleRaw === 'staff'
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
    active: false,
  }
}

function parseRole(raw: string | undefined | null): Role {
  if (raw === 'admin' || raw === 'hr' || raw === 'team_lead' || raw === 'assistant_lead' || raw === 'staff') return raw
  return 'staff'
}

function mergeProfileWithSessionUser(base: User, row: ProfileRow): User {
  return {
    ...base,
    email: row.email?.trim() || base.email,
    name: row.name?.trim() || base.name,
    role: parseRole(row.role),
    department: row.department?.trim() || base.department,
    jobTitle: row.job_title?.trim() || base.jobTitle,
    active: row.active === true,
  }
}

function parseProfileRpcPayload(data: unknown): ProfileRow | null {
  if (data == null || typeof data !== 'object') return null
  const row = data as Record<string, unknown>
  const id = row.id
  if (typeof id !== 'string' && typeof id !== 'number') return null
  return {
    id: String(id),
    email: typeof row.email === 'string' ? row.email : null,
    name: typeof row.name === 'string' ? row.name : 'User',
    role: typeof row.role === 'string' ? row.role : 'staff',
    department: typeof row.department === 'string' ? row.department : null,
    job_title: typeof row.job_title === 'string' ? row.job_title : null,
    active: row.active === true,
  }
}

function isRpcMissing(error: { message: string; code?: string }): boolean {
  return (
    error.message.includes('get_my_portal_profile') ||
    error.message.includes('Could not find the function') ||
    error.code === 'PGRST202'
  )
}

async function loadProfileRowFromTable(
  client: SupabaseClient,
  userId: string,
): Promise<{ row: ProfileRow | null; error?: string }> {
  const { data: row, error } = await client
    .from('profiles')
    .select(PROFILE_CORE_SELECT)
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    // PostgREST: no row for this user is not a hard failure — RPC may have provisioned it.
    if (error.code === 'PGRST116') return { row: null }
    return { row: null, error: error.message }
  }
  return { row: row as ProfileRow | null }
}

async function loadProfileRow(
  client: SupabaseClient,
  userId: string,
): Promise<{ row: ProfileRow | null; error?: string }> {
  const { data: rpcData, error: rpcError } = await client.rpc('get_my_portal_profile')

  if (!rpcError) {
    const row = parseProfileRpcPayload(rpcData)
    if (row) return { row }
  } else if (!isRpcMissing(rpcError)) {
    console.warn('[auth] get_my_portal_profile:', rpcError.message)
  }

  return loadProfileRowFromTable(client, userId)
}

type ProfileLoadResult = {
  user: User | null
  profileLoadFailed: boolean
  profileError: string | null
}

async function loadSupabasePortalUser(
  client: SupabaseClient,
  session: Session | null,
  attempt = 0,
): Promise<ProfileLoadResult> {
  const base = sessionToPortalUser(session)
  if (!base) return { user: null, profileLoadFailed: false, profileError: null }

  const { row, error } = await loadProfileRow(client, base.id)

  if (error) {
    if (attempt < 2) {
      await client.auth.refreshSession()
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)))
      return loadSupabasePortalUser(client, session, attempt + 1)
    }
    console.warn('[auth] profiles read:', error)
    return { user: base, profileLoadFailed: true, profileError: error }
  }

  if (row) {
    return {
      user: mergeProfileWithSessionUser(base, row),
      profileLoadFailed: false,
      profileError: null,
    }
  }

  return { user: base, profileLoadFailed: false, profileError: null }
}

async function upsertProfileRow(client: SupabaseClient, user: User): Promise<void> {
  const { error } = await client.from('profiles').upsert(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      department: user.department,
      job_title: user.jobTitle,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )
  if (error) console.warn('[auth] profiles upsert:', error.message)
}

function userPatchToSupabaseMetadata(patch: Partial<User>): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  if (patch.name !== undefined) data.name = patch.name
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
  return data
}

interface AuthContextValue {
  user: User | null
  role: Role | null
  authReady: boolean
  profileLoadFailed: boolean
  profileError: string | null
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  register: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ ok: boolean; error?: string; needsEmailConfirmation?: boolean }>
  logout: () => void
  updateProfile: (patch: Partial<User>) => void
  reconcileUser: (patch: Partial<User>) => void
  refreshUser: () => Promise<void>
  sendMagicLink: (email: string) => Promise<{ ok: boolean; error?: string }>
  changeEmail: (newEmail: string) => Promise<{ ok: boolean; error?: string }>
  changePassword: (newPassword: string) => Promise<{ ok: boolean; error?: string }>
  sendReauthentication: () => Promise<{ ok: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabaseMode = isSupabaseAuthEnabled()
  const [storedUser, setStoredUser] = useSessionStorage<User | null>(SESSION_USER_STORAGE_KEY, null)
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!supabaseMode)
  const [profileLoadFailed, setProfileLoadFailed] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const applyPortalUser = useCallback((result: ProfileLoadResult) => {
    setSupabaseUser(result.user)
    setProfileLoadFailed(result.profileLoadFailed)
    setProfileError(result.profileError)
  }, [])

  useEffect(() => {
    if (supabaseMode) return
    if (storedUser && storedUser.password !== undefined) {
      setStoredUser(stripPasswordForSession(storedUser))
    }
  }, [supabaseMode, storedUser, setStoredUser])

  useEffect(() => {
    if (!supabaseMode || !supabase) return
    const sb = supabase
    let cancelled = false

    const syncFromSession = (session: Session | null) => {
      void loadSupabasePortalUser(sb, session).then((result) => {
        if (cancelled) return
        applyPortalUser(result)
        if (result.user) recordSessionActivity()
        setAuthReady(true)
      })
    }

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      // Defer to avoid Supabase auth deadlocks when calling back into the client.
      setTimeout(() => syncFromSession(session), 0)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [supabaseMode, applyPortalUser])

  const mockUser = useMemo(
    () => (storedUser ? stripPasswordForSession(storedUser) : null),
    [storedUser],
  )
  const user = supabaseMode ? supabaseUser : mockUser

  const logout = useCallback(() => {
    clearSessionActivity()
    if (supabaseMode && supabase) {
      setSupabaseUser(null)
      setProfileLoadFailed(false)
      setProfileError(null)
      void supabase.auth.signOut()
      return
    }
    setStoredUser(null)
  }, [supabaseMode, setStoredUser])

  useAutoLogout(Boolean(user), logout)

  const refreshUser = useCallback(async () => {
    if (!supabaseMode || !supabase) return
    const client = supabase
    const {
      data: { session },
    } = await client.auth.getSession()
    const result = await loadSupabasePortalUser(client, session)
    applyPortalUser(result)
  }, [supabaseMode, applyPortalUser])

  const login = useCallback(
    async (email: string, password: string) => {
      if (supabaseMode && supabase) {
        const client = supabase
        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) {
          const msg = error.message.toLowerCase().includes('invalid login')
            ? 'Incorrect email or password. New to AfriVate? Use Request access to create an account.'
            : error.message
          return { ok: false as const, error: msg }
        }
        const result = await loadSupabasePortalUser(client, data.session)
        applyPortalUser(result)
        recordSessionActivity()
        return { ok: true as const }
      }
      try {
        const rows = JSON.parse(localStorage.getItem('av-users') ?? '[]') as User[]
        const match = rows.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
        if (!match?.password || match.password !== password) {
          return { ok: false as const, error: 'Incorrect email or password.' }
        }
        if (!match.active) {
          return {
            ok: false as const,
            error: 'Your account is pending approval. Sign in after an administrator activates it.',
          }
        }
        setStoredUser(stripPasswordForSession(match))
        recordSessionActivity()
        return { ok: true as const }
      } catch {
        return { ok: false as const, error: 'Could not sign in. Try again.' }
      }
    },
    [supabaseMode, applyPortalUser, setStoredUser],
  )

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      if (!supabaseMode || !supabase) {
        try {
          const trimmedEmail = email.trim().toLowerCase()
          const trimmedName = name.trim() || trimmedEmail.split('@')[0] || 'User'
          const pwError = validatePortalPassword(password)
          if (pwError) return { ok: false as const, error: pwError }
          const rows = JSON.parse(localStorage.getItem('av-users') ?? '[]') as User[]
          if (rows.some((u) => u.email.toLowerCase() === trimmedEmail)) {
            return { ok: false as const, error: 'An account with this email already exists.' }
          }
          const newUser: User = {
            id: crypto.randomUUID(),
            email: trimmedEmail,
            password,
            name: trimmedName,
            role: 'staff',
            department: 'General',
            jobTitle: 'Staff',
            joinedAt: new Date().toISOString().slice(0, 10),
            active: false,
          }
          localStorage.setItem('av-users', JSON.stringify([...rows, newUser]))
          setStoredUser(stripPasswordForSession(newUser))
          return { ok: true as const }
        } catch {
          return { ok: false as const, error: 'Registration is not available right now.' }
        }
      }
      const trimmedEmail = email.trim().toLowerCase()
      const trimmedName = name.trim() || trimmedEmail.split('@')[0] || 'User'
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { name: trimmedName },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })
      if (error) {
        return { ok: false as const, error: error.message }
      }
      if (data.user && !data.session) {
        return { ok: true as const, needsEmailConfirmation: true }
      }
      if (data.session) {
        const result = await loadSupabasePortalUser(supabase, data.session)
        applyPortalUser(result)
        recordSessionActivity()
      }
      return { ok: true as const }
    },
    [supabaseMode, applyPortalUser, setStoredUser],
  )

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

  const reconcileUser = useCallback(
    (patch: Partial<User>) => {
      if (supabaseMode) {
        setSupabaseUser((prev) => (prev ? ({ ...prev, ...patch } as User) : prev))
        return
      }
      setStoredUser((prev) => {
        if (!prev) return prev
        return stripPasswordForSession({ ...prev, ...patch } as User)
      })
    },
    [supabaseMode, setStoredUser],
  )

  const sendMagicLink = useCallback(
    async (email: string) => {
      if (!supabaseMode || !supabase) {
        return { ok: false as const, error: 'Magic link sign-in requires Supabase auth.' }
      }
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })
      if (error) return { ok: false as const, error: error.message }
      return { ok: true as const }
    },
    [supabaseMode],
  )

  const changeEmail = useCallback(
    async (newEmail: string) => {
      if (!supabaseMode || !supabase) {
        return { ok: false as const, error: 'Email change requires Supabase auth.' }
      }
      const { error } = await supabase.auth.updateUser(
        { email: newEmail.trim().toLowerCase() },
        { emailRedirectTo: `${window.location.origin}/account` },
      )
      if (error) return { ok: false as const, error: error.message }
      return { ok: true as const }
    },
    [supabaseMode],
  )

  const changePassword = useCallback(
    async (newPassword: string) => {
      if (!supabaseMode || !supabase) {
        return { ok: false as const, error: 'Password change requires Supabase auth.' }
      }
      const pwError = validatePortalPassword(newPassword)
      if (pwError) return { ok: false as const, error: pwError }
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) return { ok: false as const, error: error.message }
      return { ok: true as const }
    },
    [supabaseMode],
  )

  const sendReauthentication = useCallback(async () => {
    if (!supabaseMode || !supabase) {
      return { ok: false as const, error: 'Reauthentication requires Supabase auth.' }
    }
    const { error } = await supabase.auth.reauthenticate()
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const }
  }, [supabaseMode])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      authReady,
      profileLoadFailed,
      profileError,
      login,
      register,
      logout,
      updateProfile,
      reconcileUser,
      refreshUser,
      sendMagicLink,
      changeEmail,
      changePassword,
      sendReauthentication,
    }),
    [
      user,
      authReady,
      profileLoadFailed,
      profileError,
      login,
      register,
      logout,
      updateProfile,
      reconcileUser,
      refreshUser,
      sendMagicLink,
      changeEmail,
      changePassword,
      sendReauthentication,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

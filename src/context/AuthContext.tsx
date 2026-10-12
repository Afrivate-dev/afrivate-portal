import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { useSessionStorage } from '@/hooks/useSessionStorage'
import { useAutoLogout } from '@/hooks/useAutoLogout'
import { isSupabaseAuthEnabled } from '@/lib/authMode'
import { supabase } from '@/lib/supabase'
import {
  SESSION_USER_STORAGE_KEY,
  clearSessionActivity,
  isInvalidAuthTokenMessage,
  recordSessionActivity,
  removeSupabaseAuthStorageKeys,
} from '@/lib/sessionPolicy'
import { validatePortalPassword } from '@/utils/passwordPolicy'
import { parseDutyStatus } from '@/lib/dutyStatus'
import type { Role, User } from '@/types'

/** Core profile columns guaranteed by migrations (no optional directory fields). */
const PROFILE_CORE_SELECT = 'id, email, name, role, department, job_title, active, duty_status' as const

/** Row shape for `public.profiles` (see SUPABASE_SETUP §4.1). */
interface ProfileRow {
  id: string
  email: string | null
  name: string
  role: string
  department: string | null
  job_title: string | null
  active: boolean
  duty_status?: string | null
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
    jobTitle: typeof md.job_title === 'string' ? md.job_title.trim() : '',
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
    dutyStatus: 'none',
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
    dutyStatus: parseDutyStatus(row.duty_status),
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
    duty_status: typeof row.duty_status === 'string' ? row.duty_status : 'none',
  }
}

function isRpcMissing(error: { message: string; code?: string }): boolean {
  return (
    error.message.includes('get_my_portal_profile') ||
    error.message.includes('Could not find the function') ||
    error.code === 'PGRST202'
  )
}

/** 8s cap on profile reads — above this the whole app sits on "Checking your session…". */
const PROFILE_LOAD_TIMEOUT_MS = 8_000

async function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  label: string,
): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

async function loadProfileRowFromTable(
  client: SupabaseClient,
  userId: string,
): Promise<{ row: ProfileRow | null; error?: string }> {
  const { data: row, error } = await withTimeout(
    client.from('profiles').select(PROFILE_CORE_SELECT).eq('id', userId).maybeSingle(),
    PROFILE_LOAD_TIMEOUT_MS,
    'profiles select',
  ).catch((e) => ({ data: null, error: { code: 'TIMEOUT', message: e instanceof Error ? e.message : String(e) } }))

  if (error) {
    if (error.code === 'PGRST116') return { row: null }
    const missingDuty =
      error.message.includes('duty_status') || error.code === '42703'
    if (missingDuty) {
      const retry = await client
        .from('profiles')
        .select('id, email, name, role, department, job_title, active')
        .eq('id', userId)
        .maybeSingle()
      if (retry.error) {
        if (retry.error.code === 'PGRST116') return { row: null }
        return { row: null, error: retry.error.message }
      }
      return { row: retry.data as ProfileRow | null }
    }
    return { row: null, error: error.message }
  }
  return { row: row as ProfileRow | null }
}

async function clearLocalSupabaseSession(client: SupabaseClient): Promise<void> {
  try {
    await withTimeout(client.auth.signOut({ scope: 'local' }), 3_000, 'signOut')
  } catch {
    /* local sign-out is best-effort; keys are removed below either way */
  }
  removeSupabaseAuthStorageKeys()
}

async function loadProfileRow(
  client: SupabaseClient,
  userId: string,
): Promise<{ row: ProfileRow | null; error?: string }> {
  const rpcResult = await withTimeout(
    client.rpc('get_my_portal_profile'),
    PROFILE_LOAD_TIMEOUT_MS,
    'get_my_portal_profile',
  ).catch((e) => ({
    data: null,
    error: { code: 'TIMEOUT', message: e instanceof Error ? e.message : String(e) },
  }))

  const { data: rpcData, error: rpcError } = rpcResult as {
    data: unknown
    error: { code?: string; message: string } | null
  }

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
): Promise<ProfileLoadResult> {
  const base = sessionToPortalUser(session)
  if (!base) return { user: null, profileLoadFailed: false, profileError: null }

  let row: ProfileRow | null = null
  let error: string | undefined
  try {
    const loaded = await withTimeout(
      loadProfileRow(client, base.id),
      PROFILE_LOAD_TIMEOUT_MS,
      'profile',
    )
    row = loaded.row
    error = loaded.error
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  if (error) {
    if (isInvalidAuthTokenMessage(error)) {
      await clearLocalSupabaseSession(client)
      return { user: null, profileLoadFailed: false, profileError: null }
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
  /** False until the first profile/role read finishes or times out. */
  profileChecked: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  register: (
    email: string,
    password: string,
    name: string,
    options?: { jobTitle?: string },
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
  const [profileChecked, setProfileChecked] = useState(!supabaseMode)
  const signedInLocally = useRef(false)

  const applyPortalUser = useCallback((result: ProfileLoadResult) => {
    setSupabaseUser((prev) => {
      if (!result.user) return null
      // On profile read failure, session metadata defaults active:false. Keep the last
      // confirmed active/role so a blip does not bounce approved users to pending.
      let next = result.user
      if (result.profileLoadFailed && prev && prev.id === result.user.id) {
        next = {
          ...result.user,
          active: prev.active,
          role: prev.role,
          dutyStatus: prev.dutyStatus,
        }
      }
      // Keep the same object when nothing meaningful changed — avoids remounting the
      // whole portal (data reload) when mobile returns from a file/camera picker.
      if (
        prev &&
        prev.id === next.id &&
        prev.active === next.active &&
        prev.role === next.role &&
        prev.dutyStatus === next.dutyStatus &&
        prev.email === next.email &&
        prev.name === next.name &&
        prev.department === next.department &&
        prev.jobTitle === next.jobTitle
      ) {
        return prev
      }
      return next
    })
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

    const settleProfile = (session: Session | null) => {
      if (!session || cancelled) {
        if (!cancelled) setProfileChecked(true)
        return
      }
      void loadSupabasePortalUser(sb, session)
        .then((result) => {
          if (cancelled) return
          applyPortalUser(result)
          if (result.user) recordSessionActivity()
        })
        .catch((e) => {
          console.warn('[auth] profile load failed:', e)
          if (cancelled) return
          applyPortalUser({
            user: sessionToPortalUser(session),
            profileLoadFailed: true,
            profileError: e instanceof Error ? e.message : String(e),
          })
        })
        .finally(() => {
          if (!cancelled) setProfileChecked(true)
        })
    }

    // Session check is capped at 8s and always clears the "checking session"
    // gate in finally. Profile/role loads in the background so a slow query
    // cannot trap the login form or the portal shell.
    void (async () => {
      let session: Session | null = null
      try {
        const { data, error } = await withTimeout(sb.auth.getSession(), PROFILE_LOAD_TIMEOUT_MS, 'getSession')
        if (cancelled) return
        if (error && isInvalidAuthTokenMessage(error.message)) {
          await clearLocalSupabaseSession(sb)
          session = null
        } else {
          session = data.session ?? null
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        console.warn('[auth] getSession failed:', message)
        if (isInvalidAuthTokenMessage(message)) {
          await clearLocalSupabaseSession(sb)
        }
        session = null
      } finally {
        if (!cancelled && !signedInLocally.current) {
          const base = sessionToPortalUser(session)
          applyPortalUser({
            user: base,
            profileLoadFailed: false,
            profileError: null,
          })
          setAuthReady(true)
          if (base) setProfileChecked(false)
          else setProfileChecked(true)
        } else if (!cancelled) {
          setAuthReady(true)
        }
      }
      if (!cancelled && !signedInLocally.current) settleProfile(session)
    })()

    const readyFallback = window.setTimeout(() => {
      if (cancelled) return
      setAuthReady(true)
    }, PROFILE_LOAD_TIMEOUT_MS)

    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      // Never await Supabase calls inside this callback — that holds the auth
      // lock and stalls "Checking your session…" until the lock times out.
      if (event === 'SIGNED_OUT') {
        setTimeout(() => {
          if (cancelled) return
          signedInLocally.current = false
          setSupabaseUser(null)
          setProfileLoadFailed(false)
          setProfileError(null)
          setProfileChecked(true)
          setAuthReady(true)
        }, 0)
        return
      }
      if (!session) {
        if (event === 'INITIAL_SESSION') {
          setTimeout(() => {
            if (cancelled) return
            setAuthReady(true)
          }, 0)
        }
        return
      }
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        setTimeout(() => {
          if (!cancelled) setAuthReady(true)
        }, 0)
        return
      }
      setTimeout(() => {
        if (cancelled) return
        setAuthReady(true)
        settleProfile(session)
      }, 0)
    })

    return () => {
      cancelled = true
      window.clearTimeout(readyFallback)
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
        let data: { session: Session | null }
        let error: { message: string } | null
        try {
          const signed = await withTimeout(
            client.auth.signInWithPassword({
              email: email.trim(),
              password,
            }),
            PROFILE_LOAD_TIMEOUT_MS,
            'signIn',
          )
          data = signed.data
          error = signed.error
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e)
          if (isInvalidAuthTokenMessage(message)) await clearLocalSupabaseSession(client)
          return {
            ok: false as const,
            error: 'Sign-in is taking too long. Check your connection and try again.',
          }
        }
        if (error) {
          if (isInvalidAuthTokenMessage(error.message)) await clearLocalSupabaseSession(client)
          const msg = error.message.toLowerCase().includes('invalid login')
            ? 'Incorrect email or password. New to AfriVate? Use Request access to create an account.'
            : error.message
          return { ok: false as const, error: msg }
        }
        // Redirect immediately. Role and active flag load in the background.
        signedInLocally.current = true
        const base = sessionToPortalUser(data.session)
        applyPortalUser({ user: base, profileLoadFailed: false, profileError: null })
        setProfileChecked(false)
        setAuthReady(true)
        recordSessionActivity()
        void loadSupabasePortalUser(client, data.session)
          .then((result) => {
            applyPortalUser(result)
            if (result.user) recordSessionActivity()
          })
          .catch((e) => {
            console.warn('[auth] profile load after sign-in:', e)
            applyPortalUser({
              user: base,
              profileLoadFailed: true,
              profileError: e instanceof Error ? e.message : String(e),
            })
          })
          .finally(() => setProfileChecked(true))
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
    async (
      email: string,
      password: string,
      name: string,
      options?: { jobTitle?: string },
    ) => {
      if (!supabaseMode || !supabase) {
        try {
          const trimmedEmail = email.trim().toLowerCase()
          const trimmedName = name.trim() || trimmedEmail.split('@')[0] || 'User'
          const trimmedTitle = options?.jobTitle?.trim().slice(0, 120) || ''
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
            jobTitle: trimmedTitle,
            joinedAt: new Date().toISOString().slice(0, 10),
            active: false,
            dutyStatus: 'none',
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
      const trimmedTitle = options?.jobTitle?.trim().slice(0, 120) || ''
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            name: trimmedName,
            ...(trimmedTitle ? { job_title: trimmedTitle } : {}),
          },
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
        return { ok: false as const, error: 'Magic link sign-in is not available right now.' }
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
        return { ok: false as const, error: 'Email change is not available right now.' }
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
        return { ok: false as const, error: 'Password change is not available right now.' }
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
      return { ok: false as const, error: 'Verification is not available right now.' }
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
      profileChecked,
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
      profileChecked,
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

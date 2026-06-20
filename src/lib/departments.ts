import { isSupabaseAuthEnabled } from '@/lib/authMode'
import { supabase } from '@/lib/supabase'
import type { Department, User } from '@/types'

export type SignupDepartment = { id: string; name: string }

/** Departments for signup / request-access (works before full portal data loads). */
export async function fetchSignupDepartments(): Promise<SignupDepartment[]> {
  if (!isSupabaseAuthEnabled() || !supabase) {
    return readMockDepartments()
  }

  const { data, error } = await supabase.rpc('list_signup_departments')
  if (!error && Array.isArray(data)) {
    return (data as { id: string; name: string }[]).map((d) => ({
      id: String(d.id),
      name: String(d.name),
    }))
  }

  const { data: rows } = await supabase
    .from('portal_departments')
    .select('id, name')
    .order('name')

  return (rows ?? []).map((d) => ({ id: String(d.id), name: String(d.name) }))
}

function readMockDepartments(): SignupDepartment[] {
  try {
    const raw = localStorage.getItem('av-departments')
    if (!raw) return []
    const parsed = JSON.parse(raw) as { id: string; name: string }[]
    return parsed.map((d) => ({ id: d.id, name: d.name }))
  } catch {
    return []
  }
}

/** Merge structured departments with legacy profile strings for filters and audience. */
export function mergedDepartmentNames(structured: Department[], users: User[]): string[] {
  const names = new Set<string>()
  for (const d of structured) {
    if (d.name.trim()) names.add(d.name)
  }
  for (const u of users) {
    const dept = u.department?.trim()
    if (dept && dept !== 'Unassigned') names.add(dept)
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b))
}

export function departmentSelectOptions(
  structured: Department[],
  users: User[],
  includeAll = false,
): { value: string; label: string }[] {
  const names = mergedDepartmentNames(structured, users)
  const opts = names.map((d) => ({ value: d, label: d }))
  return includeAll ? [{ value: 'all', label: 'All departments' }, ...opts] : opts
}

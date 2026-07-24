import { supabase } from '@/lib/supabase'
import { isSupabaseAuthEnabled } from '@/lib/authMode'
import {
  defaultCriteriaForProfile,
  type AtsCriteriaProfile,
  type AtsCriterion,
  type AtsRoleProfile,
} from '@/utils/atsScoring'

const LOCAL_KEY = 'av-ats-criteria'

function readLocal(): Record<string, AtsCriteriaProfile> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}') as Record<string, AtsCriteriaProfile>
  } catch {
    return {}
  }
}

function writeLocal(map: Record<string, AtsCriteriaProfile>) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(map))
}

function rowToProfile(r: Record<string, unknown>): AtsCriteriaProfile {
  return {
    roleProfile: String(r.role_profile) as AtsRoleProfile,
    label: String(r.label ?? r.role_profile),
    strongMin: Number(r.strong_min ?? 75),
    viableMin: Number(r.viable_min ?? 55),
    rejectBelow: Number(r.reject_below ?? 40),
    criteria: Array.isArray(r.criteria) ? (r.criteria as AtsCriterion[]) : [],
    updatedAt: r.updated_at ? String(r.updated_at) : undefined,
  }
}

export async function loadAtsCriteria(profile: AtsRoleProfile): Promise<AtsCriteriaProfile> {
  const fallback = defaultCriteriaForProfile(profile)
  const local = readLocal()[profile]
  if (!isSupabaseAuthEnabled() || !supabase) return local ?? fallback

  const { data, error } = await supabase
    .from('portal_ats_criteria')
    .select('*')
    .eq('role_profile', profile)
    .maybeSingle()

  if (error || !data) {
    // Table may not exist yet — use local/default
    return local ?? fallback
  }

  const loaded = rowToProfile(data as Record<string, unknown>)
  if (!loaded.criteria.length) return local ?? fallback
  return loaded
}

export async function saveAtsCriteria(profile: AtsCriteriaProfile): Promise<{ ok: boolean; error?: string }> {
  const next = { ...profile, updatedAt: new Date().toISOString() }
  const map = readLocal()
  map[profile.roleProfile] = next
  writeLocal(map)

  if (!isSupabaseAuthEnabled() || !supabase) return { ok: true }

  const { error } = await supabase.from('portal_ats_criteria').upsert({
    role_profile: next.roleProfile,
    label: next.label,
    strong_min: next.strongMin,
    viable_min: next.viableMin,
    reject_below: next.rejectBelow,
    criteria: next.criteria,
    updated_at: next.updatedAt,
  })

  if (error) {
    // Still saved locally so HR can keep working before migration
    if (/relation|does not exist|schema cache/i.test(error.message)) {
      return { ok: true }
    }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

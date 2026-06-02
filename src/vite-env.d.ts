/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** POST endpoint (e.g. https://www.afrivate.org/portal-media/upload.php) */
  readonly VITE_MEDIA_UPLOAD_URL?: string
  /** Same-origin JSON from ical-json.php — merges into calendar + list */
  readonly VITE_TEAM_CALENDAR_JSON_URL?: string
  /** Google “Embed calendar” iframe src URL */
  readonly VITE_GOOGLE_CALENDAR_EMBED_URL?: string
  /** Supabase project URL — Realtime presence + live notes */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase publishable/anon key (see dashboard API settings) */
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** When `true`, login uses Supabase email/password instead of mock seed users */
  readonly VITE_USE_SUPABASE_AUTH?: string
  /** When `true`, tasks/announcements/directory data load from Postgres (`portal_*` tables + `profiles`). Requires auth session + migration `20260518120000_portal_data_tables.sql`. */
  readonly VITE_USE_SUPABASE_DATA?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

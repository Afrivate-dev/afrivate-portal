# Supabase setup for the NerdzFactory portal

This guide is for someone **new to Supabase** who wants to **go live** with real auth and data. The portal today uses **mock login** + **localStorage**. Supabase replaces those with hosted **Auth**, **Postgres**, and optional **Realtime**.

---

## 1. What Supabase gives you (simple mental model)

| Piece | What it is | In this portal |
|--------|------------|----------------|
| **Project** | Your cloud “backend app” | One project for production (and one free dev project is fine) |
| **API URL + anon key** | Public config the browser uses | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| **Auth** | Sign-up, login, sessions (JWT) | Replace mock `AuthContext` + `seedUsers` passwords |
| **Database (Postgres)** | Tables for tasks, notes, profiles … | Replace `DataContext` + `CollabContext` localStorage |
| **Row Level Security (RLS)** | Who can read/write which rows | **Required** so users only see their org’s data |
| **Realtime** | Live subscriptions (presence, broadcast) | Replace / harden today’s `CollabContext` channel |

The **anon key is safe in the browser** only if **RLS policies** enforce access. Never put the **service_role** key in the frontend.

---

## 2. Create your Supabase account and project

1. Go to [https://supabase.com](https://supabase.com) → **Start your project** → sign up (GitHub or email).
2. Click **New project**.
3. Choose **Organization** (default is fine).
4. **Name**: e.g. `nerdzfactory-portal`.
5. **Database password**: generate a strong one and **save it** (password manager). You rarely type it; the dashboard uses it internally.
6. **Region**: choose closest to your users (e.g. Europe / US).
7. Wait until the project shows **Healthy**.

### Get the two values the Vite app needs

1. In the Supabase dashboard: **Project Settings** (gear) → **API**.
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Project API keys** → **anon public** → `VITE_SUPABASE_ANON_KEY`

3. In the portal folder, copy `.env.example` to `.env.local` and paste both values:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. Restart `npm run dev` after changing env files.

With only these set, **today’s code** already uses Supabase for **Realtime** (notes broadcast + presence) when the URL and anon key exist. Auth and Postgres are still **not** wired to every screen—that’s the migration work below.

---

## 3. Authentication (replace mock login)

### 3.1 Turn on Email auth (simplest for staff portal)

1. Dashboard: **Authentication** → **Providers**.
2. **Email** → enable **Email** (and optionally **Confirm email** for production).
3. **URL configuration** (Authentication → **URL Configuration**):
   - **Site URL**: your production portal origin, e.g. `https://portal.nerdzfactory.com`
   - **Redirect URLs**: add the same + `http://localhost:5173/**` for local dev.

### 3.2 Wire the portal app to Supabase Auth (exact steps)

The repo supports **two modes**:

| Mode | When |
|------|------|
| **Mock** (default) | `VITE_USE_SUPABASE_AUTH` is unset or not `"true"` — login uses `mockData` seed users. |
| **Supabase** | `VITE_USE_SUPABASE_AUTH=true` **and** `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (publishable key) are set — login calls `supabase.auth.signInWithPassword`. |

**Step 1 — Dashboard (you already did §3.1)**  
Authentication → Providers → **Email** enabled.  
**URL configuration**: Site URL + redirect URLs include `http://localhost:5173/**` and your production origin.

**Step 2 — Create a staff user Supabase can authenticate**

1. Go to **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter **email** and **password** (the same ones you will type on the portal login form).
3. After the user exists, open the user row → edit **User Metadata** (raw JSON). Minimal example:

```json
{
  "name": "Ada Admin",
  "role": "admin",
  "department": "Operations",
  "job_title": "COO"
}
```

Allowed **`role`** values in the app: `staff`, `team_lead`, `hr`, `admin`. Anything else defaults to `staff`.

Optional metadata keys the app maps through: `joined_at`, `avatar_url`, `bio`, `phone`, `work_location`, `pronouns`, `linkedin_url`, `reports_to_id`, `active` (default true).

With a **`profiles`** row for the user (§4), **`AuthContext` loads that row** and it **overrides** metadata for **name / role / department / job title / avatar / active**. If there is no row yet, **user_metadata** still drives those fields until you insert a profile or add a signup trigger.

**Step 3 — Environment file (portal folder)**

Create or edit `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...your_publishable_key...
VITE_USE_SUPABASE_AUTH=true
```

Restart `npm run dev` after saving.

**Step 4 — What the code does (no extra npm package required)**

- `src/lib/supabase.ts` — `createClient` (already in the project).
- `src/lib/authMode.ts` — `isSupabaseAuthEnabled()` reads the env flag + client.
- `src/context/AuthContext.tsx`:
  - On load: `supabase.auth.getSession()` and `onAuthStateChange` keep the session in sync.
  - **Login:** `signInWithPassword({ email, password })`.
  - **Logout:** `signOut()`.
  - **Session → `User`:** `sessionToPortalUser()` maps `user.id` (UUID), `email`, and `user_metadata` into your existing portal `User` shape (no passwords stored locally).
- `src/pages/Login.tsx` — Demo quick-fill buttons are **hidden** when Supabase auth is on; a short hint points here.

**Step 5 — After login**

- **Realtime / notes** use the same Supabase project; presence uses the authenticated user id.
- **Tasks, announcements, etc.** still read **mock `DataContext`** until you migrate those to Postgres — new auth users get **UUID** ids, so old seed data keyed to `u_staff` will not match. Plan: add **`profiles`** and sync or migrate data (§4).

**Optional package:** `@supabase/auth-ui-react` is **not** required; the login form already calls `signInWithPassword`.

### 3.3 Invite-only / no public sign-up (common for internal portals)

1. Authentication → **Providers** → disable public sign-up if the UI allows, **or** keep sign-up off and create users from the dashboard: **Authentication** → **Users** → **Add user**.
2. Optionally use **Magic Link** only (passwordless) for less support burden.

---

## 4. Database: tables that match the portal (migration map)

Today, `DataContext` + `CollabContext` hold roughly:

| Area | Suggested table(s) | Notes |
|------|----------------------|--------|
| Staff profile | `profiles` | `id` = `auth.users.id`, `role`, `department`, `name`, … |
| Tasks | `tasks` | RLS: org or `assignee_id` / `owner_id` |
| Weekly check-ins | `weekly_check_ins` | RLS: `user_id = auth.uid()` |
| Announcements | `announcements` | RLS: read by audience rules |
| Leave | `leave_requests` | RLS: own rows + HR role |
| Documents | `documents` | RLS: department / role |
| Recognition | `recognition_posts` | RLS: workspace members |
| Events | `events` | RLS: read for all staff |
| Workspace notes | `workspace_notes` | RLS: match `share` JSON rules or normalized columns |
| Teams | `workspace_teams` + `workspace_team_members` | For note sharing by team |

You do **not** need all tables on day one. A practical go-live order:

1. **`profiles`** + trigger on signup (see Supabase docs: “Handle new user”).
2. **`workspace_notes`** (if notes are critical) **or** **`tasks`**—pick the feature that matters most.
3. Add the rest incrementally.

### 4.1 Example: `profiles` table (SQL Editor)

Dashboard → **SQL** → **New query**:

```sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text not null,
  role text not null default 'staff',
  department text,
  job_title text,
  avatar_url text,
  active boolean not null default true,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read profiles in their org"
  on public.profiles for select
  using (true); -- tighten later, e.g. same tenant_id

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id);
```

**Tighten policies** before production (e.g. tenant id, HR can update others).

### 4.2 Full portal domain data (`DataContext` → Postgres)

The Vite app can load **all** data that was previously mock/localStorage-only:

- Run **`portal/supabase/migrations/20260518120000_portal_data_tables.sql`** in the SQL Editor (extends `profiles`, adds `portal_tasks`, `portal_announcements`, …, team seed rows).
- In `.env.local`: **`VITE_USE_SUPABASE_DATA=true`** (together with **`VITE_USE_SUPABASE_AUTH=true`** and valid `VITE_SUPABASE_*`).

Staff list = **`profiles`**. Tasks, check-ins, leave, documents, recognition, events, inbox, onboarding videos/checklist/progress use the `portal_*` tables. RLS is **permissive for any logged-in user** on those tables (fine for a small internal org); tighten before wider exposure.

**Still local-first:** workspace **note pages** (`CollabContext`) keep content in the browser + Realtime broadcast until you add a `workspace_notes` table and migrate that context.

---

## 5. Row Level Security (RLS) — fixes only Supabase can fully solve

These **cannot** be solved only in React; the database must enforce them.

| Issue | Why | What to do in Supabase |
|--------|-----|-------------------------|
| Users seeing other companies’ data | Anon key is public | Add `org_id` (or `tenant_id`) to tables; `using (org_id = (select org_id from profiles where id = auth.uid()))` |
| “Admin” route security | SPA checks are cosmetic | Store `role` in `profiles`; RLS policies `using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','hr')))` for elevated operations |
| Note share links | Client-only tokens are guessable / forgeable | Store notes in `workspace_notes`; validate **read** with RLS: `auth.uid()` in allowed list, or signed **one-time** tokens via Edge Function |
| Realtime cross-tenant leak | Shared channel name | Use **private** channels: `supabase.channel('room:' || note_id)` with **RLS** on `realtime.messages` (newer) or authorize channel join in **database** / **Edge Function** |

**Steps (pattern):**

1. Enable RLS on every table: `alter table … enable row level security;`
2. Add `select` / `insert` / `update` / `delete` policies using `auth.uid()`.
3. Test with two test users in **SQL** or Table Editor “View as user” (if available) or two browsers.

---

## 6. Realtime (notes + presence) — production-hardening

Today the app uses a **broadcast** channel when Supabase is configured.

**Improvements in Supabase:**

1. **Authentication**: Only authenticated users subscribe (pass JWT to Realtime).
2. **Private channels**: Name channels per note or per org; use [Realtime authorization](https://supabase.com/docs/guides/realtime/authorization) as your project supports it.
3. **Replace broadcast with Postgres changes** (optional): `postgres_changes` on `workspace_notes` so edits persist from DB and all tabs stay in sync.

**Steps:**

1. Dashboard → **Database** → **Replication** → enable replication for `workspace_notes` if you use `postgres_changes`.
2. In code: subscribe with `filter` on `id=eq.note_id` and RLS so users only get rows they can read.

---

## 7. Going live checklist (minimal)

Do these in order before you point a real domain at the portal.

### 7.1 Supabase (production project)

1. Create a **production** project (keep a separate **dev** project if you like).
2. **Authentication → URL Configuration**  
   - **Site URL**: `https://your-portal-domain.com`  
   - **Redirect URLs**: production URL + any preview URLs + `http://localhost:5173/**` if you still test locally against prod.
3. **Auth → Providers**: Email on; turn off public sign-up if you only invite staff from the dashboard.
4. **Database backups**: Free tier is not a full DR plan; for real production data, use a plan with backups / PITR per Supabase docs.
5. **RLS**: Every table in `public` that the browser can hit must have RLS on and policies you tested (at least **`profiles`** plus any future tables).
6. **API keys**: Copy **Project URL** and **anon / publishable** key into your host’s build env — never the **service_role** key in the frontend.

### 7.2 Hosting (Vite build)

Variables must be available **at build time** (Vite inlines `import.meta.env.VITE_*`):

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | Anon / publishable key |
| `VITE_USE_SUPABASE_AUTH` | `true` in production for real login |

**Example (Vercel):** Project → **Settings → Environment Variables** → add the three for **Production**. Trigger a new deploy after saving.

**Example (Netlify):** Site → **Site configuration → Environment variables** → same.

Restart / redeploy after any change.

### 7.3 App behaviour in production

- **Demo login**: With `VITE_USE_SUPABASE_AUTH=true`, the login page already hides demo quick-fill; keep that for production builds.
- **HTTPS**: Serve the portal only over `https://` so sessions behave as expected.
- **Service role**: Server-only (Edge Functions, scripts, automation). It must **not** appear in the Vite bundle or public env.

### 7.4 Realtime settings (Free tier gotcha)

If the dashboard **refuses to save** Realtime settings (e.g. max payload vs 256 KB), leave defaults for now or ask Supabase support. See earlier notes in this doc: **private-only Realtime** may require a paid tier to edit those sliders. The app can still use Realtime on Free with the defaults.

---

## 8. How this portal ties together (simplest path)

### Done in this repo (Week 1 baseline)

- **Supabase Auth** when `VITE_USE_SUPABASE_AUTH=true`: email/password via `AuthContext` + `signInWithPassword` / `signOut`.
- **`public.profiles`**: After login, **`AuthContext` loads** `select` from `profiles` (if the table exists) and **merges over** JWT `user_metadata` for name, role, department, job title, avatar, active.  
  **`updateProfile`** **upserts** into `profiles` and still updates Auth metadata for fields the DB table does not store (e.g. bio, skills).

You still need a **row per user** in `profiles` (SQL insert or trigger on signup). Without a row, the UI falls back to metadata only.

### Week 2 – One domain (next big migration)

Pick **notes** or **tasks**:

1. Add a Postgres table (e.g. `workspace_notes`) matching the shapes in `src/types` / `CollabContext`.
2. **RLS** policies using `auth.uid()` (and later `org_id` if multi-tenant).
3. Replace `localStorage` reads/writes in `CollabContext` with `supabase.from(...).select` / `upsert` (keep or drop broadcast as needed).

### Week 3+

Repeat the same pattern for announcements, leave, documents, etc.

### Realtime

Broadcast + presence (current) is fine for internal MVP. Move to **`postgres_changes`** when the DB is the source of truth for note bodies and you enable replication for that table (§6).

---

## 9. Helpful Supabase docs (bookmark)

**Core**

- [Getting started](https://supabase.com/docs/guides/getting-started)
- [Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime](https://supabase.com/docs/guides/realtime)
- [Vite + Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)

**Often used with this portal**

- [User management / metadata / profiles](https://supabase.com/docs/guides/auth/managing-user-data)
- [Realtime authorization (private channels)](https://supabase.com/docs/guides/realtime/authorization)
- [Database webhooks & triggers (new user → new profile row)](https://supabase.com/docs/guides/database/webhooks)

---

## 10. Support inside this repo

| What | Where |
|------|--------|
| Env template | `portal/.env.example` |
| Example RLS (profiles + Realtime) | `portal/supabase/rls-section-5-and-6.sql` |
| **Portal domain tables** (tasks, announcements, …) | `portal/supabase/migrations/20260518120000_portal_data_tables.sql` |
| Supabase dataset fetch + mappers | `portal/src/lib/supabase/portalDataset.ts` |
| Supabase vs local **data** switch | `portal/src/lib/dataMode.ts` (`VITE_USE_SUPABASE_DATA`) |
| Supabase client + Realtime client options | `portal/src/lib/supabase.ts` |
| Mock vs Supabase Auth switch | `portal/src/lib/authMode.ts` |
| Login + session + **`profiles` load/upsert** | `portal/src/context/AuthContext.tsx` |
| Notes / presence / broadcast | `portal/src/context/CollabContext.tsx` |
| **Data** (local vs Supabase provider) | `portal/src/context/DataContext.tsx`, `DataContext.local.tsx`, `DataContext.supabase.tsx` |
| Domain types (mirror in SQL when you migrate) | `portal/src/types/index.ts` |
| Mock seeds (local mode / reference) | `portal/src/context/DataContext.local.tsx`, `portal/src/data/mockData.ts` |

For NerdzFactory-specific columns and policies, use `User`, `WorkspaceNote`, `Task`, etc. in `src/types/index.ts` as the contract for new tables and RLS rules.

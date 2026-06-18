# AfriVate Portal — Supabase setup (step by step)

Use this guide if SQL migrations failed partway through or Edge Function deploy returned **403**.

---

## Where you are now

If you already ran some migrations and saw **“policy already exists”** errors, that is normal — those files ran successfully the first time. You do **not** need to re-run files that already succeeded.

**Run only the steps marked REQUIRED below.**

---

## Step 1 — Create / open your Supabase project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Open your project (or create one)
3. Note your **Project URL** and **anon public key**:
   - **Settings → API → Project URL**
   - **Settings → API → anon public** (under Project API keys)

---

## Step 2 — Fill in `.env` (local app)

In the project root, edit `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key...
VITE_USE_SUPABASE_AUTH=true
VITE_USE_SUPABASE_DATA=true
```

Save the file. Restart `npm run dev` after any `.env` change.

---

## Step 3 — Run SQL in the Dashboard (one file at a time)

1. In Supabase: **SQL Editor → New query**
2. Open a migration file from `supabase/migrations/` in your code editor
3. **Copy the entire file** (Ctrl+A, Ctrl+C)
4. Paste into the SQL Editor
5. Click **Run** (or Ctrl+Enter)
6. Confirm you see **Success** before moving to the next file

### Which files to run?

| # | File | Run if… |
|---|------|---------|
| 1 | `20260518120000_portal_data_tables.sql` | Tables don't exist yet. **Skip** if you already ran it (even with inbox policy error at the end — that means 99% succeeded). |
| 2 | `20260602_departments_teams_approvals.sql` | Skip if already succeeded |
| 3 | `20260608_task_multi_assignee.sql` | Skip if already succeeded |
| 4 | `20260608_audit_log.sql` | Safe to re-run (now idempotent). Or skip if audit table exists. |
| 5 | `20260608_rls_tightening.sql` | **Optional — skip this** if you will run step 6. It is superseded by the security hardening file. |
| 6 | **`20260619_security_hardening.sql`** | **REQUIRED** — fixes RLS, adds notes table, profile guards. Run this even if earlier files partially failed. |
| 7 | `rls-section-5-and-6.sql` | **REQUIRED** — Realtime private channel policies |

### Important SQL tips

- Paste and run **the whole file at once** — do not run line-by-line.
- If a file says **“already exists”** on a table or policy, that step already completed — move on.
- After step 6, verify policies:

```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

You should **not** see any policies named `authenticated_all_select` / `authenticated_all_insert` etc.

---

## Step 4 — Realtime setting

1. **Database → Replication** (or **Realtime → Settings** depending on dashboard version)
2. Turn **OFF** “Allow public access to channels” / enable private channels only
3. Ensure `portal_workspace_notes` is enabled for Realtime if you want live note sync (optional)

---

## Step 5 — Deploy Edge Functions

The CLI error `403 … necessary privileges` means your terminal is **not authorized** to deploy to that project. Use **one** of these options:

### Option A — Fix CLI auth (recommended if you own the project)

In Git Bash or PowerShell, from the project root:

```bash
npx supabase login
```

A browser opens — sign in with the **same Supabase account that owns the project**.

Link the project (replace `YOUR_PROJECT_REF` with the ref from your dashboard URL):

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

Enter your **database password** when prompted (Settings → Database).

Deploy both functions:

```bash
npx supabase functions deploy invite-user
npx supabase functions deploy admin-patch-profile
```

Docker warning is OK for deploy — Docker is only needed for local function testing.

### Option B — Deploy via Supabase Dashboard (no CLI)

If CLI still returns 403 (e.g. you are a collaborator without deploy rights):

1. Dashboard → **Edge Functions**
2. **Create a new function** named `invite-user`
3. Replace the editor contents with `supabase/functions/invite-user/index.ts`
4. Deploy
5. Repeat for `admin-patch-profile`

Ask the **project owner** to deploy if you do not see Edge Functions in the dashboard.

### Option C — Owner adds you with deploy access

Project owner: **Settings → Team** → invite your account with **Developer** or **Owner** role.

---

## Step 6 — Set Edge Function secrets

Dashboard → **Edge Functions → Secrets** (or Project Settings → Edge Functions):

| Secret | Value |
|--------|-------|
| `SITE_URL` | `https://portal.afrivate.org` (or your Vercel URL while testing) |
| `ALLOWED_EMAIL_DOMAIN` | `@afrivate.org` |
| `SUPABASE_URL` | Auto-set by Supabase (usually present) |
| `SUPABASE_ANON_KEY` | Auto-set |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-set — never put this in `.env` frontend |

---

## Step 7 — Auth settings

1. **Authentication → URL Configuration**
   - **Site URL:** `https://portal.afrivate.org` (or `http://localhost:5173` for local dev)
   - **Redirect URLs:** add `http://localhost:5173/reset-password` and your production reset URL
2. **Authentication → Providers → Email** — ensure Email provider is enabled

---

## Step 8 — Create your first admin user

After migrations, new sign-ups start as **inactive staff** (approval workflow).

**Option 1 — Invite via Edge Function (after deploy):** use Admin Panel in the app.

**Option 2 — Manual SQL** (run in SQL Editor after you sign up once):

```sql
-- Replace with your auth user UUID from Authentication → Users
update public.profiles
set role = 'admin', active = true, approved_at = now()
where id = 'YOUR-USER-UUID-HERE';
```

---

## Step 9 — Test locally

```bash
npm install
npm run dev
```

1. Open [http://localhost:5173](http://localhost:5173)
2. Sign in (or use invite flow)
3. Confirm dashboard loads data (not stuck on “Loading workspace…”)
4. If inactive, run the admin SQL above, sign out, sign back in

---

## Step 10 — Deploy frontend (Vercel)

1. Push repo to GitHub
2. Import project in Vercel
3. Add the same four `VITE_*` env vars from `.env`
4. Deploy
5. Update Supabase **Site URL** and **Redirect URLs** to match production domain

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `policy already exists` | That migration already ran — skip it or use the updated files (now include `DROP POLICY IF EXISTS`) |
| `syntax error at end` on security hardening | Re-copy the **latest** `20260619_security_hardening.sql` from the repo (plpgsql `IF` blocks were fixed) |
| Edge Function 403 | Use **Option B** (Dashboard deploy) or `supabase login` + `supabase link` |
| “Loading workspace…” forever | Check `.env` keys, confirm `VITE_USE_SUPABASE_DATA=true`, check browser console for RLS errors |
| Login works but no data | Run `20260619_security_hardening.sql`; verify JWT session in Network tab |
| Realtime notes not syncing | Run `rls-section-5-and-6.sql`; disable public Realtime access |

---

## Minimum path (if migrations partially succeeded)

If steps 1–4 already ran with only policy errors:

1. Run **`20260619_security_hardening.sql`** (fixed version)
2. Run **`rls-section-5-and-6.sql`**
3. Deploy Edge Functions (Dashboard or CLI)
4. Set secrets (Step 6)
5. Fill `.env` and test

That is all you need to go live.

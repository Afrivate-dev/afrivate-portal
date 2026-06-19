# Supabase CLI setup (AfriVate Portal)

Use this guide to connect the CLI on your machine to the **Afrivate Portal** project.

---

## Why `supabase link` fails

Your CLI **is logged in**, but it only sees projects your current Supabase account can access.

When we ran `supabase projects list`, the CLI showed:

| Project | Ref | Org |
|---------|-----|-----|
| Afrivate M&E | `djwcndqdxwsnycnclbcf` | Afrivate HR |

Your `.env` points at a **different** project:

| Project | Ref | Org |
|---------|-----|-----|
| Afrivate Portal | `yfgkmzepqnfcajcxjgba` | *(different org — not visible to current CLI login)* |

So `supabase link --project-ref yfgkmzepqnfcajcxjgba` returns *"does not have the necessary privileges"* — not because CLI is broken, but because **this login cannot see that project**.

Common causes:

1. Portal was created under a **different email** (personal vs work).
2. Portal lives in a **different Supabase organization** than Afrivate HR.
3. Stale CLI session — fixed by re-login with a fresh access token.

---

## Step 1 — Confirm which account owns the Portal

1. Open [https://supabase.com/dashboard/project/yfgkmzepqnfcajcxjgba](https://supabase.com/dashboard/project/yfgkmzepqnfcajcxjgba)
2. Check the email in the top-right profile menu — **that** is the account the CLI must use.
3. If you cannot open that URL, the project is under another account. Sign in with that account or transfer the project.

---

## Step 2 — Log out and log in with the correct account

In **Git Bash** or **PowerShell** from the repo root:

```bash
npx supabase logout
npx supabase login
```

A browser window opens — sign in with the **same email** that owns `yfgkmzepqnfcajcxjgba`.

Verify the Portal appears:

```bash
npx supabase projects list
```

You should see **Afrivate Portal** with ref `yfgkmzepqnfcajcxjgba`. If you only see Afrivate M&E, you are still on the wrong account.

### Alternative: access token (recommended for CI / stubborn logins)

1. While logged into the **Portal owner** account: [Dashboard → Account → Access Tokens](https://supabase.com/dashboard/account/tokens)
2. Create a token (e.g. `afrivate-portal-cli`)
3. In Git Bash:

```bash
export SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxx
npx supabase projects list
```

On **PowerShell**:

```powershell
$env:SUPABASE_ACCESS_TOKEN = "sbp_xxxxxxxxxxxxxxxx"
npx supabase projects list
```

---

## Step 3 — Link the project

Get your **database password** from:  
Dashboard → Project **Afrivate Portal** → **Settings → Database → Database password**

Then link (Git Bash):

```bash
cd ~/Desktop/CODE/Afrivate/afrivate-portal
export SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxx   # if using token
export SUPABASE_DB_PASSWORD='your-db-password'
npx supabase link --project-ref yfgkmzepqnfcajcxjgba
```

PowerShell:

```powershell
cd C:\Users\DELL\Desktop\CODE\Afrivate\afrivate-portal
$env:SUPABASE_ACCESS_TOKEN = "sbp_xxxxxxxx"
$env:SUPABASE_DB_PASSWORD = "your-db-password"
npx supabase link --project-ref yfgkmzepqnfcajcxjgba
```

If link fails with pooler/auth errors, try:

```bash
npx supabase link --project-ref yfgkmzepqnfcajcxjgba --skip-pooler
```

Success creates/updates `supabase/.temp/project-ref` and lets you run deploy/db commands.

---

## Step 4 — Deploy Edge Functions

After a successful link:

```bash
npx supabase functions deploy invite-user
npx supabase functions deploy admin-patch-profile
npx supabase functions deploy request-access
```

Set secrets in Dashboard → **Edge Functions → Secrets** (see `SETUP_STEPS.md`).

---

## Step 5 — Push migrations (optional)

If you prefer CLI over SQL Editor:

```bash
npx supabase db push
```

Or run each file in **SQL Editor** if you already applied them manually (safer if partially migrated).

---

## Step 6 — Verify `.env` anon key

Your anon key must come from:  
**Settings → API → anon public** (JWT starting with `eyJ...`).

If it looks like `sb_publishable_...`, replace it with the real **anon** key from the dashboard.

---

## Quick reference

| Command | Purpose |
|---------|---------|
| `npx supabase projects list` | Projects visible to current login |
| `npx supabase link --project-ref yfgkmzepqnfcajcxjgba` | Connect repo to Portal |
| `npx supabase functions deploy <name>` | Deploy Edge Function |
| `npx supabase db push` | Apply migrations from `supabase/migrations/` |
| `npx supabase migration list` | See applied vs local migrations |

---

## Two projects — which one for the portal app?

| Project | Ref | Use for |
|---------|-----|---------|
| **Afrivate Portal** | `yfgkmzepqnfcajcxjgba` | Employee portal (`portal.afrivate.org`) — **this repo** |
| Afrivate M&E | `djwcndqdxwsnycnclbcf` | Separate M&E app — do not link this repo to it unless intentional |

If Portal should use the M&E database instead, update `.env` to `djwcndqdxwsnycnclbcf` and link that ref — but that is a product decision, not a CLI fix.

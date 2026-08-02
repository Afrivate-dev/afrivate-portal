# AVA Setup Guide — Google AI Studio → Supabase → Portal

**Audience:** First-time Google AI Studio users  
**Goal:** Get AfriVate Virtual Assistant (AVA) answering with Gemini in Team Space  
**Time:** about 15–25 minutes

---

## What you will end up with

| Piece | Where it lives |
|-------|----------------|
| Gemini API key | Created in Google AI Studio (you copy it once) |
| Same key as a secret | Supabase Edge Functions secrets (`GEMINI_API_KEY`) |
| AVA backend | Supabase function `ava-chat` |
| AVA button in the app | Portal FAB labelled **AVA** |

**Important security rule:** Never put the Gemini key in `.env` as `VITE_…`, never commit it to Git, and never paste it into frontend code. Only Supabase function secrets.

---

## Part A — Create your Gemini API key (Google AI Studio)

### A1. Open Google AI Studio

1. Open: [https://aistudio.google.com/](https://aistudio.google.com/)
2. Sign in with the Google account you want AfriVate to use for AVA  
   (a work Gmail / Google Workspace account is fine; a personal Gmail also works for getting started).
3. Accept any Terms of Service / Get Started prompts if shown.

### A2. Open the API keys page

1. In the left sidebar, click **Get API key**  
   (direct link: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)).
2. If Google asks you to create or choose a **Google Cloud project**, that is normal — AI Studio uses a Cloud project behind the scenes.
   - **New to this:** choose **Create API key in new project** (or accept the default project).
   - **You already have a Cloud project:** you can import/select that project, then create the key there.

### A3. Create the key

1. Click **Create API key**.
2. Confirm the project when prompted.
3. When the key appears, **copy it immediately** and store it somewhere safe temporarily (password manager recommended).
4. The key usually looks like a long string starting with `AIza…`.

### A4. Optional but recommended — verify the key works

1. Still in AI Studio, open a chat / playground if available and send a short prompt like:  
   `Say hello in one sentence.`
2. If that works, your Google account and project can call Gemini models.

You do **not** need to enable billing to start on the free tier. Free tier has rate limits; if AVA later says it is “busy”, wait and retry, or switch to a lighter model (see Part E).

---

## Part B — Add the key to Supabase (so the portal can use it)

AVA calls Gemini from a **Supabase Edge Function**, not from the browser.

### B1. Open your AfriVate Supabase project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Open the project that powers `portal.afrivate.org`

### B2. Set Edge Function secrets

Exact menu labels can vary slightly; use one of these paths:

**Option 1 (common):**  
**Project Settings → Edge Functions → Secrets** (or **Manage secrets**)

**Option 2:**  
**Edge Functions** in the left nav → **Secrets** / **Configuration**

Add these secrets:

| Name | Value | Required? |
|------|--------|-----------|
| `GEMINI_API_KEY` | paste your AI Studio key | **Yes** |
| `GEMINI_MODEL` | `gemini-3.6-flash` | Recommended |
| `SITE_URL` | `https://portal.afrivate.org` | **Yes** for production CORS |

Notes:
- If you skip `GEMINI_MODEL`, AVA defaults to `gemini-3.6-flash`.
- For lowest cost / free-tier friendliness later, you can set `GEMINI_MODEL` to `gemini-3.5-flash-lite`.
- Do **not** use `gemini-2.0-flash` (shut down).

Save / update secrets.

---

## Part C — Deploy the `ava-chat` function

You need the Supabase CLI and access to this repo on your machine.

### C1. Install / login (if you have not already)

1. Open a terminal in the project folder:  
   `C:\Users\DELL\Desktop\CODE\Afrivate\afrivate-portal`
2. If the CLI is not installed:  
   [https://supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli)
3. Log in:
   ```bash
   npx supabase login
   ```
4. Link this folder to your remote project (once):
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```
   `YOUR_PROJECT_REF` is in Supabase → **Project Settings → General → Reference ID**.

### C2. Deploy AVA

```bash
npx supabase functions deploy ava-chat
```

Wait until it reports success.

### C3. Confirm the function exists

In Supabase Dashboard → **Edge Functions**, you should see **`ava-chat`**.

---

## Part D — Confirm the portal can talk to Supabase

AVA’s cloud mode only runs when the user has a real Supabase login session.

On the machine / host that builds the portal, ensure production env has:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...   # JWT anon key from Supabase API settings
VITE_USE_SUPABASE_AUTH=true
VITE_USE_SUPABASE_DATA=true
# VITE_AVA_ENABLED=true   # optional; AVA is on by default
```

Then rebuild / redeploy the portal if you changed env vars.

**Local mock mode** (Playwright / `VITE_USE_SUPABASE_AUTH=false`) will use AVA’s **local guidance** answers and will not call Gemini. That is expected.

---

## Part E — Test AVA in the live portal

1. Open [https://portal.afrivate.org](https://portal.afrivate.org) (or your staging URL).
2. Sign in with a normal team account.
3. Click the purple **AVA** button (bottom-right).
4. Try a prompt chip, e.g. **How do I request leave?**
5. You should get a clear step-by-step answer.

### How to tell if Gemini is working

| Behaviour | Meaning |
|-----------|---------|
| Clear, natural answers that vary with wording | Gemini cloud path is working |
| Short template-style FAQ answers | Local fallback (no key, undeployed function, or auth/session issue) |
| “AVA is busy (rate limit)” | Free-tier limit — wait, or switch to `gemini-3.5-flash-lite` |

---

## Part F — Optional hardening

1. In AI Studio API keys, review any **restriction** options available for your key type.
2. Prefer a dedicated Google account / project for AfriVate (not a personal key shared widely).
3. Rotate the key if it was ever pasted into chat, email, or Git.
4. If someone leaves who had access to the key, revoke/create a new key and update `GEMINI_API_KEY` in Supabase.

---

## Troubleshooting checklist

| Problem | What to check |
|---------|----------------|
| No AVA button | `VITE_AVA_ENABLED` is not `false`; you are signed in past pending approval |
| AVA opens but only “local” style answers | `GEMINI_API_KEY` secret set? `ava-chat` deployed? User on Supabase auth (not mock)? |
| CORS / blocked request | `SITE_URL` must match the portal origin exactly (e.g. `https://portal.afrivate.org`) |
| 401 Unauthorized from function | User session expired — sign out/in |
| 429 / busy | Free-tier rate limit — wait or use `gemini-3.5-flash-lite` |
| 502 Gemini failed | Wrong model name, key invalid, or API temporarily unavailable — check Supabase function logs |

View logs: Supabase Dashboard → **Edge Functions** → **ava-chat** → **Logs**.

---

## Quick command summary

```bash
# From the afrivate-portal repo
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy ava-chat
```

Supabase secrets to set in the dashboard:

```text
GEMINI_API_KEY=AIza...your key...
GEMINI_MODEL=gemini-3.6-flash
SITE_URL=https://portal.afrivate.org
```

---

## Official Google links

- AI Studio home: [https://aistudio.google.com/](https://aistudio.google.com/)
- API keys: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- API key docs: [https://ai.google.dev/gemini-api/docs/api-key](https://ai.google.dev/gemini-api/docs/api-key)
- Models list: [https://ai.google.dev/gemini-api/docs/models](https://ai.google.dev/gemini-api/docs/models)

When this checklist is done, AVA is production-ready for Team Space.

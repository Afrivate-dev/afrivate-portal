# AfriVate auth email templates

Branded HTML for Supabase Auth. Primary color: **#8D4087** (matches [afrivate.org](https://afrivate.org)).

## Logo

Templates reference `{{ .SiteURL }}/afrivate-icon.svg` (served from the portal `public/` folder). Set Supabase **Site URL** to your deployed portal (e.g. `https://portal.afrivate.org`).

Some email clients (Outlook) block SVG — if the logo does not appear, upload a PNG to the portal and replace the `img` `src` in each template.

## Files

| File | Supabase template |
|------|-------------------|
| `confirmation.html` | Confirm signup |
| `invite.html` | Invite user |
| `recovery.html` | Reset password |
| `magic_link.html` | Magic link |
| `email_change.html` | Change email address |
| `reauthentication.html` | Reauthentication |
| `notifications/password_changed.html` | Password changed notification |
| `notifications/email_changed.html` | Email changed notification |

`_email-shell.html` is a reference layout only — Supabase does not include partials; each file is self-contained.

## Hosted projects

Paste each file into **Authentication → Email Templates** (and **Notifications** for the two notification templates). See `SETUP_STEPS.md` for subjects and the test checklist.

## Local CLI

Configured in `supabase/config.toml` — loaded automatically with `supabase start`.

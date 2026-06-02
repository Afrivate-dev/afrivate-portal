# AfriVate Employee Portal

Internal staff portal for AfriVate Technologies Ltd. Built with React + TypeScript + Tailwind CSS, powered by Vite. Supports mock login and localStorage by default, with optional Supabase backend for auth and data.

Intended to be deployed at `portal.afrivate.com`. See **`SUPABASE_SETUP.md`** for the go-live guide.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS 3 |
| Routing | React Router v7 |
| Backend (optional) | Supabase (Auth + Postgres + Realtime) |
| Icons | lucide-react |
| Calendar | FullCalendar |

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Demo Accounts (mock mode)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@afrivate.com` | `admin123` |
| HR | `hr@afrivate.com` | `hr123` |
| Team Lead | `lead@afrivate.com` | `lead123` |
| Staff | `staff@afrivate.com` | `staff123` |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_USE_SUPABASE_AUTH=true
VITE_USE_SUPABASE_DATA=true
```

Leave both flags as `false` (or omit them) to run in mock/localStorage mode.

---

## Brand

- **Primary colour:** `#8D4087` (AfriVate Purple)
- **Lavender:** `#F0E7F6`
- **Fonts:** Poppins (headings) · Roboto (body)
- **Company:** AfriVate Technologies Ltd · RC: 9210092 · Abuja, Nigeria

---

## Deployment

1. `npm run build` — outputs to `dist/`
2. Deploy `dist/` to Netlify or Vercel
3. Add environment variables in your hosting dashboard
4. Point your domain DNS to the deployment

See `SUPABASE_SETUP.md` for full database setup instructions.

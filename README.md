# NerdzFactory Employee Portal

Internal staff portal for NerdzFactory Company. Independent React + TypeScript application that shares the visual identity of the public marketing site (`nerdzfactory.co`) but is otherwise standalone — its own routing, auth, data layer and build output.

Intended to be deployed at `portal.nerdzfactory.com` with Supabase for auth and data. See **`SUPABASE_SETUP.md`** for a beginner-friendly go-live guide. Until migration is complete, the app supports **mock login** + **localStorage** (and optional Supabase **Realtime** for notes when env vars are set).

## Stack

| Layer | Choice |
|---|---|
| Build | Vite 8 |
| UI | React 19 + TypeScript (strict) |
| Styling | Tailwind CSS 3 with design tokens as CSS variables |
| Routing | React Router v7 |
| Icons | lucide-react |
| Dates | date-fns |
| State | React Context + `useLocalStorage` |
| Optional backend | Supabase (Auth, Postgres, Realtime) — see `SUPABASE_SETUP.md` |

## Environment variables

Copy **`.env.example`** to **`.env.local`** and fill in values. Vite exposes only variables prefixed with `VITE_`.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + bundle to dist/
npm run lint
npm run preview  # serve the built bundle
```

## Demo accounts

All credentials live in `src/data/mockData.ts`. The Login screen also has clickable buttons to auto-fill these.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@nerdzfactory.co` | `admin123` |
| HR | `hr@nerdzfactory.co` | `hr123` |
| Team Lead | `lead@nerdzfactory.co` | `lead123` |
| Staff (new joiner) | `staff@nerdzfactory.co` | `staff123` |

## Project layout

├── SUPABASE_SETUP.md          # Supabase go-live guide (auth, DB, RLS, Realtime)
├── .env.example               # VITE_* template (copy to .env.local)
├── public/
├── src/
│   ├── App.tsx                # Router + provider composition
│   ├── main.tsx               # Entry point
│   ├── styles/
│   │   ├── index.css          # Tailwind + CSS variables (light + dark)
│   │   └── tokens.ts          # Raw token values for JS consumers
│   ├── config/
│   │   └── nav.ts             # Sidebar / bottom-bar navigation items
│   ├── context/
│   │   ├── AuthContext.tsx    # Session — passwords are not persisted
│   │   ├── DataContext.tsx    # Tasks, HR data, … → localStorage
│   │   ├── CollabContext.tsx  # Workspace notes → localStorage + optional Realtime
│   │   └── ThemeContext.tsx
│   ├── hooks/
│   │   └── useLocalStorage.ts
│   ├── utils/
│   │   └── helpers.ts         # cn(), role checks, date helpers, avatar colours
│   ├── data/
│   │   └── mockData.ts        # Seed data for every feature
│   ├── types/
│   │   └── index.ts           # All shared TypeScript types
│   ├── layouts/
│   │   ├── AppLayout.tsx      # Authenticated shell
│   │   └── AuthLayout.tsx     # Login screen shell
│   ├── components/
│   │   ├── ui/                # Button, Card, Badge, Input, Modal, ...
│   │   ├── layout/            # Sidebar, TopBar, MobileNav, Drawer
│   │   └── shared/            # PageHeader, StatCard, EmptyState, ErrorBoundary, …
│   └── pages/
│       ├── Login.tsx
│       ├── Dashboard.tsx
│       ├── Tasks.tsx
│       ├── WeeklyCheckIn.tsx
│       ├── Onboarding.tsx
│       ├── Announcements.tsx
│       ├── StaffDirectory.tsx
│       ├── LeaveRequests.tsx
│       ├── DocumentLibrary.tsx
│       ├── Recognition.tsx
│       ├── EventsCalendar.tsx
│       ├── AdminPanel.tsx
│       └── ComingSoon.tsx     # Placeholder for unbuilt features
├── tailwind.config.js         # Design tokens wired here
├── postcss.config.js
├── vite.config.ts             # `@/*` path alias \u2192 src/*
└── tsconfig.app.json
```

## Design tokens

Brand identity extracted from the public site (`nerdzfactory.co`):

- **Primary / accent**: `#3e8cff`
- **Site dark background**: `#0B1120`
- **Font**: Montserrat (Google Fonts)

Tokens are exposed two ways:

- As **CSS variables** in `src/styles/index.css` — swap automatically between `:root` (light) and `.dark` (dark)
- As **Tailwind utilities** in `tailwind.config.js` — e.g. `bg-bg`, `text-fg`, `border-border`, `bg-accent`

Light theme is the default; users can toggle dark via the topbar sun/moon button. The choice persists per browser.

## Build phases

Per the project plan (`nerdzfactory_portal_plan.md`):

| Phase | What | Status |
|---|---|---|
| 1 | Scaffold + Auth + Dashboard + AppLayout | Done |
| 2 | Tasks (board + week views) + Weekly Check-in | Done |
| 3 | Onboarding (videos + checklist + admin) | Done |
| 4 | Announcements + Staff Directory | Done |
| 5 | Leave Requests + Document Library | Done |
| 6 | Recognition Wall + Events Calendar | Done |
| 7 | Admin Panel | Done |
| 8 | PWA setup | Not started |
| 9 | Supabase backend | Planned — follow **`SUPABASE_SETUP.md`** |

Notes and collaboration use **`CollabContext`** (separate from `DataContext`) for workspace notes storage and syncing.

## How to add a new feature (working with the AI)

1. Pick the section of the project plan that describes the feature (e.g. 6.3 Weekly Check-in)
2. Share that section + this README + relevant existing files with the AI
3. Ask for that single feature, matching the existing UI primitives and the design tokens
4. Run `npm run lint` and `npm run build` before committing

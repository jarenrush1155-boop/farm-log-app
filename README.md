# JLM Farm Logs

Agriculture record-keeping app for fields, equipment, maintenance, field operations, spray logs, chemicals, premixes, irrigation, crop summaries, and tasks.

**Live:** [jlmfarmlogs.vercel.app](https://jlmfarmlogs.vercel.app) · [farm-log-app.vercel.app](https://farm-log-app.vercel.app)

## Stack

- **Next.js** (App Router)
- **Supabase** (Postgres + RLS + RPC)
- **Tailwind CSS**
- **Vercel** (deploys from GitHub `main`)

## Local setup

```bash
npm install
```

Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase

Writes are gated by a shared edit PIN. Apply SQL in the Supabase SQL editor:

1. **`supabase/pin_mutations.sql`** — `check_edit_pin` + `mutate_with_pin` (required)
2. **`supabase/equipment_hours.sql`** — hour-meter recompute helpers/triggers (present in repo; apply if equipment hours are used)

RLS blocks direct client writes. All inserts/updates/deletes go through `mutate_with_pin` (and a few operation-specific RPCs with the same PIN check). The PIN is **not** stored in app code; it lives in the database and is verified server-side.

Helpers: `lib/pin.ts` (`verifyPin`, `mutateWithPin`, `promptForPin`, `promptPinForDelete`).

## PIN

- Forms include a PIN field for save/edit.
- Deletes use confirm + PIN prompt (`promptPinForDelete`).
- Wrong/missing PIN → mutation fails; UI shows a toast error.

## Deploy

Vercel project is linked to this GitHub repo. Pushes to **`main`** deploy automatically. Set the same `NEXT_PUBLIC_SUPABASE_*` env vars in the Vercel project settings.

## Page map

| Route | Purpose |
|-------|---------|
| `/` | Dashboard — acres, counts, recent ops/sprays/tasks |
| `/fields` | Field CRUD (name, acres, irrigated/dryland) |
| `/equipment` | Equipment CRUD + hour meters |
| `/maintenance` | Maintenance logs (updates equipment hours) |
| `/operations` | Field ops (tillage, planting, strip till, harvest, etc.) |
| `/spray` | Spray logs + premix quick-select |
| `/chemicals` | Chemical catalog |
| `/premixes` | Saved chemical mixes for spray entry |
| `/irrigation` | Meter readings (AF) + sprinkler inches + yearly summary |
| `/crop-summary` | Per-field yearly activity / print report |
| `/tasks` | Simple task list with complete toggle |

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run lint` — ESLint

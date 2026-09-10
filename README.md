# JLM Farm Logs

Agriculture record-keeping app for fields, equipment, maintenance, field operations, spray logs, chemicals, premixes, irrigation, crop summaries, and tasks.

**Live:** [jlmfarmlogs.vercel.app](https://jlmfarmlogs.vercel.app) · [farm-log-app.vercel.app](https://farm-log-app.vercel.app)

## Stack

- **Next.js** (App Router)
- **Supabase** (Postgres + Auth + RLS + RPC)
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
# Leave unset until Phase 1 cutover step 6 (keeps production usable pre-SQL):
# NEXT_PUBLIC_REQUIRE_AUTH=true
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Phase 1 — Multi-farm auth (cutover)

Architecture: [`docs/multi-farm-architecture.md`](docs/multi-farm-architecture.md)  
SQL: [`supabase/multi_farm_phase1.sql`](supabase/multi_farm_phase1.sql)

**Locked decisions:** no migration of existing JLM data (SQL may truncate); single role `editor` via `farm_members`; Supabase Auth + RLS; PIN/`mutate_with_pin` retired at SQL cutover; CSV export is not Phase 1.

### Exact Supabase Dashboard steps

1. Open your project → **Authentication** → **Providers** → **Email** → enable.
2. (Recommended for private/test farms) Authentication → **Providers** → Email → disable **Confirm email** so `/signup` gets a session immediately and can call `create_farm_for_new_user`. If confirm email stays on, users must confirm before farm creation works.
3. Authentication → **URL configuration**: add your site URLs (`http://localhost:3000`, `https://jlmfarmlogs.vercel.app`, etc.) to Site URL / Redirect URLs as needed.
4. **SQL Editor** → New query → paste and run the entire file `supabase/multi_farm_phase1.sql`.  
   - This **TRUNCATES** business tables (fields, equipment, logs, …). No JLM data migration.  
   - Creates `farms`, `farm_members`, adds `farm_id`, enables RLS, installs `create_farm_for_new_user`, replaces `mutate_with_pin` with an **auth + membership** version (PIN ignored).
5. Deploy/merge the app that includes `/login`, `/signup`, FarmProvider, and middleware (this branch).
6. Visit `/signup`, create the first account + farm name.
7. In Vercel → Project → Settings → Environment Variables, set `NEXT_PUBLIC_REQUIRE_AUTH=true` (Production + Preview as desired), then redeploy. Locally add the same to `.env.local`.
8. Smoke-test: sign in, dashboard loads, create/edit/delete one field (PIN modal may still appear until Phase 2 UI cleanup; server no longer validates PIN).

**Do not** set `NEXT_PUBLIC_REQUIRE_AUTH=true` before Email is enabled and the SQL has been applied — that would lock users out of the live site with no working signup/membership path.

### Pre-cutover (current production)

Until you run `multi_farm_phase1.sql`, the legacy PIN path still applies:

1. **`supabase/pin_mutations.sql`** — `check_edit_pin` + `mutate_with_pin` (PIN-gated)
2. **`supabase/equipment_hours.sql`** — hour-meter helpers (if used)

`PinProvider` remains in the layout on purpose so a mid-PR deploy does not strand production before the runbook above is complete.

## Auth scaffolding (code)

| Piece | Path |
|-------|------|
| Browser client | `lib/supabase/client.ts` |
| Server client | `lib/supabase/server.ts` |
| Back-compat export | `lib/supabase.ts` (existing page imports) |
| Session refresh + optional gate | `middleware.ts` |
| Login / Signup | `app/login`, `app/signup` |
| Active farm context | `components/FarmProvider.tsx` |

Signup calls `create_farm_for_new_user` after `signUp` so the user gets a farm + `editor` membership.

## Deploy

Vercel project is linked to this GitHub repo. Pushes to **`main`** deploy automatically. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and (after cutover) `NEXT_PUBLIC_REQUIRE_AUTH` in Vercel.

## Page map

| Route | Purpose |
|-------|---------|
| `/login` | Email/password sign-in |
| `/signup` | Create account + first farm |
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

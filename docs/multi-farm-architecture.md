# Multi-farm architecture

Revised for Phase 1 locked product decisions. This document is the source of truth for tenancy, auth, and cutover.

## Locked decisions (v1)

| Decision | Choice |
|----------|--------|
| Existing JLM data | **No migration.** Test-only cutover. SQL may `TRUNCATE` business tables when enabling `farm_id`. |
| Roles | **Single role: `editor`.** Multiple accounts per farm via `farm_members`. No owner/viewer in v1. |
| Auth | **Supabase Auth + RLS.** Shared edit PIN / `mutate_with_pin` are retired at cutover (see runbook). |
| CSV export | **Not Phase 1.** |

## Goals

- Isolate every farm's rows behind membership (`farm_members`) and Postgres RLS.
- Let each signed-in user belong to one or more farms; the app tracks an **active `farm_id`**.
- Replace the shared PIN gate with real accounts without stranding production mid-deploy.

## Data model (Phase 1)

```
auth.users
    |
    v
farm_members (user_id, farm_id, role='editor')
    |
    v
farms (id, name, created_at, ...)
    |
    |- fields
    |- equipment
    |- maintenance_logs
    |- operations
    |- spray_logs
    |- chemicals
    |- premixes
    |- irrigation_readings
    |- irrigation_applications
    |- tasks
```

All listed business tables gain a required `farm_id uuid references farms(id)`.

### Membership

- Row in `farm_members` = access to that farm.
- `role` is always `editor` in v1 (column kept for a later owner/viewer split).
- Signup creates **one farm + one membership** for the new user (RPC `create_farm_for_new_user`).

### RLS pattern

For each business table:

- `SELECT` / `INSERT` / `UPDATE` / `DELETE` allowed only when  
  `farm_id IN (SELECT farm_id FROM farm_members WHERE user_id = auth.uid())`.
- Inserts must set `farm_id` to a farm the user belongs to (enforced by `WITH CHECK`).

Anon key alone cannot read or write business data after cutover.

## Auth & clients

| Surface | Client | Notes |
|---------|--------|--------|
| Browser (pages, FarmProvider) | `lib/supabase/client.ts` via `@supabase/ssr` `createBrowserClient` | Cookie-aware session |
| Server (Server Components, route handlers) | `lib/supabase/server.ts` `createServerClient` | Reads cookies |
| Compatibility | `lib/supabase.ts` re-exports the browser client | Existing `from('../lib/supabase')` imports keep working |
| Edge | `middleware.ts` | Refreshes session cookies; optional require-auth gate |

### Routes

- Public: `/login`, `/signup`
- App routes: gated when `NEXT_PUBLIC_REQUIRE_AUTH=true` (see cutover)
- PinProvider remains mounted until a later PR removes PIN UI; after cutover the DB no longer trusts PIN

### Farm context

`FarmProvider` loads memberships for `auth.uid()`, persists `activeFarmId` in `localStorage`, and exposes `{ farms, activeFarmId, setActiveFarmId, loading }`. Pages and future write helpers should stamp `farm_id: activeFarmId` on inserts.

## Phased plan

### Phase 1 (this PR) — Auth + tenancy scaffolding

1. Architecture doc + `supabase/multi_farm_phase1.sql`.
2. Split Supabase clients + middleware session refresh.
3. `/login` + `/signup` (signup → farm + membership).
4. Farm context for active `farm_id`.
5. Optional auth gate via env flag; README cutover runbook.
6. **PIN UI stays** so production is not bricked before SQL + Email auth are enabled.

Out of scope: CSV export, migrating existing JLM rows, owner/viewer roles, rewriting every page off `mutateWithPin` (RPC is replaced at SQL cutover to auth+farm; UI PIN prompt is cosmetic debt until Phase 2 polish).

### Phase 2 — Wire pages to farm context + drop PIN UI

- Pass `farm_id` from `useFarm()` on all inserts (defense in depth beyond RLS).
- Remove PinProvider / PIN fields / `lib/pin.ts` PIN prompts.
- Prefer direct authenticated table writes (or thin helpers) instead of PIN-shaped RPC calls.
- Farm switcher in AppShell when a user has multiple memberships.

### Phase 3 — Invites & polish

- Invite additional editors to a farm (email invite or admin RPC).
- Optional owner/viewer roles if needed.
- CSV export (explicitly deferred from Phase 1).
- Hardening: audit policies, indexes on `farm_id`, rate limits.

## Cutover runbook (do not skip)

**Risk:** Enabling RLS + truncating without Auth Email + a first signup leaves the live site unable to read/write.

Order of operations:

1. **Staging / confirm Email provider** in Supabase Dashboard → Authentication → Providers → Email (enable). For internal/test, you may disable "Confirm email" so signup works immediately.
2. **Deploy this branch** (or merge to `main`) **without** setting `NEXT_PUBLIC_REQUIRE_AUTH` yet. Login/signup pages exist; old PIN path still works against pre-cutover SQL.
3. **Run** `supabase/multi_farm_phase1.sql` in the SQL editor. This truncates business tables, adds `farm_id`, creates `farms` / `farm_members`, installs RLS, replaces `mutate_with_pin` with an auth+membership version, and retires PIN checks.
4. **Sign up** the first real user at `/signup` (creates farm + membership).
5. **Set** `NEXT_PUBLIC_REQUIRE_AUTH=true` in Vercel (and local `.env.local`) and redeploy so middleware requires login for app routes.
6. **Smoke-test** login, dashboard reads, and one create/update/delete per major area.
7. **Optional:** revoke/drop `check_edit_pin` once you are satisfied (commented guidance in the SQL file).

Rollback sketch: restore DB from backup taken before step 3; unset `NEXT_PUBLIC_REQUIRE_AUTH`; redeploy previous app revision. There is **no** in-place restore of truncated JLM data by design.

## Security notes

- Never put the service role key in the Next.js client bundle.
- RLS is mandatory; do not weaken policies for "just this once" admin fixes—use the Supabase SQL editor with a privileged role instead.
- `mutate_with_pin` after Phase 1 SQL is `SECURITY DEFINER` but checks `auth.uid()` + membership before writing; PIN argument is ignored and should be removed in Phase 2.

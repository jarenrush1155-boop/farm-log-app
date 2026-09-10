-- =============================================================================
-- multi_farm_phase1.sql
-- Phase 1: farms + farm_members, farm_id on business tables, RLS, signup RPC.
-- =============================================================================
--
-- RUNBOOK (also see docs/multi-farm-architecture.md and README):
-- 1. Enable Email auth in Supabase Dashboard → Authentication → Providers.
-- 2. Deploy the app that includes /login, /signup, FarmProvider (optional:
--    leave NEXT_PUBLIC_REQUIRE_AUTH unset so the live site still works if you
--    have not run this SQL yet).
-- 3. Take a backup if you care about any non-JLM data (JLM production rows are
--    NOT migrated — this script TRUNCATEs business tables by design).
-- 4. Run THIS entire script in SQL Editor.
-- 5. Sign up at /signup (creates farm + membership).
-- 6. Set NEXT_PUBLIC_REQUIRE_AUTH=true in Vercel / .env.local and redeploy.
-- 7. Smoke-test; optionally drop check_edit_pin (see bottom).
--
-- DO NOT run this against a database you need to keep without a backup.
-- PIN / mutate_with_pin (PIN-gated) are retired by this script.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Tenancy tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.farm_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.farms (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  -- v1: only 'editor'. Column reserved for a later owner/viewer split.
  role text NOT NULL DEFAULT 'editor' CHECK (role = 'editor'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (farm_id, user_id)
);

CREATE INDEX IF NOT EXISTS farm_members_user_id_idx ON public.farm_members (user_id);
CREATE INDEX IF NOT EXISTS farm_members_farm_id_idx ON public.farm_members (farm_id);

-- ---------------------------------------------------------------------------
-- 2. Helper: farms the current user belongs to
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.user_farm_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT farm_id
  FROM public.farm_members
  WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.user_farm_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_farm_ids() TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Truncate business data (no JLM migration) then add farm_id
-- ---------------------------------------------------------------------------
-- Truncate first so we can add NOT NULL farm_id without backfill.
-- CASCADE clears dependent FKs between these tables if any exist.

TRUNCATE TABLE
  public.tasks,
  public.irrigation_applications,
  public.irrigation_readings,
  public.premixes,
  public.chemicals,
  public.spray_logs,
  public.operations,
  public.maintenance_logs,
  public.equipment,
  public.fields
RESTART IDENTITY CASCADE;

-- Add farm_id columns (nullable briefly, then enforced NOT NULL).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fields',
    'equipment',
    'maintenance_logs',
    'operations',
    'spray_logs',
    'chemicals',
    'premixes',
    'irrigation_readings',
    'irrigation_applications',
    'tasks'
  ]
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms (id) ON DELETE CASCADE',
      t
    );
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (farm_id)', t || '_farm_id_idx', t);
  END LOOP;
END $$;

-- After truncate, tables are empty — safe to require farm_id.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fields',
    'equipment',
    'maintenance_logs',
    'operations',
    'spray_logs',
    'chemicals',
    'premixes',
    'irrigation_readings',
    'irrigation_applications',
    'tasks'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN farm_id SET NOT NULL', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4. RLS — farms & members
-- ---------------------------------------------------------------------------

ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS farms_select_member ON public.farms;
CREATE POLICY farms_select_member ON public.farms
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.user_farm_ids()));

-- Inserts go through create_farm_for_new_user (security definer), not direct.
DROP POLICY IF EXISTS farms_update_member ON public.farms;
CREATE POLICY farms_update_member ON public.farms
  FOR UPDATE TO authenticated
  USING (id IN (SELECT public.user_farm_ids()))
  WITH CHECK (id IN (SELECT public.user_farm_ids()));

DROP POLICY IF EXISTS farm_members_select_own ON public.farm_members;
CREATE POLICY farm_members_select_own ON public.farm_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR farm_id IN (SELECT public.user_farm_ids()));

-- ---------------------------------------------------------------------------
-- 5. RLS — business tables (editor = full CRUD on own farms)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fields',
    'equipment',
    'maintenance_logs',
    'operations',
    'spray_logs',
    'chemicals',
    'premixes',
    'irrigation_readings',
    'irrigation_applications',
    'tasks'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_member', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (farm_id IN (SELECT public.user_farm_ids()))',
      t || '_select_member', t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert_member', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (farm_id IN (SELECT public.user_farm_ids()))',
      t || '_insert_member', t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update_member', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (farm_id IN (SELECT public.user_farm_ids())) WITH CHECK (farm_id IN (SELECT public.user_farm_ids()))',
      t || '_update_member', t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete_member', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (farm_id IN (SELECT public.user_farm_ids()))',
      t || '_delete_member', t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Signup helper RPC — create farm + editor membership for auth.uid()
-- ---------------------------------------------------------------------------
-- App pattern (see app/signup/page.tsx):
--   1. supabase.auth.signUp({ email, password })
--   2. supabase.rpc('create_farm_for_new_user', { p_farm_name: '...' })
--
-- Alternative without RPC (documented for operators):
--   insert into farms (name) values (...) returning id;  -- needs a policy or service role
--   insert into farm_members (farm_id, user_id, role) values (...);
-- Prefer the RPC so clients never need the service role.

CREATE OR REPLACE FUNCTION public.create_farm_for_new_user(p_farm_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_farm_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_farm_name IS NULL OR btrim(p_farm_name) = '' THEN
    RAISE EXCEPTION 'Farm name required'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.farms (name)
  VALUES (btrim(p_farm_name))
  RETURNING id INTO v_farm_id;

  INSERT INTO public.farm_members (farm_id, user_id, role)
  VALUES (v_farm_id, v_uid, 'editor');

  RETURN v_farm_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_farm_for_new_user(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_farm_for_new_user(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Retire PIN gate — mutate_with_pin becomes auth + farm scoped
-- ---------------------------------------------------------------------------
-- Compatibility: existing clients still call mutate_with_pin(p_pin, ...).
-- p_pin is IGNORED. Caller must be authenticated and pass farm_id in p_data
-- for inserts (or it is filled from the user's first membership).
-- Phase 2 should remove PIN UI and call tables directly.

CREATE OR REPLACE FUNCTION public.mutate_with_pin(
  p_pin text,
  p_table text,
  p_action text,
  p_data jsonb DEFAULT '{}'::jsonb,
  p_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed constant text[] := ARRAY[
    'fields',
    'equipment',
    'maintenance_logs',
    'operations',
    'spray_logs',
    'chemicals',
    'premixes',
    'irrigation_readings',
    'irrigation_applications',
    'tasks'
  ];
  result_row jsonb;
  set_list text;
  payload jsonb;
  cols text;
  selects text;
  v_uid uuid := auth.uid();
  v_farm_id uuid;
BEGIN
  -- PIN retired: authentication + membership required.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_table IS NULL OR NOT (p_table = ANY (allowed)) THEN
    RAISE EXCEPTION 'Table not allowed: %', p_table;
  END IF;

  IF p_action = 'insert' THEN
    SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
    INTO payload
    FROM jsonb_each(COALESCE(p_data, '{}'::jsonb))
    WHERE value IS DISTINCT FROM 'null'::jsonb;

    IF NOT (payload ? 'id') THEN
      payload := payload || jsonb_build_object('id', gen_random_uuid());
    END IF;

    IF payload ? 'farm_id' AND nullif(payload->>'farm_id', '') IS NOT NULL THEN
      v_farm_id := (payload->>'farm_id')::uuid;
    ELSE
      SELECT farm_id INTO v_farm_id
      FROM public.farm_members
      WHERE user_id = v_uid
      ORDER BY created_at
      LIMIT 1;
    END IF;

    IF v_farm_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.farm_members fm
      WHERE fm.user_id = v_uid AND fm.farm_id = v_farm_id
    ) THEN
      RAISE EXCEPTION 'Not a member of farm'
        USING ERRCODE = 'P0001';
    END IF;

    payload := payload || jsonb_build_object('farm_id', v_farm_id);

    SELECT
      string_agg(format('%I', key), ', '),
      string_agg(format('r.%I', key), ', ')
    INTO cols, selects
    FROM jsonb_object_keys(payload) AS key;

    EXECUTE format(
      'INSERT INTO public.%I (%s)
       SELECT %s FROM jsonb_populate_record(NULL::public.%I, $1) AS r
       RETURNING to_jsonb(%I.*)',
      p_table, cols, selects, p_table, p_table
    )
    INTO result_row
    USING payload;

    RETURN result_row;

  ELSIF p_action = 'update' THEN
    IF p_id IS NULL THEN
      RAISE EXCEPTION 'id required for update';
    END IF;

    EXECUTE format(
      'SELECT farm_id FROM public.%I WHERE id = $1',
      p_table
    )
    INTO v_farm_id
    USING p_id;

    IF v_farm_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.farm_members fm
      WHERE fm.user_id = v_uid AND fm.farm_id = v_farm_id
    ) THEN
      RAISE EXCEPTION 'Not a member of farm or record not found'
        USING ERRCODE = 'P0001';
    END IF;

    SELECT string_agg(format('%I = s.%I', key, key), ', ')
    INTO set_list
    FROM jsonb_object_keys(COALESCE(p_data, '{}'::jsonb)) AS key
    WHERE key NOT IN ('id', 'created_at', 'farm_id');

    IF set_list IS NULL OR set_list = '' THEN
      RAISE EXCEPTION 'No fields to update';
    END IF;

    EXECUTE format(
      'UPDATE public.%I AS t
       SET %s
       FROM (SELECT * FROM jsonb_populate_record(NULL::public.%I, $1)) AS s
       WHERE t.id = $2
       RETURNING to_jsonb(t.*)',
      p_table, set_list, p_table
    )
    INTO result_row
    USING COALESCE(p_data, '{}'::jsonb), p_id;

    IF result_row IS NULL THEN
      RAISE EXCEPTION 'Record not found';
    END IF;

    RETURN result_row;

  ELSIF p_action = 'delete' THEN
    IF p_id IS NULL THEN
      RAISE EXCEPTION 'id required for delete';
    END IF;

    EXECUTE format(
      'SELECT farm_id FROM public.%I WHERE id = $1',
      p_table
    )
    INTO v_farm_id
    USING p_id;

    IF v_farm_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.farm_members fm
      WHERE fm.user_id = v_uid AND fm.farm_id = v_farm_id
    ) THEN
      RAISE EXCEPTION 'Not a member of farm or record not found'
        USING ERRCODE = 'P0001';
    END IF;

    EXECUTE format(
      'DELETE FROM public.%I WHERE id = $1 RETURNING to_jsonb(%I.*)',
      p_table, p_table
    )
    INTO result_row
    USING p_id;

    IF result_row IS NULL THEN
      RAISE EXCEPTION 'Record not found';
    END IF;

    RETURN result_row;

  ELSE
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mutate_with_pin(text, text, text, jsonb, uuid) FROM PUBLIC;
-- Anon can no longer mutate; authenticated members only.
GRANT EXECUTE ON FUNCTION public.mutate_with_pin(text, text, text, jsonb, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_operation_with_pin(
  p_id uuid,
  p_pin text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.mutate_with_pin(p_pin, 'operations', 'delete', '{}'::jsonb, p_id);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_operation_with_pin(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_operation_with_pin(uuid, text) TO authenticated;

COMMIT;

-- ---------------------------------------------------------------------------
-- 8. Optional cleanup (run manually after smoke tests)
-- ---------------------------------------------------------------------------
-- DROP FUNCTION IF EXISTS public.check_edit_pin(text);

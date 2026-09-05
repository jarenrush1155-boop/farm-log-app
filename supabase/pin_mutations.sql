-- PIN-protected mutations for Farm Log
-- Run this once in the Supabase SQL Editor (Dashboard → SQL → New query).
-- IMPORTANT: Re-run this entire script in the Supabase SQL editor whenever it
-- changes. The client also sets id on insert (lib/pin.ts) so production can
-- recover on deploy before this SQL is re-applied.
-- Required existing function: public.check_edit_pin(input_pin text) returns boolean
--
-- Why this is needed:
-- Row Level Security blocks direct INSERT/UPDATE/DELETE from the anon key.
-- set_current_pin cannot authorize a later REST call (connection pooling resets
-- session settings). Mutations must validate the PIN in the same database call.
--
-- INSERT note: jsonb_populate_record fills absent columns with NULL, which
-- overrides column DEFAULTs (e.g. id gen_random_uuid()). We therefore insert
-- only keys present in p_data (JSON nulls dropped) and ensure missing id gets
-- gen_random_uuid().

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
BEGIN
  IF p_pin IS NULL OR btrim(p_pin) = '' OR NOT public.check_edit_pin(p_pin) THEN
    RAISE EXCEPTION 'Invalid PIN'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_table IS NULL OR NOT (p_table = ANY (allowed)) THEN
    RAISE EXCEPTION 'Table not allowed: %', p_table;
  END IF;

  IF p_action = 'insert' THEN
    -- Drop JSON-null values so they do not override column DEFAULTs.
    SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
    INTO payload
    FROM jsonb_each(COALESCE(p_data, '{}'::jsonb))
    WHERE value IS DISTINCT FROM 'null'::jsonb;

    -- Missing id must use gen_random_uuid() (populate_record would set NULL).
    IF NOT (payload ? 'id') THEN
      payload := payload || jsonb_build_object('id', gen_random_uuid());
    END IF;

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

    SELECT string_agg(format('%I = s.%I', key, key), ', ')
    INTO set_list
    FROM jsonb_object_keys(COALESCE(p_data, '{}'::jsonb)) AS key
    WHERE key NOT IN ('id', 'created_at');

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
GRANT EXECUTE ON FUNCTION public.mutate_with_pin(text, text, text, jsonb, uuid) TO anon, authenticated;

-- Convenience wrapper used by the operations page (same security model).
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
GRANT EXECUTE ON FUNCTION public.delete_operation_with_pin(uuid, text) TO anon, authenticated;

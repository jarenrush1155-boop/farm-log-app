-- Equipment hours: initial_hours + current_hours with auto-sync from maintenance logs
-- Run once in the Supabase SQL Editor after pin_mutations.sql (if not already applied).

-- 1) New columns (keep legacy `hours` in sync for any older clients)
ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS initial_hours numeric,
  ADD COLUMN IF NOT EXISTS current_hours numeric;

-- Backfill from existing hours meter reading
UPDATE public.equipment
SET
  initial_hours = COALESCE(initial_hours, hours),
  current_hours = COALESCE(current_hours, hours)
WHERE hours IS NOT NULL
   OR initial_hours IS NOT NULL
   OR current_hours IS NOT NULL;

-- 2) Recompute current_hours = MAX(maintenance log hours), else fall back to initial_hours
CREATE OR REPLACE FUNCTION public.recompute_equipment_hours(p_equipment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  eq_type text;
  init_h numeric;
  max_h numeric;
  max_sep numeric;
BEGIN
  SELECT type, initial_hours
  INTO eq_type, init_h
  FROM public.equipment
  WHERE id = p_equipment_id;

  IF eq_type IS NULL OR eq_type IS DISTINCT FROM 'motorized' THEN
    RETURN;
  END IF;

  SELECT MAX(hours), MAX(separator_hours)
  INTO max_h, max_sep
  FROM public.maintenance_logs
  WHERE equipment_id = p_equipment_id;

  UPDATE public.equipment
  SET
    current_hours = COALESCE(max_h, init_h),
    -- Keep legacy column aligned so nothing else breaks
    hours = COALESCE(max_h, init_h, hours),
    separator_hours = CASE
      WHEN max_sep IS NOT NULL THEN max_sep
      ELSE separator_hours
    END
  WHERE id = p_equipment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_equipment_hours(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_equipment_hours(uuid) TO anon, authenticated;

-- 3) Trigger: any maintenance change recalculates equipment hours
CREATE OR REPLACE FUNCTION public.trg_maintenance_sync_equipment_hours()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_equipment_hours(OLD.equipment_id);
    RETURN OLD;
  END IF;

  PERFORM public.recompute_equipment_hours(NEW.equipment_id);

  IF TG_OP = 'UPDATE'
     AND OLD.equipment_id IS DISTINCT FROM NEW.equipment_id THEN
    PERFORM public.recompute_equipment_hours(OLD.equipment_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS maintenance_sync_equipment_hours ON public.maintenance_logs;
CREATE TRIGGER maintenance_sync_equipment_hours
  AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_maintenance_sync_equipment_hours();

-- 4) When equipment is created/updated, seed current_hours from initial_hours if needed
CREATE OR REPLACE FUNCTION public.trg_equipment_seed_current_hours()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'motorized' THEN
    IF NEW.current_hours IS NULL THEN
      NEW.current_hours := NEW.initial_hours;
    END IF;
    IF NEW.hours IS NULL THEN
      NEW.hours := COALESCE(NEW.current_hours, NEW.initial_hours);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS equipment_seed_current_hours ON public.equipment;
CREATE TRIGGER equipment_seed_current_hours
  BEFORE INSERT OR UPDATE ON public.equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_equipment_seed_current_hours();

-- 5) One-time recompute for all motorized equipment that already has logs
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id FROM public.equipment WHERE type = 'motorized'
  LOOP
    PERFORM public.recompute_equipment_hours(r.id);
  END LOOP;
END;
$$;

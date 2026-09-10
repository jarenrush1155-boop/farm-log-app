import { supabase } from './supabase';

export type PinTable =
  | 'fields'
  | 'equipment'
  | 'maintenance_logs'
  | 'operations'
  | 'spray_logs'
  | 'chemicals'
  | 'premixes'
  | 'irrigation_readings'
  | 'irrigation_applications'
  | 'tasks';

export type PinAction = 'insert' | 'update' | 'delete';

type MutateResult = {
  data: unknown;
  error: { message: string } | null;
};

const ACTIVE_FARM_KEY = 'farm-log-active-farm-id';

function activeFarmIdFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACTIVE_FARM_KEY);
}

/** Verify PIN via Supabase. Returns false for invalid PIN or RPC errors. */
export async function verifyPin(pin: string): Promise<boolean> {
  if (!pin.trim()) return false;
  const { data, error } = await supabase.rpc('check_edit_pin', {
    input_pin: pin.trim(),
  });
  if (error) {
    console.error('check_edit_pin failed:', error.message);
    return false;
  }
  return data === true;
}

/**
 * Insert / update / delete a row after validating the PIN in the same DB call.
 * Pre-cutover: requires supabase/pin_mutations.sql (PIN-gated).
 * Post Phase 1 SQL: PIN is ignored server-side; auth + farm membership required.
 * Inserts stamp farm_id from the active farm in localStorage when missing.
 */
export async function mutateWithPin(options: {
  pin: string;
  table: PinTable;
  action: PinAction;
  data?: Record<string, unknown>;
  id?: string | null;
}): Promise<MutateResult> {
  const { pin, table, action, id = null } = options;
  let data = options.data ?? {};

  if (!pin.trim()) {
    return { data: null, error: { message: 'Please enter the PIN' } };
  }

  // jsonb_populate_record sets missing id to null and overrides gen_random_uuid().
  // Client-side id unblocks inserts on deploy without waiting for SQL re-apply.
  if (action === 'insert' && data.id == null) {
    data = { ...data, id: crypto.randomUUID() };
  }

  // Phase 1: ensure farm_id is present for inserts when FarmProvider has set one.
  if (action === 'insert' && data.farm_id == null) {
    const farmId = activeFarmIdFromStorage();
    if (farmId) {
      data = { ...data, farm_id: farmId };
    }
  }

  const { data: result, error } = await supabase.rpc('mutate_with_pin', {
    p_pin: pin.trim(),
    p_table: table,
    p_action: action,
    p_data: data,
    p_id: id,
  });

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: result, error: null };
}

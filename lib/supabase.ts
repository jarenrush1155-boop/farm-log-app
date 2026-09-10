/**
 * Browser Supabase client (back-compat).
 * Prefer importing from `lib/supabase/client` or `lib/supabase/server` in new code.
 * Existing pages import `{ supabase } from '../lib/supabase'` — keep that working.
 */
import { createClient } from './supabase/client';

export const supabase = createClient();

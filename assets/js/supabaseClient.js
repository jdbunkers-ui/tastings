/*import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";*/

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.5/+esm";

/**
 * IMPORTANT:
 * - Use your SUPABASE Project URL + anon key (safe to expose).
 * - Do NOT use the service_role key in browser code.
 */
export const SUPABASE_URL = "https://uzgwhofpmdgvyottchzx.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_F1VHKOUtmQWQv5ZmkWsmGA_HRuRmWw1";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/**
 * IMPORTANT:
 * - Use your SUPABASE Project URL + anon key (safe to expose).
 * - Do NOT use the service_role key in browser code.
 */
export const SUPABASE_URL = "https://uzgwhofpmdgvyottchzx.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6Z3dob2ZwbWRndnlvdHRjaHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MjUwODQsImV4cCI6MjA4NDAwMTA4NH0.pJkYm8EftixLt496JEvOoSHC0Ph31kYp5NVXctG41o4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

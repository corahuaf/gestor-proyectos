import { createClient } from "@supabase/supabase-js";
import { env } from "$env/dynamic/public";

// Inicializa el cliente para ser usado tanto en el frontend como en +page.js
export const supabase = createClient(
  env.PUBLIC_SUPABASE_URL!,
  env.PUBLIC_SUPABASE_ANON_KEY!,
);

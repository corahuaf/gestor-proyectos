import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export function getSupabaseAdmin() {
	if (!publicEnv.PUBLIC_SUPABASE_URL) {
		throw new Error('Falta PUBLIC_SUPABASE_URL en las variables de entorno de Vercel');
	}
	if (!env.SUPABASE_SERVICE_ROLE_KEY) {
		throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno de Vercel');
	}

	return createClient(publicEnv.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

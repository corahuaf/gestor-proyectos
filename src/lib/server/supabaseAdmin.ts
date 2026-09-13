import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

export function getSupabaseAdmin() {
	if (!env.PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
		throw new Error('Faltan variables de Supabase para el cliente administrativo');
	}

	return createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

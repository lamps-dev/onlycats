import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
	throw new Error(
		'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy apps/api/.env.example to .env and fill them in.',
	);
}

export const supabase = createClient(url, serviceKey, {
	auth: { persistSession: false, autoRefreshToken: false },
});

export default supabase;

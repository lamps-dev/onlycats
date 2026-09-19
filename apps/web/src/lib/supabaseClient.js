import { createClient } from '@supabase/supabase-js';
import { READ_ONLY, ReadOnlyError, createReadOnlyProxy } from '@/lib/readOnly.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
	throw new Error(
		'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy apps/web/.env.example to .env and fill them in.',
	);
}

const client = createClient(url, anonKey, {
	auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// Writes that are refused while the site is read-only. Auth calls are NOT in
// here on purpose: signing in, signing out, and setting a new password are how
// someone reaches their own data, and none of them publish anything.
const BLOCKED_TABLE_METHODS = ['insert', 'update', 'upsert', 'delete'];
const BLOCKED_STORAGE_METHODS = [
	'upload',
	'uploadToSignedUrl',
	'update',
	'move',
	'copy',
	'remove',
	'createSignedUploadUrl',
];

// Last line of defence. The UI already hides every posting surface, but this
// codebase had write calls scattered across a dozen components, so the guard
// lives at the client instead of trusting that each one was caught.
if (READ_ONLY) {
	const rawFrom = client.from.bind(client);
	client.from = (table) => createReadOnlyProxy(rawFrom(table), BLOCKED_TABLE_METHODS, table);

	const rawStorageFrom = client.storage.from.bind(client.storage);
	client.storage.from = (bucket) =>
		createReadOnlyProxy(rawStorageFrom(bucket), BLOCKED_STORAGE_METHODS, `storage:${bucket}`);

	// rpc() can wrap arbitrary mutations, so it is refused wholesale rather
	// than guessed at per function name.
	client.rpc = () => {
		throw new ReadOnlyError('rpc()');
	};
}

export const supabase = client;

export default supabase;

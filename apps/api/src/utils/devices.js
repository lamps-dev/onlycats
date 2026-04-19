import crypto from 'node:crypto';
import { supabase } from './supabaseClient.js';

const COOKIE_NAME = 'oc_device';
const COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

const parseCookies = (header) => {
	const out = {};
	if (!header) return out;
	for (const part of header.split(';')) {
		const idx = part.indexOf('=');
		if (idx === -1) continue;
		const name = part.slice(0, idx).trim();
		if (!name) continue;
		try {
			out[name] = decodeURIComponent(part.slice(idx + 1).trim());
		} catch (_) {
			out[name] = part.slice(idx + 1).trim();
		}
	}
	return out;
};

const hashToken = (token) =>
	crypto.createHash('sha256').update(String(token), 'utf8').digest('hex');

const generateToken = () => crypto.randomBytes(32).toString('base64url');

const setDeviceCookie = (res, token) => {
	const isProd = process.env.NODE_ENV === 'production';
	res.cookie(COOKIE_NAME, token, {
		httpOnly: true,
		secure: isProd,
		sameSite: isProd ? 'none' : 'lax',
		maxAge: COOKIE_MAX_AGE_MS,
		path: '/',
	});
};

const clearDeviceCookie = (res) => {
	const isProd = process.env.NODE_ENV === 'production';
	res.clearCookie(COOKIE_NAME, {
		httpOnly: true,
		secure: isProd,
		sameSite: isProd ? 'none' : 'lax',
		path: '/',
	});
};

// Upsert (and issue if needed) the device session row for the authenticated
// user. Returns:
//   { tokenHash }                      — active session (already existed)
//   { tokenHash, issued: true }        — new session (cookie was set on res)
//   { revoked: true }                  — the cookie's session was revoked
export const touchDevice = async (req, res, userId) => {
	const cookies = parseCookies(req.headers.cookie);
	let token = cookies.oc_device;
	let issued = false;

	if (!token) {
		token = generateToken();
		issued = true;
	}

	const tokenHash = hashToken(token);

	const { data: existing } = await supabase
		.from('device_sessions')
		.select('id, user_id, revoked_at')
		.eq('token_hash', tokenHash)
		.maybeSingle();

	if (existing?.revoked_at) {
		// Session revoked — don't refresh the cookie, signal to caller.
		return { revoked: true };
	}

	if (existing && existing.user_id !== userId) {
		// Cookie collision / stolen from another account — treat as a new device.
		token = generateToken();
		issued = true;
	}

	const finalHash = issued ? hashToken(token) : tokenHash;
	const nowIso = new Date().toISOString();

	await supabase
		.from('device_sessions')
		.upsert(
			{
				user_id: userId,
				token_hash: finalHash,
				ip: req.ip || null,
				user_agent: (req.headers['user-agent'] || '').slice(0, 500) || null,
				last_seen: nowIso,
			},
			{ onConflict: 'token_hash' },
		);

	if (issued) setDeviceCookie(res, token);
	return { tokenHash: finalHash, issued };
};

export const readDeviceTokenHash = (req) => {
	const cookies = parseCookies(req.headers.cookie);
	if (!cookies.oc_device) return null;
	return hashToken(cookies.oc_device);
};

export const listUserDevices = async (userId) => {
	const { data, error } = await supabase
		.from('device_sessions')
		.select('id, label, ip, user_agent, last_seen, created_at, token_hash')
		.eq('user_id', userId)
		.is('revoked_at', null)
		.order('last_seen', { ascending: false });
	if (error) throw error;
	return data ?? [];
};

export const revokeDevice = async (userId, deviceId) => {
	const { data, error } = await supabase
		.from('device_sessions')
		.update({ revoked_at: new Date().toISOString() })
		.eq('id', deviceId)
		.eq('user_id', userId)
		.is('revoked_at', null)
		.select('id')
		.maybeSingle();
	if (error) throw error;
	return !!data;
};

export const revokeOtherDevices = async (userId, currentTokenHash) => {
	let q = supabase
		.from('device_sessions')
		.update({ revoked_at: new Date().toISOString() })
		.eq('user_id', userId)
		.is('revoked_at', null);
	if (currentTokenHash) q = q.neq('token_hash', currentTokenHash);
	const { error, count } = await q.select('id', { count: 'exact' });
	if (error) throw error;
	return count ?? 0;
};

export { parseCookies, hashToken, setDeviceCookie, clearDeviceCookie };

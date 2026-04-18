import supabase from './supabaseClient.js';
import logger from './logger.js';

// Normalize an IPv6-mapped IPv4 address ("::ffff:1.2.3.4") to plain "1.2.3.4"
// so lookups match rows that may have been created with either form.
export const normalizeIp = (raw) => {
	if (!raw || typeof raw !== 'string') return null;
	const ip = raw.trim();
	if (ip.length === 0) return null;
	const mapped = ip.match(/^::ffff:([0-9.]+)$/i);
	return mapped ? mapped[1] : ip;
};

const toActive = (row) => {
	if (!row) return null;
	if (row.lifted_at) return null;
	if (!row.permanent && row.expires_at && new Date(row.expires_at) <= new Date()) return null;
	return row;
};

// Active (non-lifted, unexpired) sanction for a user, or null.
// Prefers bans over timeouts when both exist.
export const getActiveUserSanction = async (userId) => {
	if (!userId) return null;
	const { data, error } = await supabase
		.from('user_sanctions')
		.select('id, user_id, kind, permanent, reason, issued_at, expires_at, issued_by')
		.eq('user_id', userId)
		.is('lifted_at', null)
		.order('permanent', { ascending: false })
		.order('expires_at', { ascending: false });
	if (error) {
		logger.warn('getActiveUserSanction error:', error.message);
		return null;
	}
	const active = (data || []).map(toActive).filter(Boolean);
	if (active.length === 0) return null;
	return active.find((s) => s.kind === 'ban') || active.find((s) => s.kind === 'timeout') || null;
};

export const getActiveIpSanction = async (ip) => {
	const addr = normalizeIp(ip);
	if (!addr) return null;
	const { data, error } = await supabase
		.from('ip_sanctions')
		.select('id, ip, permanent, reason, issued_at, expires_at')
		.eq('ip', addr)
		.is('lifted_at', null);
	if (error) {
		logger.warn('getActiveIpSanction error:', error.message);
		return null;
	}
	const active = (data || []).map(toActive).filter(Boolean);
	return active[0] || null;
};

// In-memory throttle so we only upsert one row per (user, ip) pair every 5min.
const lastLogged = new Map();
const LOG_TTL_MS = 5 * 60 * 1000;

export const logUserIp = async (userId, ipRaw) => {
	const ip = normalizeIp(ipRaw);
	if (!userId || !ip) return;
	const key = `${userId}|${ip}`;
	const now = Date.now();
	const prev = lastLogged.get(key) || 0;
	if (now - prev < LOG_TTL_MS) return;
	lastLogged.set(key, now);

	try {
		const { error } = await supabase.rpc('bump_user_ip', { p_user: userId, p_ip: ip });
		if (error) logger.warn('bump_user_ip rpc failed:', error.message);
	} catch (err) {
		logger.warn('logUserIp error:', err?.message || err);
	}
};

// Recent IPs a user has hit the API from. Used by the moderation UI to offer
// matching IP-bans alongside a user ban.
export const listUserIps = async (userId, limit = 10) => {
	if (!userId) return [];
	const { data, error } = await supabase
		.from('user_ip_log')
		.select('ip, first_seen, last_seen, hit_count')
		.eq('user_id', userId)
		.order('last_seen', { ascending: false })
		.limit(limit);
	if (error) {
		logger.warn('listUserIps error:', error.message);
		return [];
	}
	return data || [];
};

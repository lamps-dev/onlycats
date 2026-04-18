import { supabase } from '../utils/supabaseClient.js';
import { selfHealRoleFor } from '../utils/roles.js';
import { getActiveUserSanction, logUserIp } from '../utils/sanctions.js';

// Authenticates the caller, runs the owner self-heal, logs the request IP
// against the user for moderation, and attaches any active sanction as
// req.userSanction. Does NOT itself block banned users — pair with
// `blockIfBanned` on routes that should be gated by bans.
export const authenticate = async (req, res, next) => {
	const header = req.headers.authorization || '';
	const token = header.startsWith('Bearer ') ? header.slice(7) : null;

	if (!token) {
		return res.status(401).json({ error: 'Missing bearer token' });
	}

	const { data, error } = await supabase.auth.getUser(token);
	if (error || !data?.user) {
		return res.status(401).json({ error: 'Invalid or expired session' });
	}

	req.user = data.user;
	req.accessToken = token;

	try {
		await selfHealRoleFor(data.user);
	} catch (_) { /* already logged inside */ }

	logUserIp(data.user.id, req.ip).catch(() => { /* logged inside */ });

	try {
		const sanction = await getActiveUserSanction(data.user.id);
		if (sanction) req.userSanction = sanction;
	} catch (_) { /* non-fatal */ }

	next();
};

// Blocks the request if the authenticated user is currently banned.
// Must be placed AFTER authenticate.
export const blockIfBanned = (req, res, next) => {
	const s = req.userSanction;
	if (s?.kind === 'ban') {
		return res.status(403).json({
			error: 'Account banned',
			code: 'BANNED',
			sanction: {
				kind: s.kind,
				permanent: s.permanent,
				reason: s.reason,
				expires_at: s.expires_at,
			},
		});
	}
	next();
};

// Blocks the request if the user is currently timed out (no post creation).
// Use on routes that create content.
export const blockIfTimedOut = (req, res, next) => {
	const s = req.userSanction;
	if (s?.kind === 'timeout' || s?.kind === 'ban') {
		return res.status(403).json({
			error: s.kind === 'ban' ? 'Account banned' : 'You are timed out from posting',
			code: s.kind === 'ban' ? 'BANNED' : 'TIMED_OUT',
			sanction: {
				kind: s.kind,
				permanent: s.permanent,
				reason: s.reason,
				expires_at: s.expires_at,
			},
		});
	}
	next();
};

// Default user auth: authenticates and blocks banned users. Existing routes
// continue importing this name and get the "blocked when banned" behavior.
// Routes that need to serve banned users (like /account/me) should import
// `authenticate` directly instead.
export const requireUser = (req, res, next) => {
	authenticate(req, res, (err) => {
		if (err) return next(err);
		blockIfBanned(req, res, next);
	});
};

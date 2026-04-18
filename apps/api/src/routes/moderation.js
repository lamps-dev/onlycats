import { Router } from 'express';
import { requireUser } from '../middleware/userAuthMiddleware.js';
import { requireRole } from '../middleware/requireRole.js';
import { ROLES } from '../utils/roles.js';
import supabase from '../utils/supabaseClient.js';
import logger from '../utils/logger.js';
import { listUserIps, normalizeIp } from '../utils/sanctions.js';

const router = Router();

// Whole router requires mod+ (owner passes the check too).
router.use(requireUser, requireRole(ROLES.MODERATOR));

const parseDuration = (hours) => {
	const h = Number(hours);
	if (!Number.isFinite(h) || h <= 0) return null;
	if (h > 24 * 365 * 10) return null; // cap at 10 years
	return new Date(Date.now() + h * 60 * 60 * 1000);
};

// GET /moderation/sanctions?active=true
router.get('/sanctions', async (req, res, next) => {
	try {
		const activeOnly = req.query.active !== 'false';
		let userQuery = supabase
			.from('user_sanctions')
			.select('id, user_id, kind, permanent, reason, issued_at, expires_at, lifted_at, lifted_by, issued_by')
			.order('issued_at', { ascending: false })
			.limit(200);
		let ipQuery = supabase
			.from('ip_sanctions')
			.select('id, ip, permanent, reason, issued_at, expires_at, lifted_at, lifted_by, issued_by')
			.order('issued_at', { ascending: false })
			.limit(200);
		if (activeOnly) {
			userQuery = userQuery.is('lifted_at', null);
			ipQuery   = ipQuery.is('lifted_at', null);
		}
		const [{ data: users, error: userErr }, { data: ips, error: ipErr }] = await Promise.all([userQuery, ipQuery]);
		if (userErr) return next(userErr);
		if (ipErr) return next(ipErr);

		// Hydrate target display names for user sanctions in a single query.
		const targetIds = [...new Set((users || []).map((r) => r.user_id).filter(Boolean))];
		let profilesById = new Map();
		if (targetIds.length > 0) {
			const { data: profiles } = await supabase
				.from('profiles')
				.select('id, display_name, avatar_url, role')
				.in('id', targetIds);
			profilesById = new Map((profiles || []).map((p) => [p.id, p]));
		}

		const now = Date.now();
		const isActive = (r) =>
			!r.lifted_at && (r.permanent || (r.expires_at && new Date(r.expires_at).getTime() > now));

		res.json({
			users: (users || []).map((r) => ({
				...r,
				active: isActive(r),
				target: profilesById.get(r.user_id) || null,
			})),
			ips: (ips || []).map((r) => ({ ...r, active: isActive(r) })),
		});
	} catch (err) {
		next(err);
	}
});

// GET /moderation/users/:id/ips — recent IPs the user hit our API from.
router.get('/users/:id/ips', async (req, res, next) => {
	try {
		const ips = await listUserIps(req.params.id, 20);
		res.json({ ips });
	} catch (err) {
		next(err);
	}
});

// POST /moderation/sanctions/user
// Body: { userId, kind: 'timeout'|'ban', durationHours?, permanent?, reason?, alsoIps?: string[] }
//   - Non-owner mods: permanent must be false.
//   - `alsoIps` creates matching IP sanctions in one call.
router.post('/sanctions/user', async (req, res, next) => {
	try {
		const { userId, kind, durationHours, permanent, reason, alsoIps } = req.body || {};
		if (!userId)                        return res.status(400).json({ error: 'userId is required' });
		if (kind !== 'timeout' && kind !== 'ban') return res.status(400).json({ error: 'kind must be "timeout" or "ban"' });

		const isPermanent = !!permanent;
		if (isPermanent && req.userRole !== ROLES.OWNER) {
			return res.status(403).json({ error: 'Only the owner can issue permanent sanctions', code: 'OWNER_ONLY' });
		}

		let expiresAt = null;
		if (!isPermanent) {
			expiresAt = parseDuration(durationHours);
			if (!expiresAt) return res.status(400).json({ error: 'durationHours must be a positive number' });
		}

		const { data: target, error: targetErr } = await supabase
			.from('profiles')
			.select('id, role, display_name')
			.eq('id', userId)
			.maybeSingle();
		if (targetErr) return next(targetErr);
		if (!target)   return res.status(404).json({ error: 'User not found' });
		if (target.role === ROLES.OWNER) return res.status(403).json({ error: 'Cannot sanction the owner' });
		if (target.id === req.user.id)   return res.status(400).json({ error: 'Cannot sanction yourself' });
		if (target.role === ROLES.MODERATOR && req.userRole !== ROLES.OWNER) {
			return res.status(403).json({ error: 'Only the owner can sanction moderators' });
		}

		const { data: inserted, error: insErr } = await supabase
			.from('user_sanctions')
			.insert({
				user_id: userId,
				kind,
				permanent: isPermanent,
				expires_at: expiresAt ? expiresAt.toISOString() : null,
				reason: typeof reason === 'string' ? reason.slice(0, 1000) : null,
				issued_by: req.user.id,
			})
			.select('id')
			.single();
		if (insErr) return next(insErr);

		let ipInserts = [];
		if (Array.isArray(alsoIps) && alsoIps.length > 0) {
			const rows = alsoIps
				.map((raw) => normalizeIp(raw))
				.filter(Boolean)
				.map((ip) => ({
					ip,
					permanent: isPermanent,
					expires_at: expiresAt ? expiresAt.toISOString() : null,
					reason: typeof reason === 'string' ? reason.slice(0, 1000) : null,
					issued_by: req.user.id,
				}));
			if (rows.length > 0) {
				const { data: ipRows, error: ipErr } = await supabase.from('ip_sanctions').insert(rows).select('id, ip');
				if (ipErr) logger.warn('Moderation: alsoIps insert failed:', ipErr.message);
				else ipInserts = ipRows || [];
			}
		}

		logger.info(
			`Moderation: ${req.userRole} ${req.user.id} issued ${kind}${isPermanent ? ' (permanent)' : ` until ${expiresAt.toISOString()}`} on user ${userId}`,
		);

		res.status(201).json({ id: inserted.id, ipSanctions: ipInserts });
	} catch (err) {
		next(err);
	}
});

// POST /moderation/sanctions/ip
// Body: { ip, durationHours?, permanent?, reason? }
router.post('/sanctions/ip', async (req, res, next) => {
	try {
		const { ip, durationHours, permanent, reason } = req.body || {};
		const normalized = normalizeIp(ip);
		if (!normalized) return res.status(400).json({ error: 'ip is required' });

		const isPermanent = !!permanent;
		if (isPermanent && req.userRole !== ROLES.OWNER) {
			return res.status(403).json({ error: 'Only the owner can issue permanent sanctions', code: 'OWNER_ONLY' });
		}
		let expiresAt = null;
		if (!isPermanent) {
			expiresAt = parseDuration(durationHours);
			if (!expiresAt) return res.status(400).json({ error: 'durationHours must be a positive number' });
		}

		const { data, error } = await supabase
			.from('ip_sanctions')
			.insert({
				ip: normalized,
				permanent: isPermanent,
				expires_at: expiresAt ? expiresAt.toISOString() : null,
				reason: typeof reason === 'string' ? reason.slice(0, 1000) : null,
				issued_by: req.user.id,
			})
			.select('id')
			.single();
		if (error) return next(error);

		logger.info(
			`Moderation: ${req.userRole} ${req.user.id} issued IP ${isPermanent ? 'permanent' : 'temp'} ban on ${normalized}`,
		);

		res.status(201).json({ id: data.id });
	} catch (err) {
		next(err);
	}
});

// POST /moderation/sanctions/user/:id/lift
// Mods can lift temporary sanctions; only owners can lift permanent ones.
router.post('/sanctions/user/:id/lift', async (req, res, next) => {
	try {
		const { data: row, error: fetchErr } = await supabase
			.from('user_sanctions')
			.select('id, permanent, lifted_at')
			.eq('id', req.params.id)
			.maybeSingle();
		if (fetchErr) return next(fetchErr);
		if (!row)     return res.status(404).json({ error: 'Sanction not found' });
		if (row.lifted_at) return res.status(400).json({ error: 'Already lifted' });
		if (row.permanent && req.userRole !== ROLES.OWNER) {
			return res.status(403).json({ error: 'Only the owner can lift a permanent sanction', code: 'OWNER_ONLY' });
		}

		const { error } = await supabase
			.from('user_sanctions')
			.update({ lifted_at: new Date().toISOString(), lifted_by: req.user.id })
			.eq('id', req.params.id);
		if (error) return next(error);
		res.json({ id: req.params.id, lifted: true });
	} catch (err) {
		next(err);
	}
});

// POST /moderation/sanctions/ip/:id/lift
router.post('/sanctions/ip/:id/lift', async (req, res, next) => {
	try {
		const { data: row, error: fetchErr } = await supabase
			.from('ip_sanctions')
			.select('id, permanent, lifted_at')
			.eq('id', req.params.id)
			.maybeSingle();
		if (fetchErr) return next(fetchErr);
		if (!row)     return res.status(404).json({ error: 'Sanction not found' });
		if (row.lifted_at) return res.status(400).json({ error: 'Already lifted' });
		if (row.permanent && req.userRole !== ROLES.OWNER) {
			return res.status(403).json({ error: 'Only the owner can lift a permanent sanction', code: 'OWNER_ONLY' });
		}

		const { error } = await supabase
			.from('ip_sanctions')
			.update({ lifted_at: new Date().toISOString(), lifted_by: req.user.id })
			.eq('id', req.params.id);
		if (error) return next(error);
		res.json({ id: req.params.id, lifted: true });
	} catch (err) {
		next(err);
	}
});

// GET /moderation/users?search=...&limit=50 — same shape as /admin/users but
// accessible to moderators (who can't access the owner-only admin router).
router.get('/users', async (req, res, next) => {
	try {
		const limit  = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
		const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
		let query = supabase
			.from('profiles')
			.select('id, display_name, avatar_url, role, created_at')
			.order('created_at', { ascending: false })
			.limit(limit);
		if (search.length > 0) query = query.ilike('display_name', `%${search}%`);
		const { data, error } = await query;
		if (error) return next(error);
		res.json({ users: data ?? [] });
	} catch (err) {
		next(err);
	}
});

export default router;

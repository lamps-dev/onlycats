import { Router } from 'express';
import { requireUser } from '../middleware/userAuthMiddleware.js';
import { requireRole } from '../middleware/requireRole.js';
import { ROLES } from '../utils/roles.js';
import supabase from '../utils/supabaseClient.js';
import logger from '../utils/logger.js';

const router = Router();

// Every route in this file requires the owner role.
router.use(requireUser, requireRole(ROLES.OWNER));

// GET /admin/users?search=foo&limit=50
// Lists profiles with id, display_name, role. Optional case-insensitive search
// against display_name.
router.get('/users', async (req, res, next) => {
	try {
		const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
		const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

		let query = supabase
			.from('profiles')
			.select('id, display_name, avatar_url, role, created_at')
			.order('created_at', { ascending: false })
			.limit(limit);

		if (search.length > 0) {
			query = query.ilike('display_name', `%${search}%`);
		}

		const { data, error } = await query;
		if (error) return next(error);
		res.json({ users: data ?? [] });
	} catch (err) {
		next(err);
	}
});

// POST /admin/users/:id/role
// Body: { role: 'user' | 'moderator' }
//
// Security:
//  - Already guarded at the router level (owner-only).
//  - Cannot target the current owner (so they can't demote themselves).
//  - Cannot promote anyone to 'owner' through this endpoint — owner is seeded
//    exclusively from the hard-coded Discord ID on startup.
router.post('/users/:id/role', async (req, res, next) => {
	try {
		const targetId = req.params.id;
		const { role } = req.body || {};

		if (role !== ROLES.USER && role !== ROLES.MODERATOR) {
			return res.status(400).json({
				error: `Invalid role. Allowed: ${ROLES.USER}, ${ROLES.MODERATOR}`,
			});
		}

		const { data: target, error: targetErr } = await supabase
			.from('profiles')
			.select('id, role, display_name')
			.eq('id', targetId)
			.maybeSingle();
		if (targetErr) return next(targetErr);
		if (!target) return res.status(404).json({ error: 'User not found' });

		if (target.role === ROLES.OWNER) {
			return res.status(403).json({ error: 'Cannot change the owner\'s role' });
		}
		if (target.id === req.user.id) {
			return res.status(400).json({ error: 'Cannot change your own role' });
		}

		const { error: updateErr } = await supabase
			.from('profiles')
			.update({ role })
			.eq('id', targetId);
		if (updateErr) return next(updateErr);

		logger.info(
			`Admin: owner ${req.user.id} set role="${role}" on user ${targetId} (${target.display_name})`,
		);

		res.json({ id: targetId, role });
	} catch (err) {
		next(err);
	}
});

export default router;

import { ROLES, getUserRole } from '../utils/roles.js';

// Attaches req.userRole and enforces that the authenticated user has at least
// the given role. Must be placed AFTER requireUser so req.user is populated.
//
// Usage:
//   router.use(requireUser, requireRole(ROLES.MODERATOR));
//   router.use(requireUser, requireRole(ROLES.OWNER));
export const requireRole = (minRole) => {
	const rank = { [ROLES.USER]: 0, [ROLES.MODERATOR]: 1, [ROLES.OWNER]: 2 };
	const minRank = rank[minRole];
	if (minRank === undefined) throw new Error(`Invalid role: ${minRole}`);

	return async (req, res, next) => {
		try {
			if (!req.user?.id) {
				return res.status(401).json({ error: 'Not authenticated' });
			}
			const role = await getUserRole(req.user.id);
			req.userRole = role;
			if ((rank[role] ?? 0) < minRank) {
				return res.status(403).json({ error: 'Insufficient permissions' });
			}
			next();
		} catch (err) {
			next(err);
		}
	};
};

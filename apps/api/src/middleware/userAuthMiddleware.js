import { supabase } from '../utils/supabaseClient.js';
import { selfHealRoleFor } from '../utils/roles.js';

export const requireUser = async (req, res, next) => {
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

	// Self-heal the owner's role based on their Discord identity. Cached per-user
	// for 60s (inside selfHealRoleFor), so after the first hit this becomes a
	// cheap in-memory check. We await so downstream requireRole() sees the
	// updated row.
	try {
		await selfHealRoleFor(data.user);
	} catch (_) { /* already logged inside */ }

	next();
};

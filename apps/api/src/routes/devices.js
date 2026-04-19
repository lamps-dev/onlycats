import { Router } from 'express';
import { authenticate } from '../middleware/userAuthMiddleware.js';
import {
	listUserDevices,
	revokeDevice,
	revokeOtherDevices,
	clearDeviceCookie,
} from '../utils/devices.js';

const router = Router();

// All /devices routes require an authenticated user. Banned users can still
// manage their devices (useful for revoking a stolen-token device), so we use
// bare `authenticate` here rather than `requireUser`.
router.use(authenticate);

router.get('/me', async (req, res) => {
	try {
		const devices = await listUserDevices(req.user.id);
		return res.json({
			current_token_hash: req.deviceTokenHash ?? null,
			devices: devices.map((d) => ({
				id: d.id,
				label: d.label,
				ip: d.ip,
				user_agent: d.user_agent,
				last_seen: d.last_seen,
				created_at: d.created_at,
				is_current: req.deviceTokenHash && d.token_hash === req.deviceTokenHash,
			})),
		});
	} catch (err) {
		console.error('List devices failed:', err);
		return res.status(500).json({ error: 'Could not list devices' });
	}
});

router.delete('/:id', async (req, res) => {
	const { id } = req.params;
	try {
		const ok = await revokeDevice(req.user.id, id);
		if (!ok) return res.status(404).json({ error: 'Device not found' });
		return res.json({ ok: true });
	} catch (err) {
		console.error('Revoke device failed:', err);
		return res.status(500).json({ error: 'Could not revoke device' });
	}
});

router.post('/revoke-others', async (req, res) => {
	try {
		const n = await revokeOtherDevices(req.user.id, req.deviceTokenHash);
		return res.json({ ok: true, revoked: n });
	} catch (err) {
		console.error('Revoke other devices failed:', err);
		return res.status(500).json({ error: 'Could not revoke other devices' });
	}
});

router.post('/sign-out', (req, res) => {
	// Client is about to call supabase.signOut — clear our tracking cookie too.
	clearDeviceCookie(res);
	return res.json({ ok: true });
});

export default router;

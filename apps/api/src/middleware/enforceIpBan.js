import { getActiveIpSanction } from '../utils/sanctions.js';

// App-level middleware: reject requests from IPs with an active sanction.
// Sits behind `app.set('trust proxy', true)` so req.ip honors X-Forwarded-For.
export const enforceIpBan = async (req, res, next) => {
	try {
		const sanction = await getActiveIpSanction(req.ip);
		if (sanction) {
			return res.status(403).json({
				error: 'IP blocked',
				code: 'IP_BANNED',
				sanction: {
					permanent: sanction.permanent,
					reason: sanction.reason,
					expires_at: sanction.expires_at,
				},
			});
		}
		next();
	} catch (_) {
		next();
	}
};

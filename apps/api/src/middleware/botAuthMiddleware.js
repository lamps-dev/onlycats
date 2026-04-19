import supabase from '../utils/supabaseClient.js';
import { lookupBotByToken } from '../utils/bots.js';

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_HOUR = Number(process.env.BOT_RATE_LIMIT) || 50;

// Bot auth: validates the ocb_ Bearer token, enforces the per-hour quota by
// counting rows in bot_request_log, and logs the request after the response
// settles. Populates req.bot and req.botTokenId for downstream handlers.
export const requireBot = async (req, res, next) => {
	try {
		const header = req.headers.authorization || '';
		const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
		if (!token) {
			return res.status(401).json({ error: 'Missing bot token', code: 'UNAUTHORIZED' });
		}

		const tokenRow = await lookupBotByToken(token);
		if (!tokenRow) {
			return res.status(401).json({ error: 'Invalid or revoked bot token', code: 'INVALID_TOKEN' });
		}

		const since = new Date(Date.now() - WINDOW_MS).toISOString();
		const { count, error: countErr } = await supabase
			.from('bot_request_log')
			.select('id', { head: true, count: 'exact' })
			.eq('bot_id', tokenRow.bot_id)
			.gte('created_at', since);
		if (countErr) {
			return res.status(500).json({ error: 'Rate-limit check failed', code: 'INTERNAL' });
		}

		const used = count ?? 0;
		const remaining = Math.max(0, MAX_REQUESTS_PER_HOUR - used);
		res.set('X-RateLimit-Limit', String(MAX_REQUESTS_PER_HOUR));
		res.set('X-RateLimit-Remaining', String(remaining));
		res.set('X-RateLimit-Window', '3600');

		if (used >= MAX_REQUESTS_PER_HOUR) {
			res.set('Retry-After', '3600');
			return res.status(429).json({
				error: `Rate limit exceeded (${MAX_REQUESTS_PER_HOUR} requests/hour)`,
				code: 'RATE_LIMITED',
			});
		}

		req.bot = tokenRow.bot;
		req.botTokenId = tokenRow.id;

		res.on('finish', () => {
			supabase
				.from('bot_request_log')
				.insert({
					bot_id: tokenRow.bot_id,
					endpoint: req.originalUrl || req.url,
					status_code: res.statusCode,
				})
				.then(() => {});
			supabase
				.from('bot_tokens')
				.update({ last_used: new Date().toISOString() })
				.eq('id', tokenRow.id)
				.then(() => {});
		});

		next();
	} catch (err) {
		next(err);
	}
};

import supabase from '../utils/supabaseClient.js';
import logger from '../utils/logger.js';
import { HttpError } from './error.js';

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = Number(process.env.API_KEY_RATE_LIMIT) || 100;

const buckets = new Map();

setInterval(() => {
	const now = Date.now();
	for (const [key, bucket] of buckets) {
		if (now > bucket.resetTime) buckets.delete(key);
	}
}, WINDOW_MS).unref();

const consumeToken = (key) => {
	const now = Date.now();
	const bucket = buckets.get(key);

	if (!bucket || now > bucket.resetTime) {
		buckets.set(key, { count: 1, resetTime: now + WINDOW_MS });
		return { remaining: MAX_REQUESTS - 1, resetTime: now + WINDOW_MS };
	}

	if (bucket.count >= MAX_REQUESTS) {
		return { limited: true, remaining: 0, resetTime: bucket.resetTime };
	}

	bucket.count += 1;
	return { remaining: MAX_REQUESTS - bucket.count, resetTime: bucket.resetTime };
};

export const apiKeyMiddleware = async (req, res, next) => {
	try {
		const authHeader = req.headers.authorization || '';
		if (!authHeader.startsWith('Bearer ')) {
			throw new HttpError(401, 'Missing or invalid Authorization header', 'UNAUTHORIZED');
		}

		const apiKey = authHeader.slice(7).trim();
		if (!apiKey) throw new HttpError(401, 'Missing API key', 'UNAUTHORIZED');

		const { data: keyRecord, error } = await supabase
			.from('api_keys')
			.select('id, user_id, revoked')
			.eq('key', apiKey)
			.eq('revoked', false)
			.maybeSingle();

		if (error) {
			logger.error('api_keys lookup failed:', error.message);
			throw new HttpError(500, 'Internal error', 'INTERNAL');
		}
		if (!keyRecord) {
			throw new HttpError(401, 'Invalid or revoked API key', 'INVALID_KEY');
		}

		const { limited, remaining, resetTime } = consumeToken(apiKey);
		res.set('X-RateLimit-Limit', String(MAX_REQUESTS));
		res.set('X-RateLimit-Remaining', String(remaining));
		res.set('X-RateLimit-Reset', String(Math.floor(resetTime / 1000)));

		if (limited) {
			res.set('Retry-After', String(Math.ceil((resetTime - Date.now()) / 1000)));
			throw new HttpError(429, 'Rate limit exceeded', 'RATE_LIMITED');
		}

		supabase
			.from('api_keys')
			.update({ last_used: new Date().toISOString() })
			.eq('id', keyRecord.id)
			.then(({ error: updateErr }) => {
				if (updateErr) logger.warn('Failed to update api_keys.last_used:', updateErr.message);
			});

		req.apiKey = keyRecord;
		next();
	} catch (err) {
		next(err);
	}
};

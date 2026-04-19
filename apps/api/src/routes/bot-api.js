import { Router } from 'express';
import crypto from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireBot } from '../middleware/botAuthMiddleware.js';
import supabase from '../utils/supabaseClient.js';
import { r2, R2_BUCKET_NAME, R2_PUBLIC_BASE } from '../utils/r2Client.js';

const router = Router();

const MAX_CAPTION = 2000;
const DUPE_WINDOW_MS = 60 * 60 * 1000;

const BOT_ALLOWED_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'video/mp4',
	'video/webm',
]);
const BOT_MAX_BYTES = 20 * 1024 * 1024;
const extFromType = (type) => ({
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/gif': 'gif',
	'image/webp': 'webp',
	'video/mp4': 'mp4',
	'video/webm': 'webm',
}[type] || null);

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(requireBot);

// POST /bot/v1/uploads/sign — request a presigned R2 upload URL for the bot.
// Body: { contentType: string, size?: number }
// Returns: { uploadUrl, publicUrl, key } — PUT the file to uploadUrl, then
// call POST /bot/v1/posts with file_url = publicUrl.
router.post(
	'/v1/uploads/sign',
	asyncHandler(async (req, res) => {
		const { contentType, size } = req.body || {};
		if (!BOT_ALLOWED_TYPES.has(contentType)) {
			return res.status(400).json({ error: 'Unsupported content type', code: 'BAD_TYPE' });
		}
		if (typeof size === 'number' && size > BOT_MAX_BYTES) {
			return res.status(400).json({ error: 'File too large (max 20MB)', code: 'TOO_LARGE' });
		}
		const ext = extFromType(contentType);
		const key = `${req.bot.id}/${crypto.randomUUID()}.${ext}`;
		const command = new PutObjectCommand({
			Bucket: R2_BUCKET_NAME,
			Key: key,
			ContentType: contentType,
		});
		const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 });
		const publicUrl = `${R2_PUBLIC_BASE}/${key}`;
		res.json({ uploadUrl, publicUrl, key });
	}),
);

// GET /bot/v1/me — who am I?
router.get('/v1/me', (req, res) => {
	res.json({
		bot: {
			id: req.bot.id,
			display_name: req.bot.display_name,
			avatar_url: req.bot.avatar_url,
		},
	});
});

// POST /bot/v1/posts — create content as this bot.
// Body: { file_url: string, caption?: string }
router.post(
	'/v1/posts',
	asyncHandler(async (req, res) => {
		const { file_url, caption } = req.body || {};
		if (typeof file_url !== 'string' || !file_url.trim()) {
			return res.status(400).json({ error: 'file_url is required', code: 'BAD_REQUEST' });
		}

		let cap = null;
		if (caption != null) {
			if (typeof caption !== 'string') {
				return res.status(400).json({ error: 'caption must be a string', code: 'BAD_REQUEST' });
			}
			cap = caption.slice(0, MAX_CAPTION).trim() || null;
		}

		// Spam guard: identical caption posted in the last hour blocks the write.
		if (cap) {
			const since = new Date(Date.now() - DUPE_WINDOW_MS).toISOString();
			const { data: dupes } = await supabase
				.from('content')
				.select('id')
				.eq('creator_id', req.bot.id)
				.eq('caption', cap)
				.gte('created_at', since)
				.limit(1);
			if (dupes && dupes.length > 0) {
				return res.status(429).json({
					error: 'Duplicate caption posted within the last hour',
					code: 'SPAM_DUPLICATE',
				});
			}
		}

		const { data, error } = await supabase
			.from('content')
			.insert({ creator_id: req.bot.id, file_url: file_url.trim(), caption: cap })
			.select('id, caption, file_url, created_at, like_count, tip_count')
			.single();
		if (error) return res.status(500).json({ error: error.message, code: 'DB_ERROR' });

		res.status(201).json({ post: data });
	}),
);

// DELETE /bot/v1/posts/:id — bot deletes its own post.
router.delete(
	'/v1/posts/:id',
	asyncHandler(async (req, res) => {
		const { error } = await supabase
			.from('content')
			.delete()
			.eq('id', req.params.id)
			.eq('creator_id', req.bot.id);
		if (error) return res.status(500).json({ error: error.message, code: 'DB_ERROR' });
		res.status(204).end();
	}),
);

export default router;

import { Router } from 'express';
import crypto from 'node:crypto';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2, R2_BUCKET_NAME, R2_PUBLIC_BASE, keyFromPublicUrl } from '../utils/r2Client.js';
import { requireUser, blockIfTimedOut } from '../middleware/userAuthMiddleware.js';
import supabase from '../utils/supabaseClient.js';
import { getUserRole, ROLES } from '../utils/roles.js';
import logger from '../utils/logger.js';

const ALLOWED_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'video/mp4',
	'video/webm',
]);

const MAX_BYTES = 20 * 1024 * 1024;

const extFromType = (type) => {
	switch (type) {
		case 'image/jpeg': return 'jpg';
		case 'image/png':  return 'png';
		case 'image/gif':  return 'gif';
		case 'image/webp': return 'webp';
		case 'video/mp4':  return 'mp4';
		case 'video/webm': return 'webm';
		default: return null;
	}
};

const router = Router();

router.post('/sign', requireUser, blockIfTimedOut, async (req, res, next) => {
	try {
		const { contentType, size } = req.body || {};

		if (!ALLOWED_TYPES.has(contentType)) {
			return res.status(400).json({ error: 'Unsupported content type' });
		}
		if (typeof size === 'number' && size > MAX_BYTES) {
			return res.status(400).json({ error: 'File too large (max 20MB)' });
		}

		const ext = extFromType(contentType);
		const key = `${req.user.id}/${crypto.randomUUID()}.${ext}`;

		const command = new PutObjectCommand({
			Bucket: R2_BUCKET_NAME,
			Key: key,
			ContentType: contentType,
		});

		const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 });
		const publicUrl = `${R2_PUBLIC_BASE}/${key}`;

		res.json({ uploadUrl, publicUrl, key });
	} catch (err) {
		next(err);
	}
});

// DELETE /uploads/content/:id — delete a post (row in `content`) and its R2 object.
// Author can delete own post; moderator/owner can delete any post.
router.delete('/content/:id', requireUser, async (req, res, next) => {
	try {
		const { id } = req.params;
		if (!id) return res.status(400).json({ error: 'Missing content id' });

		const { data: row, error: fetchErr } = await supabase
			.from('content')
			.select('id, creator_id, file_url')
			.eq('id', id)
			.maybeSingle();

		if (fetchErr) return next(fetchErr);
		if (!row) return res.status(404).json({ error: 'Post not found' });

		const role = await getUserRole(req.user.id);
		const isOwnPost = row.creator_id === req.user.id;
		const isModOrOwner = role === ROLES.MODERATOR || role === ROLES.OWNER;

		if (!isOwnPost && !isModOrOwner) {
			return res.status(403).json({ error: 'Not allowed to delete this post' });
		}

		const objectKey = keyFromPublicUrl(row.file_url);
		if (objectKey) {
			try {
				await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: objectKey }));
			} catch (r2Err) {
				// Log but do not fail — the DB row is the source of truth for the UI.
				console.error('R2 object delete failed:', r2Err?.message || r2Err);
			}
		}

		// When mod/owner moderates someone else's post, don't constrain by creator.
		const q = supabase.from('content').delete().eq('id', id);
		const { error: deleteErr } = isOwnPost ? await q.eq('creator_id', req.user.id) : await q;
		if (deleteErr) return next(deleteErr);

		if (!isOwnPost) {
			logger.info(
				`Moderation: role=${role} actor=${req.user.id} deleted post ${id} owned by ${row.creator_id}`,
			);
		}

		res.status(204).end();
	} catch (err) {
		next(err);
	}
});

export default router;

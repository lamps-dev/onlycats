import { Router } from 'express';
import crypto from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2, R2_BUCKET_NAME, R2_PUBLIC_BASE } from '../utils/r2Client.js';
import { requireUser } from '../middleware/userAuthMiddleware.js';

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

router.post('/sign', requireUser, async (req, res, next) => {
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

export default router;

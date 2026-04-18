import { Router } from 'express';
import pb from '../utils/pocketbaseClient.js';
import { apiKeyMiddleware } from '../middleware/apiKeyMiddleware.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const toPhoto = (content, creator) => ({
	id: content.id,
	caption: content.caption,
	file: pb.files.getURL(content, content.file),
	creator: {
		name: creator?.name ?? null,
		avatar: creator?.avatar ? pb.files.getURL(creator, creator.avatar) : null,
	},
	likeCount: content.like_count ?? 0,
	tipCount: content.tip_count ?? 0,
	created: content.created,
});

router.use(apiKeyMiddleware);

router.get(
	'/v1/photos',
	asyncHandler(async (req, res) => {
		const page = Math.max(1, Number(req.query.page) || 1);
		const perPage = Math.min(100, Math.max(1, Number(req.query.perPage) || 20));

		const result = await pb.collection('content').getList(page, perPage, {
			expand: 'creatorId',
			sort: '-created',
		});

		res.json({
			page: result.page,
			perPage: result.perPage,
			totalItems: result.totalItems,
			totalPages: result.totalPages,
			items: result.items.map((r) => toPhoto(r, pb.getExpandedOne(r, 'creatorId'))),
		});
	}),
);

router.get(
	'/v1/photos/random',
	asyncHandler(async (req, res) => {
		const { totalItems } = await pb.collection('content').getList(1, 1);
		if (!totalItems) throw new HttpError(404, 'No content available', 'NO_CONTENT');

		const offset = Math.floor(Math.random() * totalItems);
		const { items } = await pb.collection('content').getList(offset + 1, 1, {
			expand: 'creatorId',
		});

		const record = items[0];
		res.json(toPhoto(record, pb.getExpandedOne(record, 'creatorId')));
	}),
);

export default router;

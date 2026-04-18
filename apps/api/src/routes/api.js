import { Router } from 'express';
import supabase from '../utils/supabaseClient.js';
import { apiKeyMiddleware } from '../middleware/apiKeyMiddleware.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const toPhoto = (row) => ({
	id: row.id,
	caption: row.caption,
	photoUrl: row.file_url,
	creator: {
		id: row.creator?.id ?? row.creator_id,
		name: row.creator?.display_name ?? null,
		avatar: row.creator?.avatar_url ?? null,
	},
	likeCount: row.like_count ?? 0,
	tipCount: row.tip_count ?? 0,
	created: row.created_at,
});

const CONTENT_SELECT = 'id, caption, file_url, like_count, tip_count, created_at, creator_id, creator:profiles!creator_id(id, display_name, avatar_url)';

router.use(apiKeyMiddleware);

router.get(
	'/v1/photos',
	asyncHandler(async (req, res) => {
		const page = Math.max(1, Number(req.query.page) || 1);
		const perPage = Math.min(100, Math.max(1, Number(req.query.perPage) || 20));
		const from = (page - 1) * perPage;
		const to = from + perPage - 1;

		const { data, count, error } = await supabase
			.from('content')
			.select(CONTENT_SELECT, { count: 'exact' })
			.order('created_at', { ascending: false })
			.range(from, to);

		if (error) throw new HttpError(500, error.message, 'DB_ERROR');

		const totalItems = count ?? 0;
		res.json({
			page,
			perPage,
			totalItems,
			totalPages: Math.max(1, Math.ceil(totalItems / perPage)),
			items: (data ?? []).map(toPhoto),
		});
	}),
);

router.get(
	'/v1/photos/random',
	asyncHandler(async (req, res) => {
		const { count, error: countErr } = await supabase
			.from('content')
			.select('id', { count: 'exact', head: true });
		if (countErr) throw new HttpError(500, countErr.message, 'DB_ERROR');
		if (!count) throw new HttpError(404, 'No content available', 'NO_CONTENT');

		const offset = Math.floor(Math.random() * count);
		const { data, error } = await supabase
			.from('content')
			.select(CONTENT_SELECT)
			.order('created_at', { ascending: false })
			.range(offset, offset);

		if (error) throw new HttpError(500, error.message, 'DB_ERROR');
		if (!data?.length) throw new HttpError(404, 'No content available', 'NO_CONTENT');

		res.json(toPhoto(data[0]));
	}),
);

export default router;

import { Router } from 'express';
import crypto from 'node:crypto';
import { requireUser } from '../middleware/userAuthMiddleware.js';
import supabase from '../utils/supabaseClient.js';
import { generateBotToken, hashBotToken, shortPrefix } from '../utils/bots.js';

const router = Router();

const MAX_BOTS_PER_USER = 5;
const MAX_DISPLAY_NAME = 64;
const MAX_BIO = 200;

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const countUserBots = async (userId) => {
	const { count } = await supabase
		.from('profiles')
		.select('id', { head: true, count: 'exact' })
		.eq('bot_owner_id', userId)
		.eq('is_bot', true);
	return count ?? 0;
};

const ensureOwnedBot = async (botId, userId) => {
	const { data } = await supabase
		.from('profiles')
		.select('id, display_name, bio, avatar_url, is_bot, bot_owner_id, created_at')
		.eq('id', botId)
		.maybeSingle();
	if (!data || !data.is_bot || data.bot_owner_id !== userId) return null;
	return data;
};

// POST /bots — create a new bot account and issue its first token.
router.post(
	'/',
	requireUser,
	asyncHandler(async (req, res) => {
		const { display_name, bio } = req.body || {};
		const name = typeof display_name === 'string' ? display_name.trim() : '';
		if (!name) return res.status(400).json({ error: 'display_name is required' });
		if (name.length > MAX_DISPLAY_NAME) {
			return res.status(400).json({ error: `display_name too long (max ${MAX_DISPLAY_NAME})` });
		}

		const used = await countUserBots(req.user.id);
		if (used >= MAX_BOTS_PER_USER) {
			return res.status(400).json({
				error: `Bot limit reached (max ${MAX_BOTS_PER_USER} per user)`,
				code: 'BOT_LIMIT',
			});
		}

		const botId = crypto.randomUUID();
		const { data: bot, error: insErr } = await supabase
			.from('profiles')
			.insert({
				id: botId,
				display_name: name,
				bio: typeof bio === 'string' && bio.trim() ? bio.trim().slice(0, MAX_BIO) : null,
				is_bot: true,
				bot_owner_id: req.user.id,
			})
			.select('id, display_name, bio, avatar_url, is_bot, created_at')
			.single();
		if (insErr) return res.status(500).json({ error: insErr.message });

		const token = generateBotToken();
		const { error: tokErr } = await supabase.from('bot_tokens').insert({
			bot_id: bot.id,
			token_hash: hashBotToken(token),
			token_prefix: shortPrefix(token),
		});
		if (tokErr) {
			await supabase.from('profiles').delete().eq('id', bot.id);
			return res.status(500).json({ error: tokErr.message });
		}

		res.status(201).json({ bot, token });
	}),
);

// GET /bots — list my bots with token prefixes and last-hour usage.
router.get(
	'/',
	requireUser,
	asyncHandler(async (req, res) => {
		const { data: bots, error } = await supabase
			.from('profiles')
			.select('id, display_name, bio, avatar_url, created_at')
			.eq('bot_owner_id', req.user.id)
			.eq('is_bot', true)
			.order('created_at', { ascending: false });
		if (error) return res.status(500).json({ error: error.message });

		const ids = (bots ?? []).map((b) => b.id);
		const tokensByBot = {};
		const usageByBot = {};

		if (ids.length) {
			const { data: tokens } = await supabase
				.from('bot_tokens')
				.select('id, bot_id, token_prefix, revoked, last_used, created_at')
				.in('bot_id', ids)
				.order('created_at', { ascending: false });
			for (const t of tokens ?? []) {
				(tokensByBot[t.bot_id] ??= []).push(t);
			}

			const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
			const { data: usage } = await supabase
				.from('bot_request_log')
				.select('bot_id')
				.in('bot_id', ids)
				.gte('created_at', since);
			for (const u of usage ?? []) {
				usageByBot[u.bot_id] = (usageByBot[u.bot_id] || 0) + 1;
			}
		}

		res.json({
			bots: (bots ?? []).map((b) => ({
				...b,
				tokens: tokensByBot[b.id] ?? [],
				requests_last_hour: usageByBot[b.id] ?? 0,
			})),
			limit: MAX_BOTS_PER_USER,
		});
	}),
);

// DELETE /bots/:id — delete bot, its content, tokens, and logs via cascades.
router.delete(
	'/:id',
	requireUser,
	asyncHandler(async (req, res) => {
		const bot = await ensureOwnedBot(req.params.id, req.user.id);
		if (!bot) return res.status(404).json({ error: 'Bot not found' });
		const { error } = await supabase.from('profiles').delete().eq('id', bot.id);
		if (error) return res.status(500).json({ error: error.message });
		res.status(204).end();
	}),
);

// POST /bots/:id/rotate — revoke all existing tokens, issue a new one.
router.post(
	'/:id/rotate',
	requireUser,
	asyncHandler(async (req, res) => {
		const bot = await ensureOwnedBot(req.params.id, req.user.id);
		if (!bot) return res.status(404).json({ error: 'Bot not found' });
		await supabase.from('bot_tokens').update({ revoked: true }).eq('bot_id', bot.id);
		const token = generateBotToken();
		const { error } = await supabase.from('bot_tokens').insert({
			bot_id: bot.id,
			token_hash: hashBotToken(token),
			token_prefix: shortPrefix(token),
		});
		if (error) return res.status(500).json({ error: error.message });
		res.json({ token });
	}),
);

export default router;

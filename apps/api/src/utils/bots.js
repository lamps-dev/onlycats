import crypto from 'node:crypto';
import supabase from './supabaseClient.js';

export const BOT_TOKEN_PREFIX = 'ocb_';

export const generateBotToken = () => `${BOT_TOKEN_PREFIX}${crypto.randomBytes(32).toString('base64url')}`;

export const hashBotToken = (token) =>
	crypto.createHash('sha256').update(String(token), 'utf8').digest('hex');

// First 12 chars are safe to show in UIs as a stable identifier.
export const shortPrefix = (token) => String(token).slice(0, 12);

export const lookupBotByToken = async (token) => {
	if (typeof token !== 'string' || !token.startsWith(BOT_TOKEN_PREFIX)) return null;
	const hash = hashBotToken(token);
	const { data, error } = await supabase
		.from('bot_tokens')
		.select('id, bot_id, revoked, bot:profiles!bot_id(id, display_name, avatar_url, bot_owner_id, is_bot)')
		.eq('token_hash', hash)
		.maybeSingle();
	if (error || !data || data.revoked) return null;
	if (!data.bot?.is_bot) return null;
	return data;
};

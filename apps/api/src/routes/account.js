import { Router } from 'express';
import { ListObjectsV2Command, DeleteObjectsCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2, R2_BUCKET_NAME, keyFromPublicUrl } from '../utils/r2Client.js';
import { requireUser, authenticate, blockIfTimedOut } from '../middleware/userAuthMiddleware.js';
import supabase from '../utils/supabaseClient.js';
import logger from '../utils/logger.js';
import { getUserRole } from '../utils/roles.js';

const router = Router();

// GET /account/me — returns { id, role, sanction? } for the caller. Used by
// the frontend to decide whether to show admin/moderator UI, and to render a
// banned/timeout screen when the caller has an active sanction. Uses bare
// `authenticate` so banned users still receive their ban details.
// Best-effort: remove an R2 object only if it lives under this user's prefix.
const deleteUserR2ObjectIfOwned = async (userId, publicUrl) => {
	const key = keyFromPublicUrl(publicUrl);
	if (!key) return;
	const prefix = `${userId}/`;
	if (!key.startsWith(prefix)) return;
	try {
		await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
	} catch (r2Err) {
		logger.warn?.(`R2 avatar delete failed for ${key}: ${r2Err?.message || r2Err}`);
	}
};

// POST /account/avatar — set profile photo URL (after client PUT to signed URL), and delete the previous R2 file when it was ours.
// Body: { publicUrl: string | null }
router.post('/avatar', requireUser, blockIfTimedOut, async (req, res, next) => {
	try {
		const { publicUrl } = req.body || {};
		const userId = req.user.id;

		const { data: profile, error: fetchErr } = await supabase
			.from('profiles')
			.select('avatar_url')
			.eq('id', userId)
			.maybeSingle();
		if (fetchErr) return next(fetchErr);

		const oldUrl = profile?.avatar_url ?? null;
		let newUrl = null;

		if (publicUrl === null || publicUrl === undefined || publicUrl === '') {
			newUrl = null;
		} else if (typeof publicUrl === 'string') {
			const key = keyFromPublicUrl(publicUrl);
			if (!key) {
				return res.status(400).json({ error: 'Invalid image URL' });
			}
			if (!key.startsWith(`${userId}/`)) {
				return res.status(403).json({ error: 'Image must be uploaded to your own storage path' });
			}
			newUrl = publicUrl;
		} else {
			return res.status(400).json({ error: 'publicUrl must be a string or null' });
		}

		const { error: updErr } = await supabase
			.from('profiles')
			.update({ avatar_url: newUrl })
			.eq('id', userId);
		if (updErr) return next(updErr);

		if (oldUrl && oldUrl !== newUrl) {
			await deleteUserR2ObjectIfOwned(userId, oldUrl);
		}

		res.json({ avatar_url: newUrl });
	} catch (err) {
		next(err);
	}
});

router.get('/me', authenticate, async (req, res, next) => {
	try {
		const role = await getUserRole(req.user.id);
		const s = req.userSanction;
		const sanction = s
			? {
				kind: s.kind,
				permanent: s.permanent,
				reason: s.reason,
				issued_at: s.issued_at,
				expires_at: s.expires_at,
			}
			: null;
		res.json({ id: req.user.id, role, sanction });
	} catch (err) {
		next(err);
	}
});

// Delete every R2 object under the user's prefix (we store uploads at `${userId}/...`).
const wipeR2ForUser = async (userId) => {
	const Prefix = `${userId}/`;
	let ContinuationToken = undefined;
	let total = 0;

	do {
		const listed = await r2.send(
			new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME, Prefix, ContinuationToken }),
		);
		const objects = (listed.Contents ?? []).map((o) => ({ Key: o.Key })).filter((o) => o.Key);
		if (objects.length > 0) {
			await r2.send(
				new DeleteObjectsCommand({
					Bucket: R2_BUCKET_NAME,
					Delete: { Objects: objects, Quiet: true },
				}),
			);
			total += objects.length;
		}
		ContinuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
	} while (ContinuationToken);

	return total;
};

// DELETE /account
// Body: { password: string, confirmationText: string }
// confirmationText must equal `OnlyCats / <display_name>` (falls back to email local-part if no display_name).
router.delete('/', requireUser, async (req, res, next) => {
	try {
		const { password, confirmationText } = req.body || {};
		const userId = req.user.id;
		const email = req.user.email;

		if (typeof password !== 'string' || password.length === 0) {
			return res.status(400).json({ error: 'Password is required' });
		}
		if (typeof confirmationText !== 'string' || confirmationText.length === 0) {
			return res.status(400).json({ error: 'Confirmation text is required' });
		}
		if (!email) {
			return res.status(400).json({ error: 'Account has no email on file' });
		}

		// Re-verify password. signInWithPassword does not mutate the caller's existing session.
		const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
		if (authErr) {
			return res.status(401).json({ error: 'Incorrect password' });
		}

		// Build expected confirmation string from the user's profile.
		const { data: profile } = await supabase
			.from('profiles')
			.select('display_name')
			.eq('id', userId)
			.maybeSingle();
		const accountName = profile?.display_name || email.split('@')[0];
		const expected = `OnlyCats / ${accountName}`;
		if (confirmationText.trim() !== expected) {
			return res.status(400).json({
				error: `Confirmation text must be exactly: ${expected}`,
			});
		}

		// 1. Wipe R2 objects under the user's prefix.
		try {
			const count = await wipeR2ForUser(userId);
			logger.info?.(`Deleted ${count} R2 objects for user ${userId}`);
		} catch (r2Err) {
			logger.error?.('R2 wipe failed:', r2Err?.message || r2Err);
			// Continue — we still want to delete the account.
		}

		// 2. Wipe DB rows. Order matters because of FKs; service role bypasses RLS.
		//    Delete rows the user *owns* as well as engagement rows referencing them.
		//    Best-effort: log errors but keep going so the auth user is removed at the end.
		const tables = [
			{ table: 'likes', column: 'user_id' },
			{ table: 'followers', column: 'user_id' },
			{ table: 'followers', column: 'creator_id' },
			{ table: 'api_keys', column: 'user_id' },
			{ table: 'content', column: 'creator_id' },
			{ table: 'profiles', column: 'id' },
		];
		for (const { table, column } of tables) {
			const { error } = await supabase.from(table).delete().eq(column, userId);
			if (error) logger.warn?.(`Delete from ${table} by ${column} failed: ${error.message}`);
		}

		// 3. Delete the auth user (requires service role).
		const { error: adminErr } = await supabase.auth.admin.deleteUser(userId);
		if (adminErr) {
			return next(adminErr);
		}

		res.status(204).end();
	} catch (err) {
		next(err);
	}
});

export default router;

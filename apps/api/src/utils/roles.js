import supabase from './supabaseClient.js';
import logger from './logger.js';

// Hard-coded, compile-time identity of the owner. The Discord ID here is the
// authoritative source — the UUID in Supabase is derived from it on startup.
// Only this Discord account can ever be owner.
export const OWNER_DISCORD_ID = '1056952213056004118';

export const ROLES = Object.freeze({
	USER: 'user',
	MODERATOR: 'moderator',
	OWNER: 'owner',
});

// Resolve a user's role from the profiles table. Returns 'user' if no row exists.
export const getUserRole = async (userId) => {
	if (!userId) return ROLES.USER;
	const { data, error } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', userId)
		.maybeSingle();
	if (error) {
		logger.warn('Failed to read role for', userId, error.message);
		return ROLES.USER;
	}
	return data?.role || ROLES.USER;
};

// Find the Supabase auth user whose Discord identity matches OWNER_DISCORD_ID.
// Uses the admin API — requires service role key.
const findUserByDiscordId = async (discordId) => {
	// The admin listUsers endpoint is paginated. Typical single-owner deployments
	// have a tiny user count; we still paginate defensively up to 50 pages.
	const perPage = 200;
	for (let page = 1; page <= 50; page += 1) {
		const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
		if (error) throw error;
		const users = data?.users ?? [];
		for (const u of users) {
			const match = (u.identities ?? []).some(
				(i) => i.provider === 'discord' && String(i.provider_id ?? i.id) === String(discordId),
			);
			if (match) return u;
		}
		if (users.length < perPage) break; // no more pages
	}
	return null;
};

// Idempotent: on boot, find the owner by Discord ID and make sure their
// profiles.role === 'owner'. Also demote any other account that somehow has
// role='owner' back to 'user'.
export const ensureOwner = async () => {
	try {
		const ownerUser = await findUserByDiscordId(OWNER_DISCORD_ID);

		// Demote any stray owners. This handles the case where someone ran a raw
		// SQL UPDATE or an earlier bug set an unexpected role='owner'.
		const { data: existingOwners, error: existingErr } = await supabase
			.from('profiles')
			.select('id')
			.eq('role', ROLES.OWNER);
		if (existingErr) {
			logger.warn('ensureOwner: failed to list existing owners:', existingErr.message);
		} else if (ownerUser && existingOwners?.length) {
			for (const row of existingOwners) {
				if (row.id !== ownerUser.id) {
					const { error: demoteErr } = await supabase
						.from('profiles')
						.update({ role: ROLES.USER })
						.eq('id', row.id);
					if (demoteErr) {
						logger.warn(`ensureOwner: failed to demote stray owner ${row.id}:`, demoteErr.message);
					} else {
						logger.info(`ensureOwner: demoted stray owner ${row.id} to user`);
					}
				}
			}
		}

		if (!ownerUser) {
			logger.info(
				`ensureOwner: no Supabase user found for Discord ID ${OWNER_DISCORD_ID} yet — owner will be assigned once they sign in with Discord.`,
			);
			return null;
		}

		const { data: profile, error: profileErr } = await supabase
			.from('profiles')
			.select('id, role, display_name')
			.eq('id', ownerUser.id)
			.maybeSingle();
		if (profileErr) {
			logger.warn('ensureOwner: failed to read owner profile:', profileErr.message);
			return null;
		}
		if (!profile) {
			// Profile row is created by a DB trigger on auth.users insert. If it's
			// missing, bail — the trigger will create it; we'll try again on next boot.
			logger.info(`ensureOwner: owner user ${ownerUser.id} exists but has no profile row yet.`);
			return null;
		}

		if (profile.role !== ROLES.OWNER) {
			const { error: updateErr } = await supabase
				.from('profiles')
				.update({ role: ROLES.OWNER })
				.eq('id', ownerUser.id);
			if (updateErr) {
				logger.warn('ensureOwner: failed to promote owner:', updateErr.message);
				return null;
			}
			logger.info(`ensureOwner: promoted ${profile.display_name || ownerUser.id} to owner`);
		} else {
			logger.info(`ensureOwner: ${profile.display_name || ownerUser.id} is already owner`);
		}
		return ownerUser.id;
	} catch (err) {
		logger.error('ensureOwner: unexpected error:', err?.message || err);
		return null;
	}
};

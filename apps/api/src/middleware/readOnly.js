// OnlyCats is discontinued. The API stays up only so existing accounts can
// read their own data back out and then leave, so every request that would
// change server state is refused here rather than at each route.
//
// This is the authoritative check. The web client hides its posting UI and
// blocks writes at the Supabase client, but neither of those stops a direct
// call to this API, and the bot API exists specifically to post without a
// browser.
export const READ_ONLY = true;

export const READ_ONLY_MESSAGE =
	'OnlyCats is discontinued and read-only. Creating, changing, or deleting content is permanently disabled.';

// The only state changes still allowed: ending a session, and a user removing
// their own account. Both are ways out, not ways to publish.
const ALLOWED_WRITES = [
	{ method: 'POST', pattern: /^\/devices\/sign-out\/?$/ },
	{ method: 'POST', pattern: /^\/devices\/revoke-others\/?$/ },
	{ method: 'DELETE', pattern: /^\/devices\/[^/]+\/?$/ },
	{ method: 'DELETE', pattern: /^\/account\/?$/ },
];

// Signup gets its own answer so an old client shows "signups are closed"
// rather than a generic refusal.
const SIGNUP_ROUTES = [/^\/account\/signup-eligibility\/?$/, /^\/account\/claim-signup-ip\/?$/];

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const readOnlyGuard = (req, res, next) => {
	if (!READ_ONLY) return next();
	if (SAFE_METHODS.has(req.method)) return next();

	// req.path here is relative to the router mount point, which is '/'.
	const path = req.path || req.url || '';
	const allowed = ALLOWED_WRITES.some(
		(rule) => rule.method === req.method && rule.pattern.test(path),
	);
	if (allowed) return next();

	if (SIGNUP_ROUTES.some((pattern) => pattern.test(path))) {
		return res.status(410).json({
			error: 'OnlyCats is discontinued. New accounts can no longer be created.',
			code: 'SIGNUPS_CLOSED',
		});
	}

	return res.status(403).json({
		error: READ_ONLY_MESSAGE,
		code: 'READ_ONLY',
	});
};

export default readOnlyGuard;

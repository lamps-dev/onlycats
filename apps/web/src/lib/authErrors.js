/**
 * Map Supabase Auth errors to clearer copy for email/password flows.
 * Unconfirmed users often get the same "Invalid login credentials" as wrong password.
 */
export function mapAuthError(error) {
	const raw = error?.message || '';
	const lower = raw.toLowerCase();

	if (
		lower.includes('invalid login credentials')
		|| lower.includes('invalid credentials')
		|| (error?.status === 400 && lower.includes('invalid'))
	) {
		return 'Wrong email or password — or your email is not confirmed yet. If you just signed up, open the link we emailed you, then try again.';
	}
	if (lower.includes('email not confirmed')) {
		return 'Please confirm your email first. We sent you a link when you signed up.';
	}
	if (lower.includes('user already registered')) {
		return 'An account with this email already exists. Try logging in instead.';
	}
	if (lower.includes('signup_disabled') || lower.includes('signups not allowed')) {
		return 'New signups are disabled. Contact support if this is a mistake.';
	}
	return raw || 'Something went wrong. Please try again.';
}

/**
 * Map Supabase Auth errors to clearer copy for email/password flows.
 * Unconfirmed users often get the same "Invalid login credentials" as wrong password.
 */
export function mapAuthError(error) {
	// Accepts a thrown error, or a bare string for the reasons Supabase hands
	// back in a redirect URL rather than throwing (OAuth failures).
	const raw = (typeof error === 'string' ? error : error?.message) || '';
	const lower = raw.toLowerCase();

	if (
		lower.includes('invalid login credentials')
		|| lower.includes('invalid credentials')
		|| (error?.status === 400 && lower.includes('invalid'))
	) {
		return 'Wrong email or password, or the email was never confirmed. OnlyCats is discontinued, so there is no way to create or re-confirm an account now.';
	}
	if (lower.includes('email not confirmed')) {
		return 'This email was never confirmed, and confirmation is no longer possible now that OnlyCats is discontinued.';
	}
	if (lower.includes('user already registered')) {
		return 'An account with this email already exists. Sign in instead.';
	}
	if (lower.includes('signup_disabled') || lower.includes('signups not allowed')) {
		return 'OnlyCats is discontinued. New accounts can no longer be created.';
	}
	return raw || 'Something went wrong. Please try again.';
}

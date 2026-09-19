import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '@/lib/supabaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import BannedScreen from '@/components/BannedScreen.jsx';
import { isPreExistingAccount, NEW_ACCOUNT_REJECTED_MESSAGE } from '@/lib/readOnly.js';

const AuthContext = createContext(null);

const LoadingScreen = () => (
	<div className="min-h-screen flex items-center justify-center bg-gradient-mesh">
		<div className="text-center">
			<div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
			<p className="text-muted-foreground">Loading OnlyCats...</p>
		</div>
	</div>
);

const loadProfile = async (userId) => {
	if (!userId) return null;
	const { data } = await supabase
		.from('profiles')
		.select('id, display_name, bio, about_me, avatar_url, follower_count, role, country, location, social_links, notification_prefs')
		.eq('id', userId)
		.maybeSingle();
	return data ?? null;
};

// Ask the API for our authoritative role and any active sanction. This call
// uses the bare-authenticate path on the server, so banned users still get a
// 200 with sanction details (so the UI can render a banned screen).
// Returns { role, sanction } where either field may be null.
const fetchServerAccount = async (accessToken) => {
	if (!accessToken) return { role: null, sanction: null, deviceRevoked: false };
	try {
		const res = await apiServerClient.fetch('/account/me', {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!res.ok) {
			try {
				const body = await res.json();
				if (body?.code === 'DEVICE_REVOKED') {
					return { role: null, sanction: null, deviceRevoked: true };
				}
				if (body?.sanction) return { role: null, sanction: body.sanction, deviceRevoked: false };
			} catch (_) { /* ignore */ }
			return { role: null, sanction: null, deviceRevoked: false };
		}
		const body = await res.json();
		return { role: body?.role ?? null, sanction: body?.sanction ?? null, deviceRevoked: false };
	} catch (_) {
		return { role: null, sanction: null, deviceRevoked: false };
	}
};

const mergeUserWithProfile = (user, profile, sanction = null) => {
	if (!user) return null;
	return {
		id: user.id,
		email: user.email,
		display_name: profile?.display_name ?? user.user_metadata?.display_name ?? user.email,
		avatar_url: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
		bio: profile?.bio ?? null,
		about_me: profile?.about_me ?? null,
		country: profile?.country ?? null,
		location: profile?.location ?? null,
		social_links: Array.isArray(profile?.social_links) ? profile.social_links : [],
		notification_prefs: profile?.notification_prefs ?? { tips: true, follows: true, likes: false, email: false },
		follower_count: profile?.follower_count ?? 0,
		role: profile?.role ?? 'user',
		sanction,
	};
};

export const AuthProvider = ({ children }) => {
	const navigate = useNavigate();
	const [currentUser, setCurrentUser] = useState(null);
	const [initialLoading, setInitialLoading] = useState(true);
	// Guards the DEVICE_REVOKED handling so a revoked device signs out at most
	// once instead of looping (getSession + onAuthStateChange can both observe it
	// before the local session is cleared). Reset once we see a healthy session.
	const deviceRevokedRef = useRef(false);
	// Same one-shot guarding for a rejected sign-in: getSession and
	// onAuthStateChange can both see the session before it is cleared.
	const rejectedAccountRef = useRef(false);

	// A revoked device must sign out LOCALLY only. A global signOut (the default)
	// deletes every session for the account server-side, so one flagged device
	// would cascade into "Session not found" 401s on all the user's other
	// sessions — the exact failure we're fixing.
	const signOutRevokedDevice = useCallback(async () => {
		if (deviceRevokedRef.current) return;
		deviceRevokedRef.current = true;
		// Clear the httpOnly oc_device cookie too. Otherwise it still points at the
		// revoked device_sessions row, and the next login would immediately trip
		// DEVICE_REVOKED again — a perpetual logout trap on this browser.
		try {
			await apiServerClient.fetch('/devices/sign-out', { method: 'POST' });
		} catch (_) { /* best-effort */ }
		await supabase.auth.signOut({ scope: 'local' });
	}, []);

	// Discord OAuth creates an account for an unknown identity, which is a
	// signup by another name. Any session belonging to an account created after
	// the shutdown is turned away here and the browser is signed out.
	const signOutRejectedAccount = useCallback(async () => {
		if (rejectedAccountRef.current) return;
		rejectedAccountRef.current = true;
		try {
			await apiServerClient.fetch('/devices/sign-out', { method: 'POST' });
		} catch (_) { /* best-effort */ }
		await supabase.auth.signOut({ scope: 'local' });
		setCurrentUser(null);
		setInitialLoading(false);
		navigate('/login', { replace: true, state: { authError: NEW_ACCOUNT_REJECTED_MESSAGE } });
	}, [navigate]);

	useEffect(() => {
		let cancelled = false;
		let lastProfileUserId = null;
		let oauthHandled = false;
		// A recovery link also carries `access_token=` in the hash, but it must
		// NOT be forwarded like an OAuth sign-in: the user needs to stay on
		// /reset-password to set a new password. Exclude recovery here.
		const hash = typeof window !== 'undefined' ? window.location.hash : '';
		const isRecovery = hash.includes('type=recovery');
		const wasOAuthCallback = hash.includes('access_token=') && !isRecovery;

		const applySession = async (session) => {
			if (cancelled) return;
			const user = session?.user ?? null;

			if (user && !isPreExistingAccount(user)) {
				await signOutRejectedAccount();
				return;
			}
			if (user) rejectedAccountRef.current = false;

			setCurrentUser((prev) => (prev?.id === user?.id ? prev : mergeUserWithProfile(user, null)));
			setInitialLoading(false);

			if (!oauthHandled && wasOAuthCallback && user) {
				oauthHandled = true;
				// Settings is where the only remaining action lives: the data export.
				navigate('/settings', { replace: true });
			}

			if (user && user.id !== lastProfileUserId) {
				lastProfileUserId = user.id;
				const [profile, account] = await Promise.all([
					loadProfile(user.id),
					fetchServerAccount(session?.access_token),
				]);
				if (!cancelled) {
					if (account.deviceRevoked) {
						await signOutRevokedDevice();
						return;
					}
					// Healthy authenticated session — allow a future genuine revoke
					// to be handled again.
					deviceRevokedRef.current = false;
					const merged = mergeUserWithProfile(user, profile, account.sanction);
					if (merged && account.role) merged.role = account.role;
					setCurrentUser(merged);
				}
			} else if (!user) {
				lastProfileUserId = null;
			}
		};

		const safetyTimer = setTimeout(() => {
			if (!cancelled) setInitialLoading(false);
		}, 3000);

		// Restore session on first load (some environments miss the initial auth event).
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (!cancelled) applySession(session);
		});

		const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
			applySession(session);
		});

		return () => {
			cancelled = true;
			clearTimeout(safetyTimer);
			subscription.unsubscribe();
		};
	}, [navigate, signOutRevokedDevice, signOutRejectedAccount]);

	const login = useCallback(async (email, password) => {
		const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;
		const { data, error } = await supabase.auth.signInWithPassword({
			email: normalizedEmail,
			password,
		});
		if (error) throw error;
		return data;
	}, []);

	// Send a password-reset email. The link returns the user to /reset-password
	// with a recovery token in the URL hash (handled by detectSessionInUrl).
	const requestPasswordReset = useCallback(async (email) => {
		const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;
		const redirectTo =
			typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
		const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
		if (error) throw error;
	}, []);

	// Set a new password for the user. On the reset page the recovery token has
	// already established a temporary session, so updateUser is authorized.
	const updatePassword = useCallback(async (newPassword) => {
		const { error } = await supabase.auth.updateUser({ password: newPassword });
		if (error) throw error;
	}, []);

	// Sign in with Discord. Supabase has no "login only" flag for OAuth, so an
	// unknown Discord identity still produces a session here; applySession
	// rejects it on the way back. Turning off "Allow new users to sign up" in
	// the Supabase dashboard is what stops the user row being created at all.
	// Comes back to /login deliberately. It is a public route, so a slow session
	// restore cannot bounce off a ProtectedRoute mid-callback, and a refusal
	// from Supabase (signups disabled) lands on the page that shows the reason.
	// A successful sign-in is forwarded to /settings once the session applies.
	const authWithDiscord = useCallback(async () => {
		const { data, error } = await supabase.auth.signInWithOAuth({
			provider: 'discord',
			options: { redirectTo: `${window.location.origin}/login` },
		});
		if (error) throw error;
		return data;
	}, []);

	const logout = useCallback(async () => {
		try {
			await apiServerClient.fetch('/devices/sign-out', { method: 'POST' });
		} catch (_) { /* best-effort cookie clear */ }
		// Local scope: sign out THIS browser only. Never revoke the account's
		// sessions on its other devices from a normal logout.
		await supabase.auth.signOut({ scope: 'local' });
	}, []);

	const refreshProfile = useCallback(async () => {
		const { data: { session } } = await supabase.auth.getSession();
		const [profile, account] = await Promise.all([
			loadProfile(session?.user?.id),
			fetchServerAccount(session?.access_token),
		]);
		if (account.deviceRevoked) {
			await signOutRevokedDevice();
			return;
		}
		deviceRevokedRef.current = false;
		const merged = mergeUserWithProfile(session?.user, profile, account.sanction);
		if (merged && account.role) merged.role = account.role;
		setCurrentUser(merged);
	}, [signOutRevokedDevice]);

	const role = currentUser?.role ?? 'user';
	const sanction = currentUser?.sanction ?? null;
	const value = useMemo(
		() => ({
			currentUser,
			login,
			requestPasswordReset,
			updatePassword,
			authWithDiscord,
			logout,
			refreshProfile,
			isAuthenticated: !!currentUser,
			role,
			isModerator: role === 'moderator' || role === 'owner',
			isOwner: role === 'owner',
			sanction,
			isBanned: sanction?.kind === 'ban',
			isTimedOut: sanction?.kind === 'timeout',
		}),
		[currentUser, login, requestPasswordReset, updatePassword, authWithDiscord, logout, refreshProfile, role, sanction],
	);

	if (initialLoading) return <LoadingScreen />;

	// Banned users see a blocker instead of the app, but still get access to
	// the AuthContext so the BannedScreen can call logout().
	if (value.isBanned) {
		return (
			<AuthContext.Provider value={value}>
				<BannedScreen />
			</AuthContext.Provider>
		);
	}

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) throw new Error('useAuth must be used within AuthProvider');
	return context;
};

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '@/lib/supabaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import BannedScreen from '@/components/BannedScreen.jsx';

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
	if (!accessToken) return { role: null, sanction: null };
	try {
		const res = await apiServerClient.fetch('/account/me', {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!res.ok) {
			// 403 with code IP_BANNED is possible too — propagate via sanction
			// so the UI can show the right message.
			try {
				const body = await res.json();
				if (body?.sanction) return { role: null, sanction: body.sanction };
			} catch (_) { /* ignore */ }
			return { role: null, sanction: null };
		}
		const body = await res.json();
		return { role: body?.role ?? null, sanction: body?.sanction ?? null };
	} catch (_) {
		return { role: null, sanction: null };
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

	useEffect(() => {
		let cancelled = false;
		let lastProfileUserId = null;
		let oauthHandled = false;
		const wasOAuthCallback = typeof window !== 'undefined' && window.location.hash.includes('access_token=');

		const applySession = async (session) => {
			if (cancelled) return;
			const user = session?.user ?? null;

			setCurrentUser((prev) => (prev?.id === user?.id ? prev : mergeUserWithProfile(user, null)));
			setInitialLoading(false);

			if (!oauthHandled && wasOAuthCallback && user) {
				oauthHandled = true;
				navigate('/discover', { replace: true });
			}

			if (user && user.id !== lastProfileUserId) {
				lastProfileUserId = user.id;
				const [profile, account] = await Promise.all([
					loadProfile(user.id),
					fetchServerAccount(session?.access_token),
				]);
				if (!cancelled) {
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

		const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
			applySession(session);
		});

		return () => {
			cancelled = true;
			clearTimeout(safetyTimer);
			subscription.unsubscribe();
		};
	}, [navigate]);

	const login = useCallback(async (email, password) => {
		const { data, error } = await supabase.auth.signInWithPassword({ email, password });
		if (error) throw error;
		return data;
	}, []);

	const signup = useCallback(async (email, password, _passwordConfirm, name) => {
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: { data: { display_name: name } },
		});
		if (error) throw error;
		return data;
	}, []);

	const authWithDiscord = useCallback(async () => {
		const { data, error } = await supabase.auth.signInWithOAuth({
			provider: 'discord',
			options: { redirectTo: `${window.location.origin}/discover` },
		});
		if (error) throw error;
		return data;
	}, []);

	const logout = useCallback(async () => {
		await supabase.auth.signOut();
	}, []);

	const refreshProfile = useCallback(async () => {
		const { data: { session } } = await supabase.auth.getSession();
		const [profile, account] = await Promise.all([
			loadProfile(session?.user?.id),
			fetchServerAccount(session?.access_token),
		]);
		const merged = mergeUserWithProfile(session?.user, profile, account.sanction);
		if (merged && account.role) merged.role = account.role;
		setCurrentUser(merged);
	}, []);

	const role = currentUser?.role ?? 'user';
	const sanction = currentUser?.sanction ?? null;
	const value = useMemo(
		() => ({
			currentUser,
			login,
			signup,
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
		[currentUser, login, signup, authWithDiscord, logout, refreshProfile, role, sanction],
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

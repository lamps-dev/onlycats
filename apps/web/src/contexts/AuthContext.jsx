import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '@/lib/supabaseClient.js';

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
		.select('id, display_name, bio, avatar_url, follower_count')
		.eq('id', userId)
		.maybeSingle();
	return data ?? null;
};

const mergeUserWithProfile = (user, profile) => {
	if (!user) return null;
	return {
		id: user.id,
		email: user.email,
		display_name: profile?.display_name ?? user.user_metadata?.display_name ?? user.email,
		avatar_url: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
		bio: profile?.bio ?? null,
		follower_count: profile?.follower_count ?? 0,
	};
};

export const AuthProvider = ({ children }) => {
	const navigate = useNavigate();
	const [currentUser, setCurrentUser] = useState(null);
	const [initialLoading, setInitialLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		const wasOAuthCallback = typeof window !== 'undefined' && window.location.hash.includes('access_token=');

		const hydrate = async () => {
			const { data: { session } } = await supabase.auth.getSession();
			const profile = await loadProfile(session?.user?.id);
			if (!cancelled) {
				setCurrentUser(mergeUserWithProfile(session?.user, profile));
				setInitialLoading(false);
				if (wasOAuthCallback && session?.user) {
					navigate('/discover', { replace: true });
				}
			}
		};
		hydrate();

		const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
			const profile = await loadProfile(session?.user?.id);
			if (!cancelled) setCurrentUser(mergeUserWithProfile(session?.user, profile));
		});

		return () => {
			cancelled = true;
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
		const profile = await loadProfile(session?.user?.id);
		setCurrentUser(mergeUserWithProfile(session?.user, profile));
	}, []);

	const value = useMemo(
		() => ({
			currentUser,
			login,
			signup,
			authWithDiscord,
			logout,
			refreshProfile,
			isAuthenticated: !!currentUser,
		}),
		[currentUser, login, signup, authWithDiscord, logout, refreshProfile],
	);

	if (initialLoading) return <LoadingScreen />;

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) throw new Error('useAuth must be used within AuthProvider');
	return context;
};

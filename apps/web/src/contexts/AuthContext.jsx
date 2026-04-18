import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient.js';

const AuthContext = createContext(null);

const LoadingScreen = () => (
	<div className="min-h-screen flex items-center justify-center bg-gradient-mesh">
		<div className="text-center">
			<div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
			<p className="text-muted-foreground">Loading OnlyCats...</p>
		</div>
	</div>
);

export const AuthProvider = ({ children }) => {
	const navigate = useNavigate();
	const [currentUser, setCurrentUser] = useState(() =>
		pb.authStore.isValid ? pb.authStore.model : null,
	);
	const [initialLoading, setInitialLoading] = useState(true);

	useEffect(() => {
		const unsubscribe = pb.authStore.onChange((_token, model) => {
			setCurrentUser(model ?? null);
		});
		setInitialLoading(false);
		return () => unsubscribe();
	}, []);

	const login = useCallback(async (email, password) => {
		const authData = await pb.collection('users').authWithPassword(email, password);
		return authData;
	}, []);

	const signup = useCallback(async (email, password, passwordConfirm, name) => {
		await pb.collection('users').create({ email, password, passwordConfirm, name });
		return pb.collection('users').authWithPassword(email, password);
	}, []);

	const authWithDiscord = useCallback(async () => {
		const authData = await pb.collection('users').authWithOAuth2({ provider: 'discord' });
		navigate('/discover');
		return authData;
	}, [navigate]);

	const logout = useCallback(() => {
		pb.authStore.clear();
	}, []);

	const value = useMemo(
		() => ({
			currentUser,
			login,
			signup,
			authWithDiscord,
			logout,
			isAuthenticated: !!currentUser,
		}),
		[currentUser, login, signup, authWithDiscord, logout],
	);

	if (initialLoading) return <LoadingScreen />;

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) throw new Error('useAuth must be used within AuthProvider');
	return context;
};

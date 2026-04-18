import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'onlycats.theme';
const VALID = ['light', 'dark', 'system'];

const ThemeContext = createContext(null);

const readStored = () => {
	if (typeof window === 'undefined') return 'system';
	const v = window.localStorage.getItem(STORAGE_KEY);
	return VALID.includes(v) ? v : 'system';
};

const resolve = (pref) => {
	if (pref !== 'system') return pref;
	if (typeof window === 'undefined') return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const apply = (resolved) => {
	const root = document.documentElement;
	root.classList.toggle('dark', resolved === 'dark');
	root.style.colorScheme = resolved;
};

export const ThemeProvider = ({ children }) => {
	const [theme, setThemeState] = useState(readStored);
	const [resolved, setResolved] = useState(() => resolve(readStored()));

	useEffect(() => {
		const next = resolve(theme);
		setResolved(next);
		apply(next);
		if (theme === 'system') {
			const mql = window.matchMedia('(prefers-color-scheme: dark)');
			const onChange = () => {
				const r = mql.matches ? 'dark' : 'light';
				setResolved(r);
				apply(r);
			};
			mql.addEventListener('change', onChange);
			return () => mql.removeEventListener('change', onChange);
		}
	}, [theme]);

	const setTheme = useCallback((next) => {
		if (!VALID.includes(next)) return;
		window.localStorage.setItem(STORAGE_KEY, next);
		setThemeState(next);
	}, []);

	const toggle = useCallback(() => {
		setTheme(resolved === 'dark' ? 'light' : 'dark');
	}, [resolved, setTheme]);

	const value = useMemo(() => ({ theme, resolved, setTheme, toggle }), [theme, resolved, setTheme, toggle]);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
	return ctx;
};

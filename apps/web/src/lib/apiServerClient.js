const API_URL = import.meta.env.VITE_API_URL || '/hcgi/api';

const request = async (path, { method = 'GET', body, headers, ...rest } = {}) => {
	const res = await fetch(`${API_URL}${path}`, {
		method,
		credentials: 'include',
		headers: {
			...(body ? { 'Content-Type': 'application/json' } : {}),
			...(headers || {}),
		},
		body: body ? JSON.stringify(body) : undefined,
		...rest,
	});

	const contentType = res.headers.get('Content-Type') || '';
	const data = contentType.includes('application/json') ? await res.json() : await res.text();

	if (!res.ok) {
		const message = typeof data === 'object' && data?.error ? data.error : res.statusText;
		const err = new Error(message);
		err.status = res.status;
		err.data = data;
		throw err;
	}

	return data;
};

const apiServerClient = {
	get: (path, options) => request(path, { ...options, method: 'GET' }),
	post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
	put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
	delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
	fetch: (path, options) => fetch(`${API_URL}${path}`, { credentials: 'include', ...(options || {}) }),
};

export default apiServerClient;
export { apiServerClient };

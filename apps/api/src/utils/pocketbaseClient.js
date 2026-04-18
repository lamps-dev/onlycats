import 'dotenv/config';
import PocketBase from 'pocketbase';

const url = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';

const pb = new PocketBase(url);
pb.autoCancellation(false);

let authPromise = null;

const authenticate = () => {
	if (!authPromise) {
		authPromise = pb
			.collection('_superusers')
			.authWithPassword(process.env.PB_SUPERUSER_EMAIL, process.env.PB_SUPERUSER_PASSWORD)
			.finally(() => {
				authPromise = null;
			});
	}
	return authPromise;
};

pb.beforeSend = async (url, options) => {
	if (url.includes('/api/collections/_superusers/auth-with-password')) {
		return { url, options };
	}
	if (!pb.authStore.isValid) {
		await authenticate();
	}
	if (pb.authStore.token) {
		options.headers = { ...(options.headers || {}), Authorization: pb.authStore.token };
	}
	return { url, options };
};

export default pb;
export { pb };

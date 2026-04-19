import { S3Client } from '@aws-sdk/client-s3';

const {
	R2_ACCOUNT_ID,
	R2_ACCESS_KEY_ID,
	R2_SECRET_ACCESS_KEY,
	R2_BUCKET,
	R2_PUBLIC_URL,
} = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) {
	throw new Error(
		'Missing R2 env vars. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL.',
	);
}

export const r2 = new S3Client({
	region: 'auto',
	endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: R2_ACCESS_KEY_ID,
		secretAccessKey: R2_SECRET_ACCESS_KEY,
	},
});

export const R2_BUCKET_NAME = R2_BUCKET;
export const R2_PUBLIC_BASE = R2_PUBLIC_URL.replace(/\/$/, '');

/** Object key from our public CDN URL, or null if not under this bucket base. */
export const keyFromPublicUrl = (url) => {
	if (typeof url !== 'string') return null;
	const prefix = `${R2_PUBLIC_BASE}/`;
	if (!url.startsWith(prefix)) return null;
	const k = url.slice(prefix.length);
	return k.length > 0 ? k : null;
};

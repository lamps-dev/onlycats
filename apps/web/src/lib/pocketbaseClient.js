import PocketBase from 'pocketbase';

const url = import.meta.env.VITE_POCKETBASE_URL || '/hcgi/platform';

const pb = new PocketBase(url);
pb.autoCancellation(false);

export default pb;
export { pb };

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import routes from './routes/index.js';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.js';
import { globalRateLimit } from './middleware/global-rate-limit.js';
import { enforceIpBan } from './middleware/enforceIpBan.js';
import { BodyLimit } from './constants/common.js';

export const createApp = () => {
	const app = express();
	app.set('trust proxy', true);
	app.disable('x-powered-by');

	const corsOrigin = process.env.CORS_ORIGIN
		? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
		: true;

	app.use(helmet());
	app.use(cors({ origin: corsOrigin, credentials: corsOrigin !== true }));
	app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
	app.use(globalRateLimit);
	app.use(enforceIpBan);
	app.use(express.json({ limit: BodyLimit }));
	app.use(express.urlencoded({ extended: true, limit: BodyLimit }));

	app.use('/', routes());

	app.use(notFoundMiddleware);
	app.use(errorMiddleware);

	return app;
};

export default createApp;

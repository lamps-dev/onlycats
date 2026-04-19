import { Router } from 'express';
import healthCheck from './health-check.js';
import apiRouter from './api.js';
import uploadsRouter from './uploads.js';
import accountRouter from './account.js';
import adminRouter from './admin.js';
import moderationRouter from './moderation.js';
import devicesRouter from './devices.js';

export default () => {
	const router = Router();
	router.get('/health', healthCheck);
	router.use('/api', apiRouter);
	router.use('/uploads', uploadsRouter);
	router.use('/account', accountRouter);
	router.use('/admin', adminRouter);
	router.use('/moderation', moderationRouter);
	router.use('/devices', devicesRouter);
	return router;
};

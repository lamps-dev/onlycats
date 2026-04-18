import { Router } from 'express';
import healthCheck from './health-check.js';
import apiRouter from './api.js';
import uploadsRouter from './uploads.js';

export default () => {
	const router = Router();
	router.get('/health', healthCheck);
	router.use('/api', apiRouter);
	router.use('/uploads', uploadsRouter);
	return router;
};

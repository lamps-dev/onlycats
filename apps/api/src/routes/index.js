import { Router } from 'express';
import healthCheck from './health-check.js';
import apiRouter from './api.js';

export default () => {
	const router = Router();
	router.get('/health', healthCheck);
	router.use('/api', apiRouter);
	return router;
};

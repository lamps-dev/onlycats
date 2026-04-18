import { createApp } from './app.js';
import logger from './utils/logger.js';

const app = createApp();
const port = Number(process.env.PORT) || 3001;

const server = app.listen(port, () => {
	logger.info(`API server listening on http://localhost:${port}`);
});

const shutdown = (signal) => {
	logger.info(`${signal} received, shutting down`);
	server.close(() => process.exit(0));
	setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => logger.error('uncaughtException', err));
process.on('unhandledRejection', (reason) => logger.error('unhandledRejection', reason));

export default app;

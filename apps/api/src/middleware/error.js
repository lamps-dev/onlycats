import logger from '../utils/logger.js';

export class HttpError extends Error {
	constructor(status, message, code) {
		super(message);
		this.name = 'HttpError';
		this.status = status;
		this.code = code;
	}
}

export const notFoundMiddleware = (req, res) => {
	res.status(404).json({ error: 'Route not found' });
};

export const errorMiddleware = (err, req, res, _next) => {
	const status = err.status ?? 500;
	const isServerError = status >= 500;

	if (isServerError) {
		logger.error(err.message, err.stack);
	} else {
		logger.warn(`${status} ${err.message}`);
	}

	if (res.headersSent) return;

	const body = { error: err.message || 'Something went wrong' };
	if (err.code) body.code = err.code;
	if (isServerError && process.env.NODE_ENV !== 'production') {
		body.stack = err.stack;
	}

	res.status(status).json(body);
};

export default errorMiddleware;

const stamp = () => new Date().toISOString();

const logger = {
	info: (...args) => console.log(`[${stamp()}] INFO`, ...args),
	warn: (...args) => console.warn(`[${stamp()}] WARN`, ...args),
	debug: (...args) => {
		if (process.env.NODE_ENV !== 'production') {
			console.log(`[${stamp()}] DEBUG`, ...args);
		}
	},
	error: (...args) => console.error(`[${stamp()}] ERROR`, ...args),
	fatal: (...args) => console.error(`[${stamp()}] FATAL`, ...args),
};

export default logger;
export { logger };

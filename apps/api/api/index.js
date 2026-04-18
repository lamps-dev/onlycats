import { createApp } from '../src/app.js';

const app = createApp();

export default (req, res) => app(req, res);

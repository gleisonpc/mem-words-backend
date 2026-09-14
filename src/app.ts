import express, { type Express } from 'express';
import cors from 'cors';

import { buildCorsOptions } from './config/cors.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

const app: Express = express();

app.use(cors(buildCorsOptions()));
app.use(express.json());

app.use(routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

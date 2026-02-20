import 'dotenv/config';
import express from 'express';
import connectDB from './config/database.js';
import redisClient from './config/redis.js';

import pinoHttp from 'pino-http';
import { defaultCacheConfig } from './config/cache.js';
import logger from './config/logger.js';
import errorMiddleware from './presentation/middlewares/error.middleware.js';
import memoizationMiddleware from './presentation/middlewares/memoization.middleware.js';
import Router from './presentation/routes/index.js';

if (process.env.NODE_ENV !== 'test') {
  connectDB();
  redisClient.connect();
}

const app = express();

app.use(pinoHttp({ logger }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(memoizationMiddleware(defaultCacheConfig));
app.use(Router);

app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

export default app;

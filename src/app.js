import 'dotenv/config';
import express from 'express';
import redisClient from './config/redis.js';
import connectDB from './config/database.js';

import Router from './presentation/routes/index.js';
import logger from './config/logger.js';
import pinoHttp from 'pino-http';
import errorMiddleware from './presentation/middlewares/error.middleware.js'; // ✅ ADICIONAR

if (process.env.NODE_ENV !== 'test') {
  connectDB();
  redisClient.connect();
}

const app = express();

app.use(pinoHttp({ logger }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(Router);

// ✅ IMPORTANTE: middleware de erro sempre depois das rotas
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

export default app;

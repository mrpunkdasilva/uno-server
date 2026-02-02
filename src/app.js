import 'dotenv/config';
import express from 'express';
import redisClient from './config/redis.js';
import connectDB from './config/database.js';

import Router from './presentation/routes/index.js';

if (process.env.NODE_ENV !== 'test') {
  connectDB();
  redisClient.connect();
}

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(Router);

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;

import { createClient } from 'redis';

const redisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
};

const redisClient = createClient({
  url: `redis://${redisConfig.host}:${redisConfig.port}`,
  password: redisConfig.password,
  database: redisConfig.db,
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

redisClient.on('ready', () => {
  console.log('Redis client ready');
});

export default redisClient;

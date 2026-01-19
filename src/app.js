import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/database.js';

import Router from './presentation/routes/index.js';

dotenv.config();
connectDB();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(Router);

const PORT = process.env.PORT || 3000;
console.log('Isso é um teste para Husky e lint-staged');
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

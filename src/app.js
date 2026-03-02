const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const productsRouter = require('./routes/products');
const migrationRouter = require('./routes/migration');
const reportsRouter = require('./routes/reports');
const errorHandler = require('./middleware/errorHandler');

const app = express();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/products', apiLimiter, productsRouter);
app.use('/api/migration', apiLimiter, migrationRouter);
app.use('/api/reports', apiLimiter, reportsRouter);

app.use(errorHandler);

module.exports = app;

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const productsRouter = require('./routes/products');
const migrationRouter = require('./routes/migration');
const reportsRouter = require('./routes/reports');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/products', productsRouter);
app.use('/api/migration', migrationRouter);
app.use('/api/reports', reportsRouter);

app.use(errorHandler);

module.exports = app;

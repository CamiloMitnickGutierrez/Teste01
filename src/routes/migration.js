const express = require('express');
const router = express.Router();
const { loadCSV } = require('../controllers/migrationController');

router.post('/load-csv', loadCSV);

module.exports = router;

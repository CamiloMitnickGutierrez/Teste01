const express = require('express');
const router = express.Router();
const {
  getSupplierAnalysis,
  getCustomerHistory,
  getTopProductsByCategory
} = require('../controllers/reportsController');

router.get('/supplier-analysis', getSupplierAnalysis);
router.get('/customer-history/:email', getCustomerHistory);
router.get('/top-products/:category', getTopProductsByCategory);

module.exports = router;

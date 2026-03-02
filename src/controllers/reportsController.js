const pool = require('../config/db');
const mongoose = require('mongoose');

const getSupplierAnalysis = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT s.name, s.email,
             SUM(oi.quantity) AS total_items_sold,
             SUM(oi.total_line_value) AS total_inventory_value
      FROM suppliers s
      JOIN products p ON p.supplier_id = s.id
      JOIN order_items oi ON oi.product_id = p.id
      GROUP BY s.id, s.name, s.email
      ORDER BY total_items_sold DESC
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const getCustomerHistory = async (req, res, next) => {
  try {
    const { email } = req.params;

    // Try MongoDB first (denormalized)
    const db = mongoose.connection.db;
    const history = await db.collection('customer_purchase_history').findOne({ customer_email: email });
    if (history) {
      return res.json({ source: 'mongodb', data: history });
    }

    // Fallback to PostgreSQL
    const result = await pool.query(`
      SELECT o.transaction_id, o.date, p.name AS product_name, p.sku,
             oi.quantity, oi.unit_price, oi.total_line_value
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE c.email = $1
      ORDER BY o.date DESC
    `, [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No purchase history found for this customer' });
    }

    res.json({ source: 'postgresql', data: result.rows });
  } catch (err) {
    next(err);
  }
};

const getTopProductsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const result = await pool.query(`
      SELECT p.name, p.sku, cat.name AS category,
             SUM(oi.quantity) AS total_quantity_sold,
             SUM(oi.total_line_value) AS total_revenue
      FROM products p
      JOIN categories cat ON p.category_id = cat.id
      JOIN order_items oi ON oi.product_id = p.id
      WHERE cat.name = $1
      GROUP BY p.id, p.name, p.sku, cat.name
      ORDER BY total_revenue DESC
    `, [category]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No products found for this category' });
    }

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { getSupplierAnalysis, getCustomerHistory, getTopProductsByCategory };

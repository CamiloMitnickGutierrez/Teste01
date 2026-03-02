const pool = require('../config/db');
const AuditLog = require('../models/auditLog');

const getAllProducts = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.sku, p.name, p.unit_price,
             cat.name AS category, s.name AS supplier, s.email AS supplier_email
      FROM products p
      JOIN categories cat ON p.category_id = cat.id
      JOIN suppliers s ON p.supplier_id = s.id
      ORDER BY p.id
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT p.id, p.sku, p.name, p.unit_price,
             cat.id AS category_id, cat.name AS category,
             s.id AS supplier_id, s.name AS supplier, s.email AS supplier_email
      FROM products p
      JOIN categories cat ON p.category_id = cat.id
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const { sku, name, unit_price, category_id, supplier_id } = req.body;
    if (!sku || !name || !unit_price || !category_id || !supplier_id) {
      return res.status(400).json({ error: 'Missing required fields: sku, name, unit_price, category_id, supplier_id' });
    }
    const result = await pool.query(
      `INSERT INTO products (sku, name, unit_price, category_id, supplier_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [sku, name, unit_price, category_id, supplier_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Product with this SKU already exists' });
    }
    next(err);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sku, name, unit_price, category_id, supplier_id } = req.body;
    const result = await pool.query(
      `UPDATE products SET
         sku = COALESCE($1, sku),
         name = COALESCE($2, name),
         unit_price = COALESCE($3, unit_price),
         category_id = COALESCE($4, category_id),
         supplier_id = COALESCE($5, supplier_id),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING *`,
      [sku, name, unit_price, category_id, supplier_id, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch complete product data before deletion
    const productResult = await pool.query(`
      SELECT p.id, p.sku, p.name, p.unit_price,
             cat.id AS category_id, cat.name AS category,
             s.id AS supplier_id, s.name AS supplier, s.email AS supplier_email
      FROM products p
      JOIN categories cat ON p.category_id = cat.id
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = $1
    `, [id]);

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productData = productResult.rows[0];

    // Delete related order_items first
    await pool.query('DELETE FROM order_items WHERE product_id = $1', [id]);

    // Save audit log to MongoDB
    await AuditLog.create({
      entity_type: 'product',
      entity_id: parseInt(id),
      action: 'DELETE',
      deleted_data: productData,
      deleted_by: 'system',
      deleted_at: new Date()
    });

    // Delete from PostgreSQL
    await pool.query('DELETE FROM products WHERE id = $1', [id]);

    res.status(200).json({ message: 'Product deleted successfully', audit: 'Saved to MongoDB audit_logs', deleted: productData });
  } catch (err) {
    next(err);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find().sort({ deleted_at: -1 });
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct, getAuditLogs };
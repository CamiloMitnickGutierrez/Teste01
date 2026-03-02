const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const pool = require('../config/db');
const mongoose = require('mongoose');

const loadCSV = async (req, res, next) => {
  try {
    const csvPath = path.join(__dirname, '../../docs/AM-prueba-desempeno-data_m4.csv');
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: 'CSV file not found at docs/AM-prueba-desempeno-data_m4.csv' });
    }

    const rows = await parseCSV(csvPath);
    const summary = await migrateData(rows);
    res.status(200).json({ message: 'Migration completed', summary });
  } catch (err) {
    next(err);
  }
};

const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
};

const migrateData = async (rows) => {
  const summary = {
    categories: { created: 0, skipped: 0 },
    suppliers: { created: 0, skipped: 0 },
    customers: { created: 0, skipped: 0 },
    products: { created: 0, skipped: 0 },
    orders: { created: 0, skipped: 0 },
    order_items: { created: 0, skipped: 0 },
    customer_purchase_history: { created: 0, updated: 0 }
  };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Step 1: Categories
    const categoryMap = {};
    const uniqueCategories = [...new Set(rows.map(r => r.product_category))];
    for (const name of uniqueCategories) {
      const res = await client.query(
        `INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id`,
        [name]
      );
      if (res.rows.length > 0) {
        categoryMap[name] = res.rows[0].id;
        summary.categories.created++;
      } else {
        const existing = await client.query('SELECT id FROM categories WHERE name = $1', [name]);
        categoryMap[name] = existing.rows[0].id;
        summary.categories.skipped++;
      }
    }

    // Step 2: Suppliers
    const supplierMap = {};
    const supplierSeen = new Set();
    for (const row of rows) {
      if (!supplierSeen.has(row.supplier_email)) {
        supplierSeen.add(row.supplier_email);
        const res = await client.query(
          `INSERT INTO suppliers (name, email) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id`,
          [row.supplier_name, row.supplier_email]
        );
        if (res.rows.length > 0) {
          supplierMap[row.supplier_email] = res.rows[0].id;
          summary.suppliers.created++;
        } else {
          const existing = await client.query('SELECT id FROM suppliers WHERE email = $1', [row.supplier_email]);
          supplierMap[row.supplier_email] = existing.rows[0].id;
          summary.suppliers.skipped++;
        }
      }
    }

    // Step 3: Customers
    const customerMap = {};
    const customerSeen = new Set();
    for (const row of rows) {
      if (!customerSeen.has(row.customer_email)) {
        customerSeen.add(row.customer_email);
        const res = await client.query(
          `INSERT INTO customers (name, email, address, phone) VALUES ($1, $2, $3, $4)
           ON CONFLICT (email) DO NOTHING RETURNING id`,
          [row.customer_name, row.customer_email, row.customer_address, row.customer_phone]
        );
        if (res.rows.length > 0) {
          customerMap[row.customer_email] = res.rows[0].id;
          summary.customers.created++;
        } else {
          const existing = await client.query('SELECT id FROM customers WHERE email = $1', [row.customer_email]);
          customerMap[row.customer_email] = existing.rows[0].id;
          summary.customers.skipped++;
        }
      }
    }

    // Step 4: Products
    const productMap = {};
    const productSeen = new Set();
    for (const row of rows) {
      if (!productSeen.has(row.product_sku)) {
        productSeen.add(row.product_sku);
        const res = await client.query(
          `INSERT INTO products (sku, name, unit_price, category_id, supplier_id)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT (sku) DO NOTHING RETURNING id`,
          [row.product_sku, row.product_name, parseFloat(row.unit_price),
           categoryMap[row.product_category], supplierMap[row.supplier_email]]
        );
        if (res.rows.length > 0) {
          productMap[row.product_sku] = res.rows[0].id;
          summary.products.created++;
        } else {
          const existing = await client.query('SELECT id FROM products WHERE sku = $1', [row.product_sku]);
          productMap[row.product_sku] = existing.rows[0].id;
          summary.products.skipped++;
        }
      }
    }

    // Step 5: Orders
    const orderMap = {};
    const orderSeen = new Set();
    for (const row of rows) {
      if (!orderSeen.has(row.transaction_id)) {
        orderSeen.add(row.transaction_id);
        const res = await client.query(
          `INSERT INTO orders (transaction_id, date, customer_id)
           VALUES ($1, $2, $3) ON CONFLICT (transaction_id) DO NOTHING RETURNING id`,
          [row.transaction_id, row.date, customerMap[row.customer_email]]
        );
        if (res.rows.length > 0) {
          orderMap[row.transaction_id] = res.rows[0].id;
          summary.orders.created++;
        } else {
          const existing = await client.query('SELECT id FROM orders WHERE transaction_id = $1', [row.transaction_id]);
          orderMap[row.transaction_id] = existing.rows[0].id;
          summary.orders.skipped++;
        }
      }
    }

    // Step 6: Order Items
    for (const row of rows) {
      const orderId = orderMap[row.transaction_id];
      const productId = productMap[row.product_sku];
      const existing = await client.query(
        'SELECT id FROM order_items WHERE order_id = $1 AND product_id = $2',
        [orderId, productId]
      );
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_line_value)
           VALUES ($1, $2, $3, $4, $5)`,
          [orderId, productId, parseInt(row.quantity), parseFloat(row.unit_price), parseFloat(row.total_line_value)]
        );
        summary.order_items.created++;
      } else {
        summary.order_items.skipped++;
      }
    }

    await client.query('COMMIT');

    // Step 7: Populate MongoDB customer_purchase_history
    await populateCustomerHistory(rows, customerMap, orderMap, productMap, categoryMap, supplierMap, summary);

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return summary;
};

const populateCustomerHistory = async (rows, customerMap, orderMap, productMap, categoryMap, supplierMap, summary) => {
  const db = mongoose.connection.db;
  const collection = db.collection('customer_purchase_history');

  // Build customer history map
  const historyMap = {};
  for (const row of rows) {
    const email = row.customer_email;
    if (!historyMap[email]) {
      historyMap[email] = {
        customer_email: email,
        customer_name: row.customer_name,
        customer_address: row.customer_address,
        customer_phone: row.customer_phone,
        orders: {}
      };
    }
    const txn = row.transaction_id;
    if (!historyMap[email].orders[txn]) {
      historyMap[email].orders[txn] = {
        transaction_id: txn,
        date: new Date(row.date),
        items: []
      };
    }
    historyMap[email].orders[txn].items.push({
      product_sku: row.product_sku,
      product_name: row.product_name,
      category: row.product_category,
      quantity: parseInt(row.quantity),
      unit_price: parseFloat(row.unit_price),
      total_line_value: parseFloat(row.total_line_value)
    });
  }

  for (const [email, data] of Object.entries(historyMap)) {
    const doc = {
      customer_email: data.customer_email,
      customer_name: data.customer_name,
      customer_address: data.customer_address,
      customer_phone: data.customer_phone,
      orders: Object.values(data.orders)
    };

    const result = await collection.updateOne(
      { customer_email: email },
      { $set: doc },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      summary.customer_purchase_history.created++;
    } else {
      summary.customer_purchase_history.updated++;
    }
  }
};

module.exports = { loadCSV, parseCSV, migrateData };

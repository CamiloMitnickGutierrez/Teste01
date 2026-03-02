-- ============================================================
-- MegaStore Global - Analytical Views (PostgreSQL)
-- Database: db_megastore_exam
-- These views provide Business Intelligence insights
-- ============================================================

-- ============================================================
-- VIEW 1: Supplier Analysis
-- Shows total items sold and total inventory value per supplier
-- Answers: "Which suppliers have sold us the most products
-- and what is the total inventory value per supplier?"
-- ============================================================
CREATE OR REPLACE VIEW vw_supplier_analysis AS
SELECT
    s.id AS supplier_id,
    s.name AS supplier_name,
    s.email AS supplier_email,
    COUNT(DISTINCT p.id) AS total_products,
    SUM(oi.quantity) AS total_items_sold,
    SUM(oi.total_line_value) AS total_inventory_value
FROM suppliers s
JOIN products p ON p.supplier_id = s.id
JOIN order_items oi ON oi.product_id = p.id
GROUP BY s.id, s.name, s.email
ORDER BY total_items_sold DESC;

-- ============================================================
-- VIEW 2: Top Products by Category
-- Shows best-selling products within each category,
-- ranked by total revenue generated
-- Answers: "What are the top products per category by revenue?"
-- ============================================================
CREATE OR REPLACE VIEW vw_top_products_by_category AS
SELECT
    cat.name AS category,
    p.id AS product_id,
    p.sku,
    p.name AS product_name,
    p.unit_price,
    SUM(oi.quantity) AS total_quantity_sold,
    SUM(oi.total_line_value) AS total_revenue,
    RANK() OVER (PARTITION BY cat.id ORDER BY SUM(oi.total_line_value) DESC) AS rank_in_category
FROM products p
JOIN categories cat ON p.category_id = cat.id
JOIN order_items oi ON oi.product_id = p.id
GROUP BY cat.id, cat.name, p.id, p.sku, p.name, p.unit_price
ORDER BY cat.name, total_revenue DESC;

-- ============================================================
-- VIEW 3: Customer Purchase Summary
-- Shows total orders, total items bought, and total spent
-- per customer
-- Answers: "Who are our top customers by spending?"
-- ============================================================
CREATE OR REPLACE VIEW vw_customer_purchase_summary AS
SELECT
    c.id AS customer_id,
    c.name AS customer_name,
    c.email AS customer_email,
    c.address,
    c.phone,
    COUNT(DISTINCT o.id) AS total_orders,
    SUM(oi.quantity) AS total_items_bought,
    SUM(oi.total_line_value) AS total_spent
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY c.id, c.name, c.email, c.address, c.phone
ORDER BY total_spent DESC;

-- ============================================================
-- VIEW 4: Order Details (Denormalized)
-- Joins all tables to provide a complete order detail view
-- Useful for detailed transaction reports
-- ============================================================
CREATE OR REPLACE VIEW vw_order_details AS
SELECT
    o.transaction_id,
    o.date AS order_date,
    c.name AS customer_name,
    c.email AS customer_email,
    p.sku AS product_sku,
    p.name AS product_name,
    cat.name AS category,
    oi.quantity,
    oi.unit_price,
    oi.total_line_value,
    s.name AS supplier_name,
    s.email AS supplier_email
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON oi.product_id = p.id
JOIN categories cat ON p.category_id = cat.id
JOIN suppliers s ON p.supplier_id = s.id
ORDER BY o.date DESC, o.transaction_id;

-- ============================================================
-- VIEW 5: Monthly Revenue Report
-- Aggregates revenue by month for trend analysis
-- ============================================================
CREATE OR REPLACE VIEW vw_monthly_revenue AS
SELECT
    TO_CHAR(o.date, 'YYYY-MM') AS month,
    COUNT(DISTINCT o.id) AS total_orders,
    SUM(oi.quantity) AS total_items,
    SUM(oi.total_line_value) AS total_revenue
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
GROUP BY TO_CHAR(o.date, 'YYYY-MM')
ORDER BY month DESC;
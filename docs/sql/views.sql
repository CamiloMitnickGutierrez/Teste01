-- MegaStore Global - Views

CREATE OR REPLACE VIEW vw_order_details AS
SELECT
    o.id AS order_id,
    o.transaction_id,
    o.date,
    c.name AS customer_name,
    c.email AS customer_email,
    p.sku AS product_sku,
    p.name AS product_name,
    cat.name AS category,
    s.name AS supplier_name,
    oi.quantity,
    oi.unit_price,
    oi.total_line_value
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON oi.product_id = p.id
JOIN categories cat ON p.category_id = cat.id
JOIN suppliers s ON p.supplier_id = s.id;

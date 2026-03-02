# MegaStore Global API

A REST API built with **Express.js**, **PostgreSQL**, and **MongoDB** for managing products, orders, customers, suppliers, and purchase history for MegaStore Global.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Express.js API                  │
│                  (server.js / src/app.js)        │
└────────────┬────────────────────┬───────────────┘
             │                    │
   ┌──────────▼──────┐   ┌────────▼────────┐
   │   PostgreSQL     │   │    MongoDB       │
   │  (Relational DB) │   │  (Document DB)   │
   │  db_megastore_   │   │  db_megastore_   │
   │     exam         │   │     exam         │
   └─────────────────┘   └─────────────────┘
```

### Data Flow
- **PostgreSQL** stores normalized transactional data (categories, suppliers, customers, products, orders, order_items).
- **MongoDB** stores denormalized read-optimized data (`customer_purchase_history`) and audit logs (`audit_logs`).
- The migration endpoint reads the CSV and populates both databases idempotently.

---

## Data Model Justification

### PostgreSQL — 3NF Normalization

The relational schema follows **Third Normal Form (3NF)**:

| Table | Responsibility |
|---|---|
| `categories` | Product categories (e.g., Electronics, Home) |
| `suppliers` | Supplier contact information |
| `customers` | Customer profiles (name, email, address, phone) |
| `products` | Products with references to category and supplier |
| `orders` | Transaction header (transaction_id, date, customer) |
| `order_items` | Line items per order (product, quantity, price) |

**Why 3NF?**
- Eliminates data duplication (supplier info stored once, referenced by foreign key).
- Maintains referential integrity via foreign key constraints.
- Simplifies updates: changing a supplier email requires one row update.
- Supports complex aggregation queries (supplier analysis, category revenue).

### MongoDB — NoSQL Choices

| Collection | Pattern | Reason |
|---|---|---|
| `customer_purchase_history` | Denormalized document per customer | Fast read of full history without JOINs |
| `audit_logs` | Append-only log documents | Schema-flexible deleted snapshots, event sourcing |

**Why MongoDB for these?**
- `customer_purchase_history` embeds all orders and items in one document — ideal for the "read customer history" use case which requires no JOINs.
- `audit_logs` captures deleted entity snapshots whose shape varies by entity type — MongoDB's flexible schema is perfect for this.

---

## Prerequisites

- **Node.js** >= 18.x
- **PostgreSQL** >= 14
- **MongoDB** >= 6.x

---

## Setup Instructions

### 1. Clone & Install

```bash
git clone <repo-url>
cd Teste01
npm install
```

### 2. PostgreSQL Setup

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE db_megastore_exam;"

# Run DDL (create tables)
psql -U postgres -d db_megastore_exam -f docs/sql/ddl.sql

# Run Views
psql -U postgres -d db_megastore_exam -f docs/sql/views.sql
```

### 3. MongoDB Setup

MongoDB runs without additional schema setup. To apply validation rules (optional):

```bash
mongosh db_megastore_exam docs/nosql/schema_validation.js
```

### 4. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

```env
PORT=3000
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=db_megastore_exam
PG_USER=postgres
PG_PASSWORD=your_password
MONGODB_URI=mongodb://localhost:27017/db_megastore_exam
```

---

## Running the Project

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

The API will be available at `http://localhost:3000`.

---

## Running the Migration

### Via API endpoint (recommended)

```bash
curl -X POST http://localhost:3000/api/migration/load-csv
```

### Via standalone script

```bash
node src/scripts/migrate.js
```

The migration:
1. Reads `docs/AM-prueba-desempeno-data_m4.csv`
2. Inserts categories, suppliers, customers, products, orders, order_items into PostgreSQL (idempotent — safe to run multiple times)
3. Upserts `customer_purchase_history` documents into MongoDB

---

## API Endpoints

### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |

### Migration

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/migration/load-csv` | Load CSV data into PostgreSQL + MongoDB |

### Products

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products` | List all products (with category & supplier) |
| GET | `/api/products/:id` | Get product by ID |
| POST | `/api/products` | Create a new product |
| PUT | `/api/products/:id` | Update a product |
| DELETE | `/api/products/:id` | Delete product (logs to MongoDB audit_logs) |

**POST/PUT body:**
```json
{
  "sku": "NEW-001",
  "name": "New Product",
  "unit_price": 99.99,
  "category_id": 1,
  "supplier_id": 1
}
```

### Reports

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reports/supplier-analysis` | Total items sold & revenue per supplier |
| GET | `/api/reports/customer-history/:email` | Purchase history (MongoDB first, fallback to PostgreSQL) |
| GET | `/api/reports/top-products/:category` | Top products by revenue within a category |

---

## Postman Collection

Import `docs/postman/MegaStore_API.postman_collection.json` into Postman. Set the `base_url` variable to `http://localhost:3000`.

---

## Project Structure

```
├── docs/
│   ├── AM-prueba-desempeno-data_m4.csv
│   ├── sql/
│   │   ├── ddl.sql          # PostgreSQL table definitions
│   │   └── views.sql        # Analytical views
│   ├── nosql/
│   │   └── schema_validation.js  # MongoDB collection validators
│   └── postman/
│       └── MegaStore_API.postman_collection.json
├── src/
│   ├── config/
│   │   ├── db.js            # PostgreSQL connection pool
│   │   └── mongodb.js       # MongoDB connection
│   ├── controllers/
│   │   ├── productsController.js
│   │   ├── migrationController.js
│   │   └── reportsController.js
│   ├── models/
│   │   └── auditLog.js      # Mongoose schema for audit logs
│   ├── middleware/
│   │   └── errorHandler.js  # Global error handler
│   ├── routes/
│   │   ├── products.js
│   │   ├── migration.js
│   │   └── reports.js
│   ├── scripts/
│   │   └── migrate.js       # Standalone migration script
│   └── app.js               # Express app setup
├── server.js                # Entry point
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

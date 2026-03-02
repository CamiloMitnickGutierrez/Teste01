// ============================================================
// MegaStore Global - MongoDB Schema Validation
// Database: db_megastore_exam
// Run: mongosh db_megastore_exam docs/nosql/schema_validation.js
// ============================================================

// ============================================================
// Collection 1: customer_purchase_history
// Pattern: Denormalized document per customer (embedding)
// Justification: Optimizes read performance for customer
// history queries — all orders and items in a single document
// eliminates the need for JOINs.
// ============================================================

db.runCommand({
  collMod: "customer_purchase_history",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["customer_email", "customer_name", "orders"],
      properties: {
        customer_email: {
          bsonType: "string",
          description: "Customer email - required and must be a string"
        },
        customer_name: {
          bsonType: "string",
          description: "Customer full name - required"
        },
        customer_address: {
          bsonType: "string",
          description: "Customer address"
        },
        customer_phone: {
          bsonType: "string",
          description: "Customer phone number"
        },
        orders: {
          bsonType: "array",
          description: "Array of orders placed by the customer",
          items: {
            bsonType: "object",
            required: ["transaction_id", "date", "items"],
            properties: {
              transaction_id: {
                bsonType: "string",
                description: "Unique transaction identifier"
              },
              date: {
                bsonType: "date",
                description: "Order date"
              },
              items: {
                bsonType: "array",
                description: "Array of items in the order",
                items: {
                  bsonType: "object",
                  required: ["product_sku", "product_name", "quantity", "unit_price", "total_line_value"],
                  properties: {
                    product_sku: {
                      bsonType: "string",
                      description: "Product SKU code"
                    },
                    product_name: {
                      bsonType: "string",
                      description: "Product display name"
                    },
                    category: {
                      bsonType: "string",
                      description: "Product category"
                    },
                    quantity: {
                      bsonType: "int",
                      minimum: 1,
                      description: "Quantity purchased - must be >= 1"
                    },
                    unit_price: {
                      bsonType: "double",
                      minimum: 0,
                      description: "Price per unit"
                    },
                    total_line_value: {
                      bsonType: "double",
                      minimum: 0,
                      description: "Total value for this line item"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});

// Unique index to prevent duplicate customer entries
db.customer_purchase_history.createIndex(
  { customer_email: 1 },
  { unique: true, name: "idx_unique_customer_email" }
);

print("✅ customer_purchase_history validation and indexes applied.");

// ============================================================
// Collection 2: audit_logs
// Pattern: Append-only log documents
// Justification: Captures deleted entity snapshots whose shape
// varies by entity type. MongoDB's flexible schema (Mixed type)
// is ideal for storing different entity structures.
// ============================================================

db.runCommand({
  collMod: "audit_logs",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["entity_type", "entity_id", "action", "deleted_data", "deleted_at"],
      properties: {
        entity_type: {
          bsonType: "string",
          enum: ["product", "order", "customer", "supplier"],
          description: "Type of entity that was deleted"
        },
        entity_id: {
          bsonType: "int",
          description: "ID of the deleted entity from PostgreSQL"
        },
        action: {
          bsonType: "string",
          enum: ["DELETE"],
          description: "Action performed - currently only DELETE"
        },
        deleted_data: {
          bsonType: "object",
          description: "Complete snapshot of the entity before deletion"
        },
        deleted_by: {
          bsonType: "string",
          description: "User or system that performed the deletion"
        },
        deleted_at: {
          bsonType: "date",
          description: "Timestamp of when the deletion occurred"
        }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});

// Index for efficient querying by entity type and date
db.audit_logs.createIndex(
  { entity_type: 1, deleted_at: -1 },
  { name: "idx_audit_entity_date" }
);

// Index for querying by entity ID
db.audit_logs.createIndex(
  { entity_id: 1 },
  { name: "idx_audit_entity_id" }
);

print("✅ audit_logs validation and indexes applied.");
print("");
print("=== MongoDB Schema Validation Complete ===");
print("Collections configured:");
print("  1. customer_purchase_history (denormalized, embedded orders)");
print("  2. audit_logs (append-only, flexible deleted_data)");
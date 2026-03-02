// ============================================================
// MegaStore Global - MongoDB Schema Validation
// Database: db_megastore_exam
// Run: mongosh db_megastore_exam docs/nosql/schema_validation.js
// ============================================================

// ============================================================
// Collection 1: customer_purchase_history
// Pattern: Denormalized document per customer (Embedding)
// Justification: Embeds all orders and items in a single document
// per customer for fast reads without JOINs. Ideal for the
// "read customer history" use case.
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
          description: "Customer email - required, unique identifier"
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
                description: "Array of products in this order",
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
                      description: "Total value (quantity * unit_price)"
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

// Unique index on customer_email to prevent duplicate customer documents
db.customer_purchase_history.createIndex(
  { customer_email: 1 },
  { unique: true, name: "idx_unique_customer_email" }
);

print("✅ customer_purchase_history: Schema validation and unique index applied.");

// ============================================================
// Collection 2: audit_logs
// Pattern: Append-only log documents
// Justification: Captures deleted entity snapshots whose shape
// varies by entity type. MongoDB's flexible schema (Mixed type)
// is ideal for storing different entity structures. Used for
// event sourcing and audit trail compliance.
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
          description: "Complete snapshot of the deleted entity data"
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

// Index for fast queries by entity type and deletion date
db.audit_logs.createIndex(
  { entity_type: 1, deleted_at: -1 },
  { name: "idx_audit_entity_date" }
);

// Index for looking up by entity ID
db.audit_logs.createIndex(
  { entity_id: 1 },
  { name: "idx_audit_entity_id" }
);

print("✅ audit_logs: Schema validation and indexes applied.");
print("");
print("🎉 All MongoDB schema validations applied successfully!");
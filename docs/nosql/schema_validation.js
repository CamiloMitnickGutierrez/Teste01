// MongoDB Schema Validation for db_megastore_exam

// audit_logs collection validation
db.createCollection("audit_logs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["entity_type", "entity_id", "action", "deleted_data", "deleted_by", "deleted_at"],
      properties: {
        entity_type: { bsonType: "string", description: "Type of entity (e.g., 'product')" },
        entity_id: { bsonType: "number", description: "ID of the deleted entity in PostgreSQL" },
        action: { bsonType: "string", enum: ["DELETE"], description: "Action performed" },
        deleted_data: { bsonType: "object", description: "Full snapshot of deleted object" },
        deleted_by: { bsonType: "string", description: "Who performed the deletion" },
        deleted_at: { bsonType: "date", description: "Timestamp of deletion" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// customer_purchase_history collection validation
db.createCollection("customer_purchase_history", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["customer_email", "customer_name", "orders"],
      properties: {
        customer_email: { bsonType: "string" },
        customer_name: { bsonType: "string" },
        customer_address: { bsonType: "string" },
        customer_phone: { bsonType: "string" },
        orders: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["transaction_id", "date", "items"],
            properties: {
              transaction_id: { bsonType: "string" },
              date: { bsonType: "date" },
              items: { bsonType: "array" }
            }
          }
        }
      }
    }
  }
});

// Unique index on customer_email
db.customer_purchase_history.createIndex({ customer_email: 1 }, { unique: true });

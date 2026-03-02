const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  entity_type: { type: String, required: true },
  entity_id: { type: Number, required: true },
  action: { type: String, required: true, enum: ['DELETE'] },
  deleted_data: { type: mongoose.Schema.Types.Mixed, required: true },
  deleted_by: { type: String, required: true, default: 'system' },
  deleted_at: { type: Date, required: true, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditLogSchema, 'audit_logs');

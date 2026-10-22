const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  module: { type: String, required: true, trim: true, index: true },
  resource: { type: String, required: true, trim: true },
  action: { 
    type: String, 
    required: true, 
    enum: ['create', 'view', 'list', 'edit', 'delete', 'approve', 'reject', 'export', 'assign', 'manage'] 
  },
  description: { type: String, default: '' },
  scope: { 
    type: String, 
    enum: ['PLATFORM', 'ORGANISATION', 'PROPERTY', 'BUILDING', 'FLOOR', 'UNIT', 'DEPARTMENT'],
    default: 'ORGANISATION'
  }
}, {
  timestamps: true
});

permissionSchema.index({ module: 1, resource: 1, action: 1 }, { unique: true });

module.exports = mongoose.model('Permission', permissionSchema);

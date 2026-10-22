const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  audience: { 
    type: String, 
    enum: ['ALL', 'RESIDENTS_ONLY', 'TENANTS_ONLY', 'OWNERS_ONLY', 'STAFF_ONLY'], 
    default: 'ALL' 
  },
  
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', default: null },
  publishDate: { type: Date, default: Date.now },
  expiryDate: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  attachmentUrl: { type: String, default: '' },
  priority: { type: String, enum: ['NORMAL', 'URGENT', 'CRITICAL'], default: 'NORMAL' },
  
  status: { type: String, enum: ['PUBLISHED', 'DRAFT', 'EXPIRED'], default: 'PUBLISHED' },
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notice', noticeSchema);

const mongoose = require('mongoose');

const tenantCompanySchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  
  companyName: { type: String, required: true, trim: true },
  companyCode: { type: String, required: true, uppercase: true, trim: true },
  contactPerson: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  
  gstNumber: { type: String, default: '' },
  panNumber: { type: String, default: '' },
  registeredAddress: { type: String, default: '' },
  billingAddress: { type: String, default: '' },
  employeesCount: { type: Number, default: 1 },
  
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'TERMINATED'], default: 'ACTIVE' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('TenantCompany', tenantCompanySchema);

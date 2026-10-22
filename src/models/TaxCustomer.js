const mongoose = require('mongoose');

const taxCustomerSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  customerName: { type: String, required: true, trim: true },
  companyName: { type: String, trim: true, default: '' },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  
  billingAddress: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  stateCode: { type: String, required: true, trim: true },
  postalCode: { type: String, required: true, trim: true },
  country: { type: String, default: 'India', trim: true },

  gstin: { type: String, trim: true, uppercase: true, default: '' },
  pan: { type: String, trim: true, uppercase: true, default: '' },
  
  notes: { type: String, default: '' },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

taxCustomerSchema.index({ organisationId: 1, email: 1 });
taxCustomerSchema.index({ organisationId: 1, customerName: 1 });

module.exports = mongoose.model('TaxCustomer', taxCustomerSchema);

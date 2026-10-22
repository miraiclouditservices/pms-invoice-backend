const mongoose = require('mongoose');

const taxBusinessProfileSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true },
  legalName: { type: String, required: true, trim: true },
  displayName: { type: String, trim: true, default: '' },
  address: { type: String, required: true, trim: true },
  addressLine2: { type: String, trim: true, default: '' },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  stateCode: { type: String, required: true, trim: true }, // e.g. "27" for Maharashtra, "29" for Karnataka, "07" for Delhi
  postalCode: { type: String, required: true, trim: true },
  country: { type: String, default: 'India', trim: true },
  email: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  gstin: { type: String, trim: true, uppercase: true, default: '' },
  pan: { type: String, trim: true, uppercase: true, default: '' },
  logoUrl: { type: String, default: '' },

  bankDetails: {
    bankName: { type: String, default: '' },
    branch: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '', uppercase: true },
    accountHolderName: { type: String, default: '' },
    showOnInvoice: { type: Boolean, default: true }
  },

  defaultPaymentTerms: { type: String, default: 'Net 15 Days' },
  defaultDueDays: { type: Number, default: 15 },
  invoiceNumberPrefix: { type: String, default: 'INV' },
  financialYearConfiguration: { type: String, default: 'AUTO' }, // e.g. "2026-27" or "AUTO"

  defaultTerms: { 
    type: String, 
    default: '1. Goods / Services once supplied will not be taken back or refunded except as per agreement.\n2. Payment should be made on or before the due date via online payment link or bank transfer.\n3. For payment queries, contact billing support using the details above.'
  },

  authorizedSignatory: {
    name: { type: String, default: 'Authorized Signatory' },
    designation: { type: String, default: 'Finance Director / Manager' },
    signatureUrl: { type: String, default: '' }
  },

  currency: { type: String, default: 'INR' },
  taxConfiguration: {
    defaultTaxRate: { type: Number, default: 18 },
    enableRoundOff: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

taxBusinessProfileSchema.index({ organisationId: 1 }, { unique: true });

module.exports = mongoose.model('TaxBusinessProfile', taxBusinessProfileSchema);

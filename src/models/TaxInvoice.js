const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  hsnSac: { type: String, default: '', trim: true },
  quantity: { type: Number, required: true, min: 0.01 },
  unit: { type: String, default: 'Nos', trim: true },
  rate: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 }, // Discount amount or percentage based on calculation
  taxRate: { type: Number, default: 18, min: 0 }, // e.g. 0, 5, 12, 18, 28
  taxableAmount: { type: Number, required: true },
  cgstRate: { type: Number, default: 0 },
  cgstAmount: { type: Number, default: 0 },
  sgstRate: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstRate: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true }
}, { _id: true });

const taxInvoiceSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  invoiceNumber: { type: String, required: true, trim: true, uppercase: true },
  financialYear: { type: String, required: true, trim: true }, // e.g. "2026-27"
  invoiceDate: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date, required: true },
  
  // Snapshots to guarantee immutability once issued
  businessSnapshot: {
    legalName: String,
    displayName: String,
    address: String,
    addressLine2: String,
    city: String,
    state: String,
    stateCode: String,
    postalCode: String,
    country: String,
    email: String,
    phone: String,
    gstin: String,
    pan: String,
    logoUrl: String,
    bankDetails: {
      bankName: String,
      branch: String,
      accountNumber: String,
      ifscCode: String,
      accountHolderName: String,
      showOnInvoice: Boolean
    },
    authorizedSignatory: {
      name: String,
      designation: String,
      signatureUrl: String
    }
  },

  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxCustomer', default: null, index: true },
  customerSnapshot: {
    customerName: String,
    companyName: String,
    billingAddress: String,
    city: String,
    state: String,
    stateCode: String,
    postalCode: String,
    country: String,
    email: String,
    phone: String,
    gstin: String,
    pan: String
  },

  lineItems: [lineItemSchema],

  subtotal: { type: Number, required: true, default: 0 },
  discountTotal: { type: Number, default: 0 },
  taxableAmount: { type: Number, required: true, default: 0 },
  cgstAmount: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  otherCharges: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true, default: 0 },
  amountPaid: { type: Number, default: 0 },
  balanceDue: { type: Number, required: true, default: 0 },
  amountInWords: { type: String, default: '' },
  
  currency: { type: String, default: 'INR' },
  taxTreatment: { 
    type: String, 
    enum: ['INTRA_STATE', 'INTER_STATE', 'NON_GST'], 
    default: 'INTRA_STATE' 
  },
  placeOfSupply: { type: String, default: '' },
  customerRefNumber: { type: String, default: '' },
  poNumber: { type: String, default: '' },
  notes: { type: String, default: '' },
  termsAndConditions: { type: String, default: '' },

  invoiceStatus: {
    type: String,
    enum: ['DRAFT', 'ISSUED', 'CANCELLED'],
    default: 'DRAFT',
    index: true
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'],
    default: 'PENDING',
    index: true
  },
  emailStatus: {
    type: String,
    enum: ['NOT_SENT', 'SENT', 'FAILED', 'DELIVERED'],
    default: 'NOT_SENT',
    index: true
  },

  // Cashfree Payment Link Details
  cashfreeLinkId: { type: String, default: '', index: true },
  cashfreePaymentLink: { type: String, default: '' },
  paymentLinkExpiry: { type: Date, default: null },

  issuedAt: { type: Date, default: null },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  lastReminderSentAt: { type: Date, default: null },
  reminderCount: { type: Number, default: 0 },

  auditHistory: [{
    action: { type: String, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    performedByName: { type: String, default: 'System' },
    timestamp: { type: Date, default: Date.now },
    details: { type: mongoose.Schema.Types.Mixed, default: {} }
  }],

  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

taxInvoiceSchema.index({ organisationId: 1, invoiceNumber: 1, financialYear: 1 }, { unique: true });
taxInvoiceSchema.index({ organisationId: 1, invoiceStatus: 1, paymentStatus: 1 });
taxInvoiceSchema.index({ organisationId: 1, dueDate: 1 });

module.exports = mongoose.model('TaxInvoice', taxInvoiceSchema);

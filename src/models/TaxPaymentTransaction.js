const mongoose = require('mongoose');

const taxPaymentTransactionSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxInvoice', required: true, index: true },
  
  paymentProvider: { type: String, default: 'CASHFREE' },
  cashfreeLinkId: { type: String, default: '', index: true },
  cashfreeOrderId: { type: String, default: '', index: true },
  cashfreePaymentId: { type: String, default: '' },
  gatewayReference: { type: String, default: '' },
  
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  paymentMethod: { type: String, default: 'ONLINE' }, // UPI, NETBANKING, CARD, WALLET
  
  paymentStatus: { 
    type: String, 
    enum: ['SUCCESS', 'FAILED', 'PENDING', 'USER_DROPPED', 'CANCELLED'], 
    default: 'PENDING',
    index: true 
  },
  
  gatewayEventId: { type: String, default: '' },
  paidAt: { type: Date, default: null },
  
  receiptNumber: { type: String, default: '' },
  receiptUrl: { type: String, default: '' },

  refundStatus: { type: String, default: 'NONE' },
  refundAmount: { type: Number, default: 0 },
  
  deduplicationKey: { type: String, unique: true, sparse: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true
});

taxPaymentTransactionSchema.index({ organisationId: 1, invoiceId: 1 });
taxPaymentTransactionSchema.index({ cashfreePaymentId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('TaxPaymentTransaction', taxPaymentTransactionSchema);

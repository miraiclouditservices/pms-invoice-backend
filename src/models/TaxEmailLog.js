const mongoose = require('mongoose');

const taxEmailLogSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxInvoice', required: true, index: true },
  recipient: { type: String, required: true, trim: true, lowercase: true },
  subject: { type: String, required: true },
  emailType: { 
    type: String, 
    enum: ['INVOICE_ISSUED', 'PAYMENT_REMINDER', 'PAYMENT_RECEIPT'], 
    required: true 
  },
  providerMessageId: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['SENT', 'FAILED', 'DELIVERED', 'QUEUED'], 
    default: 'SENT',
    index: true 
  },
  attemptCount: { type: Number, default: 1 },
  lastError: { type: String, default: '' },
  sentAt: { type: Date, default: Date.now },
  deliveredAt: { type: Date, default: null }
}, {
  timestamps: true
});

taxEmailLogSchema.index({ organisationId: 1, invoiceId: 1 });

module.exports = mongoose.model('TaxEmailLog', taxEmailLogSchema);

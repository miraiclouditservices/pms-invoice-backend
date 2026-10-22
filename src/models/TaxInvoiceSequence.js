const mongoose = require('mongoose');

const taxInvoiceSequenceSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  financialYear: { type: String, required: true }, // e.g. "2026-27"
  prefix: { type: String, default: 'INV' },
  currentSequence: { type: Number, default: 0 }
}, {
  timestamps: true
});

taxInvoiceSequenceSchema.index({ organisationId: 1, financialYear: 1, prefix: 1 }, { unique: true });

module.exports = mongoose.model('TaxInvoiceSequence', taxInvoiceSequenceSchema);

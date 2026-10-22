const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
  
  paymentNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  amount: { type: Number, required: true },
  paymentMode: { 
    type: String, 
    enum: ['ONLINE', 'UPI', 'BANK_TRANSFER', 'CARD', 'CASH', 'CHEQUE'], 
    default: 'ONLINE' 
  },
  transactionReference: { type: String, default: '' },
  paymentDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['SUCCESS', 'PENDING', 'FAILED'], default: 'SUCCESS', index: true },
  receiptUrl: { type: String, default: '' },
  notes: { type: String, default: '' },
  
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);

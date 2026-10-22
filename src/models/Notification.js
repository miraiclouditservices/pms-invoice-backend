const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', default: null, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
  
  notificationType: { 
    type: String, 
    enum: [
      'VISITOR_APPROVAL', 'VISITOR_CHECKED_IN', 'PAYMENT_RECEIVED', 'INVOICE_GENERATED', 
      'BOOKING_CONFIRMED', 'COMPLAINT_UPDATE', 'WORK_ORDER_ASSIGNED', 'AMC_EXPIRY', 
      'NOTICE_PUBLISHED', 'SYSTEM_ALERT'
    ], 
    default: 'SYSTEM_ALERT' 
  },
  
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  referenceModule: { type: String, default: '' },
  referenceId: { type: String, default: '' },
  
  readStatus: { type: Boolean, default: false, index: true },
  deliveryChannels: [{ type: String, enum: ['IN_APP', 'SOCKET', 'EMAIL', 'SMS', 'PUSH'] }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);

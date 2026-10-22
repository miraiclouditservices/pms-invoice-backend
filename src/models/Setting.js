const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', default: null, index: true },
  
  currency: { type: String, default: 'INR' },
  currencySymbol: { type: String, default: '₹' },
  timezone: { type: String, default: 'Asia/Kolkata' },
  dateFormat: { type: String, default: 'DD/MM/YYYY' },
  
  branding: {
    systemTitle: { type: String, default: 'SaaS Property Management System' },
    primaryColor: { type: String, default: '#2563EB' },
    logoUrl: { type: String, default: '' },
    faviconUrl: { type: String, default: '' }
  },
  
  emailSettings: {
    smtpHost: { type: String, default: '' },
    smtpPort: { type: Number, default: 587 },
    senderEmail: { type: String, default: 'notifications@pms-saas.com' },
    senderName: { type: String, default: 'PMS Notifications' },
    enabled: { type: Boolean, default: false }
  },
  
  smsSettings: {
    provider: { type: String, default: 'Twilio' },
    senderId: { type: String, default: '' },
    enabled: { type: Boolean, default: false }
  },
  
  paymentGatewaySettings: {
    provider: { type: String, default: 'Razorpay / Stripe' },
    keyId: { type: String, default: '' },
    testMode: { type: Boolean, default: true },
    enabled: { type: Boolean, default: true }
  },
  
  notificationSettings: {
    enableVisitorAlerts: { type: Boolean, default: true },
    enableRentReminders: { type: Boolean, default: true },
    enableComplaintAlerts: { type: Boolean, default: true },
    enableAmcExpiryAlerts: { type: Boolean, default: true }
  },
  
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: true
});

module.exports = mongoose.model('Setting', settingSchema);

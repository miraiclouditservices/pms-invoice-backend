const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', default: null, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
  title: { type: String, default: '' },
  conversationType: { 
    type: String, 
    enum: ['DIRECT', 'ORG_GROUP', 'PROPERTY_GROUP', 'SUPPORT'], 
    default: 'DIRECT' 
  },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessage: {
    text: { type: String, default: '' },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now }
  },
  isArchived: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Conversation', conversationSchema);

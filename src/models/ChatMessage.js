const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  senderName: { type: String, required: true },
  senderAvatar: { type: String, default: '' },
  text: { type: String, required: true, trim: true },
  attachmentUrl: { type: String, default: '' },
  attachmentType: { type: String, default: '' }, // 'IMAGE', 'DOCUMENT'
  status: { type: String, enum: ['SENT', 'DELIVERED', 'READ'], default: 'SENT' },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);

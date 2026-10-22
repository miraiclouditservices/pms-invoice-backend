const Conversation = require('../models/Conversation');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseFormatter');
const { getIO } = require('../sockets/socketManager');

const listConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    let conversations = await Conversation.find({
      participants: userId,
      isArchived: false
    })
      .populate('participants', 'firstName lastName email primaryRole avatar')
      .sort({ updatedAt: -1 });

    // If user has no conversations yet, auto-create a welcome channel with community/manager
    if (conversations.length === 0) {
      const defaultOrgId = req.currentOrganisationId || req.user.organisationId;
      const adminUser = await User.findOne({ 
        $or: [{ primaryRole: 'ORGANISATION_OWNER' }, { isPlatformAdmin: true }],
        _id: { $ne: userId }
      });

      if (adminUser) {
        const welcomeConv = await Conversation.create({
          organisationId: defaultOrgId,
          title: 'Management Support Desk',
          conversationType: 'SUPPORT',
          participants: [userId, adminUser._id],
          lastMessage: {
            text: 'Welcome to the PMS live communications channel. How can we assist you today?',
            senderId: adminUser._id,
            senderName: `${adminUser.firstName} ${adminUser.lastName}`,
            timestamp: new Date()
          }
        });

        await ChatMessage.create({
          conversationId: welcomeConv._id,
          senderId: adminUser._id,
          senderName: `${adminUser.firstName} ${adminUser.lastName}`,
          text: 'Welcome to the PMS live communications channel. How can we assist you today?'
        });

        conversations = [welcomeConv];
      }
    }

    return sendSuccess(res, 'Conversations fetched', conversations);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createConversation = async (req, res) => {
  try {
    const { participantId, title, conversationType = 'DIRECT' } = req.body;
    const userId = req.user._id;

    // Check if direct conversation already exists
    if (conversationType === 'DIRECT' && participantId) {
      const existing = await Conversation.findOne({
        conversationType: 'DIRECT',
        participants: { $all: [userId, participantId] }
      }).populate('participants', 'firstName lastName email primaryRole');

      if (existing) {
        return sendSuccess(res, 'Conversation exists', existing);
      }
    }

    const participants = [userId];
    if (participantId && !participants.includes(participantId)) {
      participants.push(participantId);
    }

    const conv = await Conversation.create({
      organisationId: req.currentOrganisationId || req.user.organisationId,
      propertyId: req.currentPropertyId || req.user.propertyId,
      title: title || 'Direct Chat',
      conversationType,
      participants
    });

    return sendSuccess(res, 'Conversation created', conv, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await ChatMessage.find({ conversationId: id, isDeleted: false })
      .sort({ createdAt: 1 })
      .limit(100);

    return sendSuccess(res, 'Messages fetched', messages);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, attachmentUrl, attachmentType } = req.body;
    const sender = req.user;

    const message = await ChatMessage.create({
      conversationId: id,
      senderId: sender._id,
      senderName: `${sender.firstName} ${sender.lastName}`,
      senderAvatar: sender.avatar || '',
      text,
      attachmentUrl: attachmentUrl || '',
      attachmentType: attachmentType || ''
    });

    // Update conversation last message
    await Conversation.findByIdAndUpdate(id, {
      lastMessage: {
        text,
        senderId: sender._id,
        senderName: `${sender.firstName} ${sender.lastName}`,
        timestamp: new Date()
      }
    });

    // Socket.IO real-time emission
    const io = getIO();
    if (io) {
      io.emit(`chat.message.${id}`, message);
      io.emit('chat.notification', {
        conversationId: id,
        senderName: `${sender.firstName} ${sender.lastName}`,
        text
      });
    }

    return sendSuccess(res, 'Message sent', message, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  listConversations,
  createConversation,
  getMessages,
  sendMessage
};

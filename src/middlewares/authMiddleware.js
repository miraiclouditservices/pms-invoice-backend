const { verifyAccessToken } = require('../utils/tokenUtil');
const { sendError } = require('../utils/responseFormatter');
const User = require('../models/User');
const UserRoleAssignment = require('../models/UserRoleAssignment');
const Role = require('../models/Role');
const Permission = require('../models/Permission');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication required. No token provided.', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      return sendError(res, 'Invalid or expired token', 401, 'TOKEN_EXPIRED');
    }

    const user = await User.findById(decoded.userId).select('+password');
    if (!user || user.isDeleted || user.status !== 'ACTIVE') {
      return sendError(res, 'User not found or account is deactivated', 403, 'FORBIDDEN');
    }

    // Load active role assignments and permissions
    const assignments = await UserRoleAssignment.find({
      userId: user._id,
      status: 'ACTIVE'
    }).populate({
      path: 'roleId',
      populate: { path: 'permissions' }
    });

    req.user = {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      isPlatformAdmin: user.isPlatformAdmin,
      primaryRole: user.primaryRole,
      organisationId: user.organisationId,
      propertyId: user.propertyId,
      roleAssignments: assignments
    };

    next();
  } catch (error) {
    return sendError(res, error.message || 'Authentication error', 500, 'AUTH_ERROR');
  }
};

module.exports = { authenticate };

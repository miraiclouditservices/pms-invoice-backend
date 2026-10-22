const User = require('../models/User');
const UserRoleAssignment = require('../models/UserRoleAssignment');
const { sendSuccess, sendError } = require('../utils/responseFormatter');
const { logAudit } = require('../middlewares/auditMiddleware');
const bcrypt = require('bcryptjs');

const listUsers = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (req.query.role) filter.primaryRole = req.query.role;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      filter.$or = [
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { mobile: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .populate('organisationId', 'name code')
      .populate('propertyId', 'name code')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Users fetched', users);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, password, primaryRole, organisationId, propertyId } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return sendError(res, 'User with this email already exists', 400, 'USER_EXISTS');
    }

    const targetOrgId = req.currentOrganisationId || organisationId || req.user.organisationId;
    const targetPropId = req.currentPropertyId || propertyId || req.user.propertyId;

    const user = await User.create({
      firstName,
      lastName,
      email,
      mobile,
      password: password || 'Password@123',
      primaryRole: primaryRole || 'VIEWER',
      organisationId: targetOrgId,
      propertyId: targetPropId,
      status: 'ACTIVE',
      createdBy: req.user._id
    });

    await logAudit(req, {
      action: 'CREATE',
      module: 'USER',
      recordId: user._id,
      newData: { email, primaryRole }
    });

    return sendSuccess(res, 'User created successfully', user, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.isDeleted) {
      return sendError(res, 'User not found', 404, 'NOT_FOUND');
    }

    const oldData = user.toObject();
    Object.assign(user, req.body, { updatedBy: req.user._id });
    await user.save();

    await logAudit(req, {
      action: 'UPDATE',
      module: 'USER',
      recordId: user._id,
      oldData,
      newData: user.toObject()
    });

    return sendSuccess(res, 'User updated successfully', user);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const changeUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status, updatedBy: req.user._id },
      { new: true }
    );
    if (!user) return sendError(res, 'User not found', 404, 'NOT_FOUND');

    await logAudit(req, {
      action: 'STATUS_CHANGE',
      module: 'USER',
      recordId: user._id,
      newData: { status }
    });

    return sendSuccess(res, `User status updated to ${status}`, user);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return sendError(res, 'Current password is incorrect', 400, 'INVALID_PASSWORD');
    }

    user.password = newPassword;
    await user.save();

    await logAudit(req, {
      action: 'CHANGE_PASSWORD',
      module: 'USER',
      recordId: user._id
    });

    return sendSuccess(res, 'Password updated successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  listUsers,
  createUser,
  updateUser,
  changeUserStatus,
  changePassword
};

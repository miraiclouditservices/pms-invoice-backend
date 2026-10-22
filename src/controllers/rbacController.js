const Role = require('../models/Role');
const Permission = require('../models/Permission');
const UserRoleAssignment = require('../models/UserRoleAssignment');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseFormatter');

const listRoles = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) {
      filter.$or = [{ organisationId: orgId }, { isSystemRole: true }];
    }

    const roles = await Role.find(filter)
      .populate('permissions')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Roles fetched', roles);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createRole = async (req, res) => {
  try {
    const role = await Role.create({
      ...req.body,
      organisationId: req.currentOrganisationId || req.user.organisationId,
      createdBy: req.user._id
    });
    return sendSuccess(res, 'Role created successfully', role, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const listPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find().sort({ module: 1, resource: 1 });
    return sendSuccess(res, 'Permissions fetched', permissions);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const listUserAssignments = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = {};
    if (orgId) filter.organisationId = orgId;

    const assignments = await UserRoleAssignment.find(filter)
      .populate('userId', 'firstName lastName email primaryRole')
      .populate('roleId')
      .populate('propertyIds', 'name code')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'User assignments fetched', assignments);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const assignRoleToUser = async (req, res) => {
  try {
    const assignment = await UserRoleAssignment.create({
      ...req.body,
      organisationId: req.currentOrganisationId || req.user.organisationId,
      assignedBy: req.user._id
    });
    return sendSuccess(res, 'Role assigned successfully', assignment, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  listRoles,
  createRole,
  listPermissions,
  listUserAssignments,
  assignRoleToUser
};

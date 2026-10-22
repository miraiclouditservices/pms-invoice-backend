const { sendError } = require('../utils/responseFormatter');

const checkPermission = (moduleName, resourceName, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
    }

    // Platform Owner has full access
    if (req.user.isPlatformAdmin || req.user.primaryRole === 'PLATFORM_OWNER') {
      return next();
    }

    // Organisation Owner has full management within their organisation
    if (req.user.primaryRole === 'ORGANISATION_OWNER') {
      return next();
    }

    // Property Manager has management permissions for property-level resources
    if (req.user.primaryRole === 'PROPERTY_MANAGER' && !['ORGANISATION', 'PLATFORM_SETTINGS'].includes(moduleName)) {
      return next();
    }

    // Check specific permission assignments
    const assignments = req.user.roleAssignments || [];
    let hasPermission = false;

    for (const assignment of assignments) {
      if (assignment.status !== 'ACTIVE') continue;
      const role = assignment.roleId;
      if (!role || role.status !== 'ACTIVE') continue;

      const permissions = role.permissions || [];
      const match = permissions.find(p => 
        (p.module === moduleName || p.module === '*') &&
        (p.resource === resourceName || p.resource === '*') &&
        (p.action === action || p.action === 'manage')
      );

      if (match) {
        hasPermission = true;
        break;
      }
    }

    // Check permission overrides if any
    for (const assignment of assignments) {
      for (const override of (assignment.permissionOverrides || [])) {
        if (override.permissionId && override.permissionId.module === moduleName && override.permissionId.action === action) {
          hasPermission = override.granted;
        }
      }
    }

    if (!hasPermission) {
      return sendError(
        res, 
        `Access Denied: You do not have permission to ${action} ${resourceName} in ${moduleName}`, 
        403, 
        'FORBIDDEN'
      );
    }

    next();
  };
};

module.exports = { checkPermission };

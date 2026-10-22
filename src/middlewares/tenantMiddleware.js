const { sendError } = require('../utils/responseFormatter');

const tenantMiddleware = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'Unauthenticated user', 401, 'UNAUTHORIZED');
  }

  // Platform Owners bypass single tenant scoping if they are inspecting all orgs,
  // but if header x-organisation-id is provided, scope to that.
  if (req.user.isPlatformAdmin) {
    req.currentOrganisationId = req.headers['x-organisation-id'] || req.query.organisationId || req.user.organisationId || null;
    req.currentPropertyId = req.headers['x-property-id'] || req.query.propertyId || req.user.propertyId || null;
    return next();
  }

  // Organisation-level users MUST only access their own organisation
  const userOrgId = req.user.organisationId ? req.user.organisationId.toString() : null;
  const requestedOrgId = req.headers['x-organisation-id'] || req.query.organisationId || req.body?.organisationId;

  if (requestedOrgId && userOrgId && requestedOrgId !== userOrgId) {
    return sendError(res, 'Tenant Isolation Violation: Cross-organisation access is strictly forbidden', 403, 'TENANT_VIOLATION');
  }

  req.currentOrganisationId = userOrgId;
  req.currentPropertyId = req.headers['x-property-id'] || req.query.propertyId || req.body?.propertyId || (req.user.propertyId ? req.user.propertyId.toString() : null);

  next();
};

module.exports = { tenantMiddleware };

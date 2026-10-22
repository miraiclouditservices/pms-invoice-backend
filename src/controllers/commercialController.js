const TenantCompany = require('../models/TenantCompany');
const AggregateLease = require('../models/AggregateLease');
const Unit = require('../models/Unit');
const { sendSuccess, sendError } = require('../utils/responseFormatter');
const { logAudit } = require('../middlewares/auditMiddleware');

// Tenant Companies
const listTenantCompanies = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (req.currentPropertyId) filter.propertyId = req.currentPropertyId;

    const companies = await TenantCompany.find(filter)
      .populate('propertyId', 'name code')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Tenant companies fetched', companies);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createTenantCompany = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const company = await TenantCompany.create({
      ...req.body,
      organisationId: orgId,
      createdBy: req.user._id
    });

    await logAudit(req, {
      action: 'CREATE',
      module: 'COMMERCIAL_COMPANY',
      recordId: company._id,
      newData: company.toObject()
    });

    return sendSuccess(res, 'Tenant company created successfully', company, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Aggregate Lease Management (multi-unit, multi-floor)
const listLeases = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (req.currentPropertyId) filter.propertyId = req.currentPropertyId;

    const leases = await AggregateLease.find(filter)
      .populate('tenantCompanyId', 'companyName companyCode contactPerson email phone')
      .populate('propertyId', 'name code')
      .populate('buildingIds', 'name code')
      .populate('floorIds', 'floorNumber floorName')
      .populate('unitIds', 'unitNumber unitType carpetArea rentableArea')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Aggregate leases fetched', leases);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createLease = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const { unitIds, monthlyBaseRent, camCharges = 0, utilityCharges = 0, parkingCharges = 0, taxPercent = 18 } = req.body;

    // Validate that units are not already occupied
    const existingOccupied = await Unit.find({
      _id: { $in: unitIds },
      occupancyStatus: 'OCCUPIED'
    });

    if (existingOccupied.length > 0) {
      const occupiedNumbers = existingOccupied.map(u => u.unitNumber).join(', ');
      return sendError(res, `Cannot create lease: Units (${occupiedNumbers}) are already occupied.`, 409, 'UNIT_ALREADY_OCCUPIED');
    }

    // Calculate total monthly payable
    const subtotal = Number(monthlyBaseRent) + Number(camCharges) + Number(utilityCharges) + Number(parkingCharges);
    const taxAmount = (subtotal * Number(taxPercent)) / 100;
    const totalMonthlyPayable = subtotal + taxAmount;

    const lease = await AggregateLease.create({
      ...req.body,
      organisationId: orgId,
      totalMonthlyPayable,
      createdBy: req.user._id
    });

    // Mark all associated units as occupied by this tenant company
    await Unit.updateMany(
      { _id: { $in: unitIds } },
      {
        occupancyStatus: 'OCCUPIED',
        currentTenantCompanyId: req.body.tenantCompanyId
      }
    );

    await logAudit(req, {
      action: 'CREATE',
      module: 'AGGREGATE_LEASE',
      recordId: lease._id,
      newData: lease.toObject()
    });

    return sendSuccess(res, 'Aggregate lease created successfully', lease, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const getLeaseById = async (req, res) => {
  try {
    const lease = await AggregateLease.findById(req.params.id)
      .populate('tenantCompanyId')
      .populate('propertyId')
      .populate('buildingIds')
      .populate('floorIds')
      .populate('unitIds');

    if (!lease || lease.isDeleted) {
      return sendError(res, 'Lease not found', 404, 'NOT_FOUND');
    }

    return sendSuccess(res, 'Lease details', lease);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  listTenantCompanies,
  createTenantCompany,
  listLeases,
  createLease,
  getLeaseById
};

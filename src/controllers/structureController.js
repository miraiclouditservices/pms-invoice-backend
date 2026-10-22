const Building = require('../models/Building');
const Floor = require('../models/Floor');
const Unit = require('../models/Unit');
const { sendSuccess, sendError } = require('../utils/responseFormatter');
const { logAudit } = require('../middlewares/auditMiddleware');

// Buildings
const listBuildings = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (req.query.propertyId) {
      filter.propertyId = req.query.propertyId;
    } else if (req.currentPropertyId) {
      filter.propertyId = req.currentPropertyId;
    }
    if (req.query.status) filter.status = req.query.status;

    const buildings = await Building.find(filter)
      .populate('propertyId', 'name code propertyType city state address')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Buildings fetched', buildings);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const getBuildingById = async (req, res) => {
  try {
    const building = await Building.findOne({ _id: req.params.id, isDeleted: false })
      .populate('propertyId', 'name code propertyType city state address');
    if (!building) return sendError(res, 'Building not found', 404, 'NOT_FOUND');

    const floors = await Floor.find({ buildingId: building._id, isDeleted: false }).sort({ floorNumber: 1 });
    const units = await Unit.find({ buildingId: building._id, isDeleted: false });

    return sendSuccess(res, 'Building details fetched', {
      building,
      floors,
      unitsCount: units.length,
      occupiedUnits: units.filter(u => u.occupancyStatus === 'OCCUPIED').length,
      vacantUnits: units.filter(u => u.occupancyStatus === 'VACANT').length
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createBuilding = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const propId = req.body.propertyId || req.currentPropertyId || req.user.propertyId;

    if (!propId) {
      return sendError(res, 'Property ID is required to create a building', 400);
    }

    const building = await Building.create({
      ...req.body,
      organisationId: orgId,
      propertyId: propId,
      createdBy: req.user._id
    });

    await logAudit(req, {
      action: 'CREATE',
      module: 'BUILDING',
      recordId: building._id,
      newData: building.toObject()
    });

    return sendSuccess(res, 'Building created successfully', building, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const updateBuilding = async (req, res) => {
  try {
    const building = await Building.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { ...req.body, updatedBy: req.user._id },
      { new: true }
    );
    if (!building) return sendError(res, 'Building not found', 404, 'NOT_FOUND');

    return sendSuccess(res, 'Building updated successfully', building);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const deleteBuilding = async (req, res) => {
  try {
    const building = await Building.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true, status: 'ARCHIVED', updatedBy: req.user._id },
      { new: true }
    );
    if (!building) return sendError(res, 'Building not found', 404, 'NOT_FOUND');

    return sendSuccess(res, 'Building archived successfully', building);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Floors
const listFloors = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (req.query.propertyId) {
      filter.propertyId = req.query.propertyId;
    } else if (req.currentPropertyId) {
      filter.propertyId = req.currentPropertyId;
    }
    if (req.query.buildingId) filter.buildingId = req.query.buildingId;
    if (req.query.floorType) filter.floorType = req.query.floorType;

    const floors = await Floor.find(filter)
      .populate('propertyId', 'name code propertyType')
      .populate('buildingId', 'name code buildingType')
      .sort({ floorNumber: 1 });

    return sendSuccess(res, 'Floors fetched', floors);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const getFloorById = async (req, res) => {
  try {
    const floor = await Floor.findOne({ _id: req.params.id, isDeleted: false })
      .populate('propertyId', 'name code propertyType')
      .populate('buildingId', 'name code buildingType');
    if (!floor) return sendError(res, 'Floor not found', 404, 'NOT_FOUND');

    const units = await Unit.find({ floorId: floor._id, isDeleted: false })
      .populate('currentResidentId', 'name email mobile')
      .populate('currentTenantCompanyId', 'companyName contactPerson email')
      .populate('currentMemberId', 'memberName email');

    return sendSuccess(res, 'Floor details fetched', {
      floor,
      units,
      unitsCount: units.length,
      occupiedUnits: units.filter(u => u.occupancyStatus === 'OCCUPIED').length,
      vacantUnits: units.filter(u => u.occupancyStatus === 'VACANT').length
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createFloor = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const propId = req.body.propertyId || req.currentPropertyId || req.user.propertyId;

    const floor = await Floor.create({
      ...req.body,
      organisationId: orgId,
      propertyId: propId,
      createdBy: req.user._id
    });

    return sendSuccess(res, 'Floor created successfully', floor, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const updateFloor = async (req, res) => {
  try {
    const floor = await Floor.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { ...req.body, updatedBy: req.user._id },
      { new: true }
    );
    if (!floor) return sendError(res, 'Floor not found', 404, 'NOT_FOUND');

    return sendSuccess(res, 'Floor updated successfully', floor);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const deleteFloor = async (req, res) => {
  try {
    const floor = await Floor.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true, status: 'RESTRICTED', updatedBy: req.user._id },
      { new: true }
    );
    if (!floor) return sendError(res, 'Floor not found', 404, 'NOT_FOUND');

    return sendSuccess(res, 'Floor archived successfully', floor);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Units & Spaces
const listUnits = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (req.query.propertyId) {
      filter.propertyId = req.query.propertyId;
    } else if (req.currentPropertyId) {
      filter.propertyId = req.currentPropertyId;
    }
    if (req.query.buildingId) filter.buildingId = req.query.buildingId;
    if (req.query.floorId) filter.floorId = req.query.floorId;
    if (req.query.occupancyStatus) filter.occupancyStatus = req.query.occupancyStatus;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.unitType) filter.unitType = req.query.unitType;
    if (req.query.search) {
      filter.$or = [
        { unitNumber: { $regex: req.query.search, $options: 'i' } },
        { unitName: { $regex: req.query.search, $options: 'i' } },
        { wing: { $regex: req.query.search, $options: 'i' } },
        { flatNumber: { $regex: req.query.search, $options: 'i' } },
        { spaceNumber: { $regex: req.query.search, $options: 'i' } },
        { officeShopNumber: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const units = await Unit.find(filter)
      .populate('propertyId', 'name code propertyType')
      .populate('buildingId', 'name code buildingType')
      .populate('floorId', 'floorNumber floorName floorType')
      .populate('currentResidentId', 'name email mobile residentType')
      .populate('currentTenantCompanyId', 'companyName contactPerson email')
      .populate('currentMemberId', 'memberName email companyName')
      .sort({ unitNumber: 1 });

    return sendSuccess(res, 'Units & spaces fetched', units);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const getUnitById = async (req, res) => {
  try {
    const unit = await Unit.findOne({ _id: req.params.id, isDeleted: false })
      .populate('propertyId', 'name code propertyType city state address')
      .populate('buildingId', 'name code buildingType')
      .populate('floorId', 'floorNumber floorName floorType')
      .populate('currentResidentId', 'name email mobile residentType')
      .populate('currentTenantCompanyId', 'companyName contactPerson email')
      .populate('currentMemberId', 'memberName email companyName');
      
    if (!unit) return sendError(res, 'Unit/Space not found', 404, 'NOT_FOUND');

    return sendSuccess(res, 'Unit details fetched', unit);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createUnit = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const propId = req.body.propertyId || req.currentPropertyId || req.user.propertyId;

    const unit = await Unit.create({
      ...req.body,
      organisationId: orgId,
      propertyId: propId,
      createdBy: req.user._id
    });

    return sendSuccess(res, 'Unit/Space created successfully', unit, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const updateUnit = async (req, res) => {
  try {
    const unit = await Unit.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { ...req.body, updatedBy: req.user._id },
      { new: true }
    );
    if (!unit) return sendError(res, 'Unit/Space not found', 404, 'NOT_FOUND');

    return sendSuccess(res, 'Unit/Space updated successfully', unit);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const updateUnitStatus = async (req, res) => {
  try {
    const { occupancyStatus, status } = req.body;
    const updates = { updatedBy: req.user._id };
    if (occupancyStatus) updates.occupancyStatus = occupancyStatus;
    if (status) updates.status = status;

    const unit = await Unit.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );
    if (!unit) return sendError(res, 'Unit not found', 404, 'NOT_FOUND');
    return sendSuccess(res, 'Unit status updated', unit);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const deleteUnit = async (req, res) => {
  try {
    const unit = await Unit.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true, status: 'ARCHIVED', updatedBy: req.user._id },
      { new: true }
    );
    if (!unit) return sendError(res, 'Unit/Space not found', 404, 'NOT_FOUND');

    return sendSuccess(res, 'Unit/Space archived successfully', unit);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Hierarchy Overview Summary
const getStructureSummary = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const propId = req.query.propertyId || req.currentPropertyId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (propId) filter.propertyId = propId;

    const [buildings, floors, units] = await Promise.all([
      Building.find(filter),
      Floor.find(filter),
      Unit.find(filter)
    ]);

    const totalUnits = units.length;
    const occupied = units.filter(u => u.occupancyStatus === 'OCCUPIED').length;
    const vacant = units.filter(u => u.occupancyStatus === 'VACANT').length;
    const reserved = units.filter(u => u.occupancyStatus === 'RESERVED').length;
    const maintenance = units.filter(u => u.occupancyStatus === 'MAINTENANCE').length;
    const occupancyRate = totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0;

    return sendSuccess(res, 'Hierarchy structure summary', {
      totalBuildings: buildings.length,
      totalFloors: floors.length,
      totalUnits,
      occupied,
      vacant,
      reserved,
      maintenance,
      occupancyRate
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  listBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  listFloors,
  getFloorById,
  createFloor,
  updateFloor,
  deleteFloor,
  listUnits,
  getUnitById,
  createUnit,
  updateUnit,
  updateUnitStatus,
  deleteUnit,
  getStructureSummary
};

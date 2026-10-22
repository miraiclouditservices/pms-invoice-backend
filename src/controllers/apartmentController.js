const Resident = require('../models/Resident');
const Unit = require('../models/Unit');
const Notice = require('../models/Notice');
const Amenity = require('../models/Amenity');
const { sendSuccess, sendError } = require('../utils/responseFormatter');
const { logAudit } = require('../middlewares/auditMiddleware');

// Residents
const listResidents = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (req.currentPropertyId) filter.propertyId = req.currentPropertyId;
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { mobile: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const residents = await Resident.find(filter)
      .populate('propertyId', 'name code')
      .populate('buildingId', 'name code')
      .populate('unitId', 'unitNumber unitType occupancyStatus')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Residents fetched', residents);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createResident = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const resident = await Resident.create({
      ...req.body,
      organisationId: orgId,
      createdBy: req.user._id
    });

    // Mark unit as occupied
    if (req.body.unitId) {
      await Unit.findByIdAndUpdate(req.body.unitId, {
        occupancyStatus: 'OCCUPIED',
        currentResidentId: resident._id
      });
    }

    await logAudit(req, {
      action: 'CREATE',
      module: 'RESIDENT',
      recordId: resident._id,
      newData: resident.toObject()
    });

    return sendSuccess(res, 'Resident created successfully', resident, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const getResidentById = async (req, res) => {
  try {
    const resident = await Resident.findById(req.params.id)
      .populate('propertyId', 'name code')
      .populate('buildingId', 'name code')
      .populate('unitId');
    if (!resident || resident.isDeleted) {
      return sendError(res, 'Resident not found', 404, 'NOT_FOUND');
    }
    return sendSuccess(res, 'Resident details', resident);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Flats
const listFlats = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (req.currentPropertyId) filter.propertyId = req.currentPropertyId;

    const flats = await Unit.find(filter)
      .populate('buildingId', 'name code')
      .populate('floorId', 'floorNumber floorName')
      .populate('currentResidentId', 'name email mobile residentType')
      .sort({ unitNumber: 1 });

    return sendSuccess(res, 'Flats fetched', flats);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Notices
const listNotices = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (req.currentPropertyId) filter.propertyId = req.currentPropertyId;

    const notices = await Notice.find(filter)
      .populate('buildingId', 'name')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Notices fetched', notices);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createNotice = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const notice = await Notice.create({
      ...req.body,
      organisationId: orgId,
      publishedBy: req.user._id
    });
    return sendSuccess(res, 'Notice published successfully', notice, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Amenities
const listAmenities = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (req.currentPropertyId) filter.propertyId = req.currentPropertyId;

    const amenities = await Amenity.find(filter).sort({ name: 1 });
    return sendSuccess(res, 'Amenities fetched', amenities);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  listResidents,
  createResident,
  getResidentById,
  listFlats,
  listNotices,
  createNotice,
  listAmenities
};

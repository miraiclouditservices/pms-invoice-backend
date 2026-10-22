const MembershipPlan = require('../models/MembershipPlan');
const CoworkingMember = require('../models/CoworkingMember');
const Booking = require('../models/Booking');
const Unit = require('../models/Unit');
const { sendSuccess, sendError } = require('../utils/responseFormatter');
const { logAudit } = require('../middlewares/auditMiddleware');
const { emitToOrganisation } = require('../sockets/socketManager');

// Membership Plans
const listPlans = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;

    const plans = await MembershipPlan.find(filter).sort({ monthlyPrice: 1 });
    return sendSuccess(res, 'Membership plans fetched', plans);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createPlan = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const plan = await MembershipPlan.create({
      ...req.body,
      organisationId: orgId,
      createdBy: req.user._id
    });
    return sendSuccess(res, 'Plan created successfully', plan, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Members
const listMembers = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (req.currentPropertyId) filter.propertyId = req.currentPropertyId;

    const members = await CoworkingMember.find(filter)
      .populate('membershipPlanId')
      .populate('propertyId', 'name code')
      .populate('assignedUnitId', 'unitNumber unitType')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Members fetched', members);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createMember = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const member = await CoworkingMember.create({
      ...req.body,
      organisationId: orgId,
      createdBy: req.user._id
    });

    if (req.body.assignedUnitId) {
      await Unit.findByIdAndUpdate(req.body.assignedUnitId, {
        occupancyStatus: 'OCCUPIED',
        currentMemberId: member._id
      });
    }

    await logAudit(req, {
      action: 'CREATE',
      module: 'COWORKING_MEMBER',
      recordId: member._id,
      newData: member.toObject()
    });

    return sendSuccess(res, 'Member added successfully', member, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Bookings with conflict prevention
const listBookings = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (req.currentPropertyId) filter.propertyId = req.currentPropertyId;
    if (req.query.bookingType) filter.bookingType = req.query.bookingType;

    const bookings = await Booking.find(filter)
      .populate('unitId', 'unitNumber unitType')
      .populate('amenityId', 'name category')
      .populate('memberId', 'memberName companyName email')
      .populate('residentId', 'name mobile')
      .sort({ startDateTime: -1 });

    return sendSuccess(res, 'Bookings fetched', bookings);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createBooking = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const { unitId, amenityId, bookingDate, startTime, endTime, bookingType } = req.body;

    const dateStr = new Date(bookingDate).toISOString().split('T')[0];
    const startDateTime = new Date(`${dateStr}T${startTime}:00`);
    const endDateTime = new Date(`${dateStr}T${endTime}:00`);

    if (startDateTime >= endDateTime) {
      return sendError(res, 'End time must be greater than start time', 400, 'INVALID_TIME_RANGE');
    }

    // Business rule: Overlap conflict check for the requested unit or amenity
    const conflictQuery = {
      isDeleted: false,
      status: { $in: ['CONFIRMED', 'PENDING'] },
      $or: [
        {
          startDateTime: { $lt: endDateTime },
          endDateTime: { $gt: startDateTime }
        }
      ]
    };

    if (unitId) conflictQuery.unitId = unitId;
    if (amenityId) conflictQuery.amenityId = amenityId;

    const conflict = await Booking.findOne(conflictQuery);
    if (conflict) {
      return sendError(res, `Booking conflict: This resource is already booked between ${conflict.startTime} and ${conflict.endTime}`, 409, 'BOOKING_CONFLICT');
    }

    const bookingNumber = `BK-${Date.now().toString().slice(-6)}`;
    const booking = await Booking.create({
      ...req.body,
      bookingNumber,
      organisationId: orgId,
      startDateTime,
      endDateTime,
      createdBy: req.user._id
    });

    // Real-time notification broadcast
    emitToOrganisation(orgId, 'booking.created', {
      bookingNumber,
      bookingType,
      startDateTime,
      endDateTime
    });

    await logAudit(req, {
      action: 'CREATE',
      module: 'BOOKING',
      recordId: booking._id,
      newData: booking.toObject()
    });

    return sendSuccess(res, 'Booking created successfully', booking, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.isDeleted) {
      return sendError(res, 'Booking not found', 404, 'NOT_FOUND');
    }

    booking.status = 'CANCELLED';
    booking.approvalStatus = 'CANCELLED';
    booking.cancellationReason = req.body.reason || 'Cancelled by user';
    booking.cancelledAt = new Date();
    await booking.save();

    emitToOrganisation(booking.organisationId, 'booking.cancelled', {
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber
    });

    return sendSuccess(res, 'Booking cancelled and resource released', booking);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  listPlans,
  createPlan,
  listMembers,
  createMember,
  listBookings,
  createBooking,
  cancelBooking
};

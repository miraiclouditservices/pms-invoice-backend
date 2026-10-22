const Visitor = require('../models/Visitor');
const Delivery = require('../models/Delivery');
const EmergencyAccess = require('../models/EmergencyAccess');
const Property = require('../models/Property');
const Building = require('../models/Building');
const Unit = require('../models/Unit');
const { sendSuccess, sendError } = require('../utils/responseFormatter');
const { emitToOrganisation } = require('../sockets/socketManager');
const logger = require('../config/logger');

// Generate distinct pass code
const generatePassCode = (prefix = 'VP') => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${result}`;
};

// 1. List Visitors
exports.listVisitors = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;

    if (req.query.propertyId) filter.propertyId = req.query.propertyId;
    else if (req.currentPropertyId) filter.propertyId = req.currentPropertyId;

    if (req.query.propertyType) filter.propertyType = req.query.propertyType;
    if (req.query.buildingId) filter.buildingId = req.query.buildingId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.hostApprovalStatus) filter.hostApprovalStatus = req.query.hostApprovalStatus;
    if (req.query.visitorType) filter.visitorType = req.query.visitorType;
    if (req.query.isOverstay === 'true') filter.isOverstay = true;

    // Search query
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { visitorName: searchRegex },
        { mobile: searchRegex },
        { passCode: searchRegex },
        { hostName: searchRegex },
        { unitNumber: searchRegex },
        { vehicleNumber: searchRegex }
      ];
    }

    const visitors = await Visitor.find(filter)
      .populate('propertyId', 'name propertyType code')
      .populate('buildingId', 'name code')
      .populate('unitId', 'unitNumber')
      .sort({ expectedDate: -1, createdAt: -1 })
      .limit(req.query.limit ? parseInt(req.query.limit) : 200);

    return sendSuccess(res, 'Visitors fetched successfully', visitors);
  } catch (error) {
    logger.error('listVisitors error: %o', error);
    return sendError(res, error.message, 500);
  }
};

// 2. Visitor Analytics & KPI Summary
exports.getVisitorAnalytics = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (req.query.propertyId) filter.propertyId = req.query.propertyId;
    else if (req.currentPropertyId) filter.propertyId = req.currentPropertyId;

    const allVisitors = await Visitor.find(filter);

    const expectedToday = allVisitors.filter(v => v.status === 'EXPECTED').length;
    const currentlyInside = allVisitors.filter(v => v.status === 'CHECKED_IN').length;
    const checkedOutToday = allVisitors.filter(v => v.status === 'CHECKED_OUT').length;
    const pendingApprovals = allVisitors.filter(v => v.hostApprovalStatus === 'PENDING').length;
    const deniedEntries = allVisitors.filter(v => v.status === 'DENIED').length;
    const overstayCount = allVisitors.filter(v => v.isOverstay || v.status === 'OVERSTAY').length;
    const vehicleVisitors = allVisitors.filter(v => v.vehicleNumber && v.vehicleNumber.trim() !== '').length;

    // Deliveries count
    const deliveryFilter = { isDeleted: false };
    if (orgId) deliveryFilter.organisationId = orgId;
    if (filter.propertyId) deliveryFilter.propertyId = filter.propertyId;
    const deliveriesCount = await Delivery.countDocuments(deliveryFilter);

    // Emergency count
    const emergencyCount = await EmergencyAccess.countDocuments({ status: 'ACTIVE' });

    return sendSuccess(res, 'Visitor analytics fetched', {
      expectedToday,
      currentlyInside,
      checkedOutToday,
      pendingApprovals,
      deniedEntries,
      overstayCount,
      vehicleVisitors,
      deliveriesCount,
      emergencyCount,
      totalPasses: allVisitors.length
    });
  } catch (error) {
    logger.error('getVisitorAnalytics error: %o', error);
    return sendError(res, error.message, 500);
  }
};

// 3. Get Single Visitor
exports.getVisitorById = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id)
      .populate('propertyId', 'name propertyType address')
      .populate('buildingId', 'name code')
      .populate('unitId', 'unitNumber floorNumber')
      .populate('hostUserId', 'firstName lastName email mobile');

    if (!visitor || visitor.isDeleted) {
      return sendError(res, 'Visitor pass not found', 404, 'NOT_FOUND');
    }

    return sendSuccess(res, 'Visitor details retrieved', visitor);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 4. Create Visitor Request / Pre-registration
exports.createVisitor = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const passCode = generatePassCode('VP');
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${passCode}`;

    // Lookup Property & Building details if IDs provided
    let propertyName = req.body.propertyName || '';
    let propertyType = req.body.propertyType || 'RESIDENTIAL';
    if (req.body.propertyId) {
      const prop = await Property.findById(req.body.propertyId);
      if (prop) {
        propertyName = prop.name;
        propertyType = prop.propertyType || propertyType;
      }
    }

    let buildingName = req.body.buildingName || '';
    if (req.body.buildingId) {
      const bldg = await Building.findById(req.body.buildingId);
      if (bldg) buildingName = bldg.name;
    }

    let unitNumber = req.body.unitNumber || '';
    if (req.body.unitId && !unitNumber) {
      const u = await Unit.findById(req.body.unitId);
      if (u) unitNumber = u.unitNumber;
    }

    const hostApprovalStatus = req.body.hostApprovalStatus || 
      (req.user.primaryRole === 'RESIDENT' || req.user.primaryRole === 'TENANT' ? 'APPROVED' : 'PENDING');

    const visitor = await Visitor.create({
      ...req.body,
      organisationId: orgId,
      passCode,
      qrCodeUrl,
      propertyName,
      propertyType,
      buildingName,
      unitNumber,
      hostApprovalStatus,
      gatePassStatus: hostApprovalStatus === 'APPROVED' ? 'ACTIVE' : 'GENERATED',
      createdBy: req.user._id
    });

    emitToOrganisation(orgId, 'visitor.created', {
      passCode: visitor.passCode,
      visitorName: visitor.visitorName,
      hostName: visitor.hostName,
      unitNumber: visitor.unitNumber,
      status: visitor.status
    });

    return sendSuccess(res, 'Visitor pass generated successfully', visitor, null, 201);
  } catch (error) {
    logger.error('createVisitor error: %o', error);
    return sendError(res, error.message, 500);
  }
};

// 5. Fast Walk-in Registration (Gate Entry)
exports.createWalkInVisitor = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const passCode = generatePassCode('WIN');
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${passCode}`;

    const autoCheckIn = req.body.autoCheckIn !== false;

    const visitor = await Visitor.create({
      ...req.body,
      organisationId: orgId,
      passCode,
      qrCodeUrl,
      hostApprovalStatus: req.body.hostApprovalStatus || 'APPROVED',
      gatePassStatus: 'ACTIVE',
      status: autoCheckIn ? 'CHECKED_IN' : 'EXPECTED',
      checkInTime: autoCheckIn ? new Date() : null,
      actualArrivalTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      checkedInBySecurityId: req.user._id,
      createdBy: req.user._id
    });

    emitToOrganisation(orgId, 'visitor.walkIn', {
      passCode: visitor.passCode,
      visitorName: visitor.visitorName,
      unitNumber: visitor.unitNumber
    });

    return sendSuccess(res, 'Walk-in visitor registered', visitor, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 6. Approve Visitor
exports.approveVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor || visitor.isDeleted) return sendError(res, 'Visitor not found', 404);

    visitor.hostApprovalStatus = 'APPROVED';
    visitor.approvalBy = req.user.firstName + ' ' + (req.user.lastName || '');
    visitor.approvalAt = new Date();
    visitor.gatePassStatus = 'ACTIVE';
    await visitor.save();

    emitToOrganisation(visitor.organisationId, 'visitor.approved', {
      passCode: visitor.passCode,
      visitorName: visitor.visitorName
    });

    return sendSuccess(res, 'Visitor request approved', visitor);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 7. Reject Visitor
exports.rejectVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor || visitor.isDeleted) return sendError(res, 'Visitor not found', 404);

    visitor.hostApprovalStatus = 'REJECTED';
    visitor.status = 'DENIED';
    visitor.gatePassStatus = 'REVOKED';
    visitor.rejectionReason = req.body.reason || 'Declined by host';
    await visitor.save();

    emitToOrganisation(visitor.organisationId, 'visitor.rejected', {
      passCode: visitor.passCode,
      visitorName: visitor.visitorName
    });

    return sendSuccess(res, 'Visitor request rejected', visitor);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 8. Security Check-in
exports.checkInVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor || visitor.isDeleted) return sendError(res, 'Visitor not found', 404);

    if (visitor.status === 'CHECKED_IN') {
      return sendError(res, 'Visitor is already checked in and inside the property', 400);
    }

    visitor.status = 'CHECKED_IN';
    visitor.checkInTime = new Date();
    visitor.checkInGate = req.body.gate || visitor.checkInGate || 'Main Gate 1';
    visitor.checkedInBySecurityId = req.user._id;
    visitor.gatePassStatus = 'ACTIVE';
    if (req.body.securityRemarks) visitor.securityRemarks = req.body.securityRemarks;
    if (req.body.vehicleNumber) visitor.vehicleNumber = req.body.vehicleNumber;
    if (req.body.parkingSlot) visitor.parkingSlot = req.body.parkingSlot;

    await visitor.save();

    emitToOrganisation(visitor.organisationId, 'visitor.checkedIn', {
      passCode: visitor.passCode,
      visitorName: visitor.visitorName,
      unitNumber: visitor.unitNumber,
      gate: visitor.checkInGate
    });

    return sendSuccess(res, 'Visitor checked in successfully', visitor);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 9. Security Check-out
exports.checkOutVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor || visitor.isDeleted) return sendError(res, 'Visitor not found', 404);

    visitor.status = 'CHECKED_OUT';
    visitor.checkOutTime = new Date();
    visitor.checkOutGate = req.body.gate || 'Main Gate 1';
    visitor.checkedOutBySecurityId = req.user._id;
    visitor.gatePassStatus = 'COMPLETED';

    // Calculate duration
    if (visitor.checkInTime) {
      const diffMs = visitor.checkOutTime - visitor.checkInTime;
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      visitor.visitDuration = `${diffHrs}h ${diffMins}m`;
    }

    await visitor.save();

    emitToOrganisation(visitor.organisationId, 'visitor.checkedOut', {
      passCode: visitor.passCode,
      visitorName: visitor.visitorName
    });

    return sendSuccess(res, 'Visitor checked out successfully', visitor);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 10. Deny Entry at Gate
exports.denyVisitorEntry = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor || visitor.isDeleted) return sendError(res, 'Visitor not found', 404);

    visitor.status = 'DENIED';
    visitor.gatePassStatus = 'REVOKED';
    visitor.denialReason = req.body.reason || 'Denied by gate security staff';
    await visitor.save();

    return sendSuccess(res, 'Visitor entry denied and logged', visitor);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 11. Verify QR Pass Code
exports.verifyPassCode = async (req, res) => {
  try {
    const { passCode } = req.params;
    const visitor = await Visitor.findOne({ passCode: passCode.toUpperCase(), isDeleted: false })
      .populate('propertyId', 'name propertyType')
      .populate('buildingId', 'name')
      .populate('unitId', 'unitNumber');

    if (!visitor) {
      return sendError(res, 'Invalid or unrecognized Gate Pass code', 404, 'PASS_NOT_FOUND');
    }

    let validationResult = 'VALID';
    let warning = null;

    if (visitor.gatePassStatus === 'REVOKED' || visitor.status === 'DENIED') {
      validationResult = 'REVOKED';
      warning = 'This pass has been revoked or denied entry.';
    } else if (visitor.gatePassStatus === 'COMPLETED' || visitor.status === 'CHECKED_OUT') {
      validationResult = 'ALREADY_USED';
      warning = 'Pass already utilized for entry and checked out.';
    } else if (visitor.status === 'CHECKED_IN') {
      validationResult = 'ALREADY_INSIDE';
      warning = 'Visitor is already inside property. Please perform check-out instead.';
    } else if (visitor.hostApprovalStatus === 'PENDING') {
      validationResult = 'PENDING_APPROVAL';
      warning = 'Host has not yet approved this entry request.';
    }

    return sendSuccess(res, 'Pass verified', {
      visitor,
      validationResult,
      warning,
      allowedGates: visitor.allowedGates.length ? visitor.allowedGates : ['Main Gate A', 'Visitor Gate 1']
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 12. Deliveries Management
exports.listDeliveries = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (req.query.propertyId) filter.propertyId = req.query.propertyId;

    const deliveries = await Delivery.find(filter).sort({ createdAt: -1 });
    return sendSuccess(res, 'Deliveries fetched', deliveries);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.createDelivery = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const deliveryNumber = `DEL-${Math.floor(100000 + Math.random() * 900000)}`;
    const otpCode = `${Math.floor(1000 + Math.random() * 9000)}`;

    const delivery = await Delivery.create({
      ...req.body,
      organisationId: orgId,
      deliveryNumber,
      otpCode,
      receivedBySecurityId: req.user._id
    });

    emitToOrganisation(orgId, 'delivery.arrived', {
      deliveryNumber: delivery.deliveryNumber,
      hostName: delivery.hostName,
      unitNumber: delivery.unitNumber,
      company: delivery.deliveryCompany
    });

    return sendSuccess(res, 'Delivery logged at security gate', delivery, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.updateDeliveryStatus = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return sendError(res, 'Delivery record not found', 404);

    if (req.body.deliveryStatus) delivery.deliveryStatus = req.body.deliveryStatus;
    if (req.body.isOtpVerified !== undefined) delivery.isOtpVerified = req.body.isOtpVerified;
    if (req.body.recipientConfirmation !== undefined) delivery.recipientConfirmation = req.body.recipientConfirmation;
    if (req.body.deliveryStatus === 'EXITED') delivery.exitTime = new Date();

    await delivery.save();
    return sendSuccess(res, 'Delivery status updated', delivery);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 13. Emergency Access
exports.listEmergencyLogs = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const logs = await EmergencyAccess.find({ organisationId: orgId }).sort({ createdAt: -1 });
    return sendSuccess(res, 'Emergency access records', logs);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.createEmergencyLog = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const record = await EmergencyAccess.create({
      ...req.body,
      organisationId: orgId,
      supervisorUserId: req.user._id,
      supervisorName: req.user.firstName + ' ' + (req.user.lastName || '')
    });

    emitToOrganisation(orgId, 'emergency.alert', {
      type: record.emergencyType,
      visitorName: record.visitorName,
      reason: record.emergencyReason
    });

    return sendSuccess(res, 'Emergency entry registered and alerted', record, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const Occupancy = require('../models/Occupancy');
const ContractAgreement = require('../models/ContractAgreement');
const Allocation = require('../models/Allocation');
const Unit = require('../models/Unit');
const Property = require('../models/Property');
const Building = require('../models/Building');
const Floor = require('../models/Floor');
const Resident = require('../models/Resident');
const TenantCompany = require('../models/TenantCompany');
const CoworkingMember = require('../models/CoworkingMember');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseFormatter');
const { validateHierarchyChain, syncOccupancyCascade } = require('../utils/hierarchyCascade');

// 1. List Occupancies
const listOccupancies = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;

    if (req.query.propertyId) filter.propertyId = req.query.propertyId;
    else if (req.currentPropertyId) filter.propertyId = req.currentPropertyId;

    if (req.query.propertyType && req.query.propertyType !== 'ALL') {
      filter.propertyType = req.query.propertyType;
    }
    if (req.query.buildingId && req.query.buildingId !== 'ALL') filter.buildingId = req.query.buildingId;
    if (req.query.floorId && req.query.floorId !== 'ALL') filter.floorId = req.query.floorId;
    if (req.query.unitId && req.query.unitId !== 'ALL') filter.unitId = req.query.unitId;
    if (req.query.status && req.query.status !== 'ALL') filter.status = req.query.status;
    if (req.query.allocationStatus && req.query.allocationStatus !== 'ALL') filter.allocationStatus = req.query.allocationStatus;
    if (req.query.accountStatus && req.query.accountStatus !== 'ALL') filter.accountStatus = req.query.accountStatus;
    if (req.query.occupantType && req.query.occupantType !== 'ALL') filter.occupantType = req.query.occupantType;

    if (req.query.search) {
      filter.$or = [
        { occupancyCode: { $regex: req.query.search, $options: 'i' } },
        { occupantName: { $regex: req.query.search, $options: 'i' } },
        { companyName: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { mobile: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const occupancies = await Occupancy.find(filter)
      .populate('propertyId', 'name code propertyType city')
      .populate('buildingId', 'name code buildingType')
      .populate('floorId', 'floorNumber floorName')
      .populate('unitId', 'unitNumber unitCode wing unitType carpetArea status occupancyStatus')
      .populate('contractAgreementId')
      .populate('allocationId')
      .populate('userId', 'fullName email mobile primaryRole status')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Occupancies fetched successfully', occupancies);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 2. Get Occupancy Details
const getOccupancyById = async (req, res) => {
  try {
    const occupancy = await Occupancy.findOne({ _id: req.params.id, isDeleted: false })
      .populate('propertyId', 'name code propertyType city state address contactEmail contactPhone')
      .populate('buildingId', 'name code buildingType totalFloors')
      .populate('floorId', 'floorNumber floorName floorType usableArea')
      .populate('unitId')
      .populate('contractAgreementId')
      .populate('allocationId')
      .populate('residentId')
      .populate('tenantCompanyId')
      .populate('coworkingMemberId')
      .populate('userId', 'fullName email mobile primaryRole status avatar isEmailVerified');

    if (!occupancy) return sendError(res, 'Occupancy not found', 404, 'NOT_FOUND');

    return sendSuccess(res, 'Occupancy detail fetched', occupancy);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 3. Live Dashboard Metrics
const getOccupancyMetrics = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const propertyId = req.query.propertyId || req.currentPropertyId;

    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (propertyId) filter.propertyId = propertyId;

    const unitFilter = { isDeleted: false };
    if (orgId) unitFilter.organisationId = orgId;
    if (propertyId) unitFilter.propertyId = propertyId;

    const [totalUnits, occupiedUnits, vacantUnits, allOccupancies, activeContracts] = await Promise.all([
      Unit.countDocuments(unitFilter),
      Unit.countDocuments({ ...unitFilter, occupancyStatus: 'OCCUPIED' }),
      Unit.countDocuments({ ...unitFilter, occupancyStatus: 'VACANT' }),
      Occupancy.find(filter).lean(),
      ContractAgreement.find({ ...filter, status: 'ACTIVE' }).lean()
    ]);

    const activeOccupancies = allOccupancies.filter(o => o.status === 'ACTIVE').length;
    const pendingOccupancies = allOccupancies.filter(o => ['DRAFT', 'PENDING_APPROVAL', 'AGREEMENT_PENDING', 'ALLOCATION_PENDING'].includes(o.status)).length;
    
    // Revenue & Dues
    const totalMonthlyRevenue = activeContracts.reduce((sum, c) => sum + (c.baseRentOrFee || 0) + (c.maintenanceAmount || 0) + (c.camCharges || 0), 0);
    const totalDepositsHeld = activeContracts.reduce((sum, c) => sum + (c.securityDeposit || 0), 0);

    const metrics = {
      totalUnits,
      occupiedUnits,
      vacantUnits,
      occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
      totalOccupancies: allOccupancies.length,
      activeOccupancies,
      pendingOccupancies,
      totalMonthlyRevenue,
      totalDepositsHeld
    };

    return sendSuccess(res, 'Occupancy metrics fetched', metrics);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 4. Create Occupancy (Complete 7-Step Transaction)
const createOccupancy = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const {
      propertyId,
      buildingId,
      floorId,
      unitId,
      propertyType,
      occupantType,
      occupantData,
      agreementData,
      financialData,
      allocationData,
      accountData
    } = req.body;

    if (!propertyId || !unitId || !propertyType || !occupantType) {
      return sendError(res, 'Missing mandatory property or occupant fields', 400, 'VALIDATION_ERROR');
    }

    // 0. Validate hierarchy chain & organisation isolation
    await validateHierarchyChain({
      organisationId: orgId,
      propertyId,
      buildingId,
      floorId,
      unitId
    });

    // 1. Verify Unit Availability
    const targetUnit = await Unit.findOne({ _id: unitId, isDeleted: false });
    if (!targetUnit) {
      return sendError(res, 'Target unit does not exist', 404, 'NOT_FOUND');
    }

    // Check for active overlapping allocation on unit
    const existingAllocation = await Allocation.findOne({
      unitId,
      status: 'ACTIVE',
      allocationType: { $ne: 'SHARED' },
      isDeleted: false
    });

    if (existingAllocation && targetUnit.occupancyStatus === 'OCCUPIED') {
      return sendError(res, 'This unit already has an active occupant allocation. Release or terminate first.', 409, 'UNIT_ALREADY_OCCUPIED');
    }

    const timestampCode = Date.now().toString().slice(-5);
    const occCode = `OCC-${targetUnit.unitNumber}-${timestampCode}`;
    const contractCode = agreementData?.contractNumber || `AGR-${targetUnit.unitNumber}-${timestampCode}`;
    const allocCode = `ALC-${targetUnit.unitNumber}-${timestampCode}`;

    let createdResident = null;
    let createdTenantCompany = null;
    let createdCoworker = null;
    let linkedUser = null;

    // 2. Create or Link Occupant Entity
    if (propertyType === 'RESIDENTIAL') {
      createdResident = await Resident.create({
        organisationId: orgId,
        propertyId,
        buildingId: buildingId || targetUnit.buildingId,
        floorId: floorId || targetUnit.floorId,
        unitId,
        name: occupantData.fullName || `${occupantData.firstName || ''} ${occupantData.lastName || ''}`.trim(),
        email: occupantData.email,
        mobile: occupantData.mobile,
        residentType: occupantType.includes('OWNER') ? 'OWNER' : 'TENANT',
        familyMembers: occupantData.familyMembers || [],
        emergencyContact: occupantData.emergencyContact || {},
        moveInDate: occupantData.moveInDate || new Date(),
        status: 'ACTIVE',
        createdBy: req.user._id
      });
    } else if (propertyType === 'COMMERCIAL') {
      createdTenantCompany = await TenantCompany.create({
        organisationId: orgId,
        propertyId,
        companyName: occupantData.companyName,
        companyCode: occupantData.companyCode || `CO-${timestampCode}`,
        contactPerson: occupantData.contactPerson || occupantData.fullName,
        email: occupantData.email,
        phone: occupantData.mobile || occupantData.phone,
        gstNumber: occupantData.gstNumber || '',
        panNumber: occupantData.panNumber || '',
        status: 'ACTIVE',
        createdBy: req.user._id
      });
    } else if (propertyType === 'COWORKING') {
      createdCoworker = await CoworkingMember.create({
        organisationId: orgId,
        propertyId,
        memberName: occupantData.fullName || `${occupantData.firstName || ''} ${occupantData.lastName || ''}`.trim(),
        email: occupantData.email,
        mobile: occupantData.mobile,
        companyName: occupantData.companyName || '',
        assignedUnitId: unitId,
        membershipPlanId: agreementData?.membershipPlanId || targetUnit.membershipPlan || null,
        joiningDate: occupantData.joiningDate || new Date(),
        expiryDate: agreementData?.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        createdBy: req.user._id
      });
    }

    // 3. Create Contract Agreement
    const contractAgreement = await ContractAgreement.create({
      organisationId: orgId,
      propertyId,
      buildingId: buildingId || targetUnit.buildingId,
      floorId: floorId || targetUnit.floorId,
      unitId,
      contractNumber: contractCode,
      contractType: agreementData?.contractType || (propertyType === 'RESIDENTIAL' ? 'RENTAL_AGREEMENT' : propertyType === 'COMMERCIAL' ? 'STANDARD_COMMERCIAL_LEASE' : 'DEDICATED_DESK_MEMBERSHIP'),
      partyType: propertyType === 'RESIDENTIAL' ? 'RESIDENT' : propertyType === 'COMMERCIAL' ? 'TENANT_COMPANY' : 'COWORKING_MEMBER',
      residentId: createdResident?._id,
      tenantCompanyId: createdTenantCompany?._id,
      coworkingMemberId: createdCoworker?._id,
      ownerName: occupantData.ownerName || '',
      startDate: agreementData?.startDate || new Date(),
      endDate: agreementData?.endDate || null,
      lockInPeriodMonths: agreementData?.lockInPeriodMonths || 0,
      noticePeriodMonths: agreementData?.noticePeriodMonths || 1,
      billingCycle: agreementData?.billingCycle || 'MONTHLY',
      paymentDueDate: agreementData?.paymentDueDate || 5,
      baseRentOrFee: Number(financialData?.baseRentOrFee) || 0,
      maintenanceAmount: Number(financialData?.maintenanceAmount) || 0,
      camCharges: Number(financialData?.camCharges) || 0,
      securityDeposit: Number(financialData?.securityDeposit) || 0,
      advanceAmount: Number(financialData?.advanceAmount) || 0,
      taxPercentage: Number(financialData?.taxPercentage) || 0,
      escalationPercentage: Number(financialData?.escalationPercentage) || 0,
      includedHours: Number(agreementData?.includedHours) || 0,
      includedCredits: Number(agreementData?.includedCredits) || 0,
      meetingRoomAccess: !!agreementData?.meetingRoomAccess,
      lockerAccess: !!agreementData?.lockerAccess,
      printingAccess: !!agreementData?.printingAccess,
      parkingAccess: !!agreementData?.parkingAccess,
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
      approvedBy: req.user._id,
      approvedAt: new Date(),
      createdBy: req.user._id
    });

    // 4. Create Spatial Allocation
    const allocation = await Allocation.create({
      organisationId: orgId,
      propertyId,
      buildingId: buildingId || targetUnit.buildingId,
      floorId: floorId || targetUnit.floorId,
      unitId,
      allocationCode: allocCode,
      propertyType,
      allocationType: allocationData?.allocationType || 'PERMANENT',
      occupantType,
      occupantName: occupantData.fullName || occupantData.companyName,
      companyName: occupantData.companyName || '',
      residentId: createdResident?._id,
      tenantCompanyId: createdTenantCompany?._id,
      coworkingMemberId: createdCoworker?._id,
      contractAgreementId: contractAgreement._id,
      startDate: agreementData?.startDate || new Date(),
      endDate: agreementData?.endDate || null,
      parkingSlots: allocationData?.parkingSlots || [],
      allocatedAreaSqFt: targetUnit.carpetArea || 0,
      status: 'ACTIVE',
      approvedBy: req.user._id,
      createdBy: req.user._id
    });

    // 5. Create or Link User Account
    if (occupantData.email || occupantData.mobile) {
      let existingUser = await User.findOne({
        $or: [
          { email: occupantData.email?.toLowerCase().trim() },
          { mobile: occupantData.mobile?.trim() }
        ]
      });

      if (!existingUser) {
        let assignedRole = 'RESIDENT';
        if (propertyType === 'RESIDENTIAL') {
          assignedRole = occupantType.includes('OWNER') ? 'PROPERTY_MANAGER' : 'RESIDENT';
        } else if (propertyType === 'COMMERCIAL') {
          assignedRole = 'TENANT_ADMIN';
        } else if (propertyType === 'COWORKING') {
          assignedRole = 'MEMBER';
        }

        const names = (occupantData.fullName || '').split(' ');
        existingUser = await User.create({
          organisationId: orgId,
          propertyId,
          firstName: names[0] || 'User',
          lastName: names.slice(1).join(' ') || '',
          email: occupantData.email?.toLowerCase().trim(),
          mobile: occupantData.mobile?.trim(),
          primaryRole: assignedRole,
          status: 'ACTIVE',
          createdBy: req.user._id
        });
      }
      linkedUser = existingUser;
    }

    // 6. Update Unit Occupancy
    await Unit.findByIdAndUpdate(unitId, {
      occupancyStatus: 'OCCUPIED',
      status: 'OCCUPIED',
      currentResidentId: createdResident?._id || null,
      currentTenantCompanyId: createdTenantCompany?._id || null,
      currentMemberId: createdCoworker?._id || null,
      residentName: createdResident?.name || '',
      tenantCompany: createdTenantCompany?.companyName || '',
      assignedMemberName: createdCoworker?.memberName || '',
      monthlyRent: financialData?.baseRentOrFee || targetUnit.monthlyRent || 0,
      monthlyMaintenanceAmount: financialData?.maintenanceAmount || targetUnit.monthlyMaintenanceAmount || 0,
      monthlyPrice: financialData?.baseRentOrFee || targetUnit.monthlyPrice || 0
    });

    // 7. Create Occupancy Record
    const occupancy = await Occupancy.create({
      organisationId: orgId,
      propertyId,
      buildingId: buildingId || targetUnit.buildingId,
      floorId: floorId || targetUnit.floorId,
      unitId,
      occupancyCode: occCode,
      propertyType,
      occupantType,
      occupantName: occupantData.fullName || occupantData.companyName,
      companyName: occupantData.companyName || '',
      email: occupantData.email || '',
      mobile: occupantData.mobile || '',
      residentId: createdResident?._id,
      tenantCompanyId: createdTenantCompany?._id,
      coworkingMemberId: createdCoworker?._id,
      userId: linkedUser?._id || null,
      contractAgreementId: contractAgreement._id,
      allocationId: allocation._id,
      monthlyAmount: (Number(financialData?.baseRentOrFee) || 0) + (Number(financialData?.maintenanceAmount) || 0),
      camCharges: Number(financialData?.camCharges) || 0,
      securityDeposit: Number(financialData?.securityDeposit) || 0,
      advanceAmount: Number(financialData?.advanceAmount) || 0,
      billingCycle: agreementData?.billingCycle || 'MONTHLY',
      paymentDueDate: agreementData?.paymentDueDate || 5,
      startDate: agreementData?.startDate || new Date(),
      endDate: agreementData?.endDate || null,
      agreementVerified: true,
      allocationVerified: true,
      accountVerified: true,
      allocationStatus: 'ALLOCATED',
      accountStatus: linkedUser ? 'INVITED' : 'PENDING_INVITATION',
      agreementStatus: 'ACTIVE',
      status: 'ACTIVE',
      auditLog: [{
        action: 'CREATED_AND_ACTIVATED',
        performedBy: req.user._id,
        timestamp: new Date(),
        remarks: 'Occupancy registered via wizard with agreement and allocation'
      }],
      createdBy: req.user._id
    });

    // Link agreement to occupancy
    contractAgreement.occupancyId = occupancy._id;
    await contractAgreement.save();

    // Cascading sync: marks unit as OCCUPIED and updates floor, building, property stats
    await syncOccupancyCascade({ unitId, occupancyStatus: 'OCCUPIED' });

    return sendSuccess(res, 'Occupancy, contract and allocation created successfully', occupancy, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 5. Update Status (Suspend, Terminate, Cancel)
const updateOccupancyStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const occupancy = await Occupancy.findOne({ _id: req.params.id, isDeleted: false });
    if (!occupancy) return sendError(res, 'Occupancy record not found', 404, 'NOT_FOUND');

    occupancy.status = status;
    occupancy.auditLog.push({
      action: `STATUS_CHANGED_TO_${status}`,
      performedBy: req.user._id,
      timestamp: new Date(),
      remarks: remarks || ''
    });

    if (['TERMINATED', 'CANCELLED', 'EXPIRED'].includes(status)) {
      occupancy.allocationStatus = 'RELEASED';
      occupancy.moveOutDate = new Date();

      // Release Allocation
      if (occupancy.allocationId) {
        await Allocation.findByIdAndUpdate(occupancy.allocationId, {
          status: 'RELEASED',
          releasedDate: new Date()
        });
      }

      // Terminate Contract
      if (occupancy.contractAgreementId) {
        await ContractAgreement.findByIdAndUpdate(occupancy.contractAgreementId, {
          status: status === 'EXPIRED' ? 'EXPIRED' : 'TERMINATED'
        });
      }

      // Release Unit with cascading recalculation
      await syncOccupancyCascade({ unitId: occupancy.unitId, occupancyStatus: 'VACANT' });
    } else if (status === 'ACTIVE') {
      await syncOccupancyCascade({ unitId: occupancy.unitId, occupancyStatus: 'OCCUPIED' });
      if (occupancy.contractAgreementId) {
        await ContractAgreement.findByIdAndUpdate(occupancy.contractAgreementId, { status: 'ACTIVE' });
      }
    }

    await occupancy.save();
    return sendSuccess(res, `Occupancy status updated to ${status}`, occupancy);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 6. Release Unit Allocation
const releaseAllocation = async (req, res) => {
  try {
    const occupancy = await Occupancy.findOne({ _id: req.params.id, isDeleted: false });
    if (!occupancy) return sendError(res, 'Occupancy not found', 404, 'NOT_FOUND');

    occupancy.allocationStatus = 'RELEASED';
    occupancy.status = 'TERMINATED';
    occupancy.moveOutDate = new Date();

    if (occupancy.allocationId) {
      await Allocation.findByIdAndUpdate(occupancy.allocationId, {
        status: 'RELEASED',
        releasedDate: new Date()
      });
    }

    // Release Unit with cascading recalculation
    await syncOccupancyCascade({ unitId: occupancy.unitId, occupancyStatus: 'VACANT' });

    occupancy.auditLog.push({
      action: 'ALLOCATION_RELEASED',
      performedBy: req.user._id,
      timestamp: new Date(),
      remarks: req.body.remarks || 'Unit released manually'
    });

    await occupancy.save();
    return sendSuccess(res, 'Allocation released successfully and space marked vacant', occupancy);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 7. Invite Account
const inviteAccount = async (req, res) => {
  try {
    const occupancy = await Occupancy.findOne({ _id: req.params.id, isDeleted: false }).populate('userId');
    if (!occupancy) return sendError(res, 'Occupancy not found', 404, 'NOT_FOUND');

    occupancy.accountStatus = 'INVITED';
    occupancy.auditLog.push({
      action: 'INVITATION_SENT',
      performedBy: req.user._id,
      timestamp: new Date(),
      remarks: `Account invite dispatched to ${occupancy.email || occupancy.userId?.email}`
    });

    await occupancy.save();
    return sendSuccess(res, 'Invitation sent successfully', occupancy);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 8. List Spatial Allocations
const listAllocations = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (req.query.propertyId) filter.propertyId = req.query.propertyId;
    if (req.query.buildingId) filter.buildingId = req.query.buildingId;
    if (req.query.floorId) filter.floorId = req.query.floorId;
    if (req.query.status && req.query.status !== 'ALL') filter.status = req.query.status;

    const allocations = await Allocation.find(filter)
      .populate('propertyId', 'name code propertyType')
      .populate('buildingId', 'name code')
      .populate('floorId', 'floorNumber floorName')
      .populate('unitId', 'unitNumber unitCode wing unitType carpetArea')
      .populate('contractAgreementId')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Allocations fetched', allocations);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 9. List Contract Agreements
const listAgreements = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;

    if (req.query.propertyId) filter.propertyId = req.query.propertyId;
    if (req.query.unitId) filter.unitId = req.query.unitId;
    if (req.query.contractType) filter.contractType = req.query.contractType;
    if (req.query.status && req.query.status !== 'ALL') filter.status = req.query.status;

    if (req.query.search) {
      filter.$or = [
        { contractNumber: { $regex: req.query.search, $options: 'i' } },
        { ownerName: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const agreements = await ContractAgreement.find(filter)
      .populate('propertyId', 'name code propertyType address')
      .populate('buildingId', 'name code')
      .populate('floorId', 'floorNumber floorName')
      .populate('unitId', 'unitNumber wing unitType status occupancyStatus')
      .populate('residentId', 'name contactNumber email')
      .populate('tenantCompanyId', 'companyName contactPerson email phone')
      .populate('coworkingMemberId', 'memberName email mobile')
      .populate('occupancyId', 'occupancyCode status monthlyAmount')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Agreements fetched successfully', agreements);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 10. Get Agreement By ID
const getAgreementById = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const agreement = await ContractAgreement.findOne({ _id: req.params.id, organisationId: orgId, isDeleted: false })
      .populate('propertyId', 'name code propertyType address')
      .populate('buildingId', 'name code')
      .populate('floorId', 'floorNumber floorName')
      .populate('unitId', 'unitNumber wing unitType status occupancyStatus')
      .populate('residentId')
      .populate('tenantCompanyId')
      .populate('coworkingMemberId')
      .populate('occupancyId')
      .populate('documents.uploadedBy', 'firstName lastName email');

    if (!agreement) {
      return sendError(res, 'Agreement not found', 404, 'NOT_FOUND');
    }
    return sendSuccess(res, 'Agreement details fetched', agreement);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 11. Update Agreement (Instantly updates linked Occupancy)
const updateAgreement = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const agreement = await ContractAgreement.findOne({ _id: req.params.id, organisationId: orgId, isDeleted: false });
    if (!agreement) return sendError(res, 'Agreement not found', 404, 'NOT_FOUND');

    const updatable = [
      'startDate', 'endDate', 'baseRentOrFee', 'maintenanceAmount', 'camCharges',
      'utilityCharges', 'securityDeposit', 'lockInPeriodMonths', 'noticePeriodMonths',
      'billingCycle', 'paymentDueDate', 'status', 'notes'
    ];

    updatable.forEach(f => {
      if (req.body[f] !== undefined) agreement[f] = req.body[f];
    });

    await agreement.save();

    // Instantly sync with linked Occupancy
    if (agreement.occupancyId) {
      const occUpdate = {};
      if (req.body.baseRentOrFee !== undefined || req.body.maintenanceAmount !== undefined) {
        occUpdate.monthlyAmount = (agreement.baseRentOrFee || 0) + (agreement.maintenanceAmount || 0);
      }
      if (req.body.securityDeposit !== undefined) {
        occUpdate.securityDeposit = agreement.securityDeposit;
      }
      if (req.body.status) {
        occUpdate.agreementStatus = agreement.status;
        if (agreement.status === 'TERMINATED') {
          occUpdate.status = 'TERMINATED';
        }
      }
      await Occupancy.findByIdAndUpdate(agreement.occupancyId, occUpdate);
    }

    return sendSuccess(res, 'Agreement updated successfully', agreement);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 12. Upload Agreement Document (PDF/Docs with status & metadata)
const uploadAgreementDocument = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const agreement = await ContractAgreement.findOne({ _id: req.params.id, organisationId: orgId, isDeleted: false });
    if (!agreement) {
      return sendError(res, 'Agreement not found', 404, 'NOT_FOUND');
    }

    if (!req.file) {
      return sendError(res, 'No document file uploaded', 400, 'FILE_REQUIRED');
    }

    const doc = {
      fileName: req.file.originalname,
      fileUrl: `/uploads/agreements/${req.file.filename}`,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
      status: req.body.status || 'ACTIVE'
    };

    agreement.documents.push(doc);
    agreement.agreementDocumentUrl = doc.fileUrl;
    await agreement.save();

    // Log to linked Occupancy audit log
    if (agreement.occupancyId) {
      await Occupancy.findByIdAndUpdate(agreement.occupancyId, {
        $push: {
          auditLog: {
            action: 'DOCUMENT_UPLOADED',
            performedBy: req.user._id,
            timestamp: new Date(),
            remarks: `Uploaded agreement document: ${doc.fileName}`
          }
        }
      });
    }

    return sendSuccess(res, 'Document uploaded successfully', {
      agreementId: agreement._id,
      document: doc,
      documents: agreement.documents
    }, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 13. Delete Agreement Document
const deleteAgreementDocument = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const agreement = await ContractAgreement.findOne({ _id: req.params.id, organisationId: orgId, isDeleted: false });
    if (!agreement) return sendError(res, 'Agreement not found', 404, 'NOT_FOUND');

    agreement.documents = agreement.documents.filter(d => d._id.toString() !== req.params.docId);
    if (agreement.documents.length === 0) {
      agreement.agreementDocumentUrl = '';
    } else {
      agreement.agreementDocumentUrl = agreement.documents[agreement.documents.length - 1].fileUrl;
    }
    await agreement.save();

    return sendSuccess(res, 'Document removed successfully', agreement.documents);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  listOccupancies,
  getOccupancyById,
  getOccupancyMetrics,
  createOccupancy,
  updateOccupancyStatus,
  releaseAllocation,
  inviteAccount,
  listAllocations,
  listAgreements,
  getAgreementById,
  updateAgreement,
  uploadAgreementDocument,
  deleteAgreementDocument
};

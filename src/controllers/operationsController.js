const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Visitor = require('../models/Visitor');
const ParkingSlot = require('../models/ParkingSlot');
const Complaint = require('../models/Complaint');
const Asset = require('../models/Asset');
const AMCContract = require('../models/AMCContract');
const Vendor = require('../models/Vendor');
const WorkOrder = require('../models/WorkOrder');
const Unit = require('../models/Unit');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const Amenity = require('../models/Amenity');
const { sendSuccess, sendError } = require('../utils/responseFormatter');
const { logAudit } = require('../middlewares/auditMiddleware');
const { emitToOrganisation } = require('../sockets/socketManager');

// --- INVOICES & PAYMENTS ---
const listInvoices = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (req.currentPropertyId) filter.propertyId = req.currentPropertyId;
    if (req.query.status) filter.paymentStatus = req.query.status;

    const invoices = await Invoice.find(filter)
      .populate('residentId', 'name mobile')
      .populate('tenantCompanyId', 'companyName contactPerson')
      .populate('memberId', 'memberName companyName')
      .populate('unitId', 'unitNumber')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Invoices fetched', invoices);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createInvoice = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const { items, taxPercent = 18, discountAmount = 0, lateFee = 0 } = req.body;

    const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || (Number(item.quantity) * Number(item.rate))), 0);
    const taxAmount = (subtotal * Number(taxPercent)) / 100;
    const totalAmount = subtotal + taxAmount + Number(lateFee) - Number(discountAmount);

    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const invoice = await Invoice.create({
      ...req.body,
      invoiceNumber,
      organisationId: orgId,
      subtotal,
      taxAmount,
      totalAmount,
      balanceAmount: totalAmount,
      paidAmount: 0,
      paymentStatus: 'PENDING',
      createdBy: req.user._id
    });

    emitToOrganisation(orgId, 'invoice.generated', {
      invoiceNumber,
      totalAmount,
      dueDate: invoice.dueDate
    });

    return sendSuccess(res, 'Invoice created', invoice, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const recordPayment = async (req, res) => {
  try {
    const { invoiceId, amount, paymentMode, transactionReference, notes } = req.body;
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice || invoice.isDeleted) {
      return sendError(res, 'Invoice not found', 404, 'NOT_FOUND');
    }

    const payAmount = Number(amount);
    const paymentNumber = `PAY-${Date.now().toString().slice(-6)}`;
    const payment = await Payment.create({
      organisationId: invoice.organisationId,
      propertyId: invoice.propertyId,
      invoiceId: invoice._id,
      paymentNumber,
      amount: payAmount,
      paymentMode,
      transactionReference,
      notes,
      recordedBy: req.user._id
    });

    invoice.paidAmount += payAmount;
    invoice.balanceAmount = Math.max(0, invoice.totalAmount - invoice.paidAmount);
    invoice.paymentStatus = invoice.balanceAmount === 0 ? 'PAID' : 'PARTIAL';
    await invoice.save();

    emitToOrganisation(invoice.organisationId, 'payment.success', {
      paymentNumber,
      invoiceNumber: invoice.invoiceNumber,
      amount: payAmount,
      status: invoice.paymentStatus
    });

    return sendSuccess(res, 'Payment recorded successfully', { payment, invoice });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// --- VISITORS ---
const listVisitors = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (req.currentPropertyId) filter.propertyId = req.currentPropertyId;
    if (req.query.status) filter.status = req.query.status;

    const visitors = await Visitor.find(filter)
      .populate('unitId', 'unitNumber')
      .sort({ expectedDate: -1, createdAt: -1 });

    return sendSuccess(res, 'Visitors fetched', visitors);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createVisitor = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const passCode = `VP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const visitor = await Visitor.create({
      ...req.body,
      passCode,
      organisationId: orgId,
      createdBy: req.user._id
    });

    emitToOrganisation(orgId, 'visitor.created', {
      passCode,
      visitorName: visitor.visitorName,
      expectedTime: visitor.expectedTime
    });

    return sendSuccess(res, 'Visitor pass generated', visitor, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const checkInVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor || visitor.isDeleted) {
      return sendError(res, 'Visitor not found', 404, 'NOT_FOUND');
    }

    visitor.status = 'CHECKED_IN';
    visitor.checkInTime = new Date();
    visitor.checkedInBySecurityId = req.user._id;
    await visitor.save();

    emitToOrganisation(visitor.organisationId, 'visitor.checkedIn', {
      passCode: visitor.passCode,
      visitorName: visitor.visitorName
    });

    return sendSuccess(res, 'Visitor checked in successfully', visitor);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const checkOutVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor || visitor.isDeleted) {
      return sendError(res, 'Visitor not found', 404, 'NOT_FOUND');
    }

    visitor.status = 'CHECKED_OUT';
    visitor.checkOutTime = new Date();
    visitor.checkedOutBySecurityId = req.user._id;
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

// --- COMPLAINTS ---
const listComplaints = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (req.currentPropertyId) filter.propertyId = req.currentPropertyId;
    if (req.query.status) filter.status = req.query.status;

    const complaints = await Complaint.find(filter)
      .populate('unitId', 'unitNumber')
      .populate('raisedByUserId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Complaints fetched', complaints);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createComplaint = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const complaintNumber = `TKT-${Date.now().toString().slice(-6)}`;

    const complaint = await Complaint.create({
      ...req.body,
      complaintNumber,
      organisationId: orgId,
      raisedByUserId: req.user._id,
      raisedByName: `${req.user.firstName} ${req.user.lastName}`,
      createdBy: req.user._id
    });

    emitToOrganisation(orgId, 'complaint.created', {
      complaintNumber,
      category: complaint.category,
      priority: complaint.priority
    });

    return sendSuccess(res, 'Complaint ticket raised', complaint, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const updateComplaintStatus = async (req, res) => {
  try {
    const { status, resolutionDetails, assignedStaffName } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint || complaint.isDeleted) {
      return sendError(res, 'Complaint not found', 404, 'NOT_FOUND');
    }

    complaint.status = status;
    if (resolutionDetails) complaint.resolutionDetails = resolutionDetails;
    if (assignedStaffName) complaint.assignedStaffName = assignedStaffName;
    if (status === 'RESOLVED') complaint.resolvedAt = new Date();
    if (status === 'CLOSED') complaint.closedAt = new Date();

    await complaint.save();

    emitToOrganisation(complaint.organisationId, 'complaint.assigned', {
      complaintNumber: complaint.complaintNumber,
      status: complaint.status
    });

    return sendSuccess(res, 'Complaint status updated', complaint);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// --- PARKING SLOTS ---
const listParkingSlots = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (req.currentPropertyId) filter.propertyId = req.currentPropertyId;

    const slots = await ParkingSlot.find(filter).sort({ slotNumber: 1 });
    return sendSuccess(res, 'Parking slots fetched', slots);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// --- ASSETS & AMC ---
const listAssets = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (req.currentPropertyId) filter.propertyId = req.currentPropertyId;

    const assets = await Asset.find(filter)
      .populate('vendorId', 'name category contactPerson phone')
      .populate('amcContractId', 'amcNumber contractEndDate status')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Assets fetched', assets);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const listAMC = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (req.currentPropertyId) filter.propertyId = req.currentPropertyId;

    const contracts = await AMCContract.find(filter)
      .populate('vendorId', 'name category phone email')
      .populate('assetIds', 'assetCode assetName category')
      .sort({ contractEndDate: 1 });

    return sendSuccess(res, 'AMC contracts fetched', contracts);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// --- VENDORS ---
const listVendors = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;

    const vendors = await Vendor.find(filter).sort({ name: 1 });
    return sendSuccess(res, 'Vendors fetched', vendors);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// --- WORK ORDERS ---
const listWorkOrders = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;

    const orders = await WorkOrder.find(filter)
      .populate('complaintId', 'complaintNumber title')
      .populate('assetId', 'assetCode assetName')
      .populate('vendorId', 'name category phone')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Work orders fetched', orders);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// --- COMPREHENSIVE FINANCIAL & OPERATIONAL ANALYTICS & REPORTS ---
const getReports = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const { propertyId, startDate, endDate } = req.query;

    const baseFilter = { isDeleted: false };
    if (orgId) baseFilter.organisationId = orgId;
    if (propertyId && propertyId !== 'all') baseFilter.propertyId = propertyId;

    // Date range filtering where applicable
    const dateFilter = { ...baseFilter };
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    }

    // 1. FINANCIAL ANALYTICS
    const [allInvoices, allPayments] = await Promise.all([
      Invoice.find(dateFilter)
        .populate('residentId', 'name mobile')
        .populate('tenantCompanyId', 'companyName contactPerson')
        .populate('memberId', 'memberName companyName')
        .populate('unitId', 'unitNumber wing')
        .populate('propertyId', 'name code')
        .sort({ createdAt: -1 }),
      Payment.find(baseFilter).select('amount paymentMethod paymentStatus paymentDate')
    ]);

    const totalBilled = allInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    const totalCollected = allInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
    const totalOutstanding = allInvoices.reduce((sum, i) => sum + (i.balanceAmount || 0), 0);
    const collectionEfficiency = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

    // Aging analysis (based on dueDate or createdAt)
    const now = Date.now();
    const aging = {
      current: 0,     // 0 - 30 days
      days31to60: 0,  // 31 - 60 days
      days61to90: 0,  // 61 - 90 days
      over90days: 0   // > 90 days
    };

    allInvoices.forEach(inv => {
      if ((inv.balanceAmount || 0) > 0) {
        const refDate = inv.dueDate ? new Date(inv.dueDate).getTime() : new Date(inv.createdAt).getTime();
        const diffDays = Math.max(0, Math.floor((now - refDate) / (1000 * 60 * 60 * 24)));
        if (diffDays <= 30) {
          aging.current += inv.balanceAmount;
        } else if (diffDays <= 60) {
          aging.days31to60 += inv.balanceAmount;
        } else if (diffDays <= 90) {
          aging.days61to90 += inv.balanceAmount;
        } else {
          aging.over90days += inv.balanceAmount;
        }
      }
    });

    // Payment modes breakdown
    const paymentModesMap = {};
    allPayments.forEach(p => {
      const mode = p.paymentMethod || 'OTHER';
      paymentModesMap[mode] = (paymentModesMap[mode] || 0) + (p.amount || 0);
    });
    const paymentModes = Object.keys(paymentModesMap).map(mode => ({
      mode: mode.replace('_', ' '),
      amount: paymentModesMap[mode]
    }));

    // Invoices list formatted for report tables
    const invoicesList = allInvoices.slice(0, 50).map(inv => {
      const customer = inv.residentId?.name || inv.tenantCompanyId?.companyName || inv.memberId?.memberName || 'Direct Customer';
      return {
        id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        customer,
        unit: inv.unitId ? `${inv.unitId.wing ? inv.unitId.wing + '-' : ''}${inv.unitId.unitNumber}` : 'N/A',
        property: inv.propertyId?.name || 'N/A',
        invoiceType: inv.invoiceType,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        balanceAmount: inv.balanceAmount,
        paymentStatus: inv.paymentStatus,
        dueDate: inv.dueDate,
        createdAt: inv.createdAt
      };
    });

    // 2. SPACE & OCCUPANCY ANALYTICS
    const allUnits = await Unit.find(baseFilter).populate('propertyId', 'name code').sort({ unitNumber: 1 });
    const totalUnits = allUnits.length;
    const occupiedUnits = allUnits.filter(u => u.occupancyStatus === 'OCCUPIED').length;
    const vacantUnits = allUnits.filter(u => u.occupancyStatus === 'VACANT').length;
    const underMaintenanceUnits = allUnits.filter(u => ['UNDER_MAINTENANCE', 'RESERVED'].includes(u.occupancyStatus)).length;
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

    const occupancyTypeMap = {};
    allUnits.forEach(u => {
      const type = u.unitType || 'OTHER';
      if (!occupancyTypeMap[type]) {
        occupancyTypeMap[type] = { total: 0, occupied: 0, vacant: 0 };
      }
      occupancyTypeMap[type].total++;
      if (u.occupancyStatus === 'OCCUPIED') occupancyTypeMap[type].occupied++;
      else occupancyTypeMap[type].vacant++;
    });
    const occupancyByType = Object.keys(occupancyTypeMap).map(type => ({
      type: type.replace('_', ' '),
      total: occupancyTypeMap[type].total,
      occupied: occupancyTypeMap[type].occupied,
      vacant: occupancyTypeMap[type].vacant,
      rate: Math.round((occupancyTypeMap[type].occupied / occupancyTypeMap[type].total) * 100)
    }));

    const unitsList = allUnits.slice(0, 50).map(u => ({
      id: u._id,
      unitNumber: u.unitNumber,
      wing: u.wing || 'Main',
      unitType: u.unitType,
      carpetArea: u.carpetArea,
      rentableArea: u.rentableArea,
      occupancyStatus: u.occupancyStatus,
      monthlyMaintenanceBase: u.monthlyMaintenanceBase,
      property: u.propertyId?.name || 'N/A'
    }));

    // 3. SERVICE HELPDESK & SLA ANALYTICS
    const allComplaints = await Complaint.find(dateFilter)
      .populate('raisedByUserId', 'firstName lastName email mobile')
      .populate('unitId', 'unitNumber')
      .populate('propertyId', 'name')
      .sort({ createdAt: -1 });

    const totalComplaints = allComplaints.length;
    const openTickets = allComplaints.filter(c => c.status === 'OPEN').length;
    const inProgressTickets = allComplaints.filter(c => ['ASSIGNED', 'IN_PROGRESS'].includes(c.status)).length;
    const resolvedTickets = allComplaints.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status)).length;
    const slaComplianceRate = totalComplaints > 0 ? Math.round((resolvedTickets / totalComplaints) * 100) : 100;

    const categoryMap = {};
    const priorityMap = {};
    allComplaints.forEach(c => {
      const cat = c.category || 'GENERAL';
      const pri = c.priority || 'MEDIUM';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
      priorityMap[pri] = (priorityMap[pri] || 0) + 1;
    });

    const categoryBreakdown = Object.keys(categoryMap).map(cat => ({
      category: cat.replace('_', ' '),
      count: categoryMap[cat]
    }));

    const priorityBreakdown = Object.keys(priorityMap).map(pri => ({
      priority: pri,
      count: priorityMap[pri]
    }));

    const complaintsList = allComplaints.slice(0, 50).map(c => ({
      id: c._id,
      ticketNumber: c.complaintNumber || `TKT-${c._id.toString().slice(-6)}`,
      title: c.title,
      category: c.category,
      priority: c.priority,
      status: c.status,
      loggedBy: c.raisedByName || (c.raisedByUserId ? `${c.raisedByUserId.firstName} ${c.raisedByUserId.lastName}` : 'Resident / Occupant'),
      unit: c.unitId?.unitNumber || 'Common Area',
      property: c.propertyId?.name || 'N/A',
      createdAt: c.createdAt
    }));

    // 4. GATE & VISITOR TRAFFIC ANALYTICS
    const allVisitors = await Visitor.find(dateFilter)
      .populate('unitId', 'unitNumber')
      .populate('propertyId', 'name')
      .sort({ createdAt: -1 });

    const totalVisitors = allVisitors.length;
    const checkedInVisitors = allVisitors.filter(v => v.status === 'CHECKED_IN').length;
    const checkedOutVisitors = allVisitors.filter(v => v.status === 'CHECKED_OUT').length;
    const expectedVisitors = allVisitors.filter(v => v.status === 'EXPECTED').length;

    const visitorTypeMap = {};
    allVisitors.forEach(v => {
      const t = v.visitorType || 'GUEST';
      visitorTypeMap[t] = (visitorTypeMap[t] || 0) + 1;
    });

    const visitorTypeBreakdown = Object.keys(visitorTypeMap).map(t => ({
      type: t.replace('_', ' '),
      count: visitorTypeMap[t]
    }));

    const visitorsList = allVisitors.slice(0, 50).map(v => ({
      id: v._id,
      passCode: v.passCode || 'VP-DIRECT',
      visitorName: v.visitorName,
      phone: v.phone,
      visitorType: v.visitorType,
      purpose: v.purpose,
      unit: v.unitId?.unitNumber || 'General',
      property: v.propertyId?.name || 'N/A',
      status: v.status,
      checkInTime: v.checkInTime,
      checkOutTime: v.checkOutTime,
      createdAt: v.createdAt
    }));

    // 5. ASSETS, AMC & VENDOR OPERATIONS
    const [allAssets, allAMCs, allWorkOrders] = await Promise.all([
      Asset.find(baseFilter).populate('propertyId', 'name'),
      AMCContract.find(baseFilter).populate('vendorId', 'name serviceCategory'),
      WorkOrder.find(baseFilter).populate('vendorId', 'name').sort({ createdAt: -1 })
    ]);

    const totalAssets = allAssets.length;
    const operationalAssets = allAssets.filter(a => a.status === 'OPERATIONAL').length;
    const inRepairAssets = allAssets.filter(a => ['UNDER_MAINTENANCE', 'DECOMMISSIONED'].includes(a.status)).length;

    const totalAMCs = allAMCs.length;
    const activeAMCs = allAMCs.filter(a => a.status === 'ACTIVE').length;
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiringAMCs = allAMCs.filter(a => a.status === 'ACTIVE' && new Date(a.endDate) <= thirtyDaysFromNow).length;

    const totalWorkOrders = allWorkOrders.length;
    const completedWorkOrders = allWorkOrders.filter(w => w.status === 'COMPLETED').length;
    const pendingWorkOrders = allWorkOrders.filter(w => ['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(w.status)).length;

    // 6. BOOKINGS & PARKING STATS
    const [allBookings, allParking] = await Promise.all([
      Booking.find(baseFilter).populate('amenityId', 'name category').sort({ createdAt: -1 }),
      ParkingSlot.find(baseFilter).populate('propertyId', 'name')
    ]);

    const totalBookings = allBookings.length;
    const approvedBookings = allBookings.filter(b => b.bookingStatus === 'APPROVED' || b.status === 'CONFIRMED').length;

    const totalParking = allParking.length;
    const occupiedParking = allParking.filter(p => p.isOccupied || p.status === 'OCCUPIED').length;
    const availableParking = totalParking - occupiedParking;

    return sendSuccess(res, 'Comprehensive multi-module operational reports generated', {
      scope: {
        organisationId: orgId,
        propertyId: propertyId || 'all',
        startDate: startDate || null,
        endDate: endDate || null,
        generatedAt: new Date()
      },
      financials: {
        totalBilled,
        totalCollected,
        totalOutstanding,
        collectionEfficiency,
        aging,
        paymentModes,
        totalInvoicesCount: allInvoices.length,
        invoicesList
      },
      occupancy: {
        totalUnits,
        occupiedUnits,
        vacantUnits,
        underMaintenanceUnits,
        occupancyRate,
        occupancyByType,
        unitsList
      },
      tickets: {
        totalComplaints,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        slaComplianceRate,
        categoryBreakdown,
        priorityBreakdown,
        complaintsList
      },
      visitors: {
        totalVisitors,
        checkedInVisitors,
        checkedOutVisitors,
        expectedVisitors,
        visitorTypeBreakdown,
        visitorsList
      },
      assetsAndMaintenance: {
        totalAssets,
        operationalAssets,
        inRepairAssets,
        totalAMCs,
        activeAMCs,
        expiringAMCs,
        totalWorkOrders,
        completedWorkOrders,
        pendingWorkOrders,
        workOrdersList: allWorkOrders.slice(0, 30)
      },
      bookingsAndParking: {
        totalBookings,
        approvedBookings,
        totalParking,
        occupiedParking,
        availableParking,
        parkingOccupancyRate: totalParking > 0 ? Math.round((occupiedParking / totalParking) * 100) : 0
      }
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// --- MODERN CSV / EXCEL EXPORT ENDPOINT ---
const exportReports = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const { module = 'financial', propertyId } = req.query;

    const filter = { isDeleted: false };
    if (orgId) filter.organisationId = orgId;
    if (propertyId && propertyId !== 'all') filter.propertyId = propertyId;

    let csvContent = '';
    let filename = `pms-report-${module}-${Date.now()}.csv`;

    if (module === 'financial' || module === 'invoices') {
      filename = `financial-ledger-${Date.now()}.csv`;
      const invoices = await Invoice.find(filter)
        .populate('residentId', 'name mobile')
        .populate('tenantCompanyId', 'companyName')
        .populate('memberId', 'memberName')
        .populate('unitId', 'unitNumber')
        .populate('propertyId', 'name code')
        .sort({ createdAt: -1 });

      const headers = ['Invoice Number', 'Property', 'Customer / Occupant', 'Unit', 'Invoice Type', 'Billed Amount (INR)', 'Paid Amount (INR)', 'Balance Amount (INR)', 'Status', 'Due Date', 'Created Date'];
      const rows = invoices.map(i => {
        const cust = i.residentId?.name || i.tenantCompanyId?.companyName || i.memberId?.memberName || 'N/A';
        return [
          `"${i.invoiceNumber || ''}"`,
          `"${i.propertyId?.name || ''}"`,
          `"${cust}"`,
          `"${i.unitId?.unitNumber || ''}"`,
          `"${i.invoiceType || 'MAINTENANCE'}"`,
          i.totalAmount || 0,
          i.paidAmount || 0,
          i.balanceAmount || 0,
          `"${i.paymentStatus || 'PENDING'}"`,
          `"${i.dueDate ? new Date(i.dueDate).toISOString().split('T')[0] : ''}"`,
          `"${i.createdAt ? new Date(i.createdAt).toISOString().split('T')[0] : ''}"`
        ].join(',');
      });
      csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    } else if (module === 'tickets' || module === 'complaints') {
      filename = `complaints-sla-report-${Date.now()}.csv`;
      const complaints = await Complaint.find(filter)
        .populate('raisedByUserId', 'firstName lastName email mobile')
        .populate('unitId', 'unitNumber')
        .populate('propertyId', 'name')
        .sort({ createdAt: -1 });

      const headers = ['Ticket ID', 'Property', 'Title', 'Category', 'Priority', 'Status', 'Logged By', 'Unit', 'Created Date'];
      const rows = complaints.map(c => [
        `"${c.complaintNumber || c._id}"`,
        `"${c.propertyId?.name || ''}"`,
        `"${(c.title || '').replace(/"/g, '""')}"`,
        `"${c.category || 'GENERAL'}"`,
        `"${c.priority || 'MEDIUM'}"`,
        `"${c.status || 'OPEN'}"`,
        `"${c.raisedByName || (c.raisedByUserId ? c.raisedByUserId.firstName + ' ' + c.raisedByUserId.lastName : 'Occupant')}"`,
        `"${c.unitId?.unitNumber || ''}"`,
        `"${c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : ''}"`
      ].join(','));
      csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    } else if (module === 'visitors') {
      filename = `gate-visitor-log-${Date.now()}.csv`;
      const visitors = await Visitor.find(filter)
        .populate('unitId', 'unitNumber')
        .populate('propertyId', 'name')
        .sort({ createdAt: -1 });

      const headers = ['Pass Code', 'Property', 'Visitor Name', 'Phone', 'Visitor Type', 'Purpose', 'Unit', 'Status', 'Check-In Time', 'Check-Out Time'];
      const rows = visitors.map(v => [
        `"${v.passCode || ''}"`,
        `"${v.propertyId?.name || ''}"`,
        `"${v.visitorName || ''}"`,
        `"${v.phone || ''}"`,
        `"${v.visitorType || 'GUEST'}"`,
        `"${v.purpose || ''}"`,
        `"${v.unitId?.unitNumber || ''}"`,
        `"${v.status || 'CHECKED_IN'}"`,
        `"${v.checkInTime ? new Date(v.checkInTime).toLocaleString() : ''}"`,
        `"${v.checkOutTime ? new Date(v.checkOutTime).toLocaleString() : ''}"`
      ].join(','));
      csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    } else if (module === 'occupancy' || module === 'units') {
      filename = `units-occupancy-register-${Date.now()}.csv`;
      const units = await Unit.find(filter).populate('propertyId', 'name').sort({ unitNumber: 1 });

      const headers = ['Unit Number', 'Wing', 'Property', 'Unit Type', 'Carpet Area (sq.ft)', 'Rentable Area (sq.ft)', 'Occupancy Status', 'Base Maintenance (INR)'];
      const rows = units.map(u => [
        `"${u.unitNumber || ''}"`,
        `"${u.wing || 'Main'}"`,
        `"${u.propertyId?.name || ''}"`,
        `"${u.unitType || 'RESIDENTIAL'}"`,
        u.carpetArea || 0,
        u.rentableArea || 0,
        `"${u.occupancyStatus || 'VACANT'}"`,
        u.monthlyMaintenanceBase || 0
      ].join(','));
      csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    } else {
      // Default summary CSV
      filename = `executive-summary-${Date.now()}.csv`;
      csvContent = '\uFEFFModule,Metric,Value\nFinancial,Total Billed,0\n';
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createParkingSlot = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const propId = req.currentPropertyId || req.body.propertyId || req.user.propertyId;

    const slot = await ParkingSlot.create({
      ...req.body,
      organisationId: orgId,
      propertyId: propId,
      createdBy: req.user._id
    });
    return sendSuccess(res, 'Parking slot registered successfully', slot, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createAsset = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const propId = req.currentPropertyId || req.body.propertyId || req.user.propertyId;

    const assetCode = `AST-${Date.now().toString().slice(-6)}`;
    const asset = await Asset.create({
      ...req.body,
      assetCode,
      organisationId: orgId,
      propertyId: propId,
      createdBy: req.user._id
    });
    return sendSuccess(res, 'Asset added successfully', asset, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createAMC = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const propId = req.currentPropertyId || req.body.propertyId || req.user.propertyId;

    const amcNumber = `AMC-${Date.now().toString().slice(-6)}`;
    const amc = await AMCContract.create({
      ...req.body,
      amcNumber,
      organisationId: orgId,
      propertyId: propId,
      createdBy: req.user._id
    });
    return sendSuccess(res, 'AMC contract created successfully', amc, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createVendor = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const vendor = await Vendor.create({
      ...req.body,
      organisationId: orgId,
      createdBy: req.user._id
    });
    return sendSuccess(res, 'Vendor registered successfully', vendor, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createWorkOrder = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId || req.user.organisationId;
    const propId = req.currentPropertyId || req.body.propertyId || req.user.propertyId;

    const workOrderNumber = `WO-${Date.now().toString().slice(-6)}`;
    const order = await WorkOrder.create({
      ...req.body,
      workOrderNumber,
      organisationId: orgId,
      propertyId: propId,
      createdBy: req.user._id
    });
    return sendSuccess(res, 'Work order generated successfully', order, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const updateWorkOrderStatus = async (req, res) => {
  try {
    const { status, completionProof } = req.body;
    const updateData = { status, updatedBy: req.user._id };
    if (status === 'COMPLETED') updateData.completedAt = new Date();
    if (completionProof) updateData.completionProof = completionProof;

    const order = await WorkOrder.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!order) return sendError(res, 'Work order not found', 404, 'NOT_FOUND');
    return sendSuccess(res, 'Work order status updated', order);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  listInvoices,
  createInvoice,
  recordPayment,
  listVisitors,
  createVisitor,
  checkInVisitor,
  checkOutVisitor,
  listComplaints,
  createComplaint,
  updateComplaintStatus,
  listParkingSlots,
  createParkingSlot,
  listAssets,
  createAsset,
  listAMC,
  createAMC,
  listVendors,
  createVendor,
  listWorkOrders,
  createWorkOrder,
  updateWorkOrderStatus,
  getReports,
  exportReports
};

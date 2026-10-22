const Organisation = require('../models/Organisation');
const Property = require('../models/Property');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const AuditLog = require('../models/AuditLog');
const Setting = require('../models/Setting');
const { sendSuccess, sendError } = require('../utils/responseFormatter');
const { logAudit } = require('../middlewares/auditMiddleware');

// Platform Dashboard
const getPlatformDashboard = async (req, res) => {
  try {
    const totalOrganisations = await Organisation.countDocuments({ isDeleted: false });
    const activeOrganisations = await Organisation.countDocuments({ status: 'ACTIVE', isDeleted: false });
    const suspendedOrganisations = await Organisation.countDocuments({ status: 'SUSPENDED', isDeleted: false });
    
    const allProperties = await Property.find({ isDeleted: false });
    const totalProperties = allProperties.length;
    const resProperties = allProperties.filter(p => p.propertyType === 'RESIDENTIAL').length;
    const commProperties = allProperties.filter(p => p.propertyType === 'COMMERCIAL').length;
    const cowProperties = allProperties.filter(p => p.propertyType === 'COWORKING').length;

    const totalUsers = await User.countDocuments({ isDeleted: false });
    const totalSubscriptions = await Subscription.countDocuments({ isDeleted: false });

    // Revenue calculations from paid invoices
    const paidInvoices = await Invoice.find({ paymentStatus: 'PAID', isDeleted: false });
    const monthlyRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    
    const pendingInvoices = await Invoice.find({ paymentStatus: { $in: ['PENDING', 'OVERDUE', 'PARTIAL'] }, isDeleted: false });
    const pendingPayments = pendingInvoices.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0);

    const summaryCards = [
      { title: 'Total Organisations', value: totalOrganisations, prevValue: 2, changePercent: 50, trend: 'up', icon: 'bi-diagram-3', href: '/organisations' },
      { title: 'Active Subscribers', value: activeOrganisations, prevValue: 2, changePercent: 0, trend: 'up', icon: 'bi-check-circle', href: '/organisations' },
      { title: 'Total Properties', value: totalProperties, prevValue: 2, changePercent: 50, trend: 'up', icon: 'bi-building', href: '/properties' },
      { title: 'Platform Users', value: totalUsers, prevValue: 6, changePercent: 33.3, trend: 'up', icon: 'bi-people', href: '/users' },
      { title: 'Monthly SaaS Revenue', value: `₹${monthlyRevenue.toLocaleString()}`, prevValue: `₹${(monthlyRevenue * 0.9).toLocaleString()}`, changePercent: 11.1, trend: 'up', icon: 'bi-cash-coin', href: '/reports' },
      { title: 'Pending Payments', value: `₹${pendingPayments.toLocaleString()}`, prevValue: '₹0', changePercent: 100, trend: 'down', icon: 'bi-clock-history', href: '/reports' }
    ];

    const quickActions = [
      { name: 'Add Organisation', href: '/organisations', icon: 'bi-building-add' },
      { name: 'View Global Users', href: '/users', icon: 'bi-person-lines-fill' },
      { name: 'RBAC Matrix', href: '/roles', icon: 'bi-shield-lock' },
      { name: 'Platform Audit', href: '/reports', icon: 'bi-graph-up' }
    ];

    const charts = {
      orgStatus: {
        labels: ['Active', 'Suspended', 'Trial / Pending'],
        data: [activeOrganisations, suspendedOrganisations, Math.max(0, totalOrganisations - activeOrganisations - suspendedOrganisations)]
      },
      propertyTypes: {
        labels: ['Residential', 'Commercial', 'Co-working'],
        data: [resProperties, commProperties, cowProperties]
      },
      revenueComparison: {
        labels: ['Total Billed', 'Collected', 'Pending'],
        data: [monthlyRevenue + pendingPayments, monthlyRevenue, pendingPayments]
      }
    };

    const recentOrganisations = await Organisation.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('subscriptionPlanId', 'planName monthlyPrice');

    const recentActivities = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(8);

    return sendSuccess(res, 'Platform dashboard fetched successfully', {
      role: 'PLATFORM_OWNER',
      summaryCards,
      quickActions,
      charts,
      metrics: {
        totalOrganisations,
        activeOrganisations,
        suspendedOrganisations,
        totalProperties,
        totalUsers,
        totalSubscriptions,
        monthlyRevenue,
        pendingPayments
      },
      recentOrganisations,
      recentActivities,
      systemHealth: {
        apiStatus: 'HEALTHY',
        databaseStatus: 'CONNECTED',
        socketStatus: 'ACTIVE',
        uptimeSeconds: Math.floor(process.uptime())
      }
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Organisation CRUD for Platform Owner
const listOrganisations = async (req, res) => {
  try {
    const { search, status, type, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: false };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { contactEmail: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;
    if (type) filter.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Organisation.countDocuments(filter);
    const organisations = await Organisation.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('subscriptionPlanId', 'planName planCode monthlyPrice');

    return sendSuccess(res, 'Organisations fetched', organisations, {
      page: parseInt(page),
      limit: parseInt(limit),
      total
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const getOrganisationById = async (req, res) => {
  try {
    const org = await Organisation.findById(req.params.id)
      .populate('subscriptionPlanId');
    if (!org || org.isDeleted) {
      return sendError(res, 'Organisation not found', 404, 'NOT_FOUND');
    }

    const properties = await Property.find({ organisationId: org._id, isDeleted: false });
    const usersCount = await User.countDocuments({ organisationId: org._id, isDeleted: false });

    return sendSuccess(res, 'Organisation details', {
      organisation: org,
      properties,
      usersCount
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createOrganisation = async (req, res) => {
  try {
    const existing = await Organisation.findOne({ code: req.body.code.toUpperCase() });
    if (existing) {
      return sendError(res, 'Organisation with this code already exists', 400, 'CODE_EXISTS');
    }

    const org = await Organisation.create({
      ...req.body,
      createdBy: req.user ? req.user._id : null
    });

    await logAudit(req, {
      action: 'CREATE',
      module: 'ORGANISATION',
      recordId: org._id,
      newData: org.toObject()
    });

    return sendSuccess(res, 'Organisation created successfully', org, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const updateOrganisation = async (req, res) => {
  try {
    const org = await Organisation.findById(req.params.id);
    if (!org || org.isDeleted) {
      return sendError(res, 'Organisation not found', 404, 'NOT_FOUND');
    }

    const oldData = org.toObject();
    Object.assign(org, req.body, { updatedBy: req.user ? req.user._id : null });
    await org.save();

    await logAudit(req, {
      action: 'UPDATE',
      module: 'ORGANISATION',
      recordId: org._id,
      oldData,
      newData: org.toObject()
    });

    return sendSuccess(res, 'Organisation updated successfully', org);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const deleteOrganisation = async (req, res) => {
  try {
    const org = await Organisation.findById(req.params.id);
    if (!org) return sendError(res, 'Organisation not found', 404, 'NOT_FOUND');

    org.isDeleted = true;
    org.status = 'ARCHIVED';
    await org.save();

    await logAudit(req, {
      action: 'DELETE',
      module: 'ORGANISATION',
      recordId: org._id
    });

    return sendSuccess(res, 'Organisation archived successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Subscription Plans
const listSubscriptionPlans = async (req, res) => {
  try {
    const plans = await Subscription.find({ isDeleted: false });
    return sendSuccess(res, 'Subscription plans fetched', plans);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createSubscriptionPlan = async (req, res) => {
  try {
    const plan = await Subscription.create(req.body);
    return sendSuccess(res, 'Subscription plan created', plan, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Audit Logs
const listAuditLogs = async (req, res) => {
  try {
    const { module, action, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (module) filter.module = module;
    if (action) filter.action = action;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendSuccess(res, 'Audit logs fetched', logs, {
      page: parseInt(page),
      limit: parseInt(limit),
      total
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Settings
const getPlatformSettings = async (req, res) => {
  try {
    let setting = await Setting.findOne({ organisationId: null });
    if (!setting) {
      setting = await Setting.create({ organisationId: null });
    }
    return sendSuccess(res, 'Platform settings fetched', setting);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const updatePlatformSettings = async (req, res) => {
  try {
    let setting = await Setting.findOne({ organisationId: null });
    if (!setting) {
      setting = await Setting.create({ organisationId: null, ...req.body });
    } else {
      Object.assign(setting, req.body, { updatedBy: req.user._id });
      await setting.save();
    }
    return sendSuccess(res, 'Platform settings updated', setting);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getPlatformDashboard,
  listOrganisations,
  getOrganisationById,
  createOrganisation,
  updateOrganisation,
  deleteOrganisation,
  listSubscriptionPlans,
  createSubscriptionPlan,
  listAuditLogs,
  getPlatformSettings,
  updatePlatformSettings
};

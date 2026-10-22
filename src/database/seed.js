const mongoose = require('mongoose');
const User = require('../models/User');
const Organisation = require('../models/Organisation');
const Subscription = require('../models/Subscription');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const Property = require('../models/Property');
const Building = require('../models/Building');
const Floor = require('../models/Floor');
const Unit = require('../models/Unit');
const Resident = require('../models/Resident');
const TenantCompany = require('../models/TenantCompany');
const AggregateLease = require('../models/AggregateLease');
const MembershipPlan = require('../models/MembershipPlan');
const CoworkingMember = require('../models/CoworkingMember');
const Booking = require('../models/Booking');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Complaint = require('../models/Complaint');
const Visitor = require('../models/Visitor');
const ParkingSlot = require('../models/ParkingSlot');
const Amenity = require('../models/Amenity');
const Asset = require('../models/Asset');
const AMCContract = require('../models/AMCContract');
const Vendor = require('../models/Vendor');
const WorkOrder = require('../models/WorkOrder');
const Notice = require('../models/Notice');
const Setting = require('../models/Setting');
const Occupancy = require('../models/Occupancy');
const ContractAgreement = require('../models/ContractAgreement');
const Allocation = require('../models/Allocation');
const Delivery = require('../models/Delivery');
const EmergencyAccess = require('../models/EmergencyAccess');
const CctvDevice = require('../models/CctvDevice');
const CctvChannel = require('../models/CctvChannel');
const CctvEvent = require('../models/CctvEvent');
const CctvNotification = require('../models/CctvNotification');
const CctvNotificationRule = require('../models/CctvNotificationRule');
const CctvEscalationRule = require('../models/CctvEscalationRule');
const CctvAuditLog = require('../models/CctvAuditLog');
const { encryptCredentials } = require('../utils/cctvCrypto');
const { recalculateHierarchyStats } = require('../utils/hierarchyCascade');
const logger = require('../config/logger');

const seedDataIfEmpty = async () => {
  try {
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      logger.info(`Database already seeded with ${existingUsers} users.`);
      return;
    }
    await runFullSeed();
  } catch (error) {
    logger.error('Error during auto-seed check: %o', error);
  }
};

const runFullSeed = async () => {
  logger.info('Executing high-speed realistic seed pipeline...');

  // Clean existing seed collections to ensure idempotency
  await Promise.all([
    User.deleteMany({}),
    Organisation.deleteMany({}),
    Subscription.deleteMany({}),
    Property.deleteMany({}),
    Building.deleteMany({}),
    Floor.deleteMany({}),
    Unit.deleteMany({}),
    Occupancy.deleteMany({}),
    ContractAgreement.deleteMany({}),
    Allocation.deleteMany({}),
    Resident.deleteMany({}),
    TenantCompany.deleteMany({}),
    AggregateLease.deleteMany({}),
    MembershipPlan.deleteMany({}),
    CoworkingMember.deleteMany({}),
    Booking.deleteMany({}),
    Invoice.deleteMany({}),
    Payment.deleteMany({}),
    Complaint.deleteMany({}),
    Visitor.deleteMany({}),
    ParkingSlot.deleteMany({}),
    Amenity.deleteMany({}),
    Asset.deleteMany({}),
    AMCContract.deleteMany({}),
    Vendor.deleteMany({}),
    WorkOrder.deleteMany({}),
    Notice.deleteMany({}),
    Setting.deleteMany({}),
    Delivery.deleteMany({}),
    EmergencyAccess.deleteMany({}),
    CctvDevice.deleteMany({}),
    CctvChannel.deleteMany({}),
    CctvEvent.deleteMany({}),
    CctvNotification.deleteMany({}),
    CctvNotificationRule.deleteMany({}),
    CctvEscalationRule.deleteMany({}),
    CctvAuditLog.deleteMany({})
  ]);
  logger.info('Cleaned existing database records. Populating fresh realistic multi-tenant data...');

  // 1. Subscription Plans
  const starterResPlan = await Subscription.create({
    planName: 'Residential Standard',
    planCode: 'RES-STD',
    propertyTypesAllowed: ['RESIDENTIAL'],
    maxProperties: 3,
    maxBuildings: 10,
    maxUnits: 300,
    maxUsers: 500,
    monthlyPrice: 4999,
    yearlyPrice: 49990,
    status: 'ACTIVE'
  });

  const enterpriseCommPlan = await Subscription.create({
    planName: 'Commercial Enterprise',
    planCode: 'COMM-ENT',
    propertyTypesAllowed: ['COMMERCIAL'],
    maxProperties: 10,
    maxBuildings: 25,
    maxUnits: 1000,
    maxUsers: 2000,
    monthlyPrice: 19999,
    yearlyPrice: 199990,
    status: 'ACTIVE'
  });

  const flexCoworkPlan = await Subscription.create({
    planName: 'Coworking Pro',
    planCode: 'COWORK-PRO',
    propertyTypesAllowed: ['COWORKING'],
    maxProperties: 5,
    maxBuildings: 10,
    maxUnits: 500,
    maxUsers: 1500,
    monthlyPrice: 12999,
    yearlyPrice: 129990,
    status: 'ACTIVE'
  });

  // 2. Super Admin (Platform Owner)
  const superAdmin = await User.create({
    firstName: 'Super',
    lastName: 'Admin',
    email: 'superadmin@pms.com',
    mobile: '+91 9876543210',
    password: 'Password@123',
    isPlatformAdmin: true,
    primaryRole: 'PLATFORM_OWNER',
    status: 'ACTIVE'
  });

  // 3. Platform Settings
  await Setting.create({
    organisationId: null,
    currency: 'INR',
    currencySymbol: '₹',
    branding: {
      systemTitle: 'NexusPMS Enterprise Multi-Tenant Platform',
      primaryColor: '#2563EB'
    }
  });

  // ==========================================
  // ORGANISATION 1: RESIDENTIAL (Royal Palms)
  // ==========================================
  const orgRes = await Organisation.create({
    name: 'Royal Palms Residency Association',
    code: 'RPR',
    type: 'RESIDENTIAL',
    primaryContactName: 'Rajesh Sharma',
    contactEmail: 'admin@royalpalms.com',
    contactPhone: '+91 9811223344',
    city: 'Mumbai',
    state: 'Maharashtra',
    subscriptionPlanId: starterResPlan._id,
    status: 'ACTIVE'
  });

  const resAdmin = await User.create({
    firstName: 'Rajesh',
    lastName: 'Sharma',
    email: 'admin@royalpalms.com',
    mobile: '+91 9811223344',
    password: 'Password@123',
    organisationId: orgRes._id,
    primaryRole: 'ORGANISATION_OWNER',
    status: 'ACTIVE'
  });

  const resSecurity = await User.create({
    firstName: 'Suresh',
    lastName: 'Yadav',
    email: 'security@royalpalms.com',
    mobile: '+91 9811009988',
    password: 'Password@123',
    organisationId: orgRes._id,
    primaryRole: 'SECURITY_GUARD',
    status: 'ACTIVE'
  });

  // Property 1
  const propRes = await Property.create({
    organisationId: orgRes._id,
    name: 'Royal Palms Towers',
    code: 'RPT',
    propertyType: 'RESIDENTIAL',
    address: 'Aarey Milk Colony, Goregaon East',
    city: 'Mumbai',
    state: 'Maharashtra',
    managerName: 'Rajesh Sharma',
    managerContact: '+91 9811223344',
    createdBy: resAdmin._id
  });

  // Building 1
  const bldgA = await Building.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    name: 'Tower A - Emerald',
    code: 'TWR-A',
    wings: ['A1', 'A2'],
    totalFloors: 10,
    totalUnits: 40,
    createdBy: resAdmin._id
  });

  // Floors
  const floor1 = await Floor.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    buildingId: bldgA._id,
    floorNumber: 1,
    floorName: 'First Floor',
    createdBy: resAdmin._id
  });

  const floor2 = await Floor.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    buildingId: bldgA._id,
    floorNumber: 2,
    floorName: 'Second Floor',
    createdBy: resAdmin._id
  });

  // Units
  const unit101 = await Unit.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    buildingId: bldgA._id,
    floorId: floor1._id,
    unitNumber: 'A-101',
    wing: 'A1',
    unitType: '3BHK',
    carpetArea: 1450,
    rentableArea: 1750,
    furnishingType: 'FULLY_FURNISHED',
    occupancyStatus: 'OCCUPIED',
    monthlyMaintenanceBase: 6500,
    createdBy: resAdmin._id
  });

  const unit102 = await Unit.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    buildingId: bldgA._id,
    floorId: floor1._id,
    unitNumber: 'A-102',
    wing: 'A1',
    unitType: '2BHK',
    carpetArea: 1050,
    rentableArea: 1300,
    furnishingType: 'SEMI_FURNISHED',
    occupancyStatus: 'VACANT',
    monthlyMaintenanceBase: 4800,
    createdBy: resAdmin._id
  });

  // Resident User
  const resUser = await User.create({
    firstName: 'Amit',
    lastName: 'Verma',
    email: 'resident@royalpalms.com',
    mobile: '+91 9988776655',
    password: 'Password@123',
    organisationId: orgRes._id,
    propertyId: propRes._id,
    primaryRole: 'RESIDENT',
    status: 'ACTIVE'
  });

  const residentProfile = await Resident.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    buildingId: bldgA._id,
    floorId: floor1._id,
    unitId: unit101._id,
    userId: resUser._id,
    name: 'Amit Verma',
    email: 'resident@royalpalms.com',
    mobile: '+91 9988776655',
    residentType: 'OWNER',
    familyMembers: [
      { name: 'Pooja Verma', relation: 'Spouse', age: 34 },
      { name: 'Aarav Verma', relation: 'Son', age: 8 }
    ],
    vehicles: [
      { vehicleType: '4_WHEELER', vehicleNumber: 'MH-02-CE-8821', parkingSlot: 'P-101' }
    ],
    status: 'ACTIVE',
    createdBy: resAdmin._id
  });

  unit101.currentResidentId = residentProfile._id;
  await unit101.save();

  const unit103 = await Unit.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    buildingId: bldgA._id,
    floorId: floor1._id,
    unitNumber: 'A-103',
    wing: 'A1',
    unitType: '2BHK',
    carpetArea: 1100,
    rentableArea: 1350,
    furnishingType: 'SEMI_FURNISHED',
    occupancyStatus: 'RESERVED',
    status: 'RESERVED',
    monthlyMaintenanceBase: 5000,
    createdBy: resAdmin._id
  });

  // Building 2: Tower B - Ruby
  const bldgB = await Building.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    name: 'Tower B - Ruby',
    code: 'TWR-B',
    wings: ['B1', 'B2'],
    totalFloors: 10,
    totalUnits: 30,
    createdBy: resAdmin._id
  });

  const floorB1 = await Floor.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    buildingId: bldgB._id,
    floorNumber: 1,
    floorName: 'Ground Floor B',
    createdBy: resAdmin._id
  });

  const unitB101 = await Unit.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    buildingId: bldgB._id,
    floorId: floorB1._id,
    unitNumber: 'B-101',
    wing: 'B1',
    unitType: '3BHK',
    carpetArea: 1550,
    rentableArea: 1850,
    furnishingType: 'FULLY_FURNISHED',
    occupancyStatus: 'OCCUPIED',
    status: 'OCCUPIED',
    monthlyMaintenanceBase: 7000,
    createdBy: resAdmin._id
  });

  const unitB102 = await Unit.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    buildingId: bldgB._id,
    floorId: floorB1._id,
    unitNumber: 'B-102',
    wing: 'B1',
    unitType: '2BHK',
    carpetArea: 1000,
    rentableArea: 1250,
    furnishingType: 'UNFURNISHED',
    occupancyStatus: 'VACANT',
    status: 'VACANT',
    monthlyMaintenanceBase: 4500,
    createdBy: resAdmin._id
  });

  const unitB103 = await Unit.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    buildingId: bldgB._id,
    floorId: floorB1._id,
    unitNumber: 'B-103',
    wing: 'B1',
    unitType: '1BHK',
    carpetArea: 650,
    rentableArea: 800,
    furnishingType: 'SEMI_FURNISHED',
    occupancyStatus: 'MAINTENANCE',
    status: 'UNDER_MAINTENANCE',
    monthlyMaintenanceBase: 3500,
    createdBy: resAdmin._id
  });

  // Contract Agreement for Unit A-101
  const resAgreement101 = await ContractAgreement.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    buildingId: bldgA._id,
    floorId: floor1._id,
    unitId: unit101._id,
    contractNumber: 'AGR-RPT-A101-2026',
    contractType: 'RENTAL_AGREEMENT',
    partyType: 'RESIDENT',
    residentId: residentProfile._id,
    ownerName: 'Amit Verma',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-12-31'),
    lockInPeriodMonths: 11,
    noticePeriodMonths: 2,
    billingCycle: 'MONTHLY',
    paymentDueDate: 5,
    baseRentOrFee: 55000,
    maintenanceAmount: 6500,
    securityDeposit: 250000,
    status: 'ACTIVE',
    agreementDocumentUrl: '/uploads/agreements/Rental_Agreement_A101.pdf',
    documents: [{
      fileName: 'Rental_Agreement_A101.pdf',
      fileUrl: '/uploads/agreements/Rental_Agreement_A101.pdf',
      fileSize: 345000,
      fileType: 'application/pdf',
      uploadedBy: resAdmin._id,
      uploadedAt: new Date('2026-01-02'),
      status: 'ACTIVE'
    }],
    createdBy: resAdmin._id
  });

  // Spatial Allocation for Unit A-101
  const resAlloc101 = await Allocation.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    buildingId: bldgA._id,
    floorId: floor1._id,
    unitId: unit101._id,
    contractAgreementId: resAgreement101._id,
    allocationCode: 'ALC-RPT-A101',
    propertyType: 'RESIDENTIAL',
    occupantType: 'RESIDENT',
    occupantName: 'Amit Verma',
    allocationType: 'PERMANENT',
    residentId: residentProfile._id,
    startDate: new Date('2026-01-01'),
    parkingSlots: ['P-101'],
    status: 'ACTIVE',
    createdBy: resAdmin._id
  });

  // Occupancy for Unit A-101
  const resOccupancy101 = await Occupancy.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    buildingId: bldgA._id,
    floorId: floor1._id,
    unitId: unit101._id,
    occupancyCode: 'OCC-RPT-A101',
    propertyType: 'RESIDENTIAL',
    occupantType: 'RESIDENT',
    occupantName: 'Amit Verma',
    email: 'resident@royalpalms.com',
    mobile: '+91 9988776655',
    residentId: residentProfile._id,
    userId: resUser._id,
    contractAgreementId: resAgreement101._id,
    allocationId: resAlloc101._id,
    monthlyAmount: 61500,
    securityDeposit: 250000,
    startDate: new Date('2026-01-01'),
    agreementVerified: true,
    allocationVerified: true,
    accountVerified: true,
    allocationStatus: 'ALLOCATED',
    accountStatus: 'ACTIVE',
    agreementStatus: 'ACTIVE',
    status: 'ACTIVE',
    auditLog: [{
      action: 'SYSTEM_INITIALIZED',
      performedBy: resAdmin._id,
      timestamp: new Date('2026-01-01'),
      remarks: 'Seeded initial active residential occupancy with registered agreement'
    }],
    createdBy: resAdmin._id
  });

  resAgreement101.occupancyId = resOccupancy101._id;
  await resAgreement101.save();

  // Residential Invoices
  await Invoice.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    residentId: residentProfile._id,
    unitId: unit101._id,
    invoiceNumber: 'INV-RES-2026-001',
    invoiceType: 'MAINTENANCE',
    billingPeriod: 'September 2026',
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    items: [
      { description: 'Society Monthly Maintenance Base', quantity: 1, rate: 6500, amount: 6500 },
      { description: 'Water & Sewage Charges', quantity: 1, rate: 600, amount: 600 },
      { description: 'Covered Parking Bay P-101', quantity: 1, rate: 1000, amount: 1000 }
    ],
    subtotal: 8100,
    taxPercent: 18,
    taxAmount: 1458,
    totalAmount: 9558,
    paidAmount: 9558,
    balanceAmount: 0,
    paymentStatus: 'PAID',
    createdBy: resAdmin._id
  });

  await Invoice.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    residentId: residentProfile._id,
    unitId: unit101._id,
    invoiceNumber: 'INV-RES-2026-002',
    invoiceType: 'MAINTENANCE',
    billingPeriod: 'October 2026',
    dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    items: [
      { description: 'Society Monthly Maintenance Base', quantity: 1, rate: 6500, amount: 6500 },
      { description: 'Water & Sewage Charges', quantity: 1, rate: 600, amount: 600 },
      { description: 'Covered Parking Bay P-101', quantity: 1, rate: 1000, amount: 1000 }
    ],
    subtotal: 8100,
    taxPercent: 18,
    taxAmount: 1458,
    totalAmount: 9558,
    paidAmount: 0,
    balanceAmount: 9558,
    paymentStatus: 'PENDING',
    createdBy: resAdmin._id
  });

  // Visitors
  await Visitor.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    buildingId: bldgA._id,
    unitId: unit101._id,
    passCode: 'VP-9821A',
    visitorName: 'Karan Mehra',
    mobile: '+91 9771122334',
    visitorType: 'GUEST',
    purpose: 'Family Dinner',
    hostUserId: resUser._id,
    hostName: 'Amit Verma',
    expectedDate: new Date(),
    expectedTime: '19:00',
    vehicleNumber: 'MH-04-AB-1234',
    hostApprovalStatus: 'APPROVED',
    status: 'CHECKED_IN',
    checkInTime: new Date(Date.now() - 30 * 60 * 1000),
    createdBy: resUser._id
  });

  // Complaint
  await Complaint.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    buildingId: bldgA._id,
    unitId: unit101._id,
    complaintNumber: 'TKT-10492',
    title: 'Master Bathroom Drain Slow Drainage',
    category: 'PLUMBING',
    description: 'The master bathroom drain is draining very slowly and backing up water.',
    priority: 'HIGH',
    raisedByUserId: resUser._id,
    raisedByName: 'Amit Verma',
    raisedByContact: '+91 9988776655',
    status: 'IN_PROGRESS',
    assignedStaffName: 'Ramesh Plumber',
    createdBy: resUser._id
  });

  // Amenity
  await Amenity.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    name: 'Clubhouse Banquet & Lounge',
    code: 'AMN-CLUB',
    category: 'Clubhouse',
    capacity: 100,
    bookingChargesPerHour: 1500,
    rules: 'No loud music after 10 PM. Caterers must clean venue before leaving.',
    createdBy: resAdmin._id
  });

  // ==========================================
  // ORGANISATION 2: COMMERCIAL (Apex Horizon)
  // ==========================================
  const orgComm = await Organisation.create({
    name: 'Apex Horizon Tech Properties LLP',
    code: 'AHTP',
    type: 'COMMERCIAL',
    primaryContactName: 'Vikramaditya Rao',
    contactEmail: 'tech@apextech.com',
    contactPhone: '+91 9920114455',
    city: 'Bengaluru',
    state: 'Karnataka',
    subscriptionPlanId: enterpriseCommPlan._id,
    status: 'ACTIVE'
  });

  const commAdmin = await User.create({
    firstName: 'Vikramaditya',
    lastName: 'Rao',
    email: 'tech@apextech.com',
    mobile: '+91 9920114455',
    password: 'Password@123',
    organisationId: orgComm._id,
    primaryRole: 'ORGANISATION_OWNER',
    status: 'ACTIVE'
  });

  const propComm = await Property.create({
    organisationId: orgComm._id,
    name: 'Apex Horizon Cyber Park',
    code: 'AHCP',
    propertyType: 'COMMERCIAL',
    address: 'Outer Ring Road, Bellandur',
    city: 'Bengaluru',
    state: 'Karnataka',
    totalBuiltUpArea: 250000,
    managerName: 'Vikramaditya Rao',
    managerContact: '+91 9920114455',
    createdBy: commAdmin._id
  });

  const bldgAlpha = await Building.create({
    organisationId: orgComm._id,
    propertyId: propComm._id,
    name: 'Tower Alpha (Grade-A IT)',
    code: 'TWR-ALPHA',
    totalFloors: 8,
    totalUnits: 24,
    createdBy: commAdmin._id
  });

  const commFloor3 = await Floor.create({
    organisationId: orgComm._id,
    propertyId: propComm._id,
    buildingId: bldgAlpha._id,
    floorNumber: 3,
    floorName: 'Floor 3 (East Wing)',
    rentableArea: 25000,
    createdBy: commAdmin._id
  });

  const commFloor4 = await Floor.create({
    organisationId: orgComm._id,
    propertyId: propComm._id,
    buildingId: bldgAlpha._id,
    floorNumber: 4,
    floorName: 'Floor 4 (Executive Wing)',
    rentableArea: 28000,
    createdBy: commAdmin._id
  });

  const office301 = await Unit.create({
    organisationId: orgComm._id,
    propertyId: propComm._id,
    buildingId: bldgAlpha._id,
    floorId: commFloor3._id,
    unitNumber: 'Suite 301',
    unitType: 'OFFICE',
    carpetArea: 8000,
    rentableArea: 10000,
    occupancyStatus: 'OCCUPIED',
    baseRent: 750000,
    createdBy: commAdmin._id
  });

  const office401 = await Unit.create({
    organisationId: orgComm._id,
    propertyId: propComm._id,
    buildingId: bldgAlpha._id,
    floorId: commFloor4._id,
    unitNumber: 'Suite 401',
    unitType: 'OFFICE',
    carpetArea: 12000,
    rentableArea: 15000,
    occupancyStatus: 'OCCUPIED',
    baseRent: 1125000,
    createdBy: commAdmin._id
  });

  // Tenant Company
  const tenantComp = await TenantCompany.create({
    organisationId: orgComm._id,
    propertyId: propComm._id,
    companyName: 'Nexus Cloud Technologies Pvt Ltd',
    companyCode: 'NEXUS-CLOUD',
    contactPerson: 'Sanjay Krishnan',
    email: 'tenant@nexuscloud.com',
    phone: '+91 9845012345',
    gstNumber: '29AABCN1234C1Z5',
    panNumber: 'AABCN1234C',
    employeesCount: 180,
    status: 'ACTIVE',
    createdBy: commAdmin._id
  });

  const commTenantUser = await User.create({
    firstName: 'Sanjay',
    lastName: 'Krishnan',
    email: 'tenant@nexuscloud.com',
    mobile: '+91 9845012345',
    password: 'Password@123',
    organisationId: orgComm._id,
    propertyId: propComm._id,
    primaryRole: 'TENANT',
    status: 'ACTIVE'
  });

  // Aggregate Lease (Multi-unit binding: Suite 301 + Suite 401 under one agreement)
  const masterLease = await AggregateLease.create({
    organisationId: orgComm._id,
    propertyId: propComm._id,
    tenantCompanyId: tenantComp._id,
    masterLeaseNumber: 'LSE-NEXUS-2026',
    buildingIds: [bldgAlpha._id],
    floorIds: [commFloor3._id, commFloor4._id],
    unitIds: [office301._id, office401._id],
    leaseStartDate: new Date('2026-01-01'),
    leaseEndDate: new Date('2029-12-31'),
    lockInPeriodMonths: 36,
    noticePeriodMonths: 6,
    monthlyBaseRent: 1875000,
    camCharges: 250000,
    utilityCharges: 80000,
    parkingCharges: 60000,
    taxPercent: 18,
    totalMonthlyPayable: 2672700,
    securityDeposit: 11250000,
    rentEscalationPercent: 5,
    approvalStatus: 'APPROVED',
    status: 'ACTIVE',
    createdBy: commAdmin._id
  });

  office301.currentTenantCompanyId = tenantComp._id;
  office401.currentTenantCompanyId = tenantComp._id;
  await office301.save();
  await office401.save();

  // Building 2: Wing Beta (Corporate Suites)
  const bldgBeta = await Building.create({
    organisationId: orgComm._id,
    propertyId: propComm._id,
    name: 'Wing Beta (Corporate Suites)',
    code: 'WING-BETA',
    totalFloors: 6,
    totalUnits: 18,
    createdBy: commAdmin._id
  });

  const commFloorB1 = await Floor.create({
    organisationId: orgComm._id,
    propertyId: propComm._id,
    buildingId: bldgBeta._id,
    floorNumber: 1,
    floorName: 'Floor 1 (Retail & Banking)',
    rentableArea: 20000,
    createdBy: commAdmin._id
  });

  const officeB101 = await Unit.create({
    organisationId: orgComm._id,
    propertyId: propComm._id,
    buildingId: bldgBeta._id,
    floorId: commFloorB1._id,
    unitNumber: 'Shop B-101',
    unitType: 'SHOP',
    carpetArea: 3200,
    rentableArea: 4000,
    occupancyStatus: 'VACANT',
    status: 'VACANT',
    baseRent: 400000,
    createdBy: commAdmin._id
  });

  const officeB102 = await Unit.create({
    organisationId: orgComm._id,
    propertyId: propComm._id,
    buildingId: bldgBeta._id,
    floorId: commFloorB1._id,
    unitNumber: 'Office B-102',
    unitType: 'OFFICE',
    carpetArea: 5000,
    rentableArea: 6500,
    occupancyStatus: 'MAINTENANCE',
    status: 'UNDER_MAINTENANCE',
    baseRent: 550000,
    createdBy: commAdmin._id
  });

  // Contract Agreement for Commercial Suite 301
  const commAgreement301 = await ContractAgreement.create({
    organisationId: orgComm._id,
    propertyId: propComm._id,
    buildingId: bldgAlpha._id,
    floorId: commFloor3._id,
    unitId: office301._id,
    contractNumber: 'AGR-AHCP-O301-2026',
    contractType: 'STANDARD_COMMERCIAL_LEASE',
    partyType: 'TENANT_COMPANY',
    tenantCompanyId: tenantComp._id,
    ownerName: 'Nexus Cloud Technologies',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2029-12-31'),
    lockInPeriodMonths: 36,
    noticePeriodMonths: 6,
    billingCycle: 'MONTHLY',
    paymentDueDate: 5,
    baseRentOrFee: 1875000,
    camCharges: 250000,
    utilityCharges: 80000,
    securityDeposit: 11250000,
    escalationPercentage: 5,
    status: 'ACTIVE',
    agreementDocumentUrl: '/uploads/agreements/Master_Lease_Nexus_Suite301.pdf',
    documents: [{
      fileName: 'Master_Lease_Nexus_Suite301.pdf',
      fileUrl: '/uploads/agreements/Master_Lease_Nexus_Suite301.pdf',
      fileSize: 845000,
      fileType: 'application/pdf',
      uploadedBy: commAdmin._id,
      uploadedAt: new Date('2026-01-01'),
      status: 'ACTIVE'
    }],
    createdBy: commAdmin._id
  });

  // Spatial Allocation for Suite 301
  const commAlloc301 = await Allocation.create({
    organisationId: orgComm._id,
    propertyId: propComm._id,
    buildingId: bldgAlpha._id,
    floorId: commFloor3._id,
    unitId: office301._id,
    contractAgreementId: commAgreement301._id,
    allocationCode: 'ALC-AHCP-O301',
    propertyType: 'COMMERCIAL',
    occupantType: 'TENANT_COMPANY',
    occupantName: 'Nexus Cloud Technologies',
    allocationType: 'PERMANENT',
    tenantCompanyId: tenantComp._id,
    startDate: new Date('2026-01-01'),
    parkingSlots: ['CP-B1-01', 'CP-B1-02', 'CP-B1-03', 'CP-B1-04'],
    status: 'ACTIVE',
    createdBy: commAdmin._id
  });

  // Occupancy for Suite 301
  const commOccupancy301 = await Occupancy.create({
    organisationId: orgComm._id,
    propertyId: propComm._id,
    buildingId: bldgAlpha._id,
    floorId: commFloor3._id,
    unitId: office301._id,
    occupancyCode: 'OCC-AHCP-O301',
    propertyType: 'COMMERCIAL',
    occupantType: 'TENANT_COMPANY',
    occupantName: 'Nexus Cloud Technologies',
    companyName: 'Nexus Cloud Technologies Pvt Ltd',
    email: 'tenant@nexuscloud.com',
    mobile: '+91 9845012345',
    tenantCompanyId: tenantComp._id,
    userId: commTenantUser._id,
    contractAgreementId: commAgreement301._id,
    allocationId: commAlloc301._id,
    monthlyAmount: 2125000,
    camCharges: 250000,
    securityDeposit: 11250000,
    startDate: new Date('2026-01-01'),
    agreementVerified: true,
    allocationVerified: true,
    accountVerified: true,
    allocationStatus: 'ALLOCATED',
    accountStatus: 'ACTIVE',
    agreementStatus: 'ACTIVE',
    status: 'ACTIVE',
    auditLog: [{
      action: 'SYSTEM_INITIALIZED',
      performedBy: commAdmin._id,
      timestamp: new Date('2026-01-01'),
      remarks: 'Commercial long-term office lease registered'
    }],
    createdBy: commAdmin._id
  });

  commAgreement301.occupancyId = commOccupancy301._id;
  await commAgreement301.save();

  // Commercial Assets & AMC
  const vendorHVAC = await Vendor.create({
    organisationId: orgComm._id,
    name: 'BlueStar Commercial Climate Systems',
    vendorCode: 'VND-BS-01',
    category: 'HVAC',
    contactPerson: 'Mahesh Nair',
    email: 'nair@bluestar-systems.com',
    phone: '+91 9820011223',
    rating: 4.8,
    status: 'ACTIVE',
    createdBy: commAdmin._id
  });

  const chillerAsset = await Asset.create({
    organisationId: orgComm._id,
    propertyId: propComm._id,
    buildingId: bldgAlpha._id,
    assetCode: 'HVAC-CHILLER-01',
    assetName: 'Centrifugal Water-Cooled Chiller 400TR',
    category: 'HVAC',
    location: 'Basement Plant Room',
    purchaseDate: new Date('2024-05-15'),
    purchaseCost: 4500000,
    vendorId: vendorHVAC._id,
    condition: 'EXCELLENT',
    status: 'OPERATIONAL',
    createdBy: commAdmin._id
  });

  await AMCContract.create({
    organisationId: orgComm._id,
    propertyId: propComm._id,
    amcNumber: 'AMC-HVAC-2026',
    title: 'Comprehensive HVAC Chiller & AHU Operations AMC',
    vendorId: vendorHVAC._id,
    assetIds: [chillerAsset._id],
    contractStartDate: new Date('2026-01-01'),
    contractEndDate: new Date('2026-12-31'),
    contractAmount: 480000,
    serviceFrequency: 'MONTHLY',
    status: 'ACTIVE',
    createdBy: commAdmin._id
  });

  // ==========================================
  // ORGANISATION 3: COWORKING (InnoSpace)
  // ==========================================
  const orgCowork = await Organisation.create({
    name: 'InnoSpace Flexible Workspaces',
    code: 'INNO',
    type: 'COWORKING',
    primaryContactName: 'Ananya Deshmukh',
    contactEmail: 'cowork@innospace.com',
    contactPhone: '+91 9769001122',
    city: 'Hyderabad',
    state: 'Telangana',
    subscriptionPlanId: flexCoworkPlan._id,
    status: 'ACTIVE'
  });

  const coworkAdmin = await User.create({
    firstName: 'Ananya',
    lastName: 'Deshmukh',
    email: 'cowork@innospace.com',
    mobile: '+91 9769001122',
    password: 'Password@123',
    organisationId: orgCowork._id,
    primaryRole: 'ORGANISATION_OWNER',
    status: 'ACTIVE'
  });

  const propCowork = await Property.create({
    organisationId: orgCowork._id,
    name: 'InnoSpace Cyber Gateway Hub',
    code: 'INNO-CG',
    propertyType: 'COWORKING',
    address: 'Hitec City, Madhapur',
    city: 'Hyderabad',
    state: 'Telangana',
    operatingHours: '24/7 Unlimited Access',
    managerName: 'Ananya Deshmukh',
    managerContact: '+91 9769001122',
    createdBy: coworkAdmin._id
  });

  const bldgCowork = await Building.create({
    organisationId: orgCowork._id,
    propertyId: propCowork._id,
    name: 'Hub One',
    code: 'HUB-1',
    totalFloors: 4,
    totalUnits: 60,
    createdBy: coworkAdmin._id
  });

  const coworkFloor1 = await Floor.create({
    organisationId: orgCowork._id,
    propertyId: propCowork._id,
    buildingId: bldgCowork._id,
    floorNumber: 1,
    floorName: 'Flexi Open Floor & Café',
    createdBy: coworkAdmin._id
  });

  const confRoomUnit = await Unit.create({
    organisationId: orgCowork._id,
    propertyId: propCowork._id,
    buildingId: bldgCowork._id,
    floorId: coworkFloor1._id,
    unitNumber: 'Boardroom-A',
    unitType: 'CONFERENCE_ROOM',
    carpetArea: 350,
    occupancyStatus: 'VACANT',
    createdBy: coworkAdmin._id
  });

  const hotDesk10 = await Unit.create({
    organisationId: orgCowork._id,
    propertyId: propCowork._id,
    buildingId: bldgCowork._id,
    floorId: coworkFloor1._id,
    unitNumber: 'Desk-10',
    unitType: 'DEDICATED_DESK',
    carpetArea: 50,
    occupancyStatus: 'OCCUPIED',
    createdBy: coworkAdmin._id
  });

  // Membership Plan
  const planDedicated = await MembershipPlan.create({
    organisationId: orgCowork._id,
    propertyId: propCowork._id,
    planName: 'Dedicated Desk Unlimited',
    planType: 'DEDICATED_DESK',
    monthlyPrice: 8500,
    includedSeats: 1,
    meetingRoomCreditsHours: 12,
    printingCreditsPages: 200,
    status: 'ACTIVE',
    createdBy: coworkAdmin._id
  });

  // Member User
  const coworkMemberUser = await User.create({
    firstName: 'Rohan',
    lastName: 'Kapoor',
    email: 'member@innospace.com',
    mobile: '+91 9822334455',
    password: 'Password@123',
    organisationId: orgCowork._id,
    propertyId: propCowork._id,
    primaryRole: 'COWORKING_MEMBER',
    status: 'ACTIVE'
  });

  const memberProfile = await CoworkingMember.create({
    organisationId: orgCowork._id,
    propertyId: propCowork._id,
    userId: coworkMemberUser._id,
    memberName: 'Rohan Kapoor',
    email: 'member@innospace.com',
    mobile: '+91 9822334455',
    companyName: 'HyperGrowth AI Labs',
    isCompanyAdmin: true,
    membershipPlanId: planDedicated._id,
    assignedUnitId: hotDesk10._id,
    availableMeetingCreditsHours: 12,
    availablePrintingCredits: 200,
    joiningDate: new Date(),
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    status: 'ACTIVE',
    createdBy: coworkAdmin._id
  });

  hotDesk10.currentMemberId = memberProfile._id;
  await hotDesk10.save();

  // Zone 2: Innovation Pods & Labs
  const bldgCowork2 = await Building.create({
    organisationId: orgCowork._id,
    propertyId: propCowork._id,
    name: 'Innovation Pods & Private Cabins (Zone B)',
    code: 'ZONE-B',
    totalFloors: 2,
    totalUnits: 12,
    createdBy: coworkAdmin._id
  });

  const coworkFloorB = await Floor.create({
    organisationId: orgCowork._id,
    propertyId: propCowork._id,
    buildingId: bldgCowork2._id,
    floorNumber: 1,
    floorName: 'Pod Level 1',
    usableArea: 8000,
    createdBy: coworkAdmin._id
  });

  const cabin01 = await Unit.create({
    organisationId: orgCowork._id,
    propertyId: propCowork._id,
    buildingId: bldgCowork2._id,
    floorId: coworkFloorB._id,
    unitNumber: 'Cabin C-01',
    unitType: 'PRIVATE_CABIN',
    carpetArea: 250,
    occupancyStatus: 'OCCUPIED',
    status: 'OCCUPIED',
    monthlyPrice: 35000,
    createdBy: coworkAdmin._id
  });

  const cabin02 = await Unit.create({
    organisationId: orgCowork._id,
    propertyId: propCowork._id,
    buildingId: bldgCowork2._id,
    floorId: coworkFloorB._id,
    unitNumber: 'Cabin C-02',
    unitType: 'PRIVATE_CABIN',
    carpetArea: 250,
    occupancyStatus: 'VACANT',
    status: 'VACANT',
    monthlyPrice: 35000,
    createdBy: coworkAdmin._id
  });

  const desk11 = await Unit.create({
    organisationId: orgCowork._id,
    propertyId: propCowork._id,
    buildingId: bldgCowork2._id,
    floorId: coworkFloorB._id,
    unitNumber: 'Desk-11',
    unitType: 'HOT_DESK',
    carpetArea: 40,
    occupancyStatus: 'RESERVED',
    status: 'RESERVED',
    monthlyPrice: 6500,
    createdBy: coworkAdmin._id
  });

  const desk12 = await Unit.create({
    organisationId: orgCowork._id,
    propertyId: propCowork._id,
    buildingId: bldgCowork2._id,
    floorId: coworkFloorB._id,
    unitNumber: 'Desk-12',
    unitType: 'HOT_DESK',
    carpetArea: 40,
    occupancyStatus: 'MAINTENANCE',
    status: 'UNDER_MAINTENANCE',
    monthlyPrice: 6500,
    createdBy: coworkAdmin._id
  });

  // Contract Agreement for Dedicated Desk 10
  const coworkAgreement10 = await ContractAgreement.create({
    organisationId: orgCowork._id,
    propertyId: propCowork._id,
    buildingId: bldgCowork._id,
    floorId: coworkFloor1._id,
    unitId: hotDesk10._id,
    contractNumber: 'AGR-INNO-D10-2026',
    contractType: 'DEDICATED_DESK_MEMBERSHIP',
    partyType: 'COWORKING_MEMBER',
    coworkingMemberId: memberProfile._id,
    ownerName: 'Rohan Kapoor',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    lockInPeriodMonths: 3,
    noticePeriodMonths: 1,
    billingCycle: 'MONTHLY',
    paymentDueDate: 5,
    baseRentOrFee: 8500,
    securityDeposit: 17000,
    includedHours: 12,
    includedCredits: 200,
    internetAccess: true,
    status: 'ACTIVE',
    agreementDocumentUrl: '/uploads/agreements/Coworking_Dedicated_Desk_Agreement.pdf',
    documents: [{
      fileName: 'Coworking_Dedicated_Desk_Agreement.pdf',
      fileUrl: '/uploads/agreements/Coworking_Dedicated_Desk_Agreement.pdf',
      fileSize: 180000,
      fileType: 'application/pdf',
      uploadedBy: coworkAdmin._id,
      uploadedAt: new Date('2026-01-01'),
      status: 'ACTIVE'
    }],
    createdBy: coworkAdmin._id
  });

  // Spatial Allocation for Desk 10
  const coworkAlloc10 = await Allocation.create({
    organisationId: orgCowork._id,
    propertyId: propCowork._id,
    buildingId: bldgCowork._id,
    floorId: coworkFloor1._id,
    unitId: hotDesk10._id,
    contractAgreementId: coworkAgreement10._id,
    allocationCode: 'ALC-INNO-D10',
    propertyType: 'COWORKING',
    occupantType: 'INDIVIDUAL_MEMBER',
    occupantName: 'Rohan Kapoor',
    allocationType: 'PERMANENT',
    coworkingMemberId: memberProfile._id,
    startDate: new Date('2026-01-01'),
    accessLevel: '24/7 Access',
    status: 'ACTIVE',
    createdBy: coworkAdmin._id
  });

  // Occupancy for Desk 10
  const coworkOccupancy10 = await Occupancy.create({
    organisationId: orgCowork._id,
    propertyId: propCowork._id,
    buildingId: bldgCowork._id,
    floorId: coworkFloor1._id,
    unitId: hotDesk10._id,
    occupancyCode: 'OCC-INNO-D10',
    propertyType: 'COWORKING',
    occupantType: 'INDIVIDUAL_MEMBER',
    occupantName: 'Rohan Kapoor',
    companyName: 'HyperGrowth AI Labs',
    email: 'member@innospace.com',
    mobile: '+91 9822334455',
    coworkingMemberId: memberProfile._id,
    userId: coworkMemberUser._id,
    contractAgreementId: coworkAgreement10._id,
    allocationId: coworkAlloc10._id,
    monthlyAmount: 8500,
    securityDeposit: 17000,
    startDate: new Date('2026-01-01'),
    agreementVerified: true,
    allocationVerified: true,
    accountVerified: true,
    allocationStatus: 'ALLOCATED',
    accountStatus: 'ACTIVE',
    agreementStatus: 'ACTIVE',
    status: 'ACTIVE',
    auditLog: [{
      action: 'SYSTEM_INITIALIZED',
      performedBy: coworkAdmin._id,
      timestamp: new Date('2026-01-01'),
      remarks: 'Coworking dedicated desk agreement registered'
    }],
    createdBy: coworkAdmin._id
  });

  coworkAgreement10.occupancyId = coworkOccupancy10._id;
  await coworkAgreement10.save();

  // Automatic Cascading Occupancy Recalculation across all 3 Properties
  await recalculateHierarchyStats({ propertyId: propRes._id });
  await recalculateHierarchyStats({ propertyId: propComm._id });
  await recalculateHierarchyStats({ propertyId: propCowork._id });

  // Booking in Conference Room
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  await Booking.create({
    organisationId: orgCowork._id,
    propertyId: propCowork._id,
    bookingNumber: 'BK-CR-1001',
    bookingType: 'CONFERENCE_ROOM',
    unitId: confRoomUnit._id,
    userId: coworkMemberUser._id,
    memberId: memberProfile._id,
    companyName: 'HyperGrowth AI Labs',
    title: 'Series-A Investor Pitch Presentation',
    bookingDate: tomorrow,
    startTime: '14:00',
    endTime: '16:00',
    startDateTime: new Date(`${tomorrowStr}T14:00:00`),
    endDateTime: new Date(`${tomorrowStr}T16:00:00`),
    creditsUsed: 2,
    charges: 0,
    status: 'CONFIRMED',
    approvalStatus: 'APPROVED',
    createdBy: coworkMemberUser._id
  });

  // ==========================================
  // VISITORS & GATE PASS SPEED DATA
  // ==========================================
  logger.info('Seeding realistic Visitors, Gate Passes & Deliveries across properties...');

  // 1. Residential Visitors (Royal Palms)
  await Visitor.create([
    {
      organisationId: orgRes._id,
      propertyId: propRes._id,
      propertyType: 'RESIDENTIAL',
      propertyName: 'Royal Palms Towers',
      buildingId: bldgA._id,
      buildingName: 'Tower A - Emerald',
      floorId: floor1._id,
      floorName: 'Floor 1',
      unitId: unit101._id,
      unitNumber: 'A-101',
      passCode: 'VP-RPR01',
      visitorNumber: 'VIS-2026-001',
      visitorName: 'Deepak Chawla',
      mobile: '+91 9811223344',
      email: 'deepak.chawla@gmail.com',
      visitorType: 'GUEST',
      purpose: 'Family weekend dinner & stay',
      numberOfVisitors: 2,
      accompanyingVisitors: ['Sunita Chawla'],
      hostType: 'RESIDENT',
      hostUserId: resUser._id,
      hostName: 'Amit Verma',
      hostMobile: '+91 9988776655',
      expectedDate: new Date(),
      expectedTime: '18:30',
      expectedExitTime: '22:00',
      actualArrivalTime: '18:45',
      vehicleType: 'CAR',
      vehicleNumber: 'MH 02 BG 4421',
      parkingRequired: true,
      parkingSlot: 'V-Slot-04',
      idProofType: 'AADHAAR',
      idProofNumber: '8832',
      hostApprovalStatus: 'APPROVED',
      approvalBy: 'Amit Verma',
      approvalAt: new Date(Date.now() - 3600000),
      gatePassType: 'ONE_TIME',
      gatePassStatus: 'ACTIVE',
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=VP-RPR01',
      allowedGates: ['Main Gate A', 'Visitor Gate 1'],
      allowedAreas: ['Tower A Ground Lobby', 'Lift A', 'Unit A-101'],
      checkInGate: 'Main Gate A',
      checkInTime: new Date(Date.now() - 7200000),
      isOverstay: true,
      overstayDuration: '1 hr 30 min',
      securityRemarks: 'Verified photo ID and admitted with parking bay V-Slot-04',
      status: 'CHECKED_IN',
      checkedInBySecurityId: resSecurity._id,
      createdBy: resUser._id
    },
    {
      organisationId: orgRes._id,
      propertyId: propRes._id,
      propertyType: 'RESIDENTIAL',
      propertyName: 'Royal Palms Towers',
      buildingId: bldgA._id,
      buildingName: 'Tower A - Emerald',
      floorId: floor1._id,
      floorName: 'Floor 1',
      unitId: unit101._id,
      unitNumber: 'A-101',
      passCode: 'VP-RPR02',
      visitorNumber: 'VIS-2026-002',
      visitorName: 'Ramesh Kulkarni',
      mobile: '+91 9877001122',
      visitorType: 'SERVICE_TECHNICIAN',
      purpose: 'Urban Company Split AC Servicing',
      numberOfVisitors: 1,
      hostType: 'RESIDENT',
      hostUserId: resUser._id,
      hostName: 'Amit Verma',
      expectedDate: new Date(),
      expectedTime: '15:00',
      expectedExitTime: '17:00',
      actualArrivalTime: '15:10',
      vehicleType: 'TWO_WHEELER',
      vehicleNumber: 'MH 03 EN 9918',
      parkingRequired: true,
      parkingSlot: '2W-Bay-12',
      idProofType: 'DRIVING_LICENSE',
      idProofNumber: '5512',
      hostApprovalStatus: 'APPROVED',
      gatePassType: 'ONE_TIME',
      gatePassStatus: 'COMPLETED',
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=VP-RPR02',
      checkInGate: 'Service Gate 2',
      checkOutGate: 'Service Gate 2',
      checkInTime: new Date(Date.now() - 14400000),
      checkOutTime: new Date(Date.now() - 7200000),
      visitDuration: '2 hrs',
      securityRemarks: 'Technician carrying toolbox verified on exit',
      status: 'CHECKED_OUT',
      checkedInBySecurityId: resSecurity._id,
      checkedOutBySecurityId: resSecurity._id,
      createdBy: resUser._id
    },
    {
      organisationId: orgRes._id,
      propertyId: propRes._id,
      propertyType: 'RESIDENTIAL',
      propertyName: 'Royal Palms Towers',
      buildingId: bldgB._id,
      buildingName: 'Tower B - Ruby',
      floorId: floorB1._id,
      floorName: 'Floor 1',
      unitId: unitB101._id,
      unitNumber: 'B-101',
      passCode: 'VP-RPR03',
      visitorNumber: 'VIS-2026-003',
      visitorName: 'Kunal Joshi',
      mobile: '+91 9771122334',
      visitorType: 'GUEST',
      purpose: 'Friend Weekend Catchup',
      numberOfVisitors: 1,
      hostType: 'RESIDENT',
      hostName: 'Resident B-101',
      expectedDate: tomorrow,
      expectedTime: '11:00',
      expectedExitTime: '14:00',
      parkingRequired: false,
      idProofType: 'AADHAAR',
      idProofNumber: '1902',
      hostApprovalStatus: 'PENDING',
      gatePassType: 'ONE_TIME',
      gatePassStatus: 'GENERATED',
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=VP-RPR03',
      allowedGates: ['Main Gate A'],
      status: 'EXPECTED',
      createdBy: resAdmin._id
    }
  ]);

  // 2. Commercial Visitors (Apex Horizon)
  await Visitor.create([
    {
      organisationId: orgComm._id,
      propertyId: propComm._id,
      propertyType: 'COMMERCIAL',
      propertyName: 'Apex Horizon Cyber Park',
      buildingId: bldgAlpha._id,
      buildingName: 'Tower Alpha (Grade-A IT)',
      floorId: commFloor3._id,
      floorName: 'Floor 3',
      unitId: office301._id,
      unitNumber: 'Suite 301',
      passCode: 'VP-AHCP1',
      visitorNumber: 'VIS-2026-004',
      visitorName: 'Alexander Wright',
      mobile: '+1 415 889 2011',
      email: 'alex.wright@apexcloud.io',
      companyName: 'Nexus Cloud Technologies',
      visitorType: 'CLIENT',
      purpose: 'Quarterly Executive Business Review & SLA Audit',
      numberOfVisitors: 3,
      accompanyingVisitors: ['Sarah Jenkins (VP Strategy)', 'Marcus Cole (Director DevOps)'],
      hostType: 'TENANT_EMPLOYEE',
      hostUserId: commTenantUser._id,
      hostName: 'Sanjay Krishnan',
      expectedDate: new Date(),
      expectedTime: '10:00',
      expectedExitTime: '17:00',
      actualArrivalTime: '09:55',
      vehicleType: 'TAXI',
      vehicleNumber: 'KA 01 MG 7729',
      idProofType: 'PASSPORT',
      idProofNumber: '9082',
      hostApprovalStatus: 'APPROVED',
      approvalBy: 'Sanjay Krishnan (Director Eng)',
      gatePassType: 'EMPLOYEE_GUEST',
      gatePassStatus: 'ACTIVE',
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=VP-AHCP1',
      allowedGates: ['North Plaza Gate 1', 'East Turnstile B'],
      allowedAreas: ['Tower Alpha Main Reception', 'High-speed Elevators', 'Suite 301 Conference Wing'],
      checkInGate: 'North Plaza Gate 1',
      checkInTime: new Date(Date.now() - 25200000),
      isOverstay: true,
      overstayDuration: '2 hrs 15 min',
      securityRemarks: 'Executive VIP Badges issued with Level 3 turnstile access',
      status: 'CHECKED_IN',
      createdBy: commTenantUser._id
    },
    {
      organisationId: orgComm._id,
      propertyId: propComm._id,
      propertyType: 'COMMERCIAL',
      propertyName: 'Apex Horizon Cyber Park',
      buildingId: bldgAlpha._id,
      buildingName: 'Tower Alpha (Grade-A IT)',
      floorId: commFloor4._id,
      floorName: 'Floor 4',
      unitId: office401._id,
      unitNumber: 'Suite 401',
      passCode: 'VP-AHCP2',
      visitorNumber: 'VIS-2026-005',
      visitorName: 'Varun Swaminathan',
      mobile: '+91 9741002233',
      visitorType: 'INTERVIEW_CANDIDATE',
      purpose: 'Senior Staff Architect Technical In-person Interview',
      numberOfVisitors: 1,
      hostType: 'TENANT_ADMIN',
      hostName: 'Pooja Hegde (Talent Acquisition)',
      expectedDate: new Date(),
      expectedTime: '14:00',
      expectedExitTime: '16:00',
      vehicleType: 'CAR',
      vehicleNumber: 'KA 03 HY 8820',
      parkingRequired: true,
      parkingSlot: 'Basement-2 Bay 45',
      idProofType: 'AADHAAR',
      idProofNumber: '6719',
      hostApprovalStatus: 'APPROVED',
      gatePassType: 'ONE_TIME',
      gatePassStatus: 'COMPLETED',
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=VP-AHCP2',
      checkInGate: 'North Plaza Gate 1',
      checkOutGate: 'North Plaza Gate 1',
      checkInTime: new Date(Date.now() - 18000000),
      checkOutTime: new Date(Date.now() - 7200000),
      visitDuration: '3 hrs',
      securityRemarks: 'Interview badge returned on exit',
      status: 'CHECKED_OUT',
      createdBy: commAdmin._id
    }
  ]);

  // 3. Coworking Visitors (InnoSpace)
  await Visitor.create([
    {
      organisationId: orgCowork._id,
      propertyId: propCowork._id,
      propertyType: 'COWORKING',
      propertyName: 'InnoSpace Cyber Gateway Hub',
      buildingId: bldgCowork._id,
      buildingName: 'Hub One',
      floorId: coworkFloor1._id,
      floorName: 'Flexi Open Floor & Café',
      unitId: hotDesk10._id,
      unitNumber: 'Desk-10',
      passCode: 'VP-INNO1',
      visitorNumber: 'VIS-2026-007',
      visitorName: 'Neha Bansal',
      mobile: '+91 9711882233',
      visitorType: 'MEETING_GUEST',
      purpose: 'Angel Investment Pitch & Product Demo',
      numberOfVisitors: 1,
      hostType: 'COWORKING_MEMBER',
      hostUserId: coworkMemberUser._id,
      hostName: 'Rohan Kapoor',
      companyName: 'Kapoor Product Labs',
      expectedDate: new Date(),
      expectedTime: '15:00',
      expectedExitTime: '16:30',
      vehicleType: 'CAR',
      vehicleNumber: 'TS 09 EZ 3311',
      parkingRequired: true,
      parkingSlot: 'CW-Valet-02',
      idProofType: 'AADHAAR',
      idProofNumber: '4190',
      hostApprovalStatus: 'APPROVED',
      gatePassType: 'ONE_TIME',
      gatePassStatus: 'COMPLETED',
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=VP-INNO1',
      checkInGate: 'Hub One Glass Lobby',
      checkOutGate: 'Hub One Glass Lobby',
      checkInTime: new Date(Date.now() - 10800000),
      checkOutTime: new Date(Date.now() - 3600000),
      visitDuration: '2 hrs',
      securityRemarks: 'Day guest pass issued',
      status: 'CHECKED_OUT',
      createdBy: coworkMemberUser._id
    },
    {
      organisationId: orgCowork._id,
      propertyId: propCowork._id,
      propertyType: 'COWORKING',
      propertyName: 'InnoSpace Cyber Gateway Hub',
      buildingId: bldgCowork._id,
      buildingName: 'Hub One',
      floorId: coworkFloor1._id,
      floorName: 'Flexi Open Floor & Café',
      unitId: confRoomUnit._id,
      unitNumber: 'Boardroom-A',
      passCode: 'VP-INNO2',
      visitorNumber: 'VIS-2026-008',
      visitorName: 'Aditya Mehra',
      mobile: '+91 9930441122',
      visitorType: 'TRAINING_PARTICIPANT',
      purpose: 'LLM Fine-tuning & Agentic Workshop',
      numberOfVisitors: 1,
      hostType: 'COWORKING_MEMBER',
      hostName: 'Zenith AI Team',
      expectedDate: new Date(),
      expectedTime: '14:00',
      expectedExitTime: '19:00',
      idProofType: 'DRIVING_LICENSE',
      idProofNumber: '7721',
      hostApprovalStatus: 'APPROVED',
      gatePassType: 'EVENT',
      gatePassStatus: 'ACTIVE',
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=VP-INNO2',
      checkInGate: 'Hub One Glass Lobby',
      checkInTime: new Date(Date.now() - 7200000),
      isOverstay: true,
      overstayDuration: '1 hr 15 min',
      securityRemarks: 'Workshop attendee registered',
      status: 'CHECKED_IN',
      createdBy: coworkAdmin._id
    }
  ]);

  // 4. Deliveries
  await Delivery.create([
    {
      organisationId: orgRes._id,
      propertyId: propRes._id,
      propertyName: 'Royal Palms Towers',
      buildingName: 'Tower A - Emerald',
      unitNumber: 'A-101',
      deliveryNumber: 'DEL-882101',
      deliveryPersonName: 'Imran Shaikh',
      mobile: '+91 9822113344',
      deliveryCompany: 'Swiggy Instamart',
      deliveryType: 'GROCERY',
      hostUserId: resUser._id,
      hostName: 'Amit Verma',
      vehicleNumber: 'MH 02 CK 9940',
      packageCount: 2,
      packageDescription: 'Groceries & Milk packet',
      otpCode: '5821',
      isOtpVerified: true,
      recipientConfirmation: true,
      deliveryStatus: 'HANDED_OVER',
      entryGate: 'Main Gate A',
      receivedBySecurityId: resSecurity._id
    },
    {
      organisationId: orgComm._id,
      propertyId: propComm._id,
      propertyName: 'Apex Horizon Cyber Park',
      buildingName: 'Tower Alpha',
      unitNumber: 'Suite 301',
      deliveryNumber: 'DEL-394821',
      deliveryPersonName: 'Ravi Kumar',
      mobile: '+91 9711002288',
      deliveryCompany: 'BlueDart Express',
      deliveryType: 'DOCUMENTS',
      hostUserId: commTenantUser._id,
      hostName: 'Sanjay Krishnan (Nexus Cloud)',
      packageCount: 1,
      packageDescription: 'Confidential Legal Contracts & Hardware Keys',
      otpCode: '9041',
      isOtpVerified: false,
      deliveryStatus: 'ARRIVED',
      entryGate: 'North Plaza Gate 1'
    }
  ]);

  // 5. Emergency Access Record
  await EmergencyAccess.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    propertyName: 'Royal Palms Towers',
    emergencyType: 'AMBULANCE',
    visitorName: 'Dr. Alok Sen & EMT Param Sharma',
    organisation: 'Kokilaben Dhirubhai Ambani Hospital Ambulance (MH 02 EQ 1080)',
    contactNumber: '+91 9820000108',
    emergencyReason: 'Medical Emergency assistance requested for resident',
    hostOrTargetUnit: 'Tower A - Flat A-101',
    entryGate: 'Main Gate A (Emergency Bypass)',
    allowedArea: 'Tower A Ground Lobby, Emergency Lift, Flat A-101',
    supervisorUserId: resAdmin._id,
    supervisorName: 'Rajesh Sharma',
    emergencyNotes: 'Immediate bypass approved by society president',
    status: 'ACTIVE'
  });

  // ==========================================
  // 6. PRODUCTION CCTV CAMERAS & SURVEILLANCE
  // ==========================================
  logger.info('Seeding Universal CCTV hardware, channels, rules, and live notifications...');

  const defaultEncryptedPassword = encryptCredentials('AdminCamera@2026');

  // Device 1: Residential Main Gate ANPR Camera (Hikvision)
  const cctvResMainGate = await CctvDevice.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    buildingId: bldgA._id,
    zoneId: 'MAIN_GATE',
    locationDescription: 'North Vehicle Ingress Gate 1',
    deviceType: 'CAMERA',
    cameraType: 'ANPR_LPR',
    name: 'Main Gate ANPR Bullet Cam #01',
    vendor: 'HIKVISION',
    model: 'iDS-2CD7A46G0/P-IZHS',
    firmwareVersion: 'V5.7.12_240815',
    serialNumber: 'DS7A46-2026-0811A',
    ipAddress: '192.168.1.101',
    httpPort: 80,
    httpsPort: 443,
    rtspPort: 554,
    onvifPort: 80,
    username: 'admin',
    credentialsEncrypted: defaultEncryptedPassword,
    protocol: 'ISAPI',
    capabilities: {
      onvifSupported: true,
      rtspSupported: true,
      vendorApiSupported: true,
      webhookSupported: true,
      ptzSupported: false,
      snapshotSupported: true,
      audioSupported: true,
      twoWayAudio: false,
      recordingSupported: false,
      storageStatusSupported: false,
      eventSubscriptionSupported: true,
      edgeAiSupported: true,
      anprSupported: true,
      faceRecognitionSupported: false,
      lineCrossingSupported: true,
      intrusionDetectionSupported: true,
      tamperDetectionSupported: true,
      thermalSupported: false
    },
    status: 'ONLINE',
    securityGroup: 'PERIMETER_GATE',
    createdBy: resAdmin._id
  });

  // Device 2: Residential Lift Lobby Dome (Axis)
  const cctvResLobby = await CctvDevice.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    buildingId: bldgA._id,
    floorId: floor1._id,
    zoneId: 'LOBBY',
    locationDescription: 'Tower A Ground Floor Lift Lobby',
    deviceType: 'CAMERA',
    cameraType: 'DOME',
    name: 'Tower A Ground Lobby Dome Cam',
    vendor: 'AXIS',
    model: 'AXIS M3216-LVE',
    firmwareVersion: '11.8.62',
    serialNumber: 'AXIS-M3216-9812',
    ipAddress: '192.168.1.102',
    httpPort: 80,
    httpsPort: 443,
    rtspPort: 554,
    onvifPort: 80,
    username: 'admin',
    credentialsEncrypted: defaultEncryptedPassword,
    protocol: 'VAPIX',
    capabilities: {
      onvifSupported: true,
      rtspSupported: true,
      vendorApiSupported: true,
      webhookSupported: true,
      ptzSupported: false,
      snapshotSupported: true,
      audioSupported: false,
      twoWayAudio: false,
      recordingSupported: false,
      storageStatusSupported: false,
      eventSubscriptionSupported: true,
      edgeAiSupported: true,
      anprSupported: false,
      faceRecognitionSupported: false,
      lineCrossingSupported: true,
      intrusionDetectionSupported: true,
      tamperDetectionSupported: true,
      thermalSupported: false
    },
    status: 'ONLINE',
    securityGroup: 'INDOOR_COMMON',
    createdBy: resAdmin._id
  });

  // Device 3: Commercial 16-Channel NVR (Dahua)
  const cctvCommNvr = await CctvDevice.create({
    organisationId: orgComm._id,
    propertyId: propComm._id,
    zoneId: 'SERVER_ROOM',
    locationDescription: 'Tech Horizon Central Security & Server Room B1',
    deviceType: 'NVR',
    cameraType: 'IP_CAMERA',
    name: 'Apex Central Enterprise NVR 16CH',
    vendor: 'DAHUA',
    model: 'NVR5216-16P-I/L',
    firmwareVersion: 'V4.002.0000000.1',
    serialNumber: 'DH-NVR5216-2026-X8',
    ipAddress: '192.168.10.200',
    httpPort: 80,
    httpsPort: 443,
    rtspPort: 554,
    onvifPort: 80,
    username: 'admin',
    credentialsEncrypted: defaultEncryptedPassword,
    protocol: 'DAHUA_RPC',
    totalChannels: 8,
    capabilities: {
      onvifSupported: true,
      rtspSupported: true,
      vendorApiSupported: true,
      webhookSupported: true,
      ptzSupported: false,
      snapshotSupported: true,
      audioSupported: true,
      twoWayAudio: true,
      recordingSupported: true,
      storageStatusSupported: true,
      eventSubscriptionSupported: true,
      edgeAiSupported: true,
      anprSupported: true,
      faceRecognitionSupported: true,
      lineCrossingSupported: true,
      intrusionDetectionSupported: true,
      tamperDetectionSupported: true,
      thermalSupported: false
    },
    status: 'ONLINE',
    securityGroup: 'INFRASTRUCTURE',
    createdBy: commAdmin._id
  });

  // Map NVR Channels for Commercial property
  await CctvChannel.create([
    {
      deviceId: cctvCommNvr._id,
      channelNumber: 1,
      channelName: 'Commercial Main Entrance Cam',
      cameraType: 'DOME',
      propertyId: propComm._id,
      zoneId: 'MAIN_ENTRANCE',
      locationDescription: 'Tower 1 Reception Ingress',
      onlineStatus: 'ONLINE'
    },
    {
      deviceId: cctvCommNvr._id,
      channelNumber: 2,
      channelName: 'Server Room Restricted Zone Cam',
      cameraType: 'DOME',
      propertyId: propComm._id,
      zoneId: 'SERVER_ROOM',
      locationDescription: 'Core Datacenter Rack Aisle',
      onlineStatus: 'ONLINE'
    },
    {
      deviceId: cctvCommNvr._id,
      channelNumber: 3,
      channelName: 'Loading & Logistics Bay Cam',
      cameraType: 'BULLET',
      propertyId: propComm._id,
      zoneId: 'LOADING_AREA',
      locationDescription: 'Rear Loading Dock Bay 1',
      onlineStatus: 'ONLINE'
    }
  ]);

  // Device 4: Coworking Cloud VMS Gateway Camera (Cloud)
  const cctvCoworkGate = await CctvDevice.create({
    organisationId: orgCowork._id,
    propertyId: propCowork._id,
    zoneId: 'RECEPTION',
    locationDescription: 'InnoSpace Hub Front Welcome Desk & Turnstile',
    deviceType: 'CLOUD_VMS',
    cameraType: 'EDGE_AI',
    name: 'InnoSpace Member Smart Gateway Cam',
    vendor: 'CLOUD',
    model: 'CloudEdge AI 4K',
    firmwareVersion: 'CloudOS-2.4.1',
    serialNumber: 'CLOUD-EDGE-90812',
    ipAddress: '192.168.20.50',
    httpPort: 443,
    httpsPort: 443,
    rtspPort: 554,
    onvifPort: 80,
    username: 'admin',
    credentialsEncrypted: defaultEncryptedPassword,
    protocol: 'CLOUD_REST',
    capabilities: {
      onvifSupported: false,
      rtspSupported: false,
      vendorApiSupported: true,
      webhookSupported: true,
      ptzSupported: false,
      snapshotSupported: true,
      audioSupported: true,
      twoWayAudio: false,
      recordingSupported: true,
      storageStatusSupported: true,
      eventSubscriptionSupported: true,
      edgeAiSupported: true,
      anprSupported: false,
      faceRecognitionSupported: true,
      lineCrossingSupported: true,
      intrusionDetectionSupported: true,
      tamperDetectionSupported: true,
      thermalSupported: false
    },
    status: 'ONLINE',
    securityGroup: 'MEMBER_SERVICES',
    createdBy: coworkAdmin._id
  });

  // Notification Rules
  await CctvNotificationRule.create([
    {
      organisationId: orgRes._id,
      propertyId: propRes._id,
      propertyType: 'RESIDENTIAL',
      ruleName: 'Residential Gate & Common Safety Rule',
      description: 'Residents receive Main Gate and Visitor alerts; restricted security zones suppressed.',
      targetZones: ['MAIN_GATE', 'VISITOR_GATE', 'DELIVERY_ENTRANCE', 'LOBBY'],
      eventTypes: ['ANPR.vehicle.detected', 'motion.detected', 'line.crossed', 'camera.tampered', 'camera.offline'],
      minSeverity: 'LOW',
      cooldownSeconds: 30,
      aggregationWindowSeconds: 60,
      allowResidentsPublicFeeds: true,
      allowResidentsPrivateFeeds: false,
      isActive: true
    },
    {
      organisationId: orgComm._id,
      propertyId: propComm._id,
      propertyType: 'COMMERCIAL',
      ruleName: 'Commercial Tenant Isolation & Security Rule',
      description: 'Tenant isolation enforced; server room restricted alerts route to facility & security staff only.',
      targetZones: ['MAIN_ENTRANCE', 'RECEPTION', 'SERVER_ROOM', 'LOADING_AREA'],
      eventTypes: ['intrusion.detected', 'line.crossed', 'camera.tampered', 'camera.offline', 'storage.full'],
      minSeverity: 'MEDIUM',
      cooldownSeconds: 30,
      aggregationWindowSeconds: 60,
      tenantIsolationEnabled: true,
      isActive: true
    },
    {
      organisationId: orgCowork._id,
      propertyId: propCowork._id,
      propertyType: 'COWORKING',
      ruleName: 'Coworking Member Access & Zone Rule',
      description: 'Shared reception and lounge alerts permitted; private cabins isolated to assigned occupants.',
      targetZones: ['RECEPTION', 'SHARED_WORKSPACE', 'PANTRY', 'PRIVATE_CABIN'],
      eventTypes: ['person.detected', 'access.denied', 'camera.offline', 'camera.tampered'],
      minSeverity: 'LOW',
      cooldownSeconds: 30,
      aggregationWindowSeconds: 60,
      memberCabinIsolationEnabled: true,
      isActive: true
    }
  ]);

  // Escalation Rules
  await CctvEscalationRule.create([
    {
      organisationId: orgRes._id,
      propertyId: propRes._id,
      propertyType: 'RESIDENTIAL',
      ruleName: 'Residential Gate Security Escalation',
      minSeverity: 'HIGH',
      isActive: true,
      levels: [
        { level: 1, roleTargeted: 'SECURITY_GUARD', timeoutMinutes: 5, notifyPush: true },
        { level: 2, roleTargeted: 'FACILITY_MANAGER', timeoutMinutes: 10, notifyPush: true, notifySms: true },
        { level: 3, roleTargeted: 'PROPERTY_MANAGER', timeoutMinutes: 15, notifyPush: true, notifyEmail: true },
        { level: 4, roleTargeted: 'ORGANISATION_OWNER', timeoutMinutes: 20, notifyPush: true, notifyEmail: true, notifyWhatsApp: true }
      ]
    },
    {
      organisationId: orgComm._id,
      propertyId: propComm._id,
      propertyType: 'COMMERCIAL',
      ruleName: 'Commercial Critical Zone Escalation',
      minSeverity: 'HIGH',
      isActive: true,
      levels: [
        { level: 1, roleTargeted: 'SECURITY_GUARD', timeoutMinutes: 3, notifyPush: true },
        { level: 2, roleTargeted: 'PROPERTY_MANAGER', timeoutMinutes: 8, notifyPush: true, notifySms: true },
        { level: 3, roleTargeted: 'ORGANISATION_OWNER', timeoutMinutes: 15, notifyPush: true, notifyEmail: true }
      ]
    }
  ]);

  // Initial Production Normalized Events & Notifications
  // 1. ANPR Vehicle Detection at Residential Gate
  const event1 = await CctvEvent.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    buildingId: bldgA._id,
    zoneId: 'MAIN_GATE',
    cameraId: cctvResMainGate._id,
    vendor: 'HIKVISION',
    eventType: 'ANPR.vehicle.detected',
    eventSource: 'HIKVISION_ISAPI',
    severity: 'INFORMATIONAL',
    title: 'ANPR Vehicle Recognized: MH-04-AB-1234',
    message: 'Authorized resident vehicle MH-04-AB-1234 cleared at Main Gate 1',
    eventTime: new Date(Date.now() - 12 * 60 * 1000),
    receivedTime: new Date(Date.now() - 12 * 60 * 1000),
    confidence: 0.98,
    status: 'NOTIFIED',
    metadata: { licensePlate: 'MH-04-AB-1234', confidence: 0.98, lane: 'Lane 1 Ingress' }
  });

  await CctvNotification.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    buildingId: bldgA._id,
    zoneId: 'MAIN_GATE',
    cameraId: cctvResMainGate._id,
    eventId: event1._id,
    recipientUserId: resUser._id, // Amit Verma (Resident)
    recipientRoleId: 'RESIDENT',
    eventType: 'ANPR.vehicle.detected',
    severity: 'INFORMATIONAL',
    title: 'Your Vehicle Entered Main Gate',
    message: 'Vehicle MH-04-AB-1234 verified and entered through North Vehicle Gate 1',
    eventTime: event1.eventTime,
    receivedTime: event1.receivedTime,
    status: 'READ',
    readAt: new Date(Date.now() - 10 * 60 * 1000),
    aggregatedCount: 1,
    deepLink: `/cctv/alert/${event1._id}`
  });

  await CctvNotification.create({
    organisationId: orgRes._id,
    propertyId: propRes._id,
    buildingId: bldgA._id,
    zoneId: 'MAIN_GATE',
    cameraId: cctvResMainGate._id,
    eventId: event1._id,
    recipientUserId: resSecurity._id, // Security Guard
    recipientRoleId: 'SECURITY_GUARD',
    eventType: 'ANPR.vehicle.detected',
    severity: 'INFORMATIONAL',
    title: 'Vehicle Gate Clearance: MH-04-AB-1234',
    message: 'Vehicle MH-04-AB-1234 cleared barrier at North Ingress Gate 1',
    eventTime: event1.eventTime,
    receivedTime: event1.receivedTime,
    status: 'READ',
    aggregatedCount: 1,
    deepLink: `/cctv/alert/${event1._id}`
  });

  // 2. High Severity Line Crossing in Commercial Server Room (Routed only to Manager & Admin, NOT tenants!)
  const event2 = await CctvEvent.create({
    organisationId: orgComm._id,
    propertyId: propComm._id,
    zoneId: 'SERVER_ROOM',
    cameraId: cctvCommNvr._id,
    vendor: 'DAHUA',
    eventType: 'intrusion.detected',
    eventSource: 'DAHUA_API',
    severity: 'HIGH',
    title: 'Intrusion Alert: Core Server Room B1',
    message: 'Movement detected in restricted Server Datacenter outside operational hours',
    eventTime: new Date(Date.now() - 8 * 60 * 1000),
    receivedTime: new Date(Date.now() - 8 * 60 * 1000),
    confidence: 0.94,
    status: 'NOTIFIED',
    metadata: { zone: 'RESTRICTED_DATACENTER_B1', sensor: 'IVS-Tripwire-02' }
  });

  await CctvNotification.create({
    organisationId: orgComm._id,
    propertyId: propComm._id,
    zoneId: 'SERVER_ROOM',
    cameraId: cctvCommNvr._id,
    eventId: event2._id,
    recipientUserId: commAdmin._id, // Vikramaditya Rao (Commercial Manager)
    recipientRoleId: 'ORGANISATION_OWNER',
    eventType: 'intrusion.detected',
    severity: 'HIGH',
    title: 'Intrusion Alert: Core Server Room B1',
    message: 'Movement detected in restricted Server Datacenter outside operational hours',
    eventTime: event2.eventTime,
    receivedTime: event2.receivedTime,
    status: 'UNREAD',
    requiresAcknowledgement: true,
    aggregatedCount: 1,
    deepLink: `/cctv/alert/${event2._id}`
  });

  // 3. Coworking Reception Turnstile Member Arrival
  const event3 = await CctvEvent.create({
    organisationId: orgCowork._id,
    propertyId: propCowork._id,
    zoneId: 'RECEPTION',
    cameraId: cctvCoworkGate._id,
    vendor: 'CLOUD',
    eventType: 'person.detected',
    eventSource: 'CLOUD_VMS',
    severity: 'LOW',
    title: 'Member Arrival: InnoSpace Hub Entrance',
    message: 'Turnstile access triggered by member at Smart Gateway Turnstile',
    eventTime: new Date(Date.now() - 4 * 60 * 1000),
    receivedTime: new Date(Date.now() - 4 * 60 * 1000),
    confidence: 0.99,
    status: 'NOTIFIED',
    metadata: { turnstileId: 'TS-01-ENTRY' }
  });

  await CctvNotification.create({
    organisationId: orgCowork._id,
    propertyId: propCowork._id,
    zoneId: 'RECEPTION',
    cameraId: cctvCoworkGate._id,
    eventId: event3._id,
    recipientUserId: coworkAdmin._id,
    recipientRoleId: 'ORGANISATION_OWNER',
    eventType: 'person.detected',
    severity: 'LOW',
    title: 'Member Arrival: InnoSpace Hub Entrance',
    message: 'Turnstile access triggered by member at Smart Gateway Turnstile',
    eventTime: event3.eventTime,
    receivedTime: event3.receivedTime,
    status: 'UNREAD',
    aggregatedCount: 1,
    deepLink: `/cctv/alert/${event3._id}`
  });

  // Seed initial audit log
  await CctvAuditLog.create([
    {
      organisationId: orgRes._id,
      propertyId: propRes._id,
      userId: resAdmin._id,
      action: 'DEVICE_REGISTERED',
      deviceId: cctvResMainGate._id,
      details: { name: cctvResMainGate.name, vendor: 'HIKVISION' }
    },
    {
      organisationId: orgComm._id,
      propertyId: propComm._id,
      userId: commAdmin._id,
      action: 'DEVICE_REGISTERED',
      deviceId: cctvCommNvr._id,
      details: { name: cctvCommNvr.name, vendor: 'DAHUA' }
    }
  ]);

  logger.info('===========================================================');
  logger.info(' SPEED DATABASE SEED COMPLETED SUCCESSFULLY!');
  logger.info(' Pre-seeded Accounts (Password for all accounts: Password@123):');
  logger.info(' 1. Super Admin (Platform Owner):    superadmin@pms.com');
  logger.info(' 2. Royal Palms (Residential Owner): admin@royalpalms.com');
  logger.info(' 3. Royal Palms (Resident):          resident@royalpalms.com');
  logger.info(' 4. Royal Palms (Security Guard):    security@royalpalms.com');
  logger.info(' 5. Apex Horizon (Commercial Owner): tech@apextech.com');
  logger.info(' 6. Nexus Cloud (Commercial Tenant): tenant@nexuscloud.com');
  logger.info(' 7. InnoSpace (Coworking Owner):     cowork@innospace.com');
  logger.info(' 8. InnoSpace (Coworking Member):    member@innospace.com');
  logger.info('===========================================================');
};

if (require.main === module) {
  const { connectDB, disconnectDB } = require('./connection');
  (async () => {
    try {
      await connectDB();
      await runFullSeed();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('Seed error:', err);
      process.exit(1);
    }
  })();
}

module.exports = { seedDataIfEmpty, runFullSeed };

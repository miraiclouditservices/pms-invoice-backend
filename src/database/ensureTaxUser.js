const User = require('../models/User');
const Organisation = require('../models/Organisation');
const Property = require('../models/Property');
const logger = require('../config/logger');

const TAX_USER_EMAIL = 'billing@pms.com';
const TAX_USER_PASSWORD = 'Password@123';

const ensureTaxInvoiceUser = async () => {
  try {
    let taxUser = await User.findOne({ email: TAX_USER_EMAIL });

    // Fetch primary organisation (or Royal Palms)
    const org = await Organisation.findOne().sort({ createdAt: 1 });
    const prop = org ? await Property.findOne({ organisationId: org._id }) : null;

    if (!taxUser) {
      taxUser = await User.create({
        firstName: 'Tax & Invoicing',
        lastName: 'Manager',
        email: TAX_USER_EMAIL,
        mobile: '+91 98760 12345',
        password: TAX_USER_PASSWORD,
        isPlatformAdmin: false,
        organisationId: org ? org._id : null,
        propertyId: prop ? prop._id : null,
        primaryRole: 'TAX_INVOICE_USER',
        status: 'ACTIVE'
      });
      logger.info(`[Auth] Created dedicated Tax Invoice User: ${TAX_USER_EMAIL} with role TAX_INVOICE_USER`);
    } else {
      // Ensure role and active status
      let updated = false;
      if (taxUser.primaryRole !== 'TAX_INVOICE_USER') {
        taxUser.primaryRole = 'TAX_INVOICE_USER';
        updated = true;
      }
      if (org && (!taxUser.organisationId || taxUser.organisationId.toString() !== org._id.toString())) {
        taxUser.organisationId = org._id;
        updated = true;
      }
      if (prop && (!taxUser.propertyId || taxUser.propertyId.toString() !== prop._id.toString())) {
        taxUser.propertyId = prop._id;
        updated = true;
      }
      if (taxUser.status !== 'ACTIVE') {
        taxUser.status = 'ACTIVE';
        updated = true;
      }
      if (updated) {
        await taxUser.save();
        logger.info(`[Auth] Updated existing dedicated Tax Invoice User: ${TAX_USER_EMAIL}`);
      }
    }
    return taxUser;
  } catch (error) {
    logger.error('Error ensuring dedicated Tax Invoice user: %o', error);
  }
};

module.exports = { ensureTaxInvoiceUser, TAX_USER_EMAIL, TAX_USER_PASSWORD };

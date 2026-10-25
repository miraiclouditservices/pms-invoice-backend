const mongoose = require('mongoose');
require('dotenv').config();
const TaxBusinessProfile = require('../src/models/TaxBusinessProfile');
const TaxInvoice = require('../src/models/TaxInvoice');

const miraiProfile = {
  legalName: 'MIRAI CLOUD IT SERVICES',
  displayName: 'MIRAI CLOUD IT SERVICES',
  address: 'Kalki chambers A Block 108, NH 65, widia colony Miyapur',
  city: 'Hyderabad',
  state: 'Telangana',
  stateCode: '36',
  postalCode: '502032',
  country: 'India',
  email: 'info@miraiclouditservices.com',
  phone: '+91 91002 18218',
  gstin: '36ACDFM4606M1Z1',
  pan: 'ACDFM4606M',
  logoUrl: '/landing/mirai_logo.png',
  bankDetails: {
    bankName: 'IDFC FIRST',
    branch: 'KAVURI HILLS, HYDERABAD',
    accountNumber: '10228801226',
    ifscCode: 'IDFB0080231',
    accountHolderName: 'MIRAI CLOUD IT SERVICES',
    showOnInvoice: true
  },
  authorizedSignatory: {
    name: 'Authorized Signatory',
    designation: 'Mirai Cloud IT Services',
    signatureUrl: ''
  }
};

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pms_db');
    console.log('Connected to MongoDB');

    // 1. Update all TaxBusinessProfile documents
    const profileRes = await TaxBusinessProfile.updateMany({}, { $set: miraiProfile });
    console.log('Updated TaxBusinessProfile count:', profileRes.modifiedCount);

    // 2. Update all existing TaxInvoice business snapshots
    const invRes = await TaxInvoice.updateMany({}, { $set: { businessSnapshot: miraiProfile } });
    console.log('Updated TaxInvoice snapshots count:', invRes.modifiedCount);

    console.log('Successfully updated all invoice business details and bank credentials!');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

run();

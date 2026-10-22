const TaxBusinessProfile = require('../models/TaxBusinessProfile');
const TaxCustomer = require('../models/TaxCustomer');
const TaxInvoice = require('../models/TaxInvoice');
const TaxPaymentTransaction = require('../models/TaxPaymentTransaction');
const TaxEmailLog = require('../models/TaxEmailLog');
const { calculateInvoice } = require('../services/taxInvoiceCalculationService');
const { generateNextInvoiceNumber, peekNextInvoiceNumber } = require('../services/taxInvoiceNumberService');
const { generateTaxInvoicePdf } = require('../services/taxInvoicePdfService');
const { createPaymentLink, getPaymentLinkDetails } = require('../services/cashfreePaymentService');
const { sendInvoiceIssuedEmail, sendPaymentReminderEmail } = require('../services/taxInvoiceEmailService');
const { sendSuccess, sendError } = require('../utils/responseFormatter');
const logger = require('../config/logger');

// --- BUSINESS PROFILE ---

const getBusinessProfile = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId;
    if (!orgId) return sendError(res, 'Organisation context required', 400);

    let profile = await TaxBusinessProfile.findOne({ organisationId: orgId });
    if (!profile) {
      // Auto-initialize with default structure if not yet set
      profile = await TaxBusinessProfile.create({
        organisationId: orgId,
        legalName: 'Mirai Cloud Technologies Private Limited',
        displayName: 'Mirai PMS',
        address: 'Suite 401, Tech Park Avenue',
        city: 'Mumbai',
        state: 'Maharashtra',
        stateCode: '27',
        postalCode: '400001',
        country: 'India',
        email: 'billing@miraiapps.com',
        phone: '+91 98765 43210',
        gstin: '27AABCM1234F1Z5',
        pan: 'AABCM1234F',
        bankDetails: {
          bankName: 'HDFC Bank Ltd',
          branch: 'Fort, Mumbai',
          accountNumber: '50200012345678',
          ifscCode: 'HDFC0000060',
          accountHolderName: 'Mirai Cloud Technologies Pvt Ltd',
          showOnInvoice: true
        }
      });
    }

    return sendSuccess(res, 'Business profile fetched', profile);
  } catch (err) {
    logger.error('Error fetching business profile: %s', err.message);
    return sendError(res, err.message, 500);
  }
};

const updateBusinessProfile = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId;
    if (!orgId) return sendError(res, 'Organisation context required', 400);

    const updated = await TaxBusinessProfile.findOneAndUpdate(
      { organisationId: orgId },
      { ...req.body, organisationId: orgId },
      { new: true, upsert: true, runValidators: true }
    );

    return sendSuccess(res, 'Business profile updated successfully', updated);
  } catch (err) {
    logger.error('Error updating business profile: %s', err.message);
    return sendError(res, err.message, 500);
  }
};

// --- CUSTOMERS ---

const listCustomers = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId;
    const { search } = req.query;

    const filter = { organisationId: orgId, isDeleted: false };
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const customers = await TaxCustomer.find(filter).sort({ customerName: 1 });
    return sendSuccess(res, 'Customers fetched', customers);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const createCustomer = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId;
    const { customerName, email, phone, billingAddress, city, state, stateCode, postalCode } = req.body;

    if (!customerName || !email || !phone || !billingAddress || !city || !state || !postalCode) {
      return sendError(res, 'Customer name, email, phone, and complete billing address are required.', 400);
    }

    const customer = await TaxCustomer.create({
      ...req.body,
      organisationId: orgId
    });

    return sendSuccess(res, 'Customer created successfully', customer, null, 201);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const getCustomer = async (req, res) => {
  try {
    const customer = await TaxCustomer.findOne({ _id: req.params.id, organisationId: req.currentOrganisationId });
    if (!customer) return sendError(res, 'Customer not found', 404);
    return sendSuccess(res, 'Customer fetched', customer);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const updateCustomer = async (req, res) => {
  try {
    const customer = await TaxCustomer.findOneAndUpdate(
      { _id: req.params.id, organisationId: req.currentOrganisationId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!customer) return sendError(res, 'Customer not found', 404);
    return sendSuccess(res, 'Customer updated successfully', customer);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// --- INVOICES ---

const getInvoiceStats = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId;
    const filter = { organisationId: orgId, isDeleted: false };

    const invoices = await TaxInvoice.find(filter);
    const payments = await TaxPaymentTransaction.find({ organisationId: orgId });
    const failedEmails = await TaxEmailLog.find({ organisationId: orgId, status: 'FAILED' });

    let totalInvoicedAmount = 0;
    let amountCollected = 0;
    let outstandingAmount = 0;
    let overdueAmount = 0;
    let partiallyPaidAmount = 0;

    const now = new Date();

    invoices.forEach(inv => {
      if (inv.invoiceStatus !== 'CANCELLED') {
        totalInvoicedAmount += inv.grandTotal || 0;
        amountCollected += inv.amountPaid || 0;
        outstandingAmount += inv.balanceDue || 0;

        if (inv.dueDate && new Date(inv.dueDate) < now && inv.balanceDue > 0) {
          overdueAmount += inv.balanceDue;
        }

        if (inv.paymentStatus === 'PARTIALLY_PAID') {
          partiallyPaidAmount += inv.balanceDue;
        }
      }
    });

    const successfulPayments = payments.filter(p => p.paymentStatus === 'SUCCESS').length;
    const failedPayments = payments.filter(p => ['FAILED', 'USER_DROPPED'].includes(p.paymentStatus)).length;

    const recentInvoices = await TaxInvoice.find(filter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('customerId', 'customerName email companyName');

    const recentPayments = await TaxPaymentTransaction.find({ organisationId: orgId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('invoiceId', 'invoiceNumber grandTotal');

    return sendSuccess(res, 'Dashboard stats fetched', {
      totalInvoices: invoices.length,
      totalInvoicedAmount,
      amountCollected,
      outstandingAmount,
      overdueAmount,
      partiallyPaidAmount,
      successfulPayments,
      failedPayments,
      failedEmailCount: failedEmails.length,
      recentInvoices,
      recentPayments
    });
  } catch (err) {
    logger.error('Error fetching invoice stats: %s', err.message);
    return sendError(res, err.message, 500);
  }
};

const listInvoices = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId;
    const { 
      search, 
      invoiceStatus, 
      paymentStatus, 
      customerId, 
      startDate, 
      endDate, 
      isOverdue,
      page = 1, 
      limit = 20 
    } = req.query;

    const filter = { organisationId: orgId, isDeleted: false };

    if (invoiceStatus) filter.invoiceStatus = invoiceStatus;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (customerId) filter.customerId = customerId;

    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'customerSnapshot.customerName': { $regex: search, $options: 'i' } },
        { 'customerSnapshot.companyName': { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) filter.invoiceDate.$gte = new Date(startDate);
      if (endDate) filter.invoiceDate.$lte = new Date(endDate);
    }

    if (isOverdue === 'true') {
      filter.dueDate = { $lt: new Date() };
      filter.balanceDue = { $gt: 0 };
      filter.invoiceStatus = { $ne: 'CANCELLED' };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await TaxInvoice.countDocuments(filter);

    const invoices = await TaxInvoice.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('customerId', 'customerName email companyName phone');

    return sendSuccess(res, 'Invoices fetched', invoices, {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const getInvoice = async (req, res) => {
  try {
    const invoice = await TaxInvoice.findOne({ 
      _id: req.params.id, 
      organisationId: req.currentOrganisationId,
      isDeleted: false 
    }).populate('customerId');

    if (!invoice) return sendError(res, 'Invoice not found', 404);

    return sendSuccess(res, 'Invoice fetched', invoice);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const createInvoice = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId;
    const userId = req.user?._id;
    const {
      customerId,
      invoiceDate = new Date(),
      dueDate,
      taxTreatment = 'INTRA_STATE',
      lineItems = [],
      otherCharges = 0,
      notes = '',
      termsAndConditions,
      placeOfSupply,
      customerRefNumber,
      poNumber,
      status = 'DRAFT'
    } = req.body;

    // Fetch Business Profile
    const bizProfile = await TaxBusinessProfile.findOne({ organisationId: orgId });
    if (!bizProfile) {
      return sendError(res, 'Business profile not configured. Please complete Business Invoice Settings first.', 400);
    }

    // Fetch Customer
    const customer = await TaxCustomer.findOne({ _id: customerId, organisationId: orgId });
    if (!customer) {
      return sendError(res, 'Selected customer does not exist.', 400);
    }

    // Authoritative calculations on backend
    const calc = calculateInvoice({
      lineItems,
      taxTreatment,
      otherCharges: Number(otherCharges) || 0,
      enableRoundOff: bizProfile.taxConfiguration?.enableRoundOff !== false,
      amountPaid: 0
    });

    const calculatedDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + (bizProfile.defaultDueDays || 15) * 86400000);

    // Numbering: generate preview or real sequence
    const { invoiceNumber, financialYear } = await generateNextInvoiceNumber(
      orgId, 
      bizProfile.invoiceNumberPrefix, 
      bizProfile.financialYearConfiguration, 
      new Date(invoiceDate)
    );

    const businessSnapshot = {
      legalName: bizProfile.legalName,
      displayName: bizProfile.displayName,
      address: bizProfile.address,
      addressLine2: bizProfile.addressLine2,
      city: bizProfile.city,
      state: bizProfile.state,
      stateCode: bizProfile.stateCode,
      postalCode: bizProfile.postalCode,
      country: bizProfile.country,
      email: bizProfile.email,
      phone: bizProfile.phone,
      gstin: bizProfile.gstin,
      pan: bizProfile.pan,
      logoUrl: bizProfile.logoUrl,
      bankDetails: bizProfile.bankDetails,
      authorizedSignatory: bizProfile.authorizedSignatory
    };

    const customerSnapshot = {
      customerName: customer.customerName,
      companyName: customer.companyName,
      billingAddress: customer.billingAddress,
      city: customer.city,
      state: customer.state,
      stateCode: customer.stateCode,
      postalCode: customer.postalCode,
      country: customer.country,
      email: customer.email,
      phone: customer.phone,
      gstin: customer.gstin,
      pan: customer.pan
    };

    const invoice = await TaxInvoice.create({
      organisationId: orgId,
      invoiceNumber,
      financialYear,
      invoiceDate: new Date(invoiceDate),
      dueDate: calculatedDueDate,
      businessSnapshot,
      customerId: customer._id,
      customerSnapshot,
      lineItems: calc.lineItems,
      subtotal: calc.subtotal,
      discountTotal: calc.discountTotal,
      taxableAmount: calc.taxableAmount,
      cgstAmount: calc.cgstAmount,
      sgstAmount: calc.sgstAmount,
      igstAmount: calc.igstAmount,
      otherCharges: calc.otherCharges,
      roundOff: calc.roundOff,
      grandTotal: calc.grandTotal,
      amountPaid: 0,
      balanceDue: calc.balanceDue,
      amountInWords: calc.amountInWords,
      currency: bizProfile.currency || 'INR',
      taxTreatment,
      placeOfSupply: placeOfSupply || customer.state || bizProfile.state,
      customerRefNumber,
      poNumber,
      notes,
      termsAndConditions: termsAndConditions || bizProfile.defaultTerms,
      invoiceStatus: status === 'ISSUED' ? 'ISSUED' : 'DRAFT',
      paymentStatus: 'PENDING',
      emailStatus: 'NOT_SENT',
      createdBy: userId,
      issuedAt: status === 'ISSUED' ? new Date() : null,
      issuedBy: status === 'ISSUED' ? userId : null,
      auditHistory: [{
        action: status === 'ISSUED' ? 'INVOICE_CREATED_AND_ISSUED' : 'INVOICE_DRAFT_CREATED',
        performedBy: userId,
        performedByName: req.user?.fullName || 'User',
        details: { grandTotal: calc.grandTotal }
      }]
    });

    return sendSuccess(res, 'Invoice created successfully', invoice, null, 201);
  } catch (err) {
    logger.error('Error creating tax invoice: %s', err.message);
    return sendError(res, err.message, 400);
  }
};

const updateInvoice = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId;
    const invoice = await TaxInvoice.findOne({ _id: req.params.id, organisationId: orgId, isDeleted: false });

    if (!invoice) return sendError(res, 'Invoice not found', 404);
    if (invoice.invoiceStatus !== 'DRAFT') {
      return sendError(res, 'Only DRAFT invoices can be edited directly. Issued invoices are locked.', 400);
    }

    const {
      customerId,
      invoiceDate,
      dueDate,
      taxTreatment,
      lineItems,
      otherCharges,
      notes,
      termsAndConditions,
      placeOfSupply,
      customerRefNumber,
      poNumber
    } = req.body;

    let customerSnapshot = invoice.customerSnapshot;
    if (customerId && customerId !== invoice.customerId?.toString()) {
      const cust = await TaxCustomer.findOne({ _id: customerId, organisationId: orgId });
      if (cust) {
        invoice.customerId = cust._id;
        customerSnapshot = {
          customerName: cust.customerName,
          companyName: cust.companyName,
          billingAddress: cust.billingAddress,
          city: cust.city,
          state: cust.state,
          stateCode: cust.stateCode,
          postalCode: cust.postalCode,
          country: cust.country,
          email: cust.email,
          phone: cust.phone,
          gstin: cust.gstin,
          pan: cust.pan
        };
      }
    }

    const calc = calculateInvoice({
      lineItems: lineItems || invoice.lineItems,
      taxTreatment: taxTreatment || invoice.taxTreatment,
      otherCharges: otherCharges !== undefined ? Number(otherCharges) : invoice.otherCharges,
      amountPaid: invoice.amountPaid || 0
    });

    invoice.customerSnapshot = customerSnapshot;
    invoice.lineItems = calc.lineItems;
    invoice.subtotal = calc.subtotal;
    invoice.discountTotal = calc.discountTotal;
    invoice.taxableAmount = calc.taxableAmount;
    invoice.cgstAmount = calc.cgstAmount;
    invoice.sgstAmount = calc.sgstAmount;
    invoice.igstAmount = calc.igstAmount;
    invoice.otherCharges = calc.otherCharges;
    invoice.roundOff = calc.roundOff;
    invoice.grandTotal = calc.grandTotal;
    invoice.balanceDue = calc.balanceDue;
    invoice.amountInWords = calc.amountInWords;

    if (invoiceDate) invoice.invoiceDate = new Date(invoiceDate);
    if (dueDate) invoice.dueDate = new Date(dueDate);
    if (taxTreatment) invoice.taxTreatment = taxTreatment;
    if (placeOfSupply) invoice.placeOfSupply = placeOfSupply;
    if (notes !== undefined) invoice.notes = notes;
    if (termsAndConditions !== undefined) invoice.termsAndConditions = termsAndConditions;
    if (customerRefNumber !== undefined) invoice.customerRefNumber = customerRefNumber;
    if (poNumber !== undefined) invoice.poNumber = poNumber;

    invoice.auditHistory.push({
      action: 'INVOICE_UPDATED',
      performedBy: req.user?._id,
      performedByName: req.user?.fullName || 'User',
      details: { newGrandTotal: calc.grandTotal }
    });

    await invoice.save();

    return sendSuccess(res, 'Invoice updated successfully', invoice);
  } catch (err) {
    logger.error('Error updating invoice: %s', err.message);
    return sendError(res, err.message, 400);
  }
};

const issueInvoice = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId;
    const invoice = await TaxInvoice.findOne({ _id: req.params.id, organisationId: orgId, isDeleted: false });

    if (!invoice) return sendError(res, 'Invoice not found', 404);
    if (invoice.invoiceStatus === 'CANCELLED') {
      return sendError(res, 'Cannot issue a cancelled invoice', 400);
    }

    // Create Cashfree Payment Link if not existing or if balance changed
    if (!invoice.cashfreePaymentLink && invoice.balanceDue > 0) {
      const linkResult = await createPaymentLink({
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.balanceDue,
        currency: invoice.currency,
        customer: invoice.customerSnapshot,
        description: `Tax Invoice ${invoice.invoiceNumber}`
      });

      invoice.cashfreeLinkId = linkResult.linkId;
      invoice.cashfreePaymentLink = linkResult.paymentLink;
      invoice.paymentLinkExpiry = linkResult.expiryTime;
    }

    invoice.invoiceStatus = 'ISSUED';
    invoice.issuedAt = new Date();
    invoice.issuedBy = req.user?._id;

    invoice.auditHistory.push({
      action: 'INVOICE_ISSUED',
      performedBy: req.user?._id,
      performedByName: req.user?.fullName || 'User',
      details: { paymentLink: invoice.cashfreePaymentLink }
    });

    await invoice.save();

    return sendSuccess(res, 'Invoice issued successfully', invoice);
  } catch (err) {
    logger.error('Error issuing invoice: %s', err.message);
    return sendError(res, err.message, 500);
  }
};

const issueAndSendInvoice = async (req, res) => {
  try {
    const orgId = req.currentOrganisationId;
    const invoice = await TaxInvoice.findOne({ _id: req.params.id, organisationId: orgId, isDeleted: false });

    if (!invoice) return sendError(res, 'Invoice not found', 404);
    if (invoice.invoiceStatus === 'CANCELLED') {
      return sendError(res, 'Cannot issue a cancelled invoice', 400);
    }

    // 1. Generate Cashfree link if not already generated
    if (!invoice.cashfreePaymentLink && invoice.balanceDue > 0) {
      const linkResult = await createPaymentLink({
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.balanceDue,
        currency: invoice.currency,
        customer: invoice.customerSnapshot,
        description: `Tax Invoice ${invoice.invoiceNumber}`
      });

      invoice.cashfreeLinkId = linkResult.linkId;
      invoice.cashfreePaymentLink = linkResult.paymentLink;
      invoice.paymentLinkExpiry = linkResult.expiryTime;
    }

    invoice.invoiceStatus = 'ISSUED';
    invoice.issuedAt = new Date();
    invoice.issuedBy = req.user?._id;

    // 2. Generate PDF
    const pdfBuffer = await generateTaxInvoicePdf(invoice);

    // 3. Send Email with PDF attachment and Pay Now button
    try {
      await sendInvoiceIssuedEmail({ invoice, pdfBuffer });
      invoice.emailStatus = 'SENT';
    } catch (emailErr) {
      logger.error('Email sending failed during issueAndSend: %s', emailErr.message);
      invoice.emailStatus = 'FAILED';
    }

    invoice.auditHistory.push({
      action: 'INVOICE_ISSUED_AND_EMAILED',
      performedBy: req.user?._id,
      performedByName: req.user?.fullName || 'User',
      details: { emailStatus: invoice.emailStatus, cashfreeLinkId: invoice.cashfreeLinkId }
    });

    await invoice.save();

    return sendSuccess(res, 'Invoice issued and email processed', invoice);
  } catch (err) {
    logger.error('Error issuing and sending invoice: %s', err.message);
    return sendError(res, err.message, 500);
  }
};

const sendInvoiceEmailOnly = async (req, res) => {
  try {
    const invoice = await TaxInvoice.findOne({ _id: req.params.id, organisationId: req.currentOrganisationId });
    if (!invoice) return sendError(res, 'Invoice not found', 404);

    const pdfBuffer = await generateTaxInvoicePdf(invoice);
    await sendInvoiceIssuedEmail({ invoice, pdfBuffer });

    invoice.emailStatus = 'SENT';
    invoice.auditHistory.push({
      action: 'INVOICE_EMAIL_RESENT',
      performedBy: req.user?._id,
      performedByName: req.user?.fullName || 'User',
      timestamp: new Date()
    });
    await invoice.save();

    return sendSuccess(res, 'Invoice email sent successfully');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const sendReminder = async (req, res) => {
  try {
    const invoice = await TaxInvoice.findOne({ _id: req.params.id, organisationId: req.currentOrganisationId });
    if (!invoice) return sendError(res, 'Invoice not found', 404);

    if (invoice.balanceDue <= 0) {
      return sendError(res, 'Invoice is already paid in full.', 400);
    }

    // Cooldown check: 24 hours between reminders unless forced
    const now = new Date();
    if (invoice.lastReminderSentAt && (now - new Date(invoice.lastReminderSentAt)) < 24 * 60 * 60 * 1000) {
      return sendError(res, 'A reminder was sent within the last 24 hours. Please wait before sending another.', 429);
    }

    // Ensure valid payment link
    if (!invoice.cashfreePaymentLink) {
      const linkResult = await createPaymentLink({
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.balanceDue,
        currency: invoice.currency,
        customer: invoice.customerSnapshot,
        description: `Payment for ${invoice.invoiceNumber}`
      });
      invoice.cashfreeLinkId = linkResult.linkId;
      invoice.cashfreePaymentLink = linkResult.paymentLink;
    }

    const pdfBuffer = await generateTaxInvoicePdf(invoice);
    await sendPaymentReminderEmail({ invoice, pdfBuffer });

    invoice.lastReminderSentAt = now;
    invoice.reminderCount = (invoice.reminderCount || 0) + 1;
    invoice.auditHistory.push({
      action: 'PAYMENT_REMINDER_SENT',
      performedBy: req.user?._id,
      performedByName: req.user?.fullName || 'User',
      timestamp: now
    });
    await invoice.save();

    return sendSuccess(res, 'Payment reminder sent to customer');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const downloadPdf = async (req, res) => {
  try {
    const invoice = await TaxInvoice.findOne({ _id: req.params.id, organisationId: req.currentOrganisationId });
    if (!invoice) return sendError(res, 'Invoice not found', 404);

    const pdfBuffer = await generateTaxInvoicePdf(invoice);
    const filename = `${invoice.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    logger.error('Error generating PDF download: %s', err.message);
    return sendError(res, err.message, 500);
  }
};

const cancelInvoice = async (req, res) => {
  try {
    const { reason = 'Cancelled by administrator' } = req.body;
    const invoice = await TaxInvoice.findOne({ _id: req.params.id, organisationId: req.currentOrganisationId });

    if (!invoice) return sendError(res, 'Invoice not found', 404);
    if (invoice.amountPaid > 0) {
      return sendError(res, 'Cannot cancel an invoice with recorded payments. Please issue a credit note or refund.', 400);
    }

    invoice.invoiceStatus = 'CANCELLED';
    invoice.auditHistory.push({
      action: 'INVOICE_CANCELLED',
      performedBy: req.user?._id,
      performedByName: req.user?.fullName || 'User',
      details: { reason }
    });

    await invoice.save();

    return sendSuccess(res, 'Invoice cancelled successfully', invoice);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// --- PAYMENTS & EMAILS ---

const generatePaymentLinkManual = async (req, res) => {
  try {
    const invoice = await TaxInvoice.findOne({ _id: req.params.id, organisationId: req.currentOrganisationId });
    if (!invoice) return sendError(res, 'Invoice not found', 404);

    if (invoice.balanceDue <= 0) {
      return sendError(res, 'Invoice balance is zero. No payment link needed.', 400);
    }

    const linkResult = await createPaymentLink({
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.balanceDue,
      currency: invoice.currency,
      customer: invoice.customerSnapshot,
      description: `Payment for ${invoice.invoiceNumber}`
    });

    invoice.cashfreeLinkId = linkResult.linkId;
    invoice.cashfreePaymentLink = linkResult.paymentLink;
    invoice.paymentLinkExpiry = linkResult.expiryTime;
    await invoice.save();

    return sendSuccess(res, 'Payment link generated', {
      paymentLink: invoice.cashfreePaymentLink,
      linkId: invoice.cashfreeLinkId
    });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const listInvoicePayments = async (req, res) => {
  try {
    const payments = await TaxPaymentTransaction.find({
      invoiceId: req.params.id,
      organisationId: req.currentOrganisationId
    }).sort({ createdAt: -1 });

    return sendSuccess(res, 'Payments fetched', payments);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const listAllPayments = async (req, res) => {
  try {
    const payments = await TaxPaymentTransaction.find({
      organisationId: req.currentOrganisationId
    })
      .sort({ createdAt: -1 })
      .populate('invoiceId', 'invoiceNumber grandTotal customerSnapshot balanceDue');

    return sendSuccess(res, 'Transactions fetched', payments);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const listInvoiceEmails = async (req, res) => {
  try {
    const logs = await TaxEmailLog.find({
      invoiceId: req.params.id,
      organisationId: req.currentOrganisationId
    }).sort({ createdAt: -1 });

    return sendSuccess(res, 'Email history fetched', logs);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const listAllEmailLogs = async (req, res) => {
  try {
    const logs = await TaxEmailLog.find({
      organisationId: req.currentOrganisationId
    })
      .sort({ createdAt: -1 })
      .populate('invoiceId', 'invoiceNumber customerSnapshot');

    return sendSuccess(res, 'All email logs fetched', logs);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// Public Endpoint to view invoice for Payment Page
const getPublicInvoiceForPay = async (req, res) => {
  try {
    const invoice = await TaxInvoice.findById(req.params.id);
    if (!invoice || invoice.isDeleted) {
      return sendError(res, 'Invoice not found', 404);
    }

    return sendSuccess(res, 'Public invoice data', {
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      businessSnapshot: {
        legalName: invoice.businessSnapshot?.legalName,
        displayName: invoice.businessSnapshot?.displayName,
        email: invoice.businessSnapshot?.email,
        phone: invoice.businessSnapshot?.phone,
        gstin: invoice.businessSnapshot?.gstin
      },
      customerSnapshot: {
        customerName: invoice.customerSnapshot?.customerName,
        companyName: invoice.customerSnapshot?.companyName,
        email: invoice.customerSnapshot?.email,
        phone: invoice.customerSnapshot?.phone
      },
      lineItems: invoice.lineItems,
      grandTotal: invoice.grandTotal,
      amountPaid: invoice.amountPaid,
      balanceDue: invoice.balanceDue,
      amountInWords: invoice.amountInWords,
      currency: invoice.currency,
      invoiceStatus: invoice.invoiceStatus,
      paymentStatus: invoice.paymentStatus,
      cashfreePaymentLink: invoice.cashfreePaymentLink
    });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

module.exports = {
  getBusinessProfile,
  updateBusinessProfile,
  listCustomers,
  createCustomer,
  getCustomer,
  updateCustomer,
  getInvoiceStats,
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  issueInvoice,
  issueAndSendInvoice,
  sendInvoiceEmailOnly,
  sendReminder,
  downloadPdf,
  cancelInvoice,
  generatePaymentLinkManual,
  listInvoicePayments,
  listAllPayments,
  listInvoiceEmails,
  listAllEmailLogs,
  getPublicInvoiceForPay
};

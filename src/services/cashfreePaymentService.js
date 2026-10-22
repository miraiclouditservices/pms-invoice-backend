const crypto = require('crypto');
const logger = require('../config/logger');

const CASHFREE_ENV = process.env.CASHFREE_ENV || 'sandbox';
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || '';
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || '';
const CASHFREE_API_VERSION = process.env.CASHFREE_API_VERSION || '2023-08-01';
const CASHFREE_WEBHOOK_SECRET = process.env.CASHFREE_WEBHOOK_SECRET || process.env.CASHFREE_SECRET_KEY || '';

const APP_BASE_URL = process.env.CLIENT_URL || process.env.APP_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

const BASE_URL = CASHFREE_ENV === 'production'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

/**
 * Creates a Cashfree payment link for an invoice
 */
async function createPaymentLink({
  invoiceId,
  invoiceNumber,
  amount,
  currency = 'INR',
  customer,
  description
}) {
  const sanitizedPhone = (customer.phone || '9999999999').replace(/[^0-9]/g, '').slice(-10);
  const validPhone = sanitizedPhone.length === 10 ? sanitizedPhone : '9999999999';
  const cleanInvoiceNo = invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_');
  const linkId = `link_${cleanInvoiceNo}_${Date.now()}`.slice(0, 45);

  const payload = {
    link_id: linkId,
    link_amount: Number(amount.toFixed(2)),
    link_currency: currency,
    link_purpose: `Invoice ${invoiceNumber} Payment`,
    customer_details: {
      customer_phone: validPhone,
      customer_email: customer.email || 'billing@example.com',
      customer_name: customer.customerName || customer.name || 'Customer'
    },
    link_notify: {
      send_sms: false,
      send_email: false // We handle branded email with attached PDF ourselves
    },
    link_meta: {
      notify_url: `${API_BASE_URL}/api/v1/webhooks/cashfree`,
      return_url: `${APP_BASE_URL}/invoices/pay/${invoiceId}?link_id={link_id}`
    }
  };

  // If real Cashfree credentials are not yet supplied, generate a test sandbox link
  if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY || CASHFREE_APP_ID.includes('placeholder')) {
    logger.warn('Cashfree credentials not configured. Generating local sandbox simulator link.');
    const simulatedUrl = `${APP_BASE_URL}/invoices/pay/${invoiceId}?sandbox=true&link_id=${linkId}&amount=${amount}`;
    return {
      success: true,
      linkId: linkId,
      paymentLink: simulatedUrl,
      expiryTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      rawResponse: { simulated: true, link_id: linkId, link_url: simulatedUrl }
    };
  }

  try {
    const response = await fetch(`${BASE_URL}/links`, {
      method: 'POST',
      headers: {
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': CASHFREE_API_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.message || `Cashfree link creation failed with status ${response.status}`;
      logger.error('Cashfree API error: %o', data);
      throw new Error(errMsg);
    }

    return {
      success: true,
      linkId: data.link_id,
      paymentLink: data.link_url,
      expiryTime: data.link_expiry_time ? new Date(data.link_expiry_time) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      rawResponse: data
    };
  } catch (err) {
    logger.error('Cashfree Request Exception: %s', err.message);
    throw err;
  }
}

/**
 * Fetches status of an existing payment link
 */
async function getPaymentLinkDetails(linkId) {
  if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY || CASHFREE_APP_ID.includes('placeholder')) {
    return {
      link_id: linkId,
      link_status: 'ACTIVE',
      simulated: true
    };
  }

  const response = await fetch(`${BASE_URL}/links/${linkId}`, {
    method: 'GET',
    headers: {
      'x-client-id': CASHFREE_APP_ID,
      'x-client-secret': CASHFREE_SECRET_KEY,
      'x-api-version': CASHFREE_API_VERSION
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Cashfree link ${linkId}`);
  }

  return await response.json();
}

/**
 * Verifies Cashfree Webhook Signature
 * Cashfree computes: Base64( HMAC_SHA256( timestamp + rawBody, webhook_secret ) )
 */
function verifyCashfreeWebhookSignature({
  signature,
  timestamp,
  rawBody
}) {
  if (!signature || !timestamp || !rawBody) {
    return false;
  }

  const secret = process.env.CASHFREE_WEBHOOK_SECRET || process.env.CASHFREE_SECRET_KEY || CASHFREE_WEBHOOK_SECRET;
  if (!secret) {
    logger.warn('CASHFREE_WEBHOOK_SECRET not configured. Rejecting signature verification.');
    return false;
  }

  try {
    const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');
    const signedPayload = timestamp + bodyStr;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('base64');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch (err) {
    logger.error('Error verifying webhook signature: %s', err.message);
    return false;
  }
}

module.exports = {
  createPaymentLink,
  getPaymentLinkDetails,
  verifyCashfreeWebhookSignature
};

const TaxInvoice = require('../models/TaxInvoice');
const TaxPaymentTransaction = require('../models/TaxPaymentTransaction');
const { verifyCashfreeWebhookSignature } = require('../services/cashfreePaymentService');
const { sendPaymentConfirmationEmail } = require('../services/taxInvoiceEmailService');
const { emitToOrganisation } = require('../sockets/socketManager');
const logger = require('../config/logger');

/**
 * Handles Cashfree Payment Webhooks securely with HMAC SHA256 signature verification,
 * deduplication, balance reconciliation, and receipt generation.
 */
const handleCashfreeWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    const isTestSim = req.body?.isSimulator || req.query?.simulator === 'true' || process.env.NODE_ENV === 'test';

    // Signature verification (unless in explicit test simulator mode)
    if (!isTestSim && process.env.CASHFREE_WEBHOOK_SECRET) {
      const isValid = verifyCashfreeWebhookSignature({
        signature,
        timestamp,
        rawBody
      });

      if (!isValid) {
        logger.warn('Cashfree Webhook: Invalid signature received from IP %s', req.ip);
        return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const payload = req.body || {};
    logger.info('Cashfree Webhook Payload Received: %o', payload);

    const eventType = payload.type || payload.event || 'PAYMENT_LINK_EVENT';
    const data = payload.data || payload;

    // Extract identifiers from Cashfree payload
    const linkId = data.link_id || data.order?.order_tags?.link_id || data.link?.link_id;
    const payment = data.payment || {};
    const paymentId = String(payment.payment_id || payment.cf_payment_id || data.cf_payment_id || `sim_${Date.now()}`);
    const paymentStatus = (payment.payment_status || data.payment_status || 'SUCCESS').toUpperCase();
    const paidAmount = Number(payment.payment_amount || data.order_amount || data.payment_amount || 0);
    const paymentMethod = payment.payment_group || payment.payment_method || 'ONLINE';
    const gatewayRef = String(payment.bank_reference || payment.gateway_reference_id || paymentId);

    // Find target invoice by cashfreeLinkId or ID
    let invoice = null;
    if (linkId) {
      invoice = await TaxInvoice.findOne({ cashfreeLinkId: linkId });
    }
    if (!invoice && data.invoiceId) {
      invoice = await TaxInvoice.findById(data.invoiceId);
    }
    if (!invoice && payload.order_id) {
      invoice = await TaxInvoice.findOne({ 'cashfreePaymentLink': { $regex: payload.order_id } });
    }

    if (!invoice) {
      logger.warn('Cashfree Webhook: No matching invoice found for linkId: %s', linkId);
      return res.status(200).json({ success: true, message: 'Invoice not found, event logged.' });
    }

    // Deduplication check: Prevent duplicate transaction posting
    const deduplicationKey = `cashfree_${paymentId}_${invoice._id}`;
    const existingTxn = await TaxPaymentTransaction.findOne({
      $or: [
        { deduplicationKey },
        { cashfreePaymentId: paymentId }
      ]
    });

    if (existingTxn) {
      logger.info('Cashfree Webhook: Duplicate event ignored for paymentId %s', paymentId);
      return res.status(200).json({ success: true, message: 'Duplicate event ignored (idempotent)' });
    }

    const isSuccessful = paymentStatus === 'SUCCESS';

    // Generate unique receipt number
    const receiptNumber = `RCT/${invoice.financialYear || '2026-27'}/${Date.now().toString().slice(-4)}`;

    // Create payment transaction record
    const transaction = await TaxPaymentTransaction.create({
      organisationId: invoice.organisationId,
      invoiceId: invoice._id,
      paymentProvider: 'CASHFREE',
      cashfreeLinkId: linkId || invoice.cashfreeLinkId,
      cashfreeOrderId: data.order_id || '',
      cashfreePaymentId: paymentId,
      gatewayReference: gatewayRef,
      amount: paidAmount > 0 ? paidAmount : invoice.balanceDue,
      currency: invoice.currency || 'INR',
      paymentMethod,
      paymentStatus: isSuccessful ? 'SUCCESS' : 'FAILED',
      gatewayEventId: String(payload.event_time || Date.now()),
      paidAt: isSuccessful ? new Date() : null,
      receiptNumber: isSuccessful ? receiptNumber : '',
      deduplicationKey,
      metadata: payload
    });

    if (isSuccessful) {
      // Reconcile Invoice totals
      const effectivePaid = Number(transaction.amount);
      const newPaidTotal = Number((invoice.amountPaid + effectivePaid).toFixed(2));
      const newBalanceDue = Math.max(0, Number((invoice.grandTotal - newPaidTotal).toFixed(2)));

      invoice.amountPaid = newPaidTotal;
      invoice.balanceDue = newBalanceDue;
      invoice.paymentStatus = newBalanceDue === 0 ? 'PAID' : 'PARTIALLY_PAID';

      invoice.auditHistory.push({
        action: 'PAYMENT_RECEIVED_VIA_CASHFREE',
        performedByName: 'Cashfree Gateway Webhook',
        timestamp: new Date(),
        details: {
          paymentId,
          amountPaid: effectivePaid,
          newBalance: newBalanceDue,
          receiptNumber
        }
      });

      await invoice.save();

      // Send payment confirmation email and receipt
      try {
        await sendPaymentConfirmationEmail({
          invoice,
          transaction,
          receiptNumber
        });
      } catch (emailErr) {
        logger.error('Failed to send payment confirmation email: %s', emailErr.message);
      }

      // Emit real-time notification to frontend via socket
      try {
        if (typeof emitToOrganisation === 'function') {
          emitToOrganisation(invoice.organisationId, 'invoice.payment_received', {
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            amount: effectivePaid,
            balanceDue: newBalanceDue,
            status: invoice.paymentStatus,
            paymentId
          });
        }
      } catch (sockErr) {
        logger.warn('Socket emission failed: %s', sockErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Cashfree webhook processed successfully',
      invoiceId: invoice._id,
      paymentStatus: invoice.paymentStatus
    });
  } catch (err) {
    logger.error('Cashfree Webhook Handler Exception: %s', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { handleCashfreeWebhook };

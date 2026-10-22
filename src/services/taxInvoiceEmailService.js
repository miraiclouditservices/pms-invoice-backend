const nodemailer = require('nodemailer');
const TaxEmailLog = require('../models/TaxEmailLog');
const logger = require('../config/logger');

// Configure SMTP transport with environment or test fallback
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const rawPass = process.env.SMTP_PASS || '';
  const pass = rawPass.replace(/\s+/g, '');

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  // Fallback to JSON/stream simulator if SMTP not provided
  return nodemailer.createTransport({
    jsonTransport: true
  });
}

const transporter = createTransporter();
const DEFAULT_FROM = process.env.SMTP_FROM || (process.env.SMTP_USER ? `"Mirai Billing" <${process.env.SMTP_USER}>` : '"Billing Team" <billing@miraiapps.com>');

function formatCurrency(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getPaymentUrl(invoice) {
  if (invoice.cashfreePaymentLink && invoice.cashfreePaymentLink.trim() !== '') {
    return invoice.cashfreePaymentLink;
  }
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  return `${clientUrl}/invoices/pay/${invoice._id}`;
}

/**
 * Sends newly issued Tax Invoice email with attached PDF and Cashfree Pay Now button
 */
async function sendInvoiceIssuedEmail({ invoice, pdfBuffer }) {
  const biz = invoice.businessSnapshot || {};
  const cust = invoice.customerSnapshot || {};
  const recipient = cust.email || invoice.customerId?.email;

  if (!recipient) {
    throw new Error('Invoice recipient email is missing.');
  }

  const subject = `Invoice ${invoice.invoiceNumber} – Payment Due ${formatCurrency(invoice.balanceDue)}`;
  const paymentUrl = getPaymentUrl(invoice);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background: #1e3a8a; color: #ffffff; padding: 28px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">${biz.legalName || 'Tax Invoice'}</h1>
      <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px; color: #e2e8f0;">Official Indian Tax Invoice</p>
    </div>
    <div style="padding: 28px 24px;">
      <p style="font-size: 15px; margin-top: 0;">Dear <strong>${cust.customerName || 'Valued Customer'}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        Please find attached your tax invoice for your records. The invoice details and secure online payment options (UPI, Credit/Debit Cards, NetBanking) are provided below:
      </p>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 600; color: #64748b; width: 45%;">Invoice Number</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 700; color: #0f172a; text-align: right;">${invoice.invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 600; color: #64748b;">Invoice Date</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 600; color: #0f172a; text-align: right;">${formatDate(invoice.invoiceDate)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 600; color: #64748b;">Payment Due Date</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 600; color: #0f172a; text-align: right;">${formatDate(invoice.dueDate)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 600; color: #64748b;">Total Amount</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 700; color: #0f172a; text-align: right;">${formatCurrency(invoice.grandTotal)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 600; color: #64748b;">Amount Paid</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 600; color: #10b981; text-align: right;">${formatCurrency(invoice.amountPaid)}</td>
        </tr>
        <tr style="background: #fef2f2;">
          <td style="padding: 12px 16px; font-size: 14px; font-weight: 700; color: #991b1b;">Balance Due</td>
          <td style="padding: 12px 16px; font-size: 16px; font-weight: 800; color: #b91c1c; text-align: right;">${formatCurrency(invoice.balanceDue)}</td>
        </tr>
      </table>

      <!-- Prominent Bulletproof Payment Button -->
      <div style="text-align: center; margin: 32px 0 24px;">
        <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
          <tr>
            <td align="center" style="border-radius: 8px; background-color: #10b981;">
              <a href="${paymentUrl}" target="_blank" style="font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff !important; text-decoration: none; border-radius: 8px; padding: 15px 38px; border: 1px solid #10b981; display: inline-block; font-weight: 700; letter-spacing: 0.5px; background-color: #10b981;">
                💳 PAY NOW ONLINE ${Number(invoice.balanceDue || 0) > 0 ? `(${formatCurrency(invoice.balanceDue)})` : ''}
              </a>
            </td>
          </tr>
        </table>
        <div style="font-size: 12px; color: #64748b; word-break: break-all; margin-top: 14px;">
          Direct payment link: <a href="${paymentUrl}" style="color: #2563eb; text-decoration: underline;" target="_blank">${paymentUrl}</a>
        </div>
      </div>

      <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
        A copy of the complete tax invoice (PDF) with full GST and itemized breakdown is attached to this email.
      </p>
    </div>
    <div style="background: #f1f5f9; padding: 20px 24px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0 0 6px;">Questions? Contact <strong>${biz.email || 'billing support'}</strong> | ${biz.phone || ''}</p>
      <p style="margin: 0;">© ${new Date().getFullYear()} ${biz.legalName || 'NexusPMS'}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  const mailOptions = {
    from: `${biz.legalName || 'Billing'} <${process.env.SMTP_USER || 'no-reply@miraiapps.com'}>`,
    to: recipient,
    subject,
    html,
    attachments: pdfBuffer ? [
      {
        filename: `${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ] : []
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info('Invoice email sent to %s. MessageId: %s', recipient, info.messageId);

    await TaxEmailLog.create({
      organisationId: invoice.organisationId,
      invoiceId: invoice._id,
      recipient,
      subject,
      emailType: 'INVOICE_ISSUED',
      providerMessageId: info.messageId || 'local-msg',
      status: 'SENT',
      attemptCount: 1,
      sentAt: new Date()
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    logger.error('Failed to send invoice email: %s', err.message);

    await TaxEmailLog.create({
      organisationId: invoice.organisationId,
      invoiceId: invoice._id,
      recipient,
      subject,
      emailType: 'INVOICE_ISSUED',
      status: 'FAILED',
      lastError: err.message,
      attemptCount: 1
    });

    throw err;
  }
}

/**
 * Sends a Payment Reminder Email
 */
async function sendPaymentReminderEmail({ invoice, pdfBuffer }) {
  const biz = invoice.businessSnapshot || {};
  const cust = invoice.customerSnapshot || {};
  const recipient = cust.email || invoice.customerId?.email;

  if (!recipient) {
    throw new Error('Invoice recipient email is missing.');
  }

  const subject = `Payment Reminder: Invoice ${invoice.invoiceNumber} – ${formatCurrency(invoice.balanceDue)} Due`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 24px; }
    .btn-pay { display: inline-block; background-color: #2563eb; color: #ffffff !important; font-weight: 700; padding: 12px 32px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h2 style="color: #1e3a8a; margin-top: 0;">Payment Reminder</h2>
    <p>Dear <strong>${cust.customerName}</strong>,</p>
    <p>This is a friendly reminder regarding the outstanding balance for invoice <strong>${invoice.invoiceNumber}</strong>.</p>
    
    <div style="background: #f1f5f9; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <p style="margin: 4px 0;"><strong>Invoice Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
      <p style="margin: 4px 0;"><strong>Outstanding Balance:</strong> <span style="color: #b91c1c; font-size: 16px; font-weight: bold;">${formatCurrency(invoice.balanceDue)}</span></p>
    </div>

    <!-- Bulletproof Email Reminder Pay Now Button -->
    <div style="text-align: center; margin: 28px 0 20px;">
      <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
        <tr>
          <td align="center" style="border-radius: 8px; background-color: #2563eb;">
            <a href="${getPaymentUrl(invoice)}" target="_blank" style="font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff !important; text-decoration: none; border-radius: 8px; padding: 15px 38px; border: 1px solid #2563eb; display: inline-block; font-weight: 700; letter-spacing: 0.5px; background-color: #2563eb;">
              💳 PAY NOW SECURELY (${formatCurrency(invoice.balanceDue)})
            </a>
          </td>
        </tr>
      </table>
      <div style="font-size: 12px; color: #64748b; word-break: break-all; margin-top: 12px;">
        Direct payment link: <a href="${getPaymentUrl(invoice)}" style="color: #2563eb; text-decoration: underline;" target="_blank">${getPaymentUrl(invoice)}</a>
      </div>
    </div>

    <p style="font-size: 13px; color: #64748b;">If you have already made this payment, please disregard this notification.</p>
  </div>
</body>
</html>
  `;

  const mailOptions = {
    from: `${biz.legalName || 'Billing'} <${process.env.SMTP_USER || 'no-reply@miraiapps.com'}>`,
    to: recipient,
    subject,
    html,
    attachments: pdfBuffer ? [
      {
        filename: `${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ] : []
  };

  const info = await transporter.sendMail(mailOptions);

  await TaxEmailLog.create({
    organisationId: invoice.organisationId,
    invoiceId: invoice._id,
    recipient,
    subject,
    emailType: 'PAYMENT_REMINDER',
    providerMessageId: info.messageId || 'local-msg',
    status: 'SENT',
    sentAt: new Date()
  });

  return { success: true };
}

/**
 * Sends a Payment Confirmation & Receipt Email
 */
async function sendPaymentConfirmationEmail({ invoice, transaction, receiptNumber }) {
  const biz = invoice.businessSnapshot || {};
  const cust = invoice.customerSnapshot || {};
  const recipient = cust.email || invoice.customerId?.email;

  if (!recipient) return;

  const subject = `Payment Confirmed: Receipt #${receiptNumber} for Invoice ${invoice.invoiceNumber}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: sans-serif; background: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 24px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; background: #dcfce7; color: #15803d; font-weight: bold; padding: 6px 16px; border-radius: 20px; font-size: 14px;">
        ✓ PAYMENT RECEIVED
      </span>
      <h2 style="color: #0f172a; margin: 12px 0 4px;">Thank you for your payment</h2>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 6px;">
      <tr>
        <td style="padding: 10px 14px; color: #64748b;">Receipt Number</td>
        <td style="padding: 10px 14px; font-weight: bold; text-align: right;">${receiptNumber}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; color: #64748b;">Invoice Reference</td>
        <td style="padding: 10px 14px; font-weight: bold; text-align: right;">${invoice.invoiceNumber}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; color: #64748b;">Amount Received</td>
        <td style="padding: 10px 14px; font-weight: bold; text-align: right; color: #16a34a; font-size: 16px;">${formatCurrency(transaction.amount)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; color: #64748b;">Transaction Gateway ID</td>
        <td style="padding: 10px 14px; font-weight: bold; text-align: right;">${transaction.cashfreePaymentId || transaction.gatewayReference || 'Online Gateway'}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; color: #64748b;">Remaining Balance Due</td>
        <td style="padding: 10px 14px; font-weight: bold; text-align: right;">${formatCurrency(invoice.balanceDue)}</td>
      </tr>
    </table>

    <p style="font-size: 13px; color: #64748b; text-align: center;">
      This receipt has been generated automatically for your transaction on ${new Date().toLocaleString('en-IN')}.
    </p>
  </div>
</body>
</html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `${biz.legalName || 'Billing'} <${process.env.SMTP_USER || 'no-reply@miraiapps.com'}>`,
      to: recipient,
      subject,
      html
    });

    await TaxEmailLog.create({
      organisationId: invoice.organisationId,
      invoiceId: invoice._id,
      recipient,
      subject,
      emailType: 'PAYMENT_RECEIPT',
      providerMessageId: info.messageId || 'local-receipt',
      status: 'SENT',
      sentAt: new Date()
    });
  } catch (err) {
    logger.error('Failed to send payment confirmation email: %s', err.message);
  }
}

module.exports = {
  sendInvoiceIssuedEmail,
  sendPaymentReminderEmail,
  sendPaymentConfirmationEmail
};

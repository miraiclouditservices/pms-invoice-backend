const mongoose = require('mongoose');
require('dotenv').config();
const TaxInvoice = require('../src/models/TaxInvoice');
const { generateTaxInvoicePdf } = require('../src/services/taxInvoicePdfService');
const { sendInvoiceIssuedEmail } = require('../src/services/taxInvoiceEmailService');

async function sendInvoice() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the latest invoice or INV/2026-27/008
    let invoice = await TaxInvoice.findOne({ invoiceNumber: 'INV/2026-27/008' });
    if (!invoice) {
      invoice = await TaxInvoice.findOne().sort({ createdAt: -1 });
    }

    if (!invoice) {
      throw new Error('No invoice found to send');
    }

    // Ensure recipient email is set to tungananaveen6@gmail.com
    invoice.customerSnapshot.email = 'tungananaveen6@gmail.com';
    await invoice.save();

    console.log(`Sending Invoice ${invoice.invoiceNumber} to ${invoice.customerSnapshot.email}...`);
    console.log(`Business Name: ${invoice.businessSnapshot?.legalName}`);
    console.log(`Bank: ${invoice.businessSnapshot?.bankDetails?.bankName} (A/C: ${invoice.businessSnapshot?.bankDetails?.accountNumber})`);
    console.log(`Amount: ₹${invoice.grandTotal}`);

    // Generate the official PDF
    console.log('Generating Tax Invoice PDF...');
    const pdfBuffer = await generateTaxInvoicePdf(invoice);
    console.log(`Generated PDF (${pdfBuffer.length} bytes)`);

    // Send the email with PDF attachment and online payment link
    console.log('Sending email through SMTP...');
    const info = await sendInvoiceIssuedEmail({ invoice, pdfBuffer });
    console.log('Email sent successfully!');
    console.log('Message ID:', info?.messageId || info?.response);

    // Update email status on invoice
    invoice.emailStatus = 'SENT';
    invoice.auditHistory.push({
      action: 'INVOICE_EMAIL_SENT',
      details: { sentTo: 'tungananaveen6@gmail.com', messageId: info?.messageId }
    });
    await invoice.save();

    console.log('Invoice updated with email status SENT.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to send invoice email:', err);
    process.exit(1);
  }
}

sendInvoice();

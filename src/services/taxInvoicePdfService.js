const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Formats numbers into Indian currency display format
 */
function formatINR(val) {
  const n = Number(val || 0);
  return 'Rs. ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Generates Indian Tax Invoice PDF buffer
 * @param {Object} invoice 
 * @returns {Promise<Buffer>}
 */
function generateTaxInvoicePdf(invoice) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36, // 0.5 inch margins
        info: {
          Title: `Tax Invoice - ${invoice.invoiceNumber}`,
          Author: invoice.businessSnapshot?.legalName || 'Mirai PMS',
          Subject: 'Tax Invoice'
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      const biz = invoice.businessSnapshot || {};
      const cust = invoice.customerSnapshot || {};
      const primaryColor = '#1e3a8a'; // Deep Navy Blue
      const secondaryColor = '#475569'; // Slate
      const borderColor = '#cbd5e1'; // Light Gray Border
      const tableHeaderBg = '#f1f5f9';

      let y = 36;

      // 1. TOP HEADER BAR
      doc.rect(36, y, 523, 30).fill(primaryColor);
      doc.fillColor('#ffffff')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('TAX INVOICE', 46, y + 8, { letterSpacing: 2 });

      if (invoice.invoiceStatus) {
        doc.fontSize(10)
          .font('Helvetica-Bold')
          .text(invoice.invoiceStatus.toUpperCase(), 450, y + 9, { align: 'right', width: 99 });
      }

      y += 38;

      // 2. BUSINESS INFO (LEFT) & INVOICE DETAILS (RIGHT)
      const bizX = 36;
      const invX = 320;
      const startY = y;

      // Left: Business details
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text(biz.legalName || biz.displayName || 'Business Name', bizX, y);
      y += 14;
      doc.font('Helvetica').fontSize(8.5).fillColor(secondaryColor);
      
      const bizAddressParts = [biz.address, biz.addressLine2, biz.city, `${biz.state} - ${biz.postalCode}`, biz.country].filter(Boolean);
      bizAddressParts.forEach(line => {
        doc.text(line, bizX, y);
        y += 11;
      });

      if (biz.phone) {
        doc.text(`Phone: ${biz.phone}`, bizX, y);
        y += 11;
      }
      if (biz.email) {
        doc.text(`Email: ${biz.email}`, bizX, y);
        y += 11;
      }
      if (biz.gstin) {
        doc.font('Helvetica-Bold').fillColor('#0f172a').text(`GSTIN: ${biz.gstin}`, bizX, y);
        y += 11;
      }
      if (biz.pan) {
        doc.font('Helvetica').fillColor(secondaryColor).text(`PAN: ${biz.pan}`, bizX, y);
        y += 11;
      }

      const leftEndY = y;

      // Right: Invoice Metadata Box
      let rY = startY;
      doc.rect(invX, rY - 2, 239, 90).fillAndStroke('#f8fafc', borderColor);

      const renderMetaRow = (label, val, bold = false) => {
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155').text(label, invX + 8, rY + 4);
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor('#0f172a').text(val || '-', invX + 110, rY + 4, { align: 'right', width: 115 });
        rY += 14;
      };

      renderMetaRow('Invoice Number:', invoice.invoiceNumber, true);
      renderMetaRow('Invoice Date:', formatDate(invoice.invoiceDate));
      renderMetaRow('Due Date:', formatDate(invoice.dueDate));
      renderMetaRow('Financial Year:', invoice.financialYear || '-');
      renderMetaRow('Place of Supply:', invoice.placeOfSupply || biz.state || '-');
      renderMetaRow('Tax Treatment:', (invoice.taxTreatment || 'INTRA_STATE').replace('_', ' '));

      y = Math.max(leftEndY, rY) + 10;

      // 3. BUYER (BILLED TO) BOX
      doc.rect(36, y, 523, 18).fill('#e2e8f0');
      doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(9).text('BUYER (BILLED TO)', 42, y + 4);
      y += 22;

      doc.rect(36, y, 523, 50).stroke(borderColor);
      let bY = y + 5;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text(cust.customerName || 'Customer Name', 44, bY);
      if (cust.companyName) {
        doc.font('Helvetica').fontSize(8.5).fillColor(secondaryColor).text(` (${cust.companyName})`, 44 + doc.widthOfString(cust.customerName || '') + 5, bY);
      }
      bY += 12;

      const custAddr = [cust.billingAddress, cust.city, `${cust.state || ''} ${cust.postalCode || ''}`].filter(Boolean).join(', ');
      doc.font('Helvetica').fontSize(8.5).fillColor(secondaryColor).text(custAddr || 'Address details', 44, bY);
      bY += 12;

      const custTaxInfo = [];
      if (cust.gstin) custTaxInfo.push(`GSTIN: ${cust.gstin}`);
      if (cust.pan) custTaxInfo.push(`PAN: ${cust.pan}`);
      if (cust.phone) custTaxInfo.push(`Phone: ${cust.phone}`);
      if (cust.email) custTaxInfo.push(`Email: ${cust.email}`);
      doc.text(custTaxInfo.join('  |  ') || '-', 44, bY);

      y += 58;

      // 4. ITEMS TABLE
      // Column widths: Total 523
      const cols = {
        sno: { x: 36, w: 26, align: 'center', label: 'S.No' },
        desc: { x: 62, w: 175, align: 'left', label: 'Item Description' },
        hsn: { x: 237, w: 46, align: 'center', label: 'HSN/SAC' },
        qty: { x: 283, w: 34, align: 'center', label: 'Qty' },
        rate: { x: 317, w: 50, align: 'right', label: 'Rate' },
        taxable: { x: 367, w: 54, align: 'right', label: 'Taxable' },
        gst: { x: 421, w: 66, align: 'right', label: 'GST' },
        total: { x: 487, w: 72, align: 'right', label: 'Total' }
      };

      const drawTableHeader = (curY) => {
        doc.rect(36, curY, 523, 20).fillAndStroke(tableHeaderBg, borderColor);
        doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(8);
        Object.values(cols).forEach(col => {
          doc.text(col.label, col.x, curY + 5, { width: col.w, align: col.align });
        });
        return curY + 20;
      };

      y = drawTableHeader(y);

      // Render Line Items
      const items = invoice.lineItems || [];
      items.forEach((item, index) => {
        // Page break check
        if (y > 680) {
          doc.addPage();
          y = 36;
          y = drawTableHeader(y);
        }

        const isEven = index % 2 === 0;
        const rowHeight = 22;

        if (isEven) {
          doc.rect(36, y, 523, rowHeight).fill('#fafafa');
        }
        doc.rect(36, y, 523, rowHeight).stroke(borderColor);

        doc.font('Helvetica').fontSize(8).fillColor('#0f172a');
        doc.text(String(index + 1), cols.sno.x, y + 6, { width: cols.sno.w, align: cols.sno.align });
        doc.text(item.description || '-', cols.desc.x, y + 6, { width: cols.desc.w, align: cols.desc.align, lineBreak: false });
        doc.text(item.hsnSac || '-', cols.hsn.x, y + 6, { width: cols.hsn.w, align: cols.hsn.align });
        doc.text(`${item.quantity} ${item.unit || ''}`.trim(), cols.qty.x, y + 6, { width: cols.qty.w, align: cols.qty.align });
        doc.text(Number(item.rate).toFixed(2), cols.rate.x, y + 6, { width: cols.rate.w, align: cols.rate.align });
        doc.text(Number(item.taxableAmount).toFixed(2), cols.taxable.x, y + 6, { width: cols.taxable.w, align: cols.taxable.align });

        let gstLabel = '-';
        if (item.cgstAmount > 0 || item.sgstAmount > 0) {
          gstLabel = `${(item.cgstAmount + item.sgstAmount).toFixed(2)} (${item.taxRate}%)`;
        } else if (item.igstAmount > 0) {
          gstLabel = `${item.igstAmount.toFixed(2)} (${item.taxRate}%)`;
        }
        doc.text(gstLabel, cols.gst.x, y + 6, { width: cols.gst.w, align: cols.gst.align });
        doc.font('Helvetica-Bold').text(Number(item.totalAmount).toFixed(2), cols.total.x, y + 6, { width: cols.total.w, align: cols.total.align });

        y += rowHeight;
      });

      // 5. TOTALS SECTION
      if (y > 620) {
        doc.addPage();
        y = 36;
      }

      const totalsBoxY = y + 8;
      const leftWordsW = 300;
      const rightTotalsX = 345;
      const rightTotalsW = 214;

      // Words on left
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e293b').text('AMOUNT IN WORDS:', 36, totalsBoxY);
      doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(primaryColor).text(invoice.amountInWords || 'Zero Rupees Only', 36, totalsBoxY + 12, { width: leftWordsW });

      // Payment Link box if available
      if (invoice.cashfreePaymentLink) {
        const linkY = totalsBoxY + 36;
        doc.rect(36, linkY, leftWordsW, 36).fillAndStroke('#eff6ff', '#bfdbfe');
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8.5).text('ONLINE PAYMENT AVAILABLE:', 42, linkY + 4);
        doc.fillColor('#2563eb').font('Helvetica').fontSize(7.5).text(invoice.cashfreePaymentLink, 42, linkY + 18, {
          width: leftWordsW - 12,
          link: invoice.cashfreePaymentLink,
          underline: true
        });
      }

      // Summary lines on right
      let sY = totalsBoxY;
      const renderTotalLine = (label, val, isGrand = false, isDue = false) => {
        if (isGrand) {
          doc.rect(rightTotalsX - 5, sY - 2, rightTotalsW + 5, 18).fill('#1e3a8a');
          doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9.5).text(label, rightTotalsX, sY + 2);
          doc.text(val, rightTotalsX + 90, sY + 2, { width: rightTotalsW - 95, align: 'right' });
          sY += 22;
          return;
        }

        if (isDue) {
          doc.rect(rightTotalsX - 5, sY - 2, rightTotalsW + 5, 16).fill('#fee2e2');
          doc.fillColor('#b91c1c').font('Helvetica-Bold').fontSize(9).text(label, rightTotalsX, sY + 2);
          doc.text(val, rightTotalsX + 90, sY + 2, { width: rightTotalsW - 95, align: 'right' });
          sY += 18;
          return;
        }

        doc.fillColor('#334155').font('Helvetica').fontSize(8.5).text(label, rightTotalsX, sY);
        doc.font('Helvetica-Bold').fillColor('#0f172a').text(val, rightTotalsX + 90, sY, { width: rightTotalsW - 95, align: 'right' });
        sY += 13;
      };

      renderTotalLine('Gross Subtotal:', formatINR(invoice.subtotal));
      if (invoice.discountTotal > 0) {
        renderTotalLine('Discount:', '-' + formatINR(invoice.discountTotal));
      }
      renderTotalLine('Taxable Value:', formatINR(invoice.taxableAmount));

      if (invoice.cgstAmount > 0 || invoice.sgstAmount > 0) {
        renderTotalLine('CGST:', formatINR(invoice.cgstAmount));
        renderTotalLine('SGST:', formatINR(invoice.sgstAmount));
      }
      if (invoice.igstAmount > 0) {
        renderTotalLine('IGST:', formatINR(invoice.igstAmount));
      }
      if (invoice.otherCharges > 0) {
        renderTotalLine('Other Charges:', formatINR(invoice.otherCharges));
      }
      if (invoice.roundOff !== 0) {
        renderTotalLine('Round Off:', (invoice.roundOff > 0 ? '+' : '') + formatINR(invoice.roundOff));
      }

      renderTotalLine('Grand Total:', formatINR(invoice.grandTotal), true);
      renderTotalLine('Amount Paid:', formatINR(invoice.amountPaid));
      renderTotalLine('Balance Due:', formatINR(invoice.balanceDue), false, invoice.balanceDue > 0);

      y = Math.max(totalsBoxY + 85, sY) + 12;

      // 6. FOOTER (3 Clean Non-Colliding Cards: Bank Details, UPI QR Scan & Pay, Terms/Signatory)
      if (y > 640) {
        doc.addPage();
        y = 36;
      }

      doc.rect(36, y, 523, 1).fill(borderColor);
      y += 8;

      const footY = y;
      const bankDetails = biz.bankDetails || {};
      const boxH = 135;

      // Card 1: Bank Transfer Details (Left, x: 36, w: 180)
      doc.rect(36, footY, 180, boxH).fillAndStroke('#f8fafc', borderColor);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e3a8a').text('BANK TRANSFER DETAILS', 44, footY + 8, { width: 164 });

      let bky = footY + 22;
      const renderBankRow = (label, val) => {
        doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text(label, 44, bky, { width: 56 });
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0f172a').text(val || '-', 100, bky, { width: 110 });
        bky += 14;
      };

      renderBankRow('Bank Name:', bankDetails.bankName || 'IDFC FIRST');
      renderBankRow('Branch:', bankDetails.branch || 'KAVURI HILLS, HYD');
      renderBankRow('A/C Holder:', bankDetails.accountHolderName || biz.legalName || 'MIRAI CLOUD IT SERVICES');
      renderBankRow('A/C Number:', bankDetails.accountNumber || '10228801226');
      renderBankRow('IFSC Code:', bankDetails.ifscCode || 'IDFB0080231');

      // Card 2: Scan & Pay UPI (Center, x: 224, w: 145)
      doc.rect(224, footY, 145, boxH).fillAndStroke('#f8fafc', borderColor);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e3a8a').text('SCAN & PAY (UPI)', 224, footY + 8, { width: 145, align: 'center' });

      // Embed UPI QR Code image
      const qrPaths = [
        path.join(__dirname, '../assets/mirai_upi_qr.png'),
        path.join(__dirname, '../../public/assets/mirai_upi_qr.png'),
        'd:/PMS-APPLICATION/backend-pms/public/assets/mirai_upi_qr.png'
      ];
      const validQrPath = qrPaths.find(p => fs.existsSync(p));
      if (validQrPath) {
        doc.image(validQrPath, 224 + (145 - 68) / 2, footY + 22, { width: 68, height: 68 });
      }

      doc.font('Helvetica-Bold').fontSize(7).fillColor('#0f172a').text('UPI ID: miraicloudit@idfcbank', 228, footY + 95, { width: 137, align: 'center' });
      doc.font('Helvetica').fontSize(6.5).fillColor('#64748b').text('Scan with GPay, PhonePe, Paytm', 228, footY + 107, { width: 137, align: 'center' });

      // Card 3: Terms & Authorization (Right, x: 377, w: 182)
      doc.rect(377, footY, 182, boxH).fillAndStroke('#f8fafc', borderColor);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e3a8a').text('TERMS & CONDITIONS', 385, footY + 8, { width: 166 });

      const termsText = invoice.termsAndConditions || biz.defaultTerms || '1. Goods/services once supplied will not be refunded.\n2. Payment should be made on or before due date.\n3. For billing support: info@miraiclouditservices.com';
      doc.font('Helvetica').fontSize(6.8).fillColor('#475569').text(termsText, 385, footY + 22, { width: 166, lineBreak: true });

      const sigY = footY + 70;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1e293b').text(`For ${biz.legalName || 'MIRAI CLOUD IT SERVICES'}`, 385, sigY, { width: 166, align: 'center' });
      doc.font('Helvetica-Oblique').fontSize(6.5).fillColor('#64748b').text('[ Digitally Generated ]', 385, sigY + 16, { width: 166, align: 'center' });
      const signName = biz.authorizedSignatory?.name || 'Authorized Signatory';
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0f172a').text(signName, 385, sigY + 30, { width: 166, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateTaxInvoicePdf, formatINR, formatDate };

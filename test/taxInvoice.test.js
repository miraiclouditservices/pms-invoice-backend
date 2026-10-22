const assert = require('assert');
const { calculateInvoice } = require('../src/services/taxInvoiceCalculationService');
const { convertToIndianWords } = require('../src/utils/numberToWordsIndian');
const { getIndianFinancialYear } = require('../src/services/taxInvoiceNumberService');
const { generateTaxInvoicePdf } = require('../src/services/taxInvoicePdfService');
const { verifyCashfreeWebhookSignature } = require('../src/services/cashfreePaymentService');
const crypto = require('crypto');

async function runTests() {
  console.log('--- STARTING TAX INVOICE AUTOMATED TEST SUITE ---');

  // Test 1: Indian Number to Words Conversion
  console.log('Test 1: Indian Number to Words Conversion...');
  assert.strictEqual(convertToIndianWords(0), 'Zero Rupees Only');
  assert.strictEqual(convertToIndianWords(5000), 'Five Thousand Rupees Only');
  assert.strictEqual(convertToIndianWords(123456.78), 'One Lakh Twenty-Three Thousand Four Hundred Fifty-Six Rupees and Seventy-Eight Paise Only');
  assert.strictEqual(convertToIndianWords(10000000), 'One Crore Rupees Only');
  console.log('✓ Passed: Number to Indian words verified.');

  // Test 2: Financial Year Calculation (Indian FY boundary April 1 - March 31)
  console.log('Test 2: Financial Year Calculation...');
  assert.strictEqual(getIndianFinancialYear(new Date('2026-10-15')), '2026-27');
  assert.strictEqual(getIndianFinancialYear(new Date('2027-02-10')), '2026-27');
  assert.strictEqual(getIndianFinancialYear(new Date('2027-04-01')), '2027-28');
  console.log('✓ Passed: Financial year boundaries verified.');

  // Test 3: Intra-State GST Calculation (CGST 9% + SGST 9% = 18%)
  console.log('Test 3: Intra-State GST Calculation...');
  const intraResult = calculateInvoice({
    lineItems: [
      { description: 'Consulting Services', quantity: 2, rate: 1000, discount: 200, taxRate: 18 }
    ],
    taxTreatment: 'INTRA_STATE',
    enableRoundOff: true
  });
  // Subtotal = 2000, Discount = 200, Taxable = 1800
  // CGST = 9% of 1800 = 162.00, SGST = 9% of 1800 = 162.00
  // Grand Total = 1800 + 162 + 162 = 2124.00
  assert.strictEqual(intraResult.subtotal, 2000);
  assert.strictEqual(intraResult.discountTotal, 200);
  assert.strictEqual(intraResult.taxableAmount, 1800);
  assert.strictEqual(intraResult.cgstAmount, 162);
  assert.strictEqual(intraResult.sgstAmount, 162);
  assert.strictEqual(intraResult.igstAmount, 0);
  assert.strictEqual(intraResult.grandTotal, 2124);
  assert.strictEqual(intraResult.balanceDue, 2124);
  console.log('✓ Passed: Intra-state CGST & SGST verified.');

  // Test 4: Inter-State GST Calculation (IGST 18%)
  console.log('Test 4: Inter-State GST Calculation...');
  const interResult = calculateInvoice({
    lineItems: [
      { description: 'Cloud Infrastructure Subscription', quantity: 1, rate: 10000, discount: 0, taxRate: 18 }
    ],
    taxTreatment: 'INTER_STATE',
    enableRoundOff: true
  });
  assert.strictEqual(interResult.subtotal, 10000);
  assert.strictEqual(interResult.taxableAmount, 10000);
  assert.strictEqual(interResult.cgstAmount, 0);
  assert.strictEqual(interResult.sgstAmount, 0);
  assert.strictEqual(interResult.igstAmount, 1800);
  assert.strictEqual(interResult.grandTotal, 11800);
  console.log('✓ Passed: Inter-state IGST verified.');

  // Test 5: Validation - Empty line items & More than 15 items
  console.log('Test 5: Validation rules...');
  assert.throws(() => calculateInvoice({ lineItems: [] }), /At least one line item is required/);
  const sixteenItems = Array(16).fill({ description: 'Item', quantity: 1, rate: 100 });
  assert.throws(() => calculateInvoice({ lineItems: sixteenItems }), /maximum of 15 line items/);
  console.log('✓ Passed: Validation rules strictly enforced.');

  // Test 6: PDF Generation Buffer Test
  console.log('Test 6: PDF Generation test...');
  const dummyInvoice = {
    invoiceNumber: 'INV/2026-27/001',
    financialYear: '2026-27',
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 15 * 86400000),
    invoiceStatus: 'ISSUED',
    taxTreatment: 'INTRA_STATE',
    businessSnapshot: {
      legalName: 'Mirai Cloud Technologies Pvt Ltd',
      address: 'Suite 401, Tech Park',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      gstin: '27AABCM1234F1Z5',
      bankDetails: {
        bankName: 'HDFC Bank',
        accountNumber: '50200012345678',
        ifscCode: 'HDFC0000060',
        showOnInvoice: true
      }
    },
    customerSnapshot: {
      customerName: 'Acme Global Ltd',
      billingAddress: '42 Market Street',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411001',
      gstin: '27ACMEG5678K1Z2'
    },
    lineItems: intraResult.lineItems,
    subtotal: intraResult.subtotal,
    discountTotal: intraResult.discountTotal,
    taxableAmount: intraResult.taxableAmount,
    cgstAmount: intraResult.cgstAmount,
    sgstAmount: intraResult.sgstAmount,
    igstAmount: 0,
    roundOff: 0,
    grandTotal: intraResult.grandTotal,
    amountPaid: 0,
    balanceDue: intraResult.grandTotal,
    amountInWords: intraResult.amountInWords,
    cashfreePaymentLink: 'https://sandbox.cashfree.com/pay/link_12345'
  };

  const pdfBuffer = await generateTaxInvoicePdf(dummyInvoice);
  assert.ok(pdfBuffer && pdfBuffer.length > 500, 'PDF buffer should be non-empty and valid');
  assert.strictEqual(pdfBuffer.slice(0, 4).toString(), '%PDF', 'PDF header should start with %PDF');
  console.log(`✓ Passed: PDF generated successfully (${pdfBuffer.length} bytes).`);

  // Test 7: Cashfree Webhook HMAC Verification
  console.log('Test 7: Cashfree Webhook HMAC SHA256 Signature Verification...');
  process.env.CASHFREE_WEBHOOK_SECRET = 'test_webhook_secret_key_123';
  const timestamp = String(Date.now());
  const rawBody = JSON.stringify({ type: 'PAYMENT_LINK_EVENT', data: { link_id: 'link_test_123' } });
  const validSignature = crypto
    .createHmac('sha256', process.env.CASHFREE_WEBHOOK_SECRET)
    .update(timestamp + rawBody)
    .digest('base64');

  const verificationSuccess = verifyCashfreeWebhookSignature({
    signature: validSignature,
    timestamp,
    rawBody
  });
  assert.strictEqual(verificationSuccess, true, 'Valid signature should verify successfully');

  const verificationFail = verifyCashfreeWebhookSignature({
    signature: 'invalid_forged_signature',
    timestamp,
    rawBody
  });
  assert.strictEqual(verificationFail, false, 'Invalid signature should be rejected');
  console.log('✓ Passed: Webhook HMAC verification verified.');

  console.log('\n========================================');
  console.log('🎉 ALL 7 AUTOMATED TAX INVOICE TESTS PASSED!');
  console.log('========================================\n');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

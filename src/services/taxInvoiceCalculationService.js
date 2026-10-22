const { convertToIndianWords } = require('../utils/numberToWordsIndian');

/**
 * Currency-safe arithmetic helper using integer paise
 */
function toPaise(amount) {
  return Math.round(Number(amount || 0) * 100);
}

function fromPaise(paise) {
  return Number((paise / 100).toFixed(2));
}

/**
 * Calculates complete Indian Tax Invoice totals authoritatively on backend.
 * @param {Array} lineItems - Array of line items
 * @param {String} taxTreatment - 'INTRA_STATE' | 'INTER_STATE' | 'NON_GST'
 * @param {Number} otherCharges - Optional other charges
 * @param {Boolean} enableRoundOff - Whether to round off grand total
 * @param {Number} amountPaid - Existing paid amount
 */
function calculateInvoice({
  lineItems = [],
  taxTreatment = 'INTRA_STATE',
  otherCharges = 0,
  enableRoundOff = true,
  amountPaid = 0
}) {
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    throw new Error('At least one line item is required.');
  }

  if (lineItems.length > 15) {
    throw new Error('A maximum of 15 line items is permitted per invoice.');
  }

  let subtotalPaise = 0;
  let discountTotalPaise = 0;
  let taxableTotalPaise = 0;
  let cgstTotalPaise = 0;
  let sgstTotalPaise = 0;
  let igstTotalPaise = 0;

  const calculatedItems = lineItems.map((item, index) => {
    const qty = Number(item.quantity);
    const rate = Number(item.rate);
    const discount = Number(item.discount || 0);
    const taxRate = Number(item.taxRate !== undefined ? item.taxRate : 18);

    if (isNaN(qty) || qty <= 0) {
      throw new Error(`Line item #${index + 1}: Quantity must be greater than zero.`);
    }
    if (isNaN(rate) || rate < 0) {
      throw new Error(`Line item #${index + 1}: Rate must be non-negative.`);
    }
    if (isNaN(discount) || discount < 0) {
      throw new Error(`Line item #${index + 1}: Discount must be non-negative.`);
    }
    if (isNaN(taxRate) || taxRate < 0) {
      throw new Error(`Line item #${index + 1}: Tax rate must be valid.`);
    }

    const itemGrossPaise = Math.round(qty * rate * 100);
    const itemDiscountPaise = Math.min(itemGrossPaise, toPaise(discount));
    const itemTaxablePaise = Math.max(0, itemGrossPaise - itemDiscountPaise);

    let cgstRate = 0;
    let cgstPaise = 0;
    let sgstRate = 0;
    let sgstPaise = 0;
    let igstRate = 0;
    let igstPaise = 0;

    if (taxTreatment === 'INTRA_STATE' && taxRate > 0) {
      cgstRate = taxRate / 2;
      sgstRate = taxRate / 2;
      cgstPaise = Math.round(itemTaxablePaise * (cgstRate / 100));
      sgstPaise = Math.round(itemTaxablePaise * (sgstRate / 100));
    } else if (taxTreatment === 'INTER_STATE' && taxRate > 0) {
      igstRate = taxRate;
      igstPaise = Math.round(itemTaxablePaise * (igstRate / 100));
    }

    const itemTotalPaise = itemTaxablePaise + cgstPaise + sgstPaise + igstPaise;

    subtotalPaise += itemGrossPaise;
    discountTotalPaise += itemDiscountPaise;
    taxableTotalPaise += itemTaxablePaise;
    cgstTotalPaise += cgstPaise;
    sgstTotalPaise += sgstPaise;
    igstTotalPaise += igstPaise;

    return {
      description: item.description?.trim() || `Item ${index + 1}`,
      hsnSac: item.hsnSac?.trim() || '',
      quantity: qty,
      unit: item.unit?.trim() || 'Nos',
      rate: rate,
      discount: fromPaise(itemDiscountPaise),
      taxRate: taxRate,
      taxableAmount: fromPaise(itemTaxablePaise),
      cgstRate,
      cgstAmount: fromPaise(cgstPaise),
      sgstRate,
      sgstAmount: fromPaise(sgstPaise),
      igstRate,
      igstAmount: fromPaise(igstPaise),
      totalAmount: fromPaise(itemTotalPaise)
    };
  });

  const otherChargesPaise = toPaise(otherCharges);
  const rawGrandTotalPaise = taxableTotalPaise + cgstTotalPaise + sgstTotalPaise + igstTotalPaise + otherChargesPaise;

  let roundOffPaise = 0;
  let finalGrandTotalPaise = rawGrandTotalPaise;

  if (enableRoundOff) {
    // Nearest rupee in paise is Math.round(rawGrandTotalPaise / 100) * 100
    const roundedPaise = Math.round(rawGrandTotalPaise / 100) * 100;
    roundOffPaise = roundedPaise - rawGrandTotalPaise;
    finalGrandTotalPaise = roundedPaise;
  }

  const grandTotal = fromPaise(finalGrandTotalPaise);
  const paidPaise = Math.min(finalGrandTotalPaise, toPaise(amountPaid));
  const balanceDuePaise = Math.max(0, finalGrandTotalPaise - paidPaise);

  const amountInWords = convertToIndianWords(grandTotal);

  return {
    lineItems: calculatedItems,
    subtotal: fromPaise(subtotalPaise),
    discountTotal: fromPaise(discountTotalPaise),
    taxableAmount: fromPaise(taxableTotalPaise),
    cgstAmount: fromPaise(cgstTotalPaise),
    sgstAmount: fromPaise(sgstTotalPaise),
    igstAmount: fromPaise(igstTotalPaise),
    otherCharges: fromPaise(otherChargesPaise),
    roundOff: fromPaise(roundOffPaise),
    grandTotal: grandTotal,
    amountPaid: fromPaise(paidPaise),
    balanceDue: fromPaise(balanceDuePaise),
    amountInWords
  };
}

module.exports = {
  calculateInvoice,
  toPaise,
  fromPaise
};

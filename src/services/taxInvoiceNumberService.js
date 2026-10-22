const TaxInvoiceSequence = require('../models/TaxInvoiceSequence');

/**
 * Calculates Indian Financial Year string from given date
 * E.g., for 14-Oct-2026 -> "2026-27"
 * For 15-Feb-2027 -> "2026-27"
 */
function getIndianFinancialYear(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12

  if (month >= 4) {
    // April to December
    const nextYearTwoDigits = (year + 1).toString().slice(-2);
    return `${year}-${nextYearTwoDigits}`;
  } else {
    // January to March
    const prevYear = year - 1;
    const currentYearTwoDigits = year.toString().slice(-2);
    return `${prevYear}-${currentYearTwoDigits}`;
  }
}

/**
 * Generates an atomic, concurrency-safe invoice number
 * @param {ObjectId} organisationId 
 * @param {String} customPrefix 
 * @param {String} configuredFY 
 * @param {Date} invoiceDate 
 */
async function generateNextInvoiceNumber(organisationId, customPrefix = 'INV', configuredFY = 'AUTO', invoiceDate = new Date()) {
  const prefix = (customPrefix || 'INV').toUpperCase().trim();
  const financialYear = (!configuredFY || configuredFY === 'AUTO') 
    ? getIndianFinancialYear(invoiceDate) 
    : configuredFY.trim();

  const seqDoc = await TaxInvoiceSequence.findOneAndUpdate(
    { organisationId, financialYear, prefix },
    { $inc: { currentSequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const paddedSeq = String(seqDoc.currentSequence).padStart(3, '0');
  const invoiceNumber = `${prefix}/${financialYear}/${paddedSeq}`;

  return {
    invoiceNumber,
    financialYear,
    sequence: seqDoc.currentSequence
  };
}

/**
 * Previews the next invoice number without incrementing the database sequence
 */
async function peekNextInvoiceNumber(organisationId, customPrefix = 'INV', configuredFY = 'AUTO', invoiceDate = new Date()) {
  const prefix = (customPrefix || 'INV').toUpperCase().trim();
  const financialYear = (!configuredFY || configuredFY === 'AUTO') 
    ? getIndianFinancialYear(invoiceDate) 
    : configuredFY.trim();

  const seqDoc = await TaxInvoiceSequence.findOne({ organisationId, financialYear, prefix });
  const nextSeq = (seqDoc ? seqDoc.currentSequence : 0) + 1;
  const paddedSeq = String(nextSeq).padStart(3, '0');

  return {
    nextInvoiceNumber: `${prefix}/${financialYear}/${paddedSeq}`,
    financialYear,
    nextSequence: nextSeq
  };
}

module.exports = {
  getIndianFinancialYear,
  generateNextInvoiceNumber,
  peekNextInvoiceNumber
};

/**
 * Converts numbers into Indian Currency words (Rupees and Paise)
 * Supports Crores, Lakhs, Thousands, Hundreds, Units, and Paise.
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertBelowThousand(n) {
  let str = '';
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + ONES[n % 10] : '') + ' ';
  } else if (n > 0) {
    str += ONES[n] + ' ';
  }
  return str.trim();
}

function convertToIndianWords(number) {
  if (number === null || number === undefined || isNaN(number)) {
    return 'Zero Rupees Only';
  }

  const num = Math.abs(Number(number));
  if (num === 0) {
    return 'Zero Rupees Only';
  }

  const rounded = Math.round(num * 100) / 100;
  const parts = rounded.toFixed(2).split('.');
  let rupees = parseInt(parts[0], 10);
  const paise = parseInt(parts[1], 10);

  let words = '';

  if (rupees > 0) {
    // Crores (>= 1,00,00,000)
    const crores = Math.floor(rupees / 10000000);
    if (crores > 0) {
      words += convertToIndianWords(crores).replace(' Rupees Only', '') + ' Crore ';
      rupees %= 10000000;
    }

    // Lakhs (>= 1,00,000)
    const lakhs = Math.floor(rupees / 100000);
    if (lakhs > 0) {
      words += convertBelowThousand(lakhs) + ' Lakh ';
      rupees %= 100000;
    }

    // Thousands (>= 1,000)
    const thousands = Math.floor(rupees / 1000);
    if (thousands > 0) {
      words += convertBelowThousand(thousands) + ' Thousand ';
      rupees %= 1000;
    }

    // Hundreds and remaining (< 1,000)
    if (rupees > 0) {
      words += convertBelowThousand(rupees) + ' ';
    }

    words = words.trim() + ' Rupees';
  }

  if (paise > 0) {
    const paiseWords = convertBelowThousand(paise);
    if (words) {
      words += ' and ' + paiseWords + ' Paise';
    } else {
      words = paiseWords + ' Paise';
    }
  }

  return (words.trim() + ' Only').replace(/\s+/g, ' ');
}

module.exports = { convertToIndianWords };

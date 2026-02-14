const formatNumberWithSeparator = (number: number): string => {
  return new Intl.NumberFormat('id-ID').format(number);
};


const normalizeToTwoDigit = (param: number) => {
  if (param < 10) {
    return `0${param}`;
  } else return param;
};


// Fungsi bantu (parse angka format Indonesia)
const parseIDNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  const str = value.toString().trim();

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  // Case 1: Both separators exist (e.g. 12.000,50 or 12,000.50)
  if (hasComma && hasDot) {
    // If comma appears after dot -> ID Format (12.000,50)
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      return parseFloat(str.replace(/\./g, '').replace(/,/g, '.')) || 0;
    }
    // Dot appears after comma -> US Format (12,000.50)
    else {
      return parseFloat(str.replace(/,/g, '')) || 0;
    }
  }

  // Case 2: Only Comma (e.g. 12,5 or 12,000)
  if (hasComma) {
    // Check if it strictly matches US Thousands format (12,000 or 1,234,567)
    // Regex: 1-3 digits, folowed by groups of (, and 3 digits)
    const isUSThousands = /^\d{1,3}(,\d{3})+$/.test(str);
    if (isUSThousands) {
      return parseFloat(str.replace(/,/g, '')) || 0;
    }
    // Otherwise assume comma is decimal separator (12,5 or 123,45)
    return parseFloat(str.replace(/,/g, '.')) || 0;
  }

  // Case 3: Only Dot (e.g. 12.5 or 12.000)
  if (hasDot) {
    // Check if it strictly matches ID Thousands format (12.000 or 1.234.567)
    const isIDThousands = /^\d{1,3}(\.\d{3})+$/.test(str);
    if (isIDThousands) {
      return parseFloat(str.replace(/\./g, '')) || 0;
    }
    // Otherwise assume dot is decimal separator (12.5)
    return parseFloat(str) || 0;
  }

  // Case 4: No separators, plain integer
  return parseFloat(str) || 0;
};




export { formatNumberWithSeparator, normalizeToTwoDigit, parseIDNumber }


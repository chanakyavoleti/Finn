/**
 * Financial Precision & Indian Number Formatting Utilities
 * Handles exact decimal arithmetic, Indian numbering system (Lakhs & Crores),
 * and multi-currency formatting without floating-point inaccuracies.
 */

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SGD';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  decimals: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', decimals: 2 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB', decimals: 2 },
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', locale: 'ar-AE', decimals: 2 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG', decimals: 2 },
};

/**
 * Format currency according to regional rules.
 * For INR: uses Indian numbering system (e.g. ₹1,23,456.78).
 */
export function formatMoney(
  amount: number,
  currencyCode: CurrencyCode = 'INR',
  options: { compact?: boolean; showSymbol?: boolean } = {}
): string {
  const { compact = false, showSymbol = true } = options;
  const config = CURRENCIES[currencyCode] || CURRENCIES.INR;
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  if (compact && currencyCode === 'INR') {
    // Indian compact format: Thousands (K), Lakhs (L), Crores (Cr)
    if (absAmount >= 10000000) {
      const cr = (absAmount / 10000000).toFixed(2);
      return `${isNegative ? '-' : ''}${showSymbol ? '₹' : ''}${cr} Cr`;
    }
    if (absAmount >= 100000) {
      const lk = (absAmount / 100000).toFixed(2);
      return `${isNegative ? '-' : ''}${showSymbol ? '₹' : ''}${lk} L`;
    }
    if (absAmount >= 1000) {
      const k = (absAmount / 1000).toFixed(1);
      return `${isNegative ? '-' : ''}${showSymbol ? '₹' : ''}${k}k`;
    }
  }

  // Format using standard Intl.NumberFormat
  try {
    const formatter = new Intl.NumberFormat(config.locale, {
      style: showSymbol ? 'currency' : 'decimal',
      currency: config.code,
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    });
    return formatter.format(amount);
  } catch {
    // Fallback if Intl fails
    const fixed = absAmount.toFixed(config.decimals);
    return `${isNegative ? '-' : ''}${showSymbol ? config.symbol : ''}${fixed}`;
  }
}

/**
 * Clean and format Indian numbers explicitly.
 * e.g., 1234567.89 -> "12,34,567.89"
 */
export function formatIndianNumber(num: number): string {
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const parts = absNum.toFixed(2).split('.');
  let intPart = parts[0];
  const decPart = parts[1];

  if (intPart.length > 3) {
    const lastThree = intPart.substring(intPart.length - 3);
    const otherNumbers = intPart.substring(0, intPart.length - 3);
    intPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  return (isNegative ? '-' : '') + intPart + '.' + decPart;
}

/**
 * Money safe addition using integer cents/paise to avoid IEEE-754 floating point drift.
 */
export function addMoney(a: number, b: number): number {
  return (Math.round(a * 100) + Math.round(b * 100)) / 100;
}

/**
 * Money safe subtraction using integer cents/paise.
 */
export function subtractMoney(a: number, b: number): number {
  return (Math.round(a * 100) - Math.round(b * 100)) / 100;
}

/**
 * Multiply monetary value safely by a quantity or factor.
 */
export function multiplyMoney(amount: number, factor: number): number {
  return Math.round(amount * factor * 100) / 100;
}

/**
 * Sanitize cell values for CSV export to prevent formula injection.
 * Escapes leading =, +, -, @, \t, \r with a single quote.
 */
export function sanitizeCsvCell(value: string | number): string {
  if (typeof value === 'number') return value.toString();
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str.replace(/"/g, '""')}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

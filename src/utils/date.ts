/**
 * Financial Date and Fiscal Year (FY) Utilities
 * Handles Indian Financial Year (Apr 1 - Mar 31), Quarters (Q1-Q4),
 * and timezone-aware timestamps (Asia/Kolkata / IST).
 */

export interface FiscalPeriod {
  label: string;
  startDate: string;
  endDate: string;
  fiscalYear: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
}

/**
 * Get current Indian Fiscal Year for any given date.
 * If month >= April (3), FY is currentYear - (currentYear + 1).
 * If month < April, FY is (currentYear - 1) - currentYear.
 */
export function getIndianFiscalYear(date: Date = new Date()): string {
  const month = date.getMonth(); // 0-indexed: 0 = Jan, 3 = Apr
  const year = date.getFullYear();

  if (month >= 3) {
    const nextYearShort = String(year + 1).slice(-2);
    return `FY ${year}-${nextYearShort}`;
  } else {
    const currentYearShort = String(year).slice(-2);
    return `FY ${year - 1}-${currentYearShort}`;
  }
}

/**
 * Get the current fiscal quarter according to Indian FY (Apr-Jun = Q1, Jul-Sep = Q2, Oct-Dec = Q3, Jan-Mar = Q4).
 */
export function getIndianFiscalQuarter(date: Date = new Date()): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  const month = date.getMonth();
  if (month >= 3 && month <= 5) return 'Q1';
  if (month >= 6 && month <= 8) return 'Q2';
  if (month >= 9 && month <= 11) return 'Q3';
  return 'Q4';
}

/**
 * Return start and end date bounds for a fiscal period.
 */
export function getFiscalYearBounds(date: Date = new Date()): { start: string; end: string; label: string } {
  const month = date.getMonth();
  const year = date.getFullYear();
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;

  return {
    start: `${startYear}-04-01`,
    end: `${endYear}-03-31`,
    label: `FY ${startYear}-${String(endYear).slice(-2)}`,
  };
}

/**
 * Format date in Indian readable format (DD MMM YYYY or DD/MM/YYYY).
 */
export function formatIndianDate(dateInput: string | Date, format: 'readable' | 'standard' = 'readable'): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);

  if (format === 'standard') {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Timezone-aware IST timestamp formatted string.
 */
export function getIstTimestamp(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
}

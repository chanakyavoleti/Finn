import { describe, it, expect } from 'vitest';
import { 
  formatMoney, 
  formatIndianNumber, 
  addMoney, 
  subtractMoney, 
  multiplyMoney, 
  sanitizeCsvCell 
} from '../utils/currency';

describe('Currency and Indian Number Formatting Utilities', () => {
  it('formats Indian numbers with standard Lakhs and Crores commas', () => {
    expect(formatIndianNumber(1000)).toBe('1,000.00');
    expect(formatIndianNumber(100000)).toBe('1,00,000.00');
    expect(formatIndianNumber(1234567.89)).toBe('12,34,567.89');
    expect(formatIndianNumber(10000000)).toBe('1,00,00,000.00');
    expect(formatIndianNumber(-45200.5)).toBe('-45,200.50');
  });

  it('formats compact Indian representation for Lakhs (L) and Crores (Cr)', () => {
    expect(formatMoney(15000000, 'INR', { compact: true })).toBe('₹1.50 Cr');
    expect(formatMoney(2500000, 'INR', { compact: true })).toBe('₹25.00 L');
    expect(formatMoney(85000, 'INR', { compact: true })).toBe('₹85.0k');
  });

  it('performs exact decimal arithmetic avoiding IEEE-754 floating point drift', () => {
    // Classic 0.1 + 0.2 = 0.30000000000000004 bug
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(addMoney(0.1, 0.2)).toBe(0.3);

    // Subtle penny subtraction
    expect(subtractMoney(100.05, 50.04)).toBe(50.01);

    // Multi-item additions
    const item1 = 19.99;
    const item2 = 29.95;
    expect(addMoney(item1, item2)).toBe(49.94);

    // Safe multiplication
    expect(multiplyMoney(10.55, 3)).toBe(31.65);
  });

  it('sanitizes formula injection characters in CSV exports', () => {
    // Excel/Calc dangerous characters: =, +, -, @, tab
    expect(sanitizeCsvCell('=1+1')).toBe("'=1+1");
    expect(sanitizeCsvCell('+cmd|')).toBe("'+cmd|");
    expect(sanitizeCsvCell('-@danger')).toBe("'-@danger");
    expect(sanitizeCsvCell('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
    expect(sanitizeCsvCell('Normal Merchant')).toBe('"Normal Merchant"');
    expect(sanitizeCsvCell(1250.5)).toBe('1250.5');
  });
});

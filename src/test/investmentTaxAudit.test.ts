import { describe, it, expect } from 'vitest';
import { addMoney, subtractMoney, multiplyMoney } from '../utils/currency';

interface HoldingPosition {
  symbol: string;
  name: string;
  assetClass: 'listed_equity' | 'equity_mf' | 'unlisted_us_equity' | 'debt_mf' | 'crypto' | 'sgb';
  shares: number;
  avgCost: number;
  currentPrice: number;
  holdingPeriodMonths: number;
}

/**
 * Independent Indian Tax Engine (Finance Act 2024 / FY 2024-25 / FY 2025-26)
 */
class IndianTaxAuditEngine {
  static readonly EQUITY_LTCG_EXEMPTION = 125000; // ₹1.25 Lakh annual exemption

  static calculateTax(position: HoldingPosition, sellQuantity: number, sellPrice: number): {
    proceeds: number;
    costBasis: number;
    realizedGain: number;
    taxRate: number;
    taxableGain: number;
    estimatedTax: number;
    taxClassification: string;
  } {
    const proceeds = multiplyMoney(sellQuantity, sellPrice);
    const costBasis = multiplyMoney(sellQuantity, position.avgCost);
    const realizedGain = subtractMoney(proceeds, costBasis);

    if (realizedGain <= 0) {
      return {
        proceeds,
        costBasis,
        realizedGain,
        taxRate: 0,
        taxableGain: 0,
        estimatedTax: 0,
        taxClassification: 'Capital Loss'
      };
    }

    switch (position.assetClass) {
      case 'listed_equity':
      case 'equity_mf': {
        // Threshold: 12 months
        const isLongTerm = position.holdingPeriodMonths > 12;
        if (isLongTerm) {
          // LTCG: 12.5% on gains exceeding ₹1.25L exemption
          const taxable = Math.max(0, realizedGain - this.EQUITY_LTCG_EXEMPTION);
          return {
            proceeds,
            costBasis,
            realizedGain,
            taxRate: 0.125,
            taxableGain: taxable,
            estimatedTax: Math.round(taxable * 0.125 * 100) / 100,
            taxClassification: 'LTCG (12.5% post-exemption)'
          };
        } else {
          // STCG: Flat 20% under Section 111A (Finance Act 2024)
          return {
            proceeds,
            costBasis,
            realizedGain,
            taxRate: 0.20,
            taxableGain: realizedGain,
            estimatedTax: Math.round(realizedGain * 0.20 * 100) / 100,
            taxClassification: 'STCG Section 111A (20%)'
          };
        }
      }

      case 'unlisted_us_equity': {
        // Foreign shares (e.g. US stocks AAPL, GOOG):
        // Threshold: 24 months
        const isLongTerm = position.holdingPeriodMonths > 24;
        if (isLongTerm) {
          // LTCG: 12.5% without indexation (Finance Act 2024, no ₹1.25L exemption)
          return {
            proceeds,
            costBasis,
            realizedGain,
            taxRate: 0.125,
            taxableGain: realizedGain,
            estimatedTax: Math.round(realizedGain * 0.125 * 100) / 100,
            taxClassification: 'Foreign Equity LTCG (12.5%)'
          };
        } else {
          // STCG: Marginal Slab Rate (assuming 30% bracket)
          return {
            proceeds,
            costBasis,
            realizedGain,
            taxRate: 0.30,
            taxableGain: realizedGain,
            estimatedTax: Math.round(realizedGain * 0.30 * 100) / 100,
            taxClassification: 'Foreign Equity STCG (Slab Rate 30%)'
          };
        }
      }

      case 'debt_mf': {
        // Section 50AA: All gains taxed at slab rates regardless of holding period (zero indexation)
        return {
          proceeds,
          costBasis,
          realizedGain,
          taxRate: 0.30,
          taxableGain: realizedGain,
          estimatedTax: Math.round(realizedGain * 0.30 * 100) / 100,
          taxClassification: 'Debt Mutual Fund (Section 50AA Slab Rate)'
        };
      }

      case 'crypto': {
        // Section 115BBH: Flat 30% + 4% cess (31.2%). No basic exemption. No loss set-off.
        const tax = Math.round(realizedGain * 0.30 * 1.04 * 100) / 100;
        return {
          proceeds,
          costBasis,
          realizedGain,
          taxRate: 0.312,
          taxableGain: realizedGain,
          estimatedTax: tax,
          taxClassification: 'VDA Section 115BBH (30% + 4% Cess)'
        };
      }

      case 'sgb': {
        // Sovereign Gold Bonds held to maturity (8 years) are 100% tax exempt
        if (position.holdingPeriodMonths >= 96) {
          return {
            proceeds,
            costBasis,
            realizedGain,
            taxRate: 0,
            taxableGain: 0,
            estimatedTax: 0,
            taxClassification: 'SGB Maturity (Section 47 Exempt)'
          };
        }
        return {
          proceeds,
          costBasis,
          realizedGain,
          taxRate: 0.125,
          taxableGain: realizedGain,
          estimatedTax: Math.round(realizedGain * 0.125 * 100) / 100,
          taxClassification: 'SGB Secondary Sale LTCG (12.5%)'
        };
      }
    }
  }
}

describe('Phase 6: Investment Portfolio & Indian Tax Audit (Finance Act 2024)', () => {
  it('Calculates weighted average cost basis across multiple purchase tranches', () => {
    // Tranche 1: 50 shares @ ₹1,000 = ₹50,000
    // Tranche 2: 30 shares @ ₹1,200 = ₹36,000
    // Tranche 3: 20 shares @ ₹1,500 = ₹30,000
    // Total: 100 shares, Total Cost: ₹1,16,000 -> Avg Cost: ₹1,160.00
    const tranches = [
      { shares: 50, cost: 1000 },
      { shares: 30, cost: 1200 },
      { shares: 20, cost: 1500 }
    ];

    const totalShares = tranches.reduce((sum, t) => sum + t.shares, 0);
    const totalCost = tranches.reduce((sum, t) => addMoney(sum, multiplyMoney(t.shares, t.cost)), 0);
    const avgCost = Math.round((totalCost / totalShares) * 100) / 100;

    expect(totalShares).toBe(100);
    expect(totalCost).toBe(116000.00);
    expect(avgCost).toBe(1160.00);
  });

  it('Calculates partial liquidation with remaining quantity and realized gain', () => {
    // 100 shares @ ₹1,160.00. Sell 40 shares @ ₹1,800.00.
    const avgCost = 1160.00;
    const initialShares = 100;
    const sellShares = 40;
    const sellPrice = 1800.00;

    const remainingShares = initialShares - sellShares;
    const realizedProceeds = multiplyMoney(sellShares, sellPrice); // 72,000
    const realizedCostBasis = multiplyMoney(sellShares, avgCost);  // 46,400
    const realizedGain = subtractMoney(realizedProceeds, realizedCostBasis); // 25,600

    expect(remainingShares).toBe(60);
    expect(realizedProceeds).toBe(72000.00);
    expect(realizedCostBasis).toBe(46400.00);
    expect(realizedGain).toBe(25600.00);
  });

  it('Verifies Indian Listed Equities LTCG with ₹1.25 Lakh exemption applied', () => {
    const position: HoldingPosition = {
      symbol: 'RELIANCE',
      name: 'Reliance Industries',
      assetClass: 'listed_equity',
      shares: 100,
      avgCost: 1500,
      currentPrice: 3000,
      holdingPeriodMonths: 18 // > 12 months = LTCG
    };

    // Gain = 100 * (3000 - 1500) = ₹1,50,000
    // Exemption = ₹1,25,000 -> Taxable = ₹25,000 @ 12.5% = ₹3,125.00
    const tax = IndianTaxAuditEngine.calculateTax(position, 100, 3000);
    expect(tax.realizedGain).toBe(150000.00);
    expect(tax.taxableGain).toBe(25000.00);
    expect(tax.estimatedTax).toBe(3125.00);
    expect(tax.taxClassification).toBe('LTCG (12.5% post-exemption)');
  });

  it('Verifies Indian Listed Equities STCG at flat 20% under Finance Act 2024', () => {
    const position: HoldingPosition = {
      symbol: 'TATASTEEL',
      name: 'Tata Steel',
      assetClass: 'listed_equity',
      shares: 500,
      avgCost: 120,
      currentPrice: 160,
      holdingPeriodMonths: 6 // <= 12 months = STCG
    };

    // Gain = 500 * 40 = ₹20,000 @ 20% = ₹4,000.00
    const tax = IndianTaxAuditEngine.calculateTax(position, 500, 160);
    expect(tax.realizedGain).toBe(20000.00);
    expect(tax.taxableGain).toBe(20000.00);
    expect(tax.estimatedTax).toBe(4000.00);
    expect(tax.taxClassification).toBe('STCG Section 111A (20%)');
  });

  it('Verifies Debt Mutual Fund gains taxed at slab rates without indexation (Section 50AA)', () => {
    const position: HoldingPosition = {
      symbol: 'HDFC_DEBT_FUND',
      name: 'HDFC Short Term Debt Fund',
      assetClass: 'debt_mf',
      shares: 1000,
      avgCost: 25,
      currentPrice: 30,
      holdingPeriodMonths: 36 // Even if held > 36 months, Section 50AA eliminates LTCG
    };

    const tax = IndianTaxAuditEngine.calculateTax(position, 1000, 30);
    expect(tax.realizedGain).toBe(5000.00);
    expect(tax.taxRate).toBe(0.30);
    expect(tax.estimatedTax).toBe(1500.00);
    expect(tax.taxClassification).toBe('Debt Mutual Fund (Section 50AA Slab Rate)');
  });

  it('Verifies Crypto / VDA taxation at flat 30% plus 4% cess under Section 115BBH', () => {
    const position: HoldingPosition = {
      symbol: 'BTC',
      name: 'Bitcoin Cold Storage',
      assetClass: 'crypto',
      shares: 0.1,
      avgCost: 4000000,
      currentPrice: 7000000,
      holdingPeriodMonths: 24
    };

    // Proceeds = 7,00,000, Cost = 4,00,000, Gain = 3,00,000
    // Tax = 3,00,000 * 30% = 90,000 + 4% cess (3,600) = ₹93,600.00
    const tax = IndianTaxAuditEngine.calculateTax(position, 0.1, 7000000);
    expect(tax.realizedGain).toBe(300000.00);
    expect(tax.estimatedTax).toBe(93600.00);
    expect(tax.taxClassification).toBe('VDA Section 115BBH (30% + 4% Cess)');
  });
});

import { describe, it, expect } from 'vitest';
import { 
  addBuyLot, 
  executePositionSale, 
  estimateIndianCapitalGainsTax,
  HoldingPosition 
} from '../utils/investmentCalculator';

describe('Investment Portfolio & Indian Capital Gains Calculations', () => {
  const initialHolding: HoldingPosition = {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    assetType: 'equity_in',
    quantity: 100,
    averageCostBasis: 2500.0,
    currentMarketPrice: 3000.0,
    currency: 'INR',
  };

  it('calculates weighted-average cost basis after an additional buy lot', () => {
    // Current: 100 shares @ 2500 = ₹2,50,000
    // Buy: 50 shares @ 2800 + ₹100 fees = ₹1,40,100
    // Total: 150 shares for ₹3,90,100 -> avg = 2600.6667
    const result = addBuyLot(initialHolding, 50, 2800, 100);

    expect(result.newQuantity).toBe(150);
    expect(result.newAverageCostBasis).toBeCloseTo(2600.6667, 2);
  });

  it('calculates partial position sale, realized P&L, and remaining shares accurately', () => {
    // Current: 100 shares @ 2500 avg cost
    // Sell: 40 shares @ 3100, with ₹120 fees + STT
    // Proceeds = 40 * 3100 = 124,000
    // Cost of sold = 40 * 2500 = 100,000
    // Realized gain = 124,000 - 100,000 - 120 = 23,880
    const sale = executePositionSale(initialHolding, 40, 3100, 120);

    expect(sale.soldQuantity).toBe(40);
    expect(sale.totalGrossProceeds).toBe(124000);
    expect(sale.costOfSoldShares).toBe(100000);
    expect(sale.realizedGainLoss).toBe(23880);
    expect(sale.remainingQuantity).toBe(60);
    expect(sale.updatedAverageCost).toBe(2500); // Cost basis per share remains invariant in weighted-average
  });

  it('rejects invalid sale quantities exceeding available inventory', () => {
    expect(() => executePositionSale(initialHolding, 150, 3000)).toThrow(/only 100 units/);
    expect(() => executePositionSale(initialHolding, 0, 3000)).toThrow(/greater than zero/);
  });

  it('estimates Indian Capital Gains Tax under Finance Act 2024', () => {
    // Short-Term Capital Gain (< 12 months holding on equity) -> 20%
    const stcg = estimateIndianCapitalGainsTax(50000, 6, 'equity_in');
    expect(stcg.taxType).toBe('STCG');
    expect(stcg.taxRatePct).toBe(20);
    expect(stcg.estimatedTax).toBe(10000);

    // Long-Term Capital Gain (>= 12 months) -> First ₹1.25L exempt, 12.5% on remainder
    const ltcgSmall = estimateIndianCapitalGainsTax(100000, 18, 'equity_in');
    expect(ltcgSmall.taxType).toBe('LTCG');
    expect(ltcgSmall.taxableGain).toBe(0); // Under ₹1.25L exemption
    expect(ltcgSmall.estimatedTax).toBe(0);

    const ltcgLarge = estimateIndianCapitalGainsTax(225000, 24, 'equity_in');
    // Gain = 2,25,000. Exemption = 1,25,000. Taxable = 1,00,000 @ 12.5% = ₹12,500
    expect(ltcgLarge.taxType).toBe('LTCG');
    expect(ltcgLarge.taxableGain).toBe(100000);
    expect(ltcgLarge.estimatedTax).toBe(12500);
  });
});

/**
 * Investment Portfolio & Capital Gains Calculation Engine
 * Implements authoritative cost basis tracking, partial sales accounting,
 * and Indian tax rules (STCG vs LTCG as per Finance Act 2024).
 */

export interface BuyLot {
  date: string;
  quantity: number;
  pricePerUnit: number;
  fees: number;
}

export interface HoldingPosition {
  symbol: string;
  name: string;
  assetType: 'equity_in' | 'mutual_fund' | 'etf' | 'gold' | 'fixed_deposit' | 'bonds';
  quantity: number;
  averageCostBasis: number;
  currentMarketPrice: number;
  currency: string;
}

export interface PartialSaleResult {
  soldQuantity: number;
  sellPricePerUnit: number;
  totalGrossProceeds: number;
  costOfSoldShares: number;
  feesAndStt: number;
  realizedGainLoss: number;
  remainingQuantity: number;
  updatedAverageCost: number;
}

/**
 * Calculate the outcome of a partial or full position sale using weighted-average cost basis.
 */
export function executePositionSale(
  currentHolding: HoldingPosition,
  soldQuantity: number,
  sellPricePerUnit: number,
  feesAndStt: number = 0
): PartialSaleResult {
  if (soldQuantity <= 0) {
    throw new Error('Sold quantity must be greater than zero.');
  }
  if (soldQuantity > currentHolding.quantity) {
    throw new Error(`Cannot sell ${soldQuantity} units; only ${currentHolding.quantity} units are held.`);
  }

  const totalGrossProceeds = soldQuantity * sellPricePerUnit;
  const costOfSoldShares = soldQuantity * currentHolding.averageCostBasis;
  const realizedGainLoss = totalGrossProceeds - costOfSoldShares - feesAndStt;

  const remainingQuantity = currentHolding.quantity - soldQuantity;
  // In weighted-average accounting, selling shares does not change the average cost per unit of remaining shares
  const updatedAverageCost = remainingQuantity > 0 ? currentHolding.averageCostBasis : 0;

  return {
    soldQuantity,
    sellPricePerUnit,
    totalGrossProceeds: Math.round(totalGrossProceeds * 100) / 100,
    costOfSoldShares: Math.round(costOfSoldShares * 100) / 100,
    feesAndStt,
    realizedGainLoss: Math.round(realizedGainLoss * 100) / 100,
    remainingQuantity,
    updatedAverageCost,
  };
}

/**
 * Add a new buy lot and calculate the new weighted-average cost basis.
 */
export function addBuyLot(
  currentHolding: HoldingPosition,
  additionalQuantity: number,
  purchasePricePerUnit: number,
  brokerageFees: number = 0
): { newQuantity: number; newAverageCostBasis: number } {
  if (additionalQuantity <= 0) {
    throw new Error('Quantity must be greater than zero.');
  }

  const existingTotalCost = currentHolding.quantity * currentHolding.averageCostBasis;
  const newLotTotalCost = additionalQuantity * purchasePricePerUnit + brokerageFees;

  const newQuantity = currentHolding.quantity + additionalQuantity;
  const newAverageCostBasis = (existingTotalCost + newLotTotalCost) / newQuantity;

  return {
    newQuantity,
    newAverageCostBasis: Math.round(newAverageCostBasis * 10000) / 10000,
  };
}

/**
 * Calculate Indian Capital Gains Tax estimate under Finance Act 2024.
 * - Equity / Equity MFs held < 12 months: STCG @ 20%
 * - Equity / Equity MFs held >= 12 months: LTCG @ 12.5% on gains exceeding ₹1,25,000 threshold
 */
export function estimateIndianCapitalGainsTax(
  realizedGain: number,
  holdingPeriodMonths: number,
  assetType: HoldingPosition['assetType']
): { taxableGain: number; taxRatePct: number; estimatedTax: number; taxType: 'STCG' | 'LTCG' | 'SLAB' } {
  if (realizedGain <= 0) {
    return { taxableGain: 0, taxRatePct: 0, estimatedTax: 0, taxType: 'STCG' };
  }

  if (assetType === 'equity_in' || assetType === 'etf' || assetType === 'mutual_fund') {
    if (holdingPeriodMonths < 12) {
      // Short-Term Capital Gains
      const taxRate = 20; // 20% flat
      return {
        taxableGain: realizedGain,
        taxRatePct: taxRate,
        estimatedTax: Math.round((realizedGain * (taxRate / 100)) * 100) / 100,
        taxType: 'STCG',
      };
    } else {
      // Long-Term Capital Gains: ₹1.25L exemption
      const exemption = 125000;
      const taxable = Math.max(realizedGain - exemption, 0);
      const taxRate = 12.5; // 12.5% flat
      return {
        taxableGain: taxable,
        taxRatePct: taxRate,
        estimatedTax: Math.round((taxable * (taxRate / 100)) * 100) / 100,
        taxType: 'LTCG',
      };
    }
  }

  // Debt, FDs taxed at income tax slab (approximate baseline 30%)
  return {
    taxableGain: realizedGain,
    taxRatePct: 30,
    estimatedTax: Math.round((realizedGain * 0.3) * 100) / 100,
    taxType: 'SLAB',
  };
}

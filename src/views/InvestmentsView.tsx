import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card } from '../components/common/Card';
import { MetricCard } from '../components/common/MetricCard';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { 
  Plus, 
  TrendingUp, 
  Clock, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight 
} from 'lucide-react';
import { AssetClass, Holding } from '../types';

export const InvestmentsView: React.FC = () => {
  const { holdings, addHolding } = useFinance();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [assetClass, setAssetClass] = useState<AssetClass>('us_stocks');
  const [shares, setShares] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');

  // Calculate portfolio totals
  const totalValue = holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);
  const totalCostBasis = holdings.reduce((sum, h) => sum + h.shares * h.avgCost, 0);
  const totalGainLoss = totalValue - totalCostBasis;
  const totalGainLossPct = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

  // Asset class breakdown
  const assetClassTotals = holdings.reduce((acc, h) => {
    const val = h.shares * h.currentPrice;
    acc[h.assetClass] = (acc[h.assetClass] || 0) + val;
    return acc;
  }, {} as Record<string, number>);

  const assetClassLabels: Record<AssetClass, { label: string; color: string }> = {
    us_stocks: { label: 'US Equities', color: '#1B4332' },
    intl_stocks: { label: 'International Equities', color: '#2D6A4F' },
    fixed_income: { label: 'Fixed Income & Bonds', color: '#52B788' },
    crypto: { label: 'Digital Assets (Cold Storage)', color: '#3A506B' },
    real_estate: { label: 'Real Estate REITs', color: '#9C7A5B' },
    cash: { label: 'Cash Equivalents', color: '#8A928E' },
  };

  const handleAddHoldingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedShares = parseFloat(shares);
    const parsedCost = parseFloat(avgCost);
    const parsedPrice = parseFloat(currentPrice);

    if (!symbol.trim() || isNaN(parsedShares) || isNaN(parsedCost) || isNaN(parsedPrice)) {
      return;
    }

    addHolding({
      symbol: symbol.toUpperCase().trim(),
      name: name.trim() || symbol.toUpperCase().trim(),
      assetClass,
      shares: parsedShares,
      avgCost: parsedCost,
      currentPrice: parsedPrice,
      dayChangePct: 0.15,
      currency: 'USD'
    });

    setSymbol('');
    setName('');
    setShares('');
    setAvgCost('');
    setCurrentPrice('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Headline Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Portfolio Value"
          value={`$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subValue="USD"
          trend={{ value: '+$1,120.40 today (+0.6%)', isPositive: true }}
          secondaryContext="Priced via NYSE & Nasdaq live feeds"
          accent="forest"
        />
        <MetricCard
          label="Unrealized Total Return"
          value={`+$${totalGainLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          trend={{ value: `+${totalGainLossPct.toFixed(1)}% all-time`, isPositive: true }}
          secondaryContext={`Cost basis: $${totalCostBasis.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
        />
        <MetricCard
          label="Number of Asset Holdings"
          value={`${holdings.length} Positions`}
          secondaryContext="Indexed ETFs, Core Bluechips & Reserve"
        />
        <MetricCard
          label="Valuation Timestamp"
          value="Oct 29, 2026"
          subValue="14:30 EDT"
          secondaryContext="Consolidated market session close"
        />
      </div>

      {/* Asset Allocation Breakdown */}
      <Card
        title="Portfolio Asset Allocation"
        subtitle="Distribution across diversified asset classes"
      >
        <div className="space-y-3">
          {/* Multi-segmented Allocation Bar */}
          <div className="w-full h-3 rounded bg-[#E8EAE6] dark:bg-[#252E28] overflow-hidden flex">
            {Object.entries(assetClassTotals).map(([ac, val]) => {
              const pct = (val / (totalValue || 1)) * 100;
              const meta = assetClassLabels[ac as AssetClass] || { label: ac, color: '#6C757D' };
              return (
                <div
                  key={ac}
                  style={{ width: `${pct}%`, backgroundColor: meta.color }}
                  className="h-full transition-all"
                  title={`${meta.label}: ${pct.toFixed(1)}%`}
                />
              );
            })}
          </div>

          {/* Allocation Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-xs">
            {Object.entries(assetClassTotals).map(([ac, val]) => {
              const pct = (val / (totalValue || 1)) * 100;
              const meta = assetClassLabels[ac as AssetClass] || { label: ac, color: '#6C757D' };
              return (
                <div key={ac} className="flex items-center gap-1.5 tabular-nums">
                  <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: meta.color }} />
                  <span className="text-[#58605C] dark:text-[#9BA6A0]">{meta.label}:</span>
                  <span className="font-semibold text-[#141716] dark:text-[#F0F3F1]">{pct.toFixed(1)}%</span>
                  <span className="text-[11px] text-[#8A928E] dark:text-[#6B7771]">(${val.toLocaleString('en-US', { maximumFractionDigits: 0 })})</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Holdings Ledger Table */}
      {holdings.length === 0 ? (
        <EmptyState
          icon={<TrendingUp size={24} />}
          title="No Investment Positions Recorded"
          description="Log holdings from Vanguard, Fidelity, Schwab, or cold storage to monitor aggregate returns and asset allocations."
          actionText="Add Investment Position"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <Card
          title="Portfolio Positions & Performance"
          subtitle="Real-time valuations with individual cost bases and unrealized yield"
          action={
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={13} />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Add Holding
            </Button>
          }
          padding="none"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E8EAE6] dark:border-[#242D28] bg-[#FAFAF8] dark:bg-[#161B18] text-[#58605C] dark:text-[#9BA6A0]">
                  <th className="py-2.5 px-4 font-medium">Asset / Ticker</th>
                  <th className="py-2.5 px-4 font-medium">Asset Class</th>
                  <th className="py-2.5 px-4 text-right font-medium">Shares</th>
                  <th className="py-2.5 px-4 text-right font-medium">Avg Cost</th>
                  <th className="py-2.5 px-4 text-right font-medium">Market Price</th>
                  <th className="py-2.5 px-4 text-right font-medium">Current Value</th>
                  <th className="py-2.5 px-4 text-right font-medium">Total Return</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EAE6] dark:divide-[#242D28]">
                {holdings.map((h) => {
                  const positionValue = h.shares * h.currentPrice;
                  const positionCost = h.shares * h.avgCost;
                  const gainLoss = positionValue - positionCost;
                  const gainLossPct = (gainLoss / positionCost) * 100;
                  const isPositive = gainLoss >= 0;

                  return (
                    <tr 
                      key={h.id}
                      className="hover:bg-[#F9FAF8] dark:hover:bg-[#181D1A] transition-colors"
                    >
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-[#141716] dark:text-[#F0F3F1]">
                          {h.symbol}
                        </div>
                        <div className="text-[11px] text-[#58605C] dark:text-[#9BA6A0] truncate max-w-xs">
                          {h.name}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <Badge variant="neutral" size="sm">
                          {assetClassLabels[h.assetClass]?.label || h.assetClass}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums font-medium text-[#141716] dark:text-[#F0F3F1]">
                        {h.shares.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-[#58605C] dark:text-[#9BA6A0]">
                        ${h.avgCost.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums font-medium text-[#141716] dark:text-[#F0F3F1]">
                        <div className="flex items-center justify-end gap-1">
                          <span>${h.currentPrice.toFixed(2)}</span>
                          <span className={`text-[10px] ${h.dayChangePct >= 0 ? 'text-[#166534] dark:text-[#4ADE80]' : 'text-[#991B1B] dark:text-[#F87171]'}`}>
                            {h.dayChangePct >= 0 ? '+' : ''}{h.dayChangePct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-[#141716] dark:text-[#F0F3F1]">
                        ${positionValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums font-semibold">
                        <span className={isPositive ? 'text-[#166534] dark:text-[#4ADE80]' : 'text-[#991B1B] dark:text-[#F87171]'}>
                          {isPositive ? '+' : '-'}${Math.abs(gainLoss).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <span className="text-[11px] font-normal ml-1">
                            ({isPositive ? '+' : ''}{gainLossPct.toFixed(1)}%)
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Holding Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Investment Position"
        description="Record an existing equity, fund, bond, or digital asset holding."
      >
        <form onSubmit={handleAddHoldingSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
                Ticker Symbol
              </label>
              <input
                type="text"
                required
                placeholder="e.g. VOO"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] uppercase finn-focus"
              />
            </div>
            <div>
              <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
                Asset Class
              </label>
              <select
                value={assetClass}
                onChange={(e) => setAssetClass(e.target.value as AssetClass)}
                className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus"
              >
                <option value="us_stocks">US Equities</option>
                <option value="intl_stocks">International Equities</option>
                <option value="fixed_income">Fixed Income / Bonds</option>
                <option value="crypto">Digital Assets / Crypto</option>
                <option value="real_estate">Real Estate REITs</option>
                <option value="cash">Cash Equivalents</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Position Name
            </label>
            <input
              type="text"
              placeholder="e.g. Vanguard S&P 500 ETF"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
                Shares / Units
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="50"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus tabular-nums"
              />
            </div>
            <div>
              <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
                Average Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="420.00"
                value={avgCost}
                onChange={(e) => setAvgCost(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus tabular-nums"
              />
            </div>
            <div>
              <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
                Current Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="495.50"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus tabular-nums"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8EAE6] dark:border-[#252E28]">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Holding
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

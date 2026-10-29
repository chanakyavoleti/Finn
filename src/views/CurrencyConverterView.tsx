import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { MetricCard } from '../components/common/MetricCard';
import { ArrowLeftRight, Clock, Globe, TrendingUp, TrendingDown } from 'lucide-react';

export const CurrencyConverterView: React.FC = () => {
  const { currencyPairs } = useFinance();

  const [amount, setAmount] = useState<string>('1000');
  const [fromCode, setFromCode] = useState<string>('USD');
  const [toCode, setToCode] = useState<string>('EUR');

  const fromCurrency = currencyPairs.find(c => c.code === fromCode) || currencyPairs[0];
  const toCurrency = currencyPairs.find(c => c.code === toCode) || currencyPairs[1];

  // Convert: valueInUSD = amount / fromCurrency.rateToUSD; result = valueInUSD * toCurrency.rateToUSD
  const parsedAmount = parseFloat(amount) || 0;
  const valueInUSD = parsedAmount / fromCurrency.rateToUSD;
  const convertedResult = valueInUSD * toCurrency.rateToUSD;

  // Direct exchange rate: 1 From = X To
  const unitRate = (1 / fromCurrency.rateToUSD) * toCurrency.rateToUSD;
  const inverseUnitRate = 1 / (unitRate || 1);

  const handleSwap = () => {
    setFromCode(toCode);
    setToCode(fromCode);
  };

  const timestamp = 'Oct 29, 2026 · 14:30:00 UTC (European Central Bank & Fed Benchmark)';

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Base Currency"
          value="USD ($)"
          secondaryContext="US Federal Reserve Reference Rate"
          accent="forest"
        />
        <MetricCard
          label="Active Pair Rate"
          value={`1 ${fromCode} = ${unitRate.toFixed(4)} ${toCode}`}
          secondaryContext={`Inverse: 1 ${toCode} = ${inverseUnitRate.toFixed(4)} ${fromCode}`}
        />
        <MetricCard
          label="Tracked Sovereign Currencies"
          value={`${currencyPairs.length} Benchmarks`}
          secondaryContext="USD, EUR, GBP, JPY, CHF, CAD, AUD, SGD, INR"
        />
        <MetricCard
          label="Valuation Timestamp"
          value="Oct 29, 2026"
          subValue="14:30 UTC"
          secondaryContext="Real-time interbank reference feeds"
        />
      </div>

      {/* Interactive Converter Calculator */}
      <Card
        title="Institutional Foreign Exchange Calculator"
        subtitle="Mid-market exchange rates without markup or spread fees"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-end">
            {/* Amount & From */}
            <div className="md:col-span-5 space-y-1.5 text-xs">
              <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0]">
                Source Amount & Currency
              </label>
              <div className="flex rounded-md border border-[#E8EAE6] dark:border-[#252E28] overflow-hidden bg-white dark:bg-[#1A1F1C]">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-semibold tabular-nums text-[#141716] dark:text-[#F0F3F1] finn-focus outline-none"
                  placeholder="1000.00"
                />
                <select
                  value={fromCode}
                  onChange={(e) => setFromCode(e.target.value)}
                  className="bg-[#F6F7F5] dark:bg-[#202723] px-3 py-2 text-xs font-semibold text-[#141716] dark:text-[#F0F3F1] border-l border-[#E8EAE6] dark:border-[#252E28] cursor-pointer"
                >
                  {currencyPairs.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Swap Button */}
            <div className="md:col-span-1 flex justify-center pb-0.5">
              <Button
                variant="outline"
                size="md"
                onClick={handleSwap}
                title="Swap source and destination currencies"
                aria-label="Swap currencies"
                className="w-full md:w-auto"
              >
                <ArrowLeftRight size={15} />
              </Button>
            </div>

            {/* To & Converted Result */}
            <div className="md:col-span-5 space-y-1.5 text-xs">
              <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0]">
                Converted Outcome & Destination
              </label>
              <div className="flex rounded-md border border-[#E8EAE6] dark:border-[#252E28] overflow-hidden bg-white dark:bg-[#1A1F1C]">
                <div className="w-full px-3 py-2 text-sm font-bold tabular-nums text-[#1B4332] dark:text-[#52B788] flex items-center bg-[#FAFBF9] dark:bg-[#151917]">
                  {toCurrency.symbol}{convertedResult.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <select
                  value={toCode}
                  onChange={(e) => setToCode(e.target.value)}
                  className="bg-[#F6F7F5] dark:bg-[#202723] px-3 py-2 text-xs font-semibold text-[#141716] dark:text-[#F0F3F1] border-l border-[#E8EAE6] dark:border-[#252E28] cursor-pointer"
                >
                  {currencyPairs.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Timestamp and Rate Guarantee Notice */}
          <div className="p-3 rounded-lg border border-[#E8EAE6] dark:border-[#242D28] bg-[#FAFAF8] dark:bg-[#161B18] flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 text-[#58605C] dark:text-[#9BA6A0]">
              <Clock size={13} className="shrink-0 text-[#1B4332] dark:text-[#52B788]" />
              <span>Exchange Rate Timestamp: <span className="font-medium text-[#141716] dark:text-[#F0F3F1]">{timestamp}</span></span>
            </div>
            <div className="text-[11px] text-[#8A928E] dark:text-[#6B7771] tabular-nums">
              1 {fromCode} = {unitRate.toFixed(4)} {toCode}
            </div>
          </div>
        </div>
      </Card>

      {/* Global Currency Reference Table */}
      <Card
        title="Benchmark Interbank Exchange Board"
        subtitle="Mid-market currency exchange rates pegged to US Dollar benchmark"
        padding="none"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8EAE6] dark:border-[#242D28] bg-[#FAFAF8] dark:bg-[#161B18] text-[#58605C] dark:text-[#9BA6A0]">
                <th className="py-2.5 px-4 font-medium">Currency</th>
                <th className="py-2.5 px-4 font-medium">Symbol</th>
                <th className="py-2.5 px-4 text-right font-medium">Rate to 1 USD</th>
                <th className="py-2.5 px-4 text-right font-medium">USD per 1 Unit</th>
                <th className="py-2.5 px-4 text-right font-medium">24h Benchmark Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EAE6] dark:divide-[#242D28]">
              {currencyPairs.map((pair) => {
                const usdPerUnit = pair.rateToUSD > 0 ? (1 / pair.rateToUSD).toFixed(4) : '1.0000';
                const isPositive = pair.change24h >= 0;

                return (
                  <tr 
                    key={pair.code}
                    className="hover:bg-[#F9FAF8] dark:hover:bg-[#181D1A] transition-colors"
                  >
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-base select-none">{pair.flag}</span>
                        <div>
                          <div className="font-semibold text-[#141716] dark:text-[#F0F3F1]">
                            {pair.code}
                          </div>
                          <div className="text-[11px] text-[#58605C] dark:text-[#9BA6A0]">
                            {pair.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-[#58605C] dark:text-[#9BA6A0] tabular-nums font-medium">
                      {pair.symbol}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-[#141716] dark:text-[#F0F3F1]">
                      {pair.rateToUSD.toFixed(4)}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-[#58605C] dark:text-[#9BA6A0]">
                      ${usdPerUnit}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-medium">
                      {pair.code === 'USD' ? (
                        <span className="text-[#8A928E] dark:text-[#6B7771]">Base (1.000)</span>
                      ) : (
                        <span className={isPositive ? 'text-[#166534] dark:text-[#4ADE80]' : 'text-[#991B1B] dark:text-[#F87171]'}>
                          {isPositive ? '+' : ''}{pair.change24h}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

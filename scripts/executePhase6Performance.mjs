/**
 * FINN — Phase 6 Performance & Workload Benchmark
 * Benchmarks realistic workloads: 1,000, 5,000, and 10,000 transactions.
 * Distinguishes in-memory processing from network and serialization overhead.
 */

function generateMockTransactions(count) {
  const categories = ['Groceries', 'Utilities', 'Dining', 'Investments', 'Shopping', 'Travel'];
  const types = ['expense', 'income', 'expense', 'expense', 'transfer'];
  const txs = [];
  const baseDate = new Date('2026-01-01').getTime();

  for (let i = 0; i < count; i++) {
    txs.push({
      id: `tx-bench-${i}`,
      accountId: 'acc-vault-1',
      date: new Date(baseDate + (i * 3600000)).toISOString().split('T')[0],
      amount: Math.round(((i % 100) + 1) * 75.50 * 100) / 100,
      currency: 'INR',
      type: types[i % types.length],
      category: categories[i % categories.length],
      merchant: `Merchant ${i % 50}`,
      description: `Automated benchmark tx ${i}`
    });
  }
  return txs;
}

function runBenchmark() {
  console.log('=== FINN PHASE 6 PERFORMANCE BENCHMARK ===');

  const counts = [1000, 5000, 10000];
  const results = {};

  for (const count of counts) {
    console.log(`\nTesting workload: ${count} transactions...`);
    const txs = generateMockTransactions(count);

    // 1. In-memory ledger balance calculation (paise precision)
    const t0 = performance.now();
    let balancePaise = 5000000; // ₹50,000.00
    let totalIncomePaise = 0;
    let totalExpensePaise = 0;

    for (const tx of txs) {
      const amountPaise = Math.round(tx.amount * 100);
      if (tx.type === 'income') {
        balancePaise += amountPaise;
        totalIncomePaise += amountPaise;
      } else if (tx.type === 'expense') {
        balancePaise -= amountPaise;
        totalExpensePaise += amountPaise;
      }
    }
    const t1 = performance.now();
    const ledgerTime = t1 - t0;

    // 2. Filter & Sort (Simulating UI search/sort on TransactionsView)
    const t2 = performance.now();
    const filtered = txs.filter(t => t.category === 'Dining' && t.amount > 500)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const t3 = performance.now();
    const filterTime = t3 - t2;

    // 3. JSON Serialization (LocalStorage write emulation)
    const t4 = performance.now();
    const serialized = JSON.stringify(txs);
    const t5 = performance.now();
    const serializeTime = t5 - t4;
    const payloadSizeKb = Math.round(serialized.length / 1024);

    // 4. JSON Deserialization (LocalStorage read emulation)
    const t6 = performance.now();
    const parsed = JSON.parse(serialized);
    const t7 = performance.now();
    const deserializeTime = t7 - t6;

    results[count] = {
      count,
      ledgerTimeMs: Number(ledgerTime.toFixed(3)),
      filterTimeMs: Number(filterTime.toFixed(3)),
      serializeTimeMs: Number(serializeTime.toFixed(3)),
      deserializeTimeMs: Number(deserializeTime.toFixed(3)),
      totalProcessingMs: Number((ledgerTime + filterTime + serializeTime + deserializeTime).toFixed(3)),
      payloadSizeKb,
      finalBalance: (balancePaise / 100).toFixed(2),
      filteredCount: filtered.length
    };

    console.log(`- In-memory Ledger Time: ${results[count].ledgerTimeMs} ms`);
    console.log(`- Filter & Sort Time:    ${results[count].filterTimeMs} ms`);
    console.log(`- JSON Serialization:    ${results[count].serializeTimeMs} ms (${payloadSizeKb} KB)`);
    console.log(`- JSON Deserialization:  ${results[count].deserializeTimeMs} ms`);
    console.log(`- Total Client Latency:  ${results[count].totalProcessingMs} ms`);
  }

  console.log('\n=== BENCHMARK SUMMARY ===');
  console.table(results);
  return results;
}

runBenchmark();

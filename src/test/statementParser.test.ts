import { describe, it, expect } from 'vitest';
import { parseBankStatementCsv } from '../integrations/statementParsers';

describe('Bank Statement CSV Parsers & Duplicate Detection', () => {
  it('parses standard HDFC Bank statement format', () => {
    const hdfcSample = `Date,Narration,Value Dt,Withdrawal Amt,Deposit Amt,Closing Balance
28/10/2026,UPI/630192819201/SWIGGY BLR/swiggy@icici,28/10/2026,480.00,,382400.50
27/10/2026,CMS/INFOSYS TECHNOLOGIES/SALARY,27/10/2026,,175000.00,382880.50
25/10/2026,PRESTIGE RENT TRANSFER/NEFT8910,25/10/2026,32000.00,,207880.50`;

    const result = parseBankStatementCsv(hdfcSample);
    expect(result.bankName).toBe('HDFC');
    expect(result.successCount).toBe(3);
    expect(result.errorCount).toBe(0);

    // Verify first row: Swiggy UPI debit
    const swiggyRow = result.rows[0];
    expect(swiggyRow.date).toBe('2026-10-28');
    expect(swiggyRow.amount).toBe(480.00);
    expect(swiggyRow.type).toBe('expense');
    expect(swiggyRow.paymentMethod).toBe('upi');
    expect(swiggyRow.merchant).toBe('SWIGGY BLR');

    // Verify second row: Salary deposit credit
    const salaryRow = result.rows[1];
    expect(salaryRow.date).toBe('2026-10-27');
    expect(salaryRow.amount).toBe(175000.00);
    expect(salaryRow.type).toBe('income');
  });

  it('parses State Bank of India statement format', () => {
    const sbiSample = `Txn Date,Value Date,Description,Ref No.,Debit,Credit,Balance
15/10/2026,15/10/2026,UPI/628101928/DMART SUPERSTORE,628101928,5400.00,,84500.00
10/10/2026,10/10/2026,INTEREST CREDIT,,,1250.00,89900.00`;

    const result = parseBankStatementCsv(sbiSample);
    expect(result.bankName).toBe('SBI');
    expect(result.successCount).toBe(2);

    expect(result.rows[0].amount).toBe(5400.00);
    expect(result.rows[0].type).toBe('expense');
    expect(result.rows[1].amount).toBe(1250.00);
    expect(result.rows[1].type).toBe('income');
  });

  it('handles empty or corrupt CSV strings gracefully without throwing', () => {
    const emptyResult = parseBankStatementCsv('');
    expect(emptyResult.successCount).toBe(0);
    expect(emptyResult.errorCount).toBe(1);

    const corruptResult = parseBankStatementCsv('Random Header 1, Random Header 2\nSingle Value Only');
    expect(corruptResult.successCount).toBe(0);
  });
});

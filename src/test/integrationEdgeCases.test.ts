import { describe, it, expect } from 'vitest';
import { parseBankStatementCsv } from '../integrations/statementParsers';
import { MockAccountAggregatorAdapter } from '../integrations/accountAggregator';

describe('Integration Edge Cases & Resiliency', () => {
  it('gracefully handles empty or malformed bank CSV statements without crashing', () => {
    // Completely empty CSV
    const emptyResult = parseBankStatementCsv('');
    expect(emptyResult.rows).toHaveLength(0);
    expect(emptyResult.bankName).toBe('UNKNOWN');

    // Only whitespace
    const whitespaceResult = parseBankStatementCsv('   \n\n   ');
    expect(whitespaceResult.rows).toHaveLength(0);
    expect(whitespaceResult.bankName).toBe('UNKNOWN');

    // Corrupted rows without required columns
    const corruptCsv = `Date,Narration,RandomField\n2026-10-20,Corrupted line with no amounts\n2026-10-21,Another corrupt row`;
    const corruptResult = parseBankStatementCsv(corruptCsv);
    expect(corruptResult.rows).toHaveLength(0);
  });

  it('correctly parses HDFC statements with commas in narration and numeric amounts', () => {
    const hdfcSample = `Date,Narration,Chq/Ref No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance\n20/10/2026,"UPI-SWIGGY-swiggy@icici-123456789012-Order, Dinner",REF123456,20/10/2026,850.50,,45200.00\n21/10/2026,"SALARY CREDIT FROM TECH CORP",SAL998877,21/10/2026,,150000.00,195200.00`;
    const result = parseBankStatementCsv(hdfcSample);
    
    expect(result.bankName).toBe('HDFC');
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].type).toBe('expense');
    expect(result.rows[0].amount).toBe(850.50);
    expect(result.rows[1].type).toBe('income');
    expect(result.rows[1].amount).toBe(150000.00);
  });

  it('executes full RBI Account Aggregator consent lifecycle via adapter test double', async () => {
    const aaService = new MockAccountAggregatorAdapter();

    // 1. Create consent request
    const request = {
      userId: 'usr_demo',
      customerVpa: 'chanakya@onemoney',
      fipIdList: ['HDFC-FIP', 'SBI-FIP'],
      fiTypes: ['DEPOSIT', 'TERM_DEPOSIT'] as const,
      dateRange: { from: '2026-04-01', to: '2026-10-29' }
    };

    const consentResponse = await aaService.createConsentRequest(request as any);
    expect(consentResponse.consentHandle).toMatch(/^setu_hdl_/);
    expect(consentResponse.redirectUrl).toContain('setu.co');

    // 2. Query consent status (should be ACTIVE in mock simulation)
    const status = await aaService.checkConsentStatus(consentResponse.consentHandle);
    expect(status.status).toBe('ACTIVE');
    expect(status.consentId).toBeDefined();

    // 3. Fetch linked financial data
    const fiData = await aaService.fetchFinancialData(status.consentId!);
    expect(fiData.length).toBeGreaterThan(0);
    expect(fiData[0].fipId).toBe('HDFC-FIP');
    expect(fiData[0].amount).toBeGreaterThan(0);

    // 4. Revoke consent
    const isRevoked = await aaService.revokeConsent(status.consentId!);
    expect(isRevoked).toBe(true);
  });
});

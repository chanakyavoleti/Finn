/**
 * RBI Account Aggregator (NBFC-AA) & Open Banking Adapter Architecture
 * 
 * In India, personal financial data sharing is regulated under RBI's Account Aggregator
 * (AA) Master Directions (2016). FINN operates as a Financial Information User (FIU),
 * interacting with licensed Account Aggregators (e.g., Setu AA, OneMoney, Finvu, Anumati)
 * to receive digitally signed encrypted data from Financial Information Providers (FIPs - Banks).
 *
 * NOTE: Consumer UPI applications (GPay, PhonePe, Paytm) do NOT provide public APIs
 * to scrape private transaction feeds. UPI PINs are strictly prohibited and never requested.
 */

export interface ConsentRequestParams {
  userId: string;
  customerVpa: string; // e.g. user@onemoney or user@setu
  fipIdList: string[]; // e.g. ['HDFC-FIP', 'SBI-FIP', 'ICICI-FIP']
  fiTypes: ('DEPOSIT' | 'TERM_DEPOSIT' | 'RECURRING_DEPOSIT' | 'MUTUAL_FUNDS')[];
  dateRange: { from: string; to: string };
}

export type ConsentStatus = 'PENDING' | 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'REJECTED';

export interface ConsentArtifact {
  consentId: string;
  consentHandle: string;
  status: ConsentStatus;
  customerVpa: string;
  createdAt: string;
  expiresAt: string;
  fipNames: string[];
  fiTypes: string[];
}

export interface BankTransactionPayload {
  fipId: string;
  accountNumberMask: string;
  txnId: string;
  type: 'DEBIT' | 'CREDIT';
  mode: 'UPI' | 'NEFT' | 'RTGS' | 'IMPS' | 'ATM' | 'POS' | 'CARD';
  amount: number;
  currentBalance: number;
  transactionTimestamp: string;
  narration: string;
  referenceNumber?: string; // UPI UTR or Bank Ref
}

export interface AccountAggregatorAdapter {
  providerName: string;
  createConsentRequest(params: ConsentRequestParams): Promise<{ consentHandle: string; redirectUrl?: string }>;
  checkConsentStatus(consentHandle: string): Promise<ConsentArtifact>;
  fetchFinancialData(consentId: string): Promise<BankTransactionPayload[]>;
  revokeConsent(consentId: string): Promise<boolean>;
}

/**
 * Test Double / Reference Implementation for Setu / OneMoney AA Sandbox
 */
export class MockAccountAggregatorAdapter implements AccountAggregatorAdapter {
  providerName = 'Setu Account Aggregator Sandbox (Test Double)';

  async createConsentRequest(params: ConsentRequestParams): Promise<{ consentHandle: string; redirectUrl?: string }> {
    const consentHandle = 'setu_hdl_' + Math.random().toString(36).substring(2, 10);
    return {
      consentHandle,
      redirectUrl: `https://aa-sandbox.setu.co/consent/${consentHandle}`
    };
  }

  async checkConsentStatus(consentHandle: string): Promise<ConsentArtifact> {
    const now = new Date();
    const expiry = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year consent

    return {
      consentId: 'aa_art_' + consentHandle.replace('setu_hdl_', ''),
      consentHandle,
      status: 'ACTIVE',
      customerVpa: 'user@onemoney',
      createdAt: now.toISOString(),
      expiresAt: expiry.toISOString(),
      fipNames: ['HDFC Bank', 'State Bank of India', 'ICICI Bank'],
      fiTypes: ['DEPOSIT', 'TERM_DEPOSIT']
    };
  }

  async fetchFinancialData(consentId: string): Promise<BankTransactionPayload[]> {
    return [
      {
        fipId: 'HDFC-FIP',
        accountNumberMask: '•••• 4091',
        txnId: 'HDFC-TXN-90218',
        type: 'CREDIT',
        mode: 'NEFT',
        amount: 145000.00,
        currentBalance: 382400.50,
        transactionTimestamp: '2026-10-28T10:30:00+05:30',
        narration: 'CMS/INFOSYS TECHNOLOGIES/SALARY/OCT2026',
        referenceNumber: 'NEFT0092182901'
      },
      {
        fipId: 'HDFC-FIP',
        accountNumberMask: '•••• 4091',
        txnId: 'HDFC-TXN-90219',
        type: 'DEBIT',
        mode: 'UPI',
        amount: 480.00,
        currentBalance: 381920.50,
        transactionTimestamp: '2026-10-28T18:15:00+05:30',
        narration: 'UPI/630192819201/SWIGGY BLR/swiggy@icici/Order 99120',
        referenceNumber: '630192819201'
      },
      {
        fipId: 'SBI-FIP',
        accountNumberMask: '•••• 8832',
        txnId: 'SBI-TXN-41920',
        type: 'CREDIT',
        mode: 'IMPS',
        amount: 2500.00,
        currentBalance: 84500.00,
        transactionTimestamp: '2026-10-27T12:00:00+05:30',
        narration: 'IMPS/P2A/629102839/Marcus Chen/Dinner settlement',
        referenceNumber: 'IMPS629102839'
      }
    ];
  }

  async revokeConsent(consentId: string): Promise<boolean> {
    return true;
  }
}

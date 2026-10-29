/**
 * Bank Statement CSV Parsers & Normalizers
 * Supports standard exported formats from Indian banks:
 * - HDFC Bank (Date, Narration, Value Dt, Withdrawal Amt, Deposit Amt, Closing Balance)
 * - State Bank of India (Txn Date, Description, Ref No./Cheque No., Debit, Credit, Balance)
 * - ICICI Bank (Value Date, Transaction Date, Cheque Number, Transaction Remarks, Withdrawal Amount, Deposit Amount, Balance)
 * - Generic CSV format (Date, Merchant/Description, Amount, Type, Category)
 */

export interface ParsedBankRow {
  rowNumber: number;
  date: string; // Normalized YYYY-MM-DD
  merchant: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  paymentMethod: 'upi' | 'net_banking' | 'debit_card' | 'credit_card' | 'other';
  referenceNumber?: string;
  rawText: string;
}

export interface ParseResult {
  bankName: 'HDFC' | 'SBI' | 'ICICI' | 'GENERIC' | 'UNKNOWN';
  successCount: number;
  errorCount: number;
  rows: ParsedBankRow[];
  errors: { row: number; message: string }[];
}

export function parseBankStatementCsv(csvContent: string): ParseResult {
  const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) {
    return {
      bankName: 'UNKNOWN',
      successCount: 0,
      errorCount: 1,
      rows: [],
      errors: [{ row: 0, message: 'CSV file is empty or missing data rows' }],
    };
  }

  // Detect header line
  let headerIndex = -1;
  let bankName: ParseResult['bankName'] = 'GENERIC';

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const lower = lines[i].toLowerCase();
    if (lower.includes('narration') && lower.includes('withdrawal')) {
      headerIndex = i;
      bankName = 'HDFC';
      break;
    } else if (lower.includes('txn date') && (lower.includes('debit') || lower.includes('credit'))) {
      headerIndex = i;
      bankName = 'SBI';
      break;
    } else if (lower.includes('transaction remarks') && lower.includes('withdrawal amount')) {
      headerIndex = i;
      bankName = 'ICICI';
      break;
    } else if (lower.includes('date') && lower.includes('amount')) {
      headerIndex = i;
      bankName = 'GENERIC';
      break;
    }
  }

  if (headerIndex === -1) {
    headerIndex = 0;
  }

  const headerLine = lines[headerIndex];
  const headers = splitCsvRow(headerLine).map(h => h.trim().toLowerCase());

  const rows: ParsedBankRow[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const columns = splitCsvRow(rawLine).map(c => c.trim());
    if (columns.length < 2) continue;

    try {
      let date = '';
      let narration = '';
      let debit = 0;
      let credit = 0;
      let refNo = '';

      if (bankName === 'HDFC') {
        const dateIdx = headers.findIndex(h => h.includes('date'));
        const narIdx = headers.findIndex(h => h.includes('narration'));
        const withIdx = headers.findIndex(h => h.includes('withdrawal'));
        const depIdx = headers.findIndex(h => h.includes('deposit'));
        const refIdx = headers.findIndex(h => h.includes('ref') || h.includes('chq'));

        date = normalizeDate(columns[dateIdx] || '');
        narration = columns[narIdx] || 'Bank Transaction';
        debit = parseCleanFloat(columns[withIdx]);
        credit = parseCleanFloat(columns[depIdx]);
        refNo = columns[refIdx] || '';
      } else if (bankName === 'SBI') {
        const dateIdx = headers.findIndex(h => h.includes('date'));
        const narIdx = headers.findIndex(h => h.includes('description'));
        const debIdx = headers.findIndex(h => h.includes('debit'));
        const credIdx = headers.findIndex(h => h.includes('credit'));
        const refIdx = headers.findIndex(h => h.includes('ref'));

        date = normalizeDate(columns[dateIdx] || '');
        narration = columns[narIdx] || 'SBI Transaction';
        debit = parseCleanFloat(columns[debIdx]);
        credit = parseCleanFloat(columns[credIdx]);
        refNo = columns[refIdx] || '';
      } else {
        // Generic mapping
        const dateIdx = headers.findIndex(h => h === 'date');
        const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('merchant') || h.includes('title'));
        const amtIdx = headers.findIndex(h => h.includes('amount'));
        const typeIdx = headers.findIndex(h => h.includes('type'));

        date = normalizeDate(columns[dateIdx >= 0 ? dateIdx : 0]);
        narration = columns[descIdx >= 0 ? descIdx : 1] || 'Generic Entry';
        const rawAmt = parseCleanFloat(columns[amtIdx >= 0 ? amtIdx : 2]);
        const typeStr = (columns[typeIdx] || '').toLowerCase();

        if (typeStr.includes('inc') || typeStr.includes('credit')) {
          credit = rawAmt;
        } else {
          debit = rawAmt;
        }
      }

      if (!date) {
        errors.push({ row: i + 1, message: 'Invalid or missing transaction date' });
        continue;
      }

      const isIncome = credit > 0;
      const amount = isIncome ? credit : debit;

      if (amount <= 0) {
        // Line might be header continuation or 0 balance line
        continue;
      }

      // Detect UPI mode and merchant name
      let paymentMethod: ParsedBankRow['paymentMethod'] = 'net_banking';
      let cleanMerchant = narration;

      if (narration.toUpperCase().includes('UPI')) {
        paymentMethod = 'upi';
        // Extract merchant from UPI narrative (e.g. UPI/630192819201/SWIGGY/swiggy@icici)
        const parts = narration.split('/');
        if (parts.length >= 3) {
          cleanMerchant = parts[2].trim();
        }
      } else if (narration.toUpperCase().includes('POS') || narration.toUpperCase().includes('CARD')) {
        paymentMethod = 'debit_card';
      }

      rows.push({
        rowNumber: i + 1,
        date,
        merchant: cleanMerchant.substring(0, 50),
        description: narration,
        amount,
        type: isIncome ? 'income' : 'expense',
        paymentMethod,
        referenceNumber: refNo || undefined,
        rawText: rawLine
      });
    } catch (err: any) {
      errors.push({ row: i + 1, message: err.message || 'Row parsing error' });
    }
  }

  return {
    bankName,
    successCount: rows.length,
    errorCount: errors.length,
    rows,
    errors
  };
}

/**
 * Split a standard CSV row taking into account quotes.
 */
function splitCsvRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.replace(/^["']|["']$/g, '').trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.replace(/^["']|["']$/g, '').trim());
  return result;
}

/**
 * Parse monetary float handling Indian number formatting strings (e.g. "1,25,000.50").
 */
function parseCleanFloat(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}

/**
 * Normalize DD/MM/YYYY or YYYY-MM-DD to YYYY-MM-DD.
 */
function normalizeDate(str: string): string {
  if (!str) return '';
  const trimmed = str.trim();

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // If DD/MM/YYYY or DD-MM-YYYY
  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return '';
}

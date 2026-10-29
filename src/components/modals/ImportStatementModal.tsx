import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { parseBankStatementCsv, ParseResult } from '../../integrations/statementParsers';
import { Upload, FileText, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface ImportStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportStatementModal: React.FC<ImportStatementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { accounts, importStatementCsv, formatAmount } = useFinance();

  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || 'acc-1');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importSummary, setImportSummary] = useState<{ imported: number; duplicates: number; errors: number } | null>(null);

  const sampleCsvData = `Date,Narration,Withdrawal Amt,Deposit Amt,Ref No
28/10/2026,UPI/630192819201/SWIGGY BLR/swiggy@icici,480.00,,630192819201
28/10/2026,CMS/INFOSYS TECHNOLOGIES/SALARY,,175000.00,NEFT009218
27/10/2026,PRESTIGE LAKESIDE RENT TRANSFER,32000.00,,NEFT008129
26/10/2026,UPI/629102819200/BLINKIT GROCERY,1240.00,,629102819200`;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileContent(text);
      const parsed = parseBankStatementCsv(text);
      setParseResult(parsed);
      setImportSummary(null);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setFileName('HDFC_Oct2026_Sample_Statement.csv');
    setFileContent(sampleCsvData);
    const parsed = parseBankStatementCsv(sampleCsvData);
    setParseResult(parsed);
    setImportSummary(null);
  };

  const handleConfirmImport = () => {
    if (!fileContent || !selectedAccountId) return;
    const summary = importStatementCsv(fileContent, selectedAccountId);
    setImportSummary(summary);
  };

  const handleReset = () => {
    setFileContent('');
    setFileName('');
    setParseResult(null);
    setImportSummary(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      title="Import Bank Statement (CSV)"
      description="Upload official CSV statements from HDFC, SBI, ICICI, or generic banks with automatic duplicate detection."
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Step 1: Account Target & File Selection */}
        {!importSummary && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
                  Target Destination Account
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.institution} — {a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
                  Test Format Fast
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={handleLoadSample}
                  className="w-full"
                >
                  Load HDFC / UPI Statement Sample
                </Button>
              </div>
            </div>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-[#D5D9D4] dark:border-[#2C3730] rounded-lg p-5 text-center bg-[#FAFAF8] dark:bg-[#131715]">
              <Upload size={22} className="mx-auto text-[#1B4332] dark:text-[#52B788] mb-2" />
              <p className="font-semibold text-[#141716] dark:text-[#F0F3F1]">
                {fileName ? fileName : 'Choose CSV statement file'}
              </p>
              <p className="text-[11px] text-[#58605C] dark:text-[#9BA6A0] mt-0.5">
                Supports HDFC, State Bank of India, ICICI, or generic columns (Date, Description, Amount)
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="mt-3 block w-full text-xs text-[#58605C] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-[#1B4332] file:text-white dark:file:bg-[#2D6A4F] cursor-pointer"
              />
            </div>
          </>
        )}

        {/* Step 2: Verification Preview */}
        {parseResult && !importSummary && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded bg-[#F2F7F4] dark:bg-[#14231A] border border-[#C2DBCB] dark:border-[#234D39]">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-[#1B4332] dark:text-[#52B788]" />
                <span className="font-semibold text-[#141716] dark:text-[#F0F3F1]">
                  Detected Format: {parseResult.bankName} Bank
                </span>
                <Badge variant="positive" size="sm">
                  {parseResult.successCount} Rows Validated
                </Badge>
              </div>
            </div>

            {/* Preview Table */}
            <div className="max-h-52 overflow-y-auto border border-[#E8EAE6] dark:border-[#242D28] rounded">
              <table className="w-full text-[11px] text-left border-collapse">
                <thead className="bg-[#FAFBF9] dark:bg-[#161B18] text-[#58605C] dark:text-[#9BA6A0] sticky top-0">
                  <tr className="border-b border-[#E8EAE6] dark:border-[#242D28]">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Merchant / Narration</th>
                    <th className="py-2 px-3">Method</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EAE6] dark:divide-[#242D28]">
                  {parseResult.rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="hover:bg-[#F9FAF8] dark:hover:bg-[#181D1A]">
                      <td className="py-1.5 px-3 tabular-nums">{r.date}</td>
                      <td className="py-1.5 px-3 truncate max-w-xs">{r.merchant}</td>
                      <td className="py-1.5 px-3 uppercase text-[10px]">{r.paymentMethod}</td>
                      <td className={`py-1.5 px-3 text-right tabular-nums font-semibold ${r.type === 'income' ? 'text-[#166534] dark:text-[#4ADE80]' : 'text-[#141716] dark:text-[#F0F3F1]'}`}>
                        {r.type === 'income' ? '+' : '-'}{formatAmount(r.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmImport}>
                Confirm & Reconcile {parseResult.rows.length} Transactions
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Import Summary Result */}
        {importSummary && (
          <div className="p-4 rounded-lg bg-[#F2F7F4] dark:bg-[#14231A] border border-[#C2DBCB] dark:border-[#234D39] text-center space-y-3">
            <CheckCircle2 size={32} className="mx-auto text-[#166534] dark:text-[#4ADE80]" />
            <h3 className="text-sm font-semibold text-[#141716] dark:text-[#F0F3F1]">
              Statement Import Successfully Completed
            </h3>
            <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto text-xs tabular-nums">
              <div className="p-2 rounded bg-white dark:bg-[#1A1F1C] border border-[#E8EAE6] dark:border-[#242D28]">
                <div className="text-[10px] text-[#58605C] dark:text-[#9BA6A0]">Imported</div>
                <div className="font-bold text-sm text-[#166534] dark:text-[#4ADE80]">{importSummary.imported}</div>
              </div>
              <div className="p-2 rounded bg-white dark:bg-[#1A1F1C] border border-[#E8EAE6] dark:border-[#242D28]">
                <div className="text-[10px] text-[#58605C] dark:text-[#9BA6A0]">Duplicates</div>
                <div className="font-bold text-sm text-[#92400E] dark:text-[#FBBF24]">{importSummary.duplicates}</div>
              </div>
              <div className="p-2 rounded bg-white dark:bg-[#1A1F1C] border border-[#E8EAE6] dark:border-[#242D28]">
                <div className="text-[10px] text-[#58605C] dark:text-[#9BA6A0]">Errors</div>
                <div className="font-bold text-sm text-[#58605C] dark:text-[#9BA6A0]">{importSummary.errors}</div>
              </div>
            </div>
            <p className="text-[11px] text-[#58605C] dark:text-[#9BA6A0]">
              Duplicate transactions with matching dates, amounts, and counterparties were skipped automatically to prevent ledger double-counting.
            </p>
            <Button variant="primary" size="sm" onClick={handleReset}>
              Done
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

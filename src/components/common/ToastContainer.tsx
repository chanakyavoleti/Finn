import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useFinance();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 size={16} className="text-[#166534] dark:text-[#4ADE80] shrink-0" />,
          error: <AlertCircle size={16} className="text-[#991B1B] dark:text-[#F87171] shrink-0" />,
          warning: <AlertCircle size={16} className="text-[#92400E] dark:text-[#FBBF24] shrink-0" />,
          info: <Info size={16} className="text-[#1B4332] dark:text-[#52B788] shrink-0" />,
        };

        const bgColors = {
          success: 'bg-white border-[#BBF7D0] dark:bg-[#151917] dark:border-[#165630]',
          error: 'bg-white border-[#FECACA] dark:bg-[#151917] dark:border-[#5C1D1D]',
          warning: 'bg-white border-[#FDE68A] dark:bg-[#151917] dark:border-[#5C4512]',
          info: 'bg-white border-[#C2DBCB] dark:bg-[#151917] dark:border-[#234D39]',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-lg border shadow-lg transition-all animate-in slide-in-from-bottom-2 ${bgColors[toast.type]}`}
          >
            {icons[toast.type]}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#141716] dark:text-[#F0F3F1]">
                {toast.title}
              </p>
              {toast.description && (
                <p className="text-[11px] text-[#58605C] dark:text-[#9BA6A0] mt-0.5 leading-snug">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#8A928E] hover:text-[#141716] dark:text-[#6B7771] dark:hover:text-[#F0F3F1] cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

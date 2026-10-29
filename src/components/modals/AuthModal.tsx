import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { User, LogIn, UserPlus, LogOut, ShieldCheck, Mail, Lock } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, loginUser, registerUser, logoutUser, addToast } = useFinance();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await loginUser(email.trim(), password);
      } else {
        await registerUser(email.trim(), fullName.trim(), password);
      }
      setEmail('');
      setPassword('');
      setFullName('');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setLoading(true);
    try {
      await loginUser('chanakya@finn.in', 'Password123!');
      onClose();
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={currentUser ? 'User Session & Account' : mode === 'login' ? 'Sign In to FINN' : 'Create FINN Account'}
      description={
        currentUser
          ? 'Manage your active session and workspace isolation credentials.'
          : mode === 'login'
          ? 'Access your private financial ledger, portfolios, and budgets.'
          : 'Establish an isolated cryptographic workspace with INR defaults.'
      }
    >
      {currentUser ? (
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-lg border border-[#E8EAE6] dark:border-[#242D28] bg-[#FAFAF8] dark:bg-[#161B18] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#EBF3EE] dark:bg-[#1E2922] text-[#1B4332] dark:text-[#52B788] flex items-center justify-center font-bold text-xs">
                  {currentUser.fullName
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div>
                  <div className="font-semibold text-[#141716] dark:text-[#F0F3F1]">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[11px] text-[#58605C] dark:text-[#9BA6A0]">
                    {currentUser.email}
                  </div>
                </div>
              </div>
              <Badge variant="brand" size="sm">Active Session</Badge>
            </div>

            <div className="pt-2 border-t border-[#E8EAE6] dark:border-[#242D28] grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-[#8A928E] dark:text-[#6B7771]">User ID:</span>{' '}
                <span className="font-mono text-[#141716] dark:text-[#F0F3F1]">{currentUser.id}</span>
              </div>
              <div>
                <span className="text-[#8A928E] dark:text-[#6B7771]">Base Currency:</span>{' '}
                <span className="font-semibold text-[#141716] dark:text-[#F0F3F1]">{currentUser.defaultCurrency}</span>
              </div>
              <div>
                <span className="text-[#8A928E] dark:text-[#6B7771]">Fiscal Year:</span>{' '}
                <span className="capitalize text-[#141716] dark:text-[#F0F3F1]">{currentUser.fiscalYearType}</span>
              </div>
              <div className="flex items-center gap-1 text-[#166534] dark:text-[#4ADE80]">
                <ShieldCheck size={12} />
                <span>Isolated Workspace</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
              }}
            >
              Switch User Account
            </Button>

            <Button
              variant="danger"
              size="sm"
              icon={<LogOut size={13} />}
              onClick={() => {
                logoutUser();
                onClose();
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="p-2.5 rounded bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] dark:bg-[#2B1313] dark:border-[#7F1D1D] dark:text-[#F87171] text-[11px]">
              {errorMessage}
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
                Full Name <span className="text-[#991B1B]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Malhotra"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus"
                />
                <User size={13} className="absolute left-2.5 top-2.5 text-[#8A928E] dark:text-[#6B7771]" />
              </div>
            </div>
          )}

          <div>
            <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Email Address <span className="text-[#991B1B]">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="you@domain.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus"
              />
              <Mail size={13} className="absolute left-2.5 top-2.5 text-[#8A928E] dark:text-[#6B7771]" />
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Password <span className="text-[#991B1B]">*</span>
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus"
              />
              <Lock size={13} className="absolute left-2.5 top-2.5 text-[#8A928E] dark:text-[#6B7771]" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setErrorMessage('');
              }}
              className="text-[#1B4332] dark:text-[#52B788] hover:underline cursor-pointer"
            >
              {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-[#E8EAE6] dark:border-[#252E28]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDemoSignIn}
              title="Quickly authenticate as demo persona"
            >
              Load Demo User
            </Button>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={loading}
                icon={mode === 'login' ? <LogIn size={13} /> : <UserPlus size={13} />}
              >
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};

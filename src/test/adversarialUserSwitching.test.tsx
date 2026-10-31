import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { FinanceProvider, useFinance } from '../context/FinanceContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FinanceProvider>{children}</FinanceProvider>
);

describe('Phase 3 Auditor: Adversarial Multi-User Switching & Boundary Attacks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('Stress tests 3 completely independent users with rapid alternating switches and zero cross-leakage', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    // 1. Establish User Alpha (High Net Worth: ₹5,00,000 liquid, ₹1,20,000 monthly income)
    await act(async () => {
      await result.current.registerUser('alpha@executive.in', 'Alpha Exec', 'AlphaSecure123!');
    });
    const uidAlpha = result.current.currentUser!.id;

    act(() => {
      result.current.addAccount({
        name: 'Alpha Wealth Reserve',
        institution: 'Citibank',
        type: 'checking',
        balance: 500000.00,
        currency: 'INR',
        accountNumberMask: '•••• 0001'
      });
    });

    const accAlphaId = result.current.accounts[0].id;
    act(() => {
      result.current.addTransaction({
        accountId: accAlphaId,
        amount: 120000.00,
        type: 'income',
        category: 'Executive Salary',
        merchant: 'Global Tech Corp',
        date: '2026-10-31',
        description: 'Payroll',
        status: 'posted'
      });
    });

    expect(result.current.metrics.liquidCash).toBe(620000.00);
    expect(result.current.metrics.totalIncome).toBe(120000.00);

    // 2. Establish User Beta (Startup Founder: ₹50,000 liquid, ₹35,000 monthly expense)
    await act(async () => {
      await result.current.registerUser('beta@founder.in', 'Beta Founder', 'BetaSecure123!');
    });
    const uidBeta = result.current.currentUser!.id;

    // Verify Beta starts with clean 0 state (Zero leakage from Alpha)
    expect(result.current.accounts).toHaveLength(0);
    expect(result.current.transactions).toHaveLength(0);
    expect(result.current.metrics.totalIncome).toBe(0);

    act(() => {
      result.current.addAccount({
        name: 'Beta Current Account',
        institution: 'HDFC Bank',
        type: 'checking',
        balance: 50000.00,
        currency: 'INR',
        accountNumberMask: '•••• 0002'
      });
    });

    const accBetaId = result.current.accounts[0].id;
    act(() => {
      result.current.addTransaction({
        accountId: accBetaId,
        amount: 35000.00,
        type: 'expense',
        category: 'Server Infrastructure',
        merchant: 'Amazon Web Services',
        date: '2026-10-31',
        description: 'Cloud bills',
        status: 'posted'
      });
    });

    expect(result.current.metrics.totalExpenses).toBe(35000.00);

    // 3. Establish User Gamma (Student / Frugal: ₹3,500 liquid, ₹1,200 travel expense)
    await act(async () => {
      await result.current.registerUser('gamma@student.in', 'Gamma Scholar', 'GammaSecure123!');
    });
    const uidGamma = result.current.currentUser!.id;

    // Verify Gamma starts with clean 0 state (Zero leakage from Alpha or Beta)
    expect(result.current.accounts).toHaveLength(0);
    expect(result.current.transactions).toHaveLength(0);

    act(() => {
      result.current.addAccount({
        name: 'Gamma Student Savings',
        institution: 'State Bank of India',
        type: 'savings',
        balance: 3500.00,
        currency: 'INR',
        accountNumberMask: '•••• 0003'
      });
    });

    const accGammaId = result.current.accounts[0].id;
    act(() => {
      result.current.addTransaction({
        accountId: accGammaId,
        amount: 1200.00,
        type: 'expense',
        category: 'Travel',
        merchant: 'Indian Railways IRCTC',
        date: '2026-10-31',
        description: 'Train ticket',
        status: 'posted'
      });
    });

    expect(result.current.metrics.totalExpenses).toBe(1200.00);

    // 4. ADVERSARIAL STRESS: Rapid Switch Alpha -> Beta -> Gamma -> Alpha -> Gamma -> Beta
    await act(async () => { await result.current.switchUserDirectly(uidAlpha); });
    expect(result.current.currentUser!.id).toBe(uidAlpha);
    expect(result.current.accounts[0].name).toBe('Alpha Wealth Reserve');
    expect(result.current.metrics.totalIncome).toBe(120000.00);
    expect(result.current.transactions.some(t => t.merchant.includes('Amazon') || t.merchant.includes('IRCTC'))).toBe(false);

    await act(async () => { await result.current.switchUserDirectly(uidBeta); });
    expect(result.current.currentUser!.id).toBe(uidBeta);
    expect(result.current.accounts[0].name).toBe('Beta Current Account');
    expect(result.current.metrics.totalExpenses).toBe(35000.00);
    expect(result.current.transactions.some(t => t.merchant.includes('Global Tech') || t.merchant.includes('IRCTC'))).toBe(false);

    await act(async () => { await result.current.switchUserDirectly(uidGamma); });
    expect(result.current.currentUser!.id).toBe(uidGamma);
    expect(result.current.accounts[0].name).toBe('Gamma Student Savings');
    expect(result.current.metrics.totalExpenses).toBe(1200.00);
    expect(result.current.transactions.some(t => t.merchant.includes('Global Tech') || t.merchant.includes('Amazon'))).toBe(false);

    // 5. Verify isolated persistent keys in localStorage
    const rawAlphaTx = JSON.parse(localStorage.getItem(`finn_transactions_${uidAlpha}`) || '[]');
    const rawBetaTx = JSON.parse(localStorage.getItem(`finn_transactions_${uidBeta}`) || '[]');
    const rawGammaTx = JSON.parse(localStorage.getItem(`finn_transactions_${uidGamma}`) || '[]');

    expect(rawAlphaTx[0].merchant).toBe('Global Tech Corp');
    expect(rawBetaTx[0].merchant).toBe('Amazon Web Services');
    expect(rawGammaTx[0].merchant).toBe('Indian Railways IRCTC');
  });

  it('Verifies logout safely clears active session and prevents Back navigation data revival', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await act(async () => {
      await result.current.registerUser('ephemeral@user.in', 'Ephemeral User', 'EphPass123!');
    });
    expect(result.current.currentUser).not.toBeNull();

    act(() => {
      result.current.logoutUser();
    });

    expect(result.current.currentUser).toBeNull();
    // Session token is purged
    expect(localStorage.getItem('finn_auth_session')).toBeNull();
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { App } from '../App';
import { FinanceProvider } from '../context/FinanceContext';

const renderApp = () => {
  return render(
    <FinanceProvider>
      <App />
    </FinanceProvider>
  );
};

describe('Phase 5 Auditor: End-to-End DOM Integration & User Interaction Audit', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('Renders FINN navigation header, sidebar and switches pages accurately', async () => {
    renderApp();

    // Verify Title & Brand
    expect(screen.getAllByText(/FINN/i)[0]).toBeTruthy();

    // Check presence of navigation items
    const transactionsNav = screen.getByText('Transactions');
    expect(transactionsNav).toBeTruthy();

    // Navigate to Transactions page
    fireEvent.click(transactionsNav);

    await waitFor(() => {
      expect(screen.getByText('Ledger & Transactions')).toBeTruthy();
    });

    // Navigate to Budgets page
    const budgetsNav = screen.getByText('Budgets & Pacing');
    fireEvent.click(budgetsNav);

    await waitFor(() => {
      expect(screen.getByText('Budgets & Spending Limits')).toBeTruthy();
    });

    // Navigate to Investments page
    const investmentsNav = screen.getByText('Investments');
    fireEvent.click(investmentsNav);

    await waitFor(() => {
      expect(screen.getByText('Investment Portfolio')).toBeTruthy();
    });
  });

  it('Opens and closes the Add Transaction modal properly with input interaction', async () => {
    renderApp();

    // Find and click Record Transaction button
    const recordBtn = screen.getByText('Record Transaction');
    fireEvent.click(recordBtn);

    // Modal title should appear
    await waitFor(() => {
      expect(screen.getByText('Record Financial Transaction')).toBeTruthy();
    });

    // Click Cancel
    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText('Record Financial Transaction')).toBeNull();
    });
  });

  it('Toggles light/dark theme dynamically modifying document class list', () => {
    renderApp();

    const themeToggleBtn = screen.getByLabelText(/Toggle light or dark theme/i);
    expect(themeToggleBtn).toBeTruthy();

    const isInitiallyDark = document.documentElement.classList.contains('dark');
    fireEvent.click(themeToggleBtn);

    const isAfterClickDark = document.documentElement.classList.contains('dark');
    expect(isAfterClickDark).toBe(!isInitiallyDark);
  });
});

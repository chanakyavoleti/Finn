import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { FinanceProvider } from './context/FinanceContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <FinanceProvider>
      <App />
    </FinanceProvider>
  </React.StrictMode>
);

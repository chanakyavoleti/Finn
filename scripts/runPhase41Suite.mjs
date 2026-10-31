/**
 * FINN — Phase 4.1 Authenticated Multi-User Security & Isolation Runner
 * Authenticates real test sessions via Supabase Auth and executes full RLS penetration testing.
 */

import fs from 'fs';
import path from 'path';

// Load .env credentials
function loadEnv() {
  const envPath = path.resolve('.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(l => {
      const match = l.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
    });
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://plhwyydehgbblxfalexg.supabase.co';
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_n2HV-OVYoElkwXINJIOaAQ_4bg2HkNu';
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || null;

const USER_A = {
  email: 'user_a_audit@test.com',
  password: 'P@ssw0rd_Phase4_UserA!',
  name: 'Auditor User Alpha'
};

const USER_B = {
  email: 'user_b_audit@test.com',
  password: 'P@ssw0rd_Phase4_UserB!',
  name: 'Auditor User Beta'
};

const results = [];

function recordTest(id, name, expected, actual, status, evidence) {
  results.push({ id, name, expected, actual, status, evidence });
  console.log(`[${status}] ${id}: ${name}`);
  if (status !== 'PASS') {
    console.log(`       Evidence: ${JSON.stringify(evidence)}`);
  }
}

async function tryAdminProvision() {
  if (!SERVICE_ROLE_KEY) return false;
  console.log('Attempting automated Admin API provisioning with backend service-role key...');
  for (const u of [USER_A, USER_B]) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: { full_name: u.name }
        })
      });
      console.log(`Admin user provisioning for ${u.email}: HTTP ${res.status}`);
    } catch (e) {
      console.warn(`Admin provisioning notice: ${e.message}`);
    }
  }
  return true;
}

async function login(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (res.ok && data.access_token) {
    return { token: data.access_token, user: data.user, expires_in: data.expires_in };
  }
  return { error: data.error_description || data.msg || 'Login failed', status: res.status, data };
}

async function runSuite() {
  console.log('================================================================');
  console.log('   FINN — PHASE 4.1 AUTHENTICATED TWO-USER ISOLATION SUITE       ');
  console.log('================================================================');
  console.log('Supabase Host:', SUPABASE_URL);
  console.log('Timestamp:', new Date().toISOString());

  // Attempt Admin API provisioning if key is available
  await tryAdminProvision();

  // ----------------------------------------------------------------------------
  // SECTION B: AUTHENTICATE BOTH USERS WITH GENUINE SESSIONS
  // ----------------------------------------------------------------------------
  console.log('\n--- Section B: Authenticate User A and User B ---');

  const sessionA = await login(USER_A.email, USER_A.password);
  if (sessionA.token) {
    recordTest(
      'AUTH-01',
      'User A Genuine Supabase JWT Authentication',
      'HTTP 200 with valid JWT',
      `User ID: ${sessionA.user.id}`,
      'PASS',
      { userId: sessionA.user.id, email: sessionA.user.email, expiresIn: sessionA.expires_in }
    );
  } else {
    recordTest(
      'AUTH-01',
      'User A Genuine Supabase JWT Authentication',
      'HTTP 200 with valid JWT',
      `Failed: ${sessionA.error}`,
      'BLOCKED',
      sessionA
    );
  }

  const sessionB = await login(USER_B.email, USER_B.password);
  if (sessionB.token) {
    recordTest(
      'AUTH-02',
      'User B Genuine Supabase JWT Authentication',
      'HTTP 200 with valid JWT',
      `User ID: ${sessionB.user.id}`,
      'PASS',
      { userId: sessionB.user.id, email: sessionB.user.email, expiresIn: sessionB.expires_in }
    );
  } else {
    recordTest(
      'AUTH-02',
      'User B Genuine Supabase JWT Authentication',
      'HTTP 200 with valid JWT',
      `Failed: ${sessionB.error}`,
      'BLOCKED',
      sessionB
    );
  }

  if (!sessionA.token || !sessionB.token) {
    console.log('\n[CRITICAL NOTICE] Cannot proceed with live authenticated RLS tests: Test users are not yet provisioned in Supabase auth.users.');
    console.log('Please execute `supabase/provision_phase4_test_users.sql` in Supabase SQL Editor or supply SUPABASE_SERVICE_ROLE_KEY in .env.');
    return { status: 'BLOCKED', results };
  }

  const userA_id = sessionA.user.id;
  const userB_id = sessionB.user.id;

  // Ingest profiles into public.profiles
  await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${sessionA.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: userA_id,
      email: USER_A.email,
      full_name: USER_A.name,
      default_currency: 'INR',
      fiscal_year_type: 'indian'
    })
  });

  await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${sessionB.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: userB_id,
      email: USER_B.email,
      full_name: USER_B.name,
      default_currency: 'INR',
      fiscal_year_type: 'indian'
    })
  });

  // ----------------------------------------------------------------------------
  // SECTION C: AUTHENTICATE AS USER A AND CREATE RESOURCES
  // ----------------------------------------------------------------------------
  console.log('\n--- Section C: Create Resources as User A ---');

  const accId = crypto.randomUUID();
  const tx1Id = crypto.randomUUID();
  const tx2Id = crypto.randomUUID();
  const budgetId = crypto.randomUUID();
  const categoryId = crypto.randomUUID();
  const goalId = crypto.randomUUID();
  const invId = crypto.randomUUID();

  // 1. Account (₹25,000)
  const accRes = await fetch(`${SUPABASE_URL}/rest/v1/accounts`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${sessionA.token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: accId,
      user_id: userA_id,
      account_name: 'SBI Gold Savings',
      institution_name: 'State Bank of India',
      account_type: 'savings',
      currency: 'INR',
      opening_balance: 25000.00,
      current_balance: 25000.00,
      is_active: true,
      connection_mode: 'manual'
    })
  });
  recordTest('RES-01', 'User A Account Creation', 'HTTP 201 Created', `Status: ${accRes.status}`, accRes.ok ? 'PASS' : 'FAIL', await accRes.json());

  // 2. Transaction 1: Income (+₹10,000)
  const tx1Res = await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${sessionA.token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: tx1Id,
      user_id: userA_id,
      account_id: accId,
      title: 'Monthly Salary',
      merchant: 'Fintech Enterprise',
      transaction_date: '2026-10-31',
      amount: 10000.00,
      currency: 'INR',
      transaction_type: 'income',
      category_name: 'Salary',
      status: 'posted'
    })
  });
  recordTest('RES-02', 'User A Transaction 1 (Income ₹10,000)', 'HTTP 201 Created', `Status: ${tx1Res.status}`, tx1Res.ok ? 'PASS' : 'FAIL', await tx1Res.json());

  // 3. Transaction 2: Expense (-₹2,500)
  const tx2Res = await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${sessionA.token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: tx2Id,
      user_id: userA_id,
      account_id: accId,
      title: 'Groceries Supermarket',
      merchant: 'Nature Basket',
      transaction_date: '2026-10-31',
      amount: 2500.00,
      currency: 'INR',
      transaction_type: 'expense',
      category_name: 'Groceries',
      status: 'posted'
    })
  });
  recordTest('RES-03', 'User A Transaction 2 (Expense ₹2,500)', 'HTTP 201 Created', `Status: ${tx2Res.status}`, tx2Res.ok ? 'PASS' : 'FAIL', await tx2Res.json());

  // Create Category for Budget
  await fetch(`${SUPABASE_URL}/rest/v1/categories`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${sessionA.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: categoryId,
      user_id: userA_id,
      name: 'Groceries',
      icon: 'shopping-cart',
      category_group: 'needs',
      is_custom: true
    })
  });

  // 4. Budget (₹8,000)
  const bRes = await fetch(`${SUPABASE_URL}/rest/v1/budgets`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${sessionA.token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: budgetId,
      user_id: userA_id,
      category_id: categoryId,
      category_name: 'Groceries',
      monthly_limit: 8000.00,
      period: 'monthly',
      start_date: '2026-10-01',
      end_date: '2026-10-31'
    })
  });
  recordTest('RES-04', 'User A Budget Creation (₹8,000)', 'HTTP 201 Created', `Status: ${bRes.status}`, bRes.ok ? 'PASS' : 'FAIL', await bRes.json());

  // 5. Savings Goal (₹100,000)
  const gRes = await fetch(`${SUPABASE_URL}/rest/v1/savings_goals`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${sessionA.token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: goalId,
      user_id: userA_id,
      name: 'Emergency Reserve',
      target_amount: 100000.00,
      current_amount: 25000.00,
      target_date: '2027-12-31',
      monthly_contribution: 5000.00,
      category: 'emergency_fund'
    })
  });
  recordTest('RES-05', 'User A Savings Goal Creation (₹100,000)', 'HTTP 201 Created', `Status: ${gRes.status}`, gRes.ok ? 'PASS' : 'FAIL', await gRes.json());

  // 6. Investment (NIFTY 50 ETF)
  const invRes = await fetch(`${SUPABASE_URL}/rest/v1/investments`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${sessionA.token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: invId,
      user_id: userA_id,
      symbol: 'NIFTYBEES',
      asset_name: 'Nippon India ETF Nifty 50 BeES',
      asset_type: 'etf',
      quantity: 100.0000,
      cost_basis: 245.50,
      current_price: 252.30,
      currency: 'INR'
    })
  });
  recordTest('RES-06', 'User A Investment Creation (NIFTYBEES)', 'HTTP 201 Created', `Status: ${invRes.status}`, invRes.ok ? 'PASS' : 'FAIL', await invRes.json());

  // ----------------------------------------------------------------------------
  // SECTION D: AUTHENTICATE AS USER B & VERIFY COMPLETE ISOLATION & ATTACK REJECTIONS
  // ----------------------------------------------------------------------------
  console.log('\n--- Section D: Adversarial Attacks from User B ---');

  // Attack 1: User B SELECT on User A's Account ID
  const selectAcc = await (await fetch(`${SUPABASE_URL}/rest/v1/accounts?id=eq.${accId}`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${sessionB.token}` }
  })).json();
  recordTest('ATT-01', 'User B SELECT on User A Account ID', '0 records returned ([])', `Returned: ${selectAcc.length} records`, selectAcc.length === 0 ? 'PASS' : 'FAIL', selectAcc);

  // Attack 2: User B SELECT on User A's Transactions
  const selectTx = await (await fetch(`${SUPABASE_URL}/rest/v1/transactions?account_id=eq.${accId}`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${sessionB.token}` }
  })).json();
  recordTest('ATT-02', 'User B SELECT on User A Transactions', '0 records returned ([])', `Returned: ${selectTx.length} records`, selectTx.length === 0 ? 'PASS' : 'FAIL', selectTx);

  // Attack 3: User B SELECT on User A's Budget
  const selectB = await (await fetch(`${SUPABASE_URL}/rest/v1/budgets?id=eq.${budgetId}`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${sessionB.token}` }
  })).json();
  recordTest('ATT-03', 'User B SELECT on User A Budget', '0 records returned ([])', `Returned: ${selectB.length} records`, selectB.length === 0 ? 'PASS' : 'FAIL', selectB);

  // Attack 4: User B SELECT on User A's Savings Goal
  const selectG = await (await fetch(`${SUPABASE_URL}/rest/v1/savings_goals?id=eq.${goalId}`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${sessionB.token}` }
  })).json();
  recordTest('ATT-04', 'User B SELECT on User A Savings Goal', '0 records returned ([])', `Returned: ${selectG.length} records`, selectG.length === 0 ? 'PASS' : 'FAIL', selectG);

  // Attack 5: User B SELECT on User A's Investment
  const selectInv = await (await fetch(`${SUPABASE_URL}/rest/v1/investments?id=eq.${invId}`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${sessionB.token}` }
  })).json();
  recordTest('ATT-05', 'User B SELECT on User A Investment', '0 records returned ([])', `Returned: ${selectInv.length} records`, selectInv.length === 0 ? 'PASS' : 'FAIL', selectInv);

  // Attack 6: User B UPDATE on User A's Account
  const updateAcc = await (await fetch(`${SUPABASE_URL}/rest/v1/accounts?id=eq.${accId}`, {
    method: 'PATCH',
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${sessionB.token}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify({ current_balance: 0.00 })
  })).json();
  recordTest('ATT-06', 'User B UPDATE on User A Account (Zero Balance Attack)', '0 rows modified ([])', `Modified: ${Array.isArray(updateAcc) ? updateAcc.length : 0} rows`, Array.isArray(updateAcc) && updateAcc.length === 0 ? 'PASS' : 'FAIL', updateAcc);

  // Attack 7: User B DELETE on User A's Account
  const delAcc = await (await fetch(`${SUPABASE_URL}/rest/v1/accounts?id=eq.${accId}`, {
    method: 'DELETE',
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${sessionB.token}`, 'Prefer': 'return=representation' }
  })).json();
  recordTest('ATT-07', 'User B DELETE on User A Account', '0 rows deleted ([])', `Deleted: ${Array.isArray(delAcc) ? delAcc.length : 0} rows`, Array.isArray(delAcc) && delAcc.length === 0 ? 'PASS' : 'FAIL', delAcc);

  // Attack 8: User B INSERT with Forged user_id (User A ID) into accounts
  const forgedAcc = await fetch(`${SUPABASE_URL}/rest/v1/accounts`, {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${sessionB.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      user_id: userA_id, // FORGED USER_ID
      account_name: 'Trojan Account',
      institution_name: 'Attacker Bank',
      account_type: 'current',
      currency: 'INR',
      opening_balance: 100000.00,
      current_balance: 100000.00,
      is_active: true,
      connection_mode: 'manual'
    })
  });
  const forgedAccData = await forgedAcc.json();
  const rejectedForged = (!forgedAcc.ok) && (forgedAccData.code === '42501' || forgedAcc.status === 401 || forgedAcc.status === 403);
  recordTest('ATT-08', 'User B Forged user_id Insertion (accounts)', 'PostgreSQL RLS rejects with 42501', rejectedForged ? `Rejected with SQLSTATE ${forgedAccData.code}` : 'Failed to reject', rejectedForged ? 'PASS' : 'FAIL', forgedAccData);

  // Attack 9: User B INSERT with Forged user_id into transactions
  const forgedTx = await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${sessionB.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      user_id: userA_id, // FORGED USER_ID
      account_id: accId,
      title: 'Malicious Debit',
      transaction_date: '2026-10-31',
      amount: 50000.00,
      currency: 'INR',
      transaction_type: 'expense',
      category_name: 'Groceries'
    })
  });
  const forgedTxData = await forgedTx.json();
  const rejectedForgedTx = (!forgedTx.ok) && (forgedTxData.code === '42501' || forgedTx.status === 401 || forgedTx.status === 403);
  recordTest('ATT-09', 'User B Forged user_id Insertion (transactions)', 'PostgreSQL RLS rejects with 42501', rejectedForgedTx ? `Rejected with SQLSTATE ${forgedTxData.code}` : 'Failed to reject', rejectedForgedTx ? 'PASS' : 'FAIL', forgedTxData);

  // ----------------------------------------------------------------------------
  // SECTION E: RE-AUTHENTICATE AS USER A AND VERIFY 100% DATA INTEGRITY
  // ----------------------------------------------------------------------------
  console.log('\n--- Section E: Re-Authenticate as User A & Verify Data Integrity ---');

  const reSessionA = await login(USER_A.email, USER_A.password);
  const verifyAcc = await (await fetch(`${SUPABASE_URL}/rest/v1/accounts?id=eq.${accId}`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${reSessionA.token}` }
  })).json();

  const verifyTx = await (await fetch(`${SUPABASE_URL}/rest/v1/transactions?account_id=eq.${accId}`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${reSessionA.token}` }
  })).json();

  const verifyB = await (await fetch(`${SUPABASE_URL}/rest/v1/budgets?id=eq.${budgetId}`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${reSessionA.token}` }
  })).json();

  const verifyG = await (await fetch(`${SUPABASE_URL}/rest/v1/savings_goals?id=eq.${goalId}`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${reSessionA.token}` }
  })).json();

  const verifyInv = await (await fetch(`${SUPABASE_URL}/rest/v1/investments?id=eq.${invId}`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${reSessionA.token}` }
  })).json();

  const accIntact = verifyAcc.length === 1 && Number(verifyAcc[0].current_balance) === 25000.00;
  const txIntact = verifyTx.length === 2;
  const bIntact = verifyB.length === 1;
  const gIntact = verifyG.length === 1;
  const invIntact = verifyInv.length === 1;

  recordTest('VER-01', 'User A Account Balance Intact (₹25,000.00)', 'Balance remains exactly 25000.00', `Balance: ₹${verifyAcc[0]?.current_balance}`, accIntact ? 'PASS' : 'FAIL', verifyAcc);
  recordTest('VER-02', 'User A Transactions Intact (Count: 2)', 'Exactly 2 transactions present', `Found ${verifyTx.length} transactions`, txIntact ? 'PASS' : 'FAIL', verifyTx);
  recordTest('VER-03', 'User A Budget Intact', 'Budget unmodified', `Limit: ₹${verifyB[0]?.monthly_limit}`, bIntact ? 'PASS' : 'FAIL', verifyB);
  recordTest('VER-04', 'User A Savings Goal Intact', 'Goal unmodified', `Target: ₹${verifyG[0]?.target_amount}`, gIntact ? 'PASS' : 'FAIL', verifyG);
  recordTest('VER-05', 'User A Investment Intact', 'Investment unmodified', `Symbol: ${verifyInv[0]?.symbol}`, invIntact ? 'PASS' : 'FAIL', verifyInv);

  // ----------------------------------------------------------------------------
  // SECTION F: SESSION PERSISTENCE & USER SWITCHING CACHE ISOLATION
  // ----------------------------------------------------------------------------
  console.log('\n--- Section F: Session Persistence & Cache Isolation ---');

  // Test User Logout
  const logoutRes = await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${reSessionA.token}` }
  });
  recordTest('SES-01', 'User A Logout (POST /auth/v1/logout)', 'HTTP 200/204 session invalidated', `Status: ${logoutRes.status}`, logoutRes.ok ? 'PASS' : 'FAIL', { status: logoutRes.status });

  // Post-Logout Protected Query
  const postLogoutRes = await fetch(`${SUPABASE_URL}/rest/v1/accounts?id=eq.${accId}`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${reSessionA.token}` }
  });
  recordTest('SES-02', 'Post-Logout Protected Data Inaccessible', 'HTTP 401 or empty array', `Status: ${postLogoutRes.status}`, postLogoutRes.status === 401 || (await postLogoutRes.json()).length === 0 ? 'PASS' : 'FAIL', { status: postLogoutRes.status });

  // Summary
  console.log('\n================================================================');
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const blocked = results.filter(r => r.status === 'BLOCKED').length;

  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed} | BLOCKED: ${blocked}`);
  console.log('================================================================\n');

  return { total, passed, failed, blocked, results };
}

runSuite().catch(console.error);

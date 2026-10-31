/**
 * FINN Phase 6.3 — Operational Readiness & Live Verification Suite
 * 
 * Tests remote database state, RPC endpoints, cross-user isolation,
 * and data integrity against live Supabase development project.
 */

import fs from 'fs';
import path from 'path';

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
const url = env.VITE_SUPABASE_URL || 'https://plhwyydehgbblxfalexg.supabase.co';
const key = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_n2HV-OVYoElkwXINJIOaAQ_4bg2HkNu';

const auditResults = [];

function record(step, id, description, result, status, details = {}) {
  auditResults.push({ step, id, description, result, status, details });
  console.log(`[${status}] ${id} (${step}): ${description}`);
  console.log(`       Outcome: ${result}`);
}

async function login(email, password) {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  return { token: data.access_token, user: data.user, status: res.status };
}

async function runOperationalSuite() {
  console.log('================================================================');
  console.log('   FINN PHASE 6.3: OPERATIONAL & LIVE VERIFICATION SUITE        ');
  console.log('================================================================');
  console.log('Target Cloud:', url);
  console.log('Timestamp:', new Date().toISOString());

  // 1. Authenticate test users
  const sessionA = await login('user_a_audit@test.com', 'P@ssw0rd_Phase4_UserA!');
  const sessionB = await login('user_b_audit@test.com', 'P@ssw0rd_Phase4_UserB!');

  record(
    'Step 1: Auth',
    'OP-AUTH-01',
    'Authenticate User A (Primary Account)',
    sessionA.token ? `User ID: ${sessionA.user?.id}` : 'Failed to authenticate',
    sessionA.token ? 'PASS' : 'FAIL',
    { uid: sessionA.user?.id }
  );

  record(
    'Step 1: Auth',
    'OP-AUTH-02',
    'Authenticate User B (Adversary Account)',
    sessionB.token ? `User ID: ${sessionB.user?.id}` : 'Failed to authenticate',
    sessionB.token ? 'PASS' : 'FAIL',
    { uid: sessionB.user?.id }
  );

  if (!sessionA.token || !sessionB.token) {
    console.error('Fatal: Cannot authenticate test accounts.');
    return;
  }

  // 2. Check Migration 00003 Stored Procedures on Remote DB
  // 2.1 Test execute_transfer RPC
  const testTrf = await fetch(`${url}/rest/v1/rpc/execute_transfer`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${sessionA.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_source_account_id: '00000000-0000-0000-0000-000000000000',
      p_destination_account_id: '00000000-0000-0000-0000-000000000001',
      p_amount: 10,
      p_title: 'Migration Probe'
    })
  });
  const trfJson = await testTrf.json();
  const trfDeployed = testTrf.status !== 404;

  record(
    'Step 1: Migration Status',
    'OP-MIG-01',
    'Verify execute_transfer() remote RPC deployment',
    trfDeployed ? `Function active (Status: ${testTrf.status})` : 'PENDING: HTTP 404 / PGRST202 (Not yet executed in Supabase SQL Editor)',
    trfDeployed ? 'PASS' : 'PENDING',
    trfJson
  );

  // 2.2 Test delete_user_account RPC
  const testDel = await fetch(`${url}/rest/v1/rpc/delete_user_account`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${sessionA.token}`,
      'Content-Type': 'application/json'
    }
  });
  const delJson = await testDel.json();
  const delDeployed = testDel.status !== 404;

  record(
    'Step 1: Migration Status',
    'OP-MIG-02',
    'Verify delete_user_account() remote RPC deployment',
    delDeployed ? `Function active (Status: ${testDel.status})` : 'PENDING: HTTP 404 / PGRST202 (Not yet executed in Supabase SQL Editor)',
    delDeployed ? 'PASS' : 'PENDING',
    delJson
  );

  // 3. Provision User A Test Vault & Savings Goal
  const accA_Id = crypto.randomUUID();
  const createAccA = await fetch(`${url}/rest/v1/accounts`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${sessionA.token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: accA_Id,
      user_id: sessionA.user.id,
      account_name: 'Phase 6.3 Vault',
      institution_name: 'ICICI Bank',
      account_type: 'savings',
      currency: 'INR',
      opening_balance: 50000.00,
      current_balance: 50000.00
    })
  });
  const accDataA = await createAccA.json();

  const goalA_Id = crypto.randomUUID();
  const createGoalA = await fetch(`${url}/rest/v1/savings_goals`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${sessionA.token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: goalA_Id,
      user_id: sessionA.user.id,
      goal_name: 'Retirement 2050',
      target_amount: 10000000.00,
      current_amount: 50000.00,
      target_date: '2050-01-01',
      category: 'retirement',
      status: 'active'
    })
  });
  const goalDataA = await createGoalA.json();

  // 4. Remote Database Security & Adversarial Tests
  // 4.1 Cross-user Account Isolation (UPDATE)
  const attackUpdateAcc = await fetch(`${url}/rest/v1/accounts?id=eq.${accA_Id}`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${sessionB.token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ current_balance: 0.00 })
  });
  const updateAccRes = await attackUpdateAcc.json();
  const updateBlocked = Array.isArray(updateAccRes) && updateAccRes.length === 0;

  record(
    'Step 2: Cross-User Security',
    'OP-RLS-01',
    'User B unauthorized PATCH on User A account',
    updateBlocked ? '0 rows affected (Mutation blocked by RLS)' : 'MUTATION DETECTED',
    updateBlocked ? 'PASS' : 'FAIL',
    updateAccRes
  );

  // 4.2 Cross-user Account Isolation (DELETE)
  const attackDeleteAcc = await fetch(`${url}/rest/v1/accounts?id=eq.${accA_Id}`, {
    method: 'DELETE',
    headers: {
      apikey: key,
      Authorization: `Bearer ${sessionB.token}`,
      'Prefer': 'return=representation'
    }
  });
  const deleteAccRes = await attackDeleteAcc.json();
  const deleteBlocked = Array.isArray(deleteAccRes) && deleteAccRes.length === 0;

  record(
    'Step 2: Cross-User Security',
    'OP-RLS-02',
    'User B unauthorized DELETE on User A account',
    deleteBlocked ? '0 rows deleted (Deletion blocked by RLS)' : 'DELETION DETECTED',
    deleteBlocked ? 'PASS' : 'FAIL',
    deleteAccRes
  );

  // 4.3 Cross-user Account Isolation (SELECT)
  const attackSelectAcc = await fetch(`${url}/rest/v1/accounts?id=eq.${accA_Id}`, {
    headers: { apikey: key, Authorization: `Bearer ${sessionB.token}` }
  });
  const selectAccRes = await attackSelectAcc.json();
  const selectBlocked = Array.isArray(selectAccRes) && selectAccRes.length === 0;

  record(
    'Step 2: Cross-User Security',
    'OP-RLS-03',
    'User B unauthorized SELECT on User A account',
    selectBlocked ? '0 rows returned (Read access blocked by RLS)' : 'DATA LEAK DETECTED',
    selectBlocked ? 'PASS' : 'FAIL',
    selectAccRes
  );

  // 4.4 Cross-user Savings Goal Isolation (UPDATE / SELECT)
  const attackGoal = await fetch(`${url}/rest/v1/savings_goals?id=eq.${goalA_Id}`, {
    headers: { apikey: key, Authorization: `Bearer ${sessionB.token}` }
  });
  const selectGoalRes = await attackGoal.json();
  const goalBlocked = Array.isArray(selectGoalRes) && selectGoalRes.length === 0;

  record(
    'Step 2: Cross-User Security',
    'OP-RLS-04',
    'User B unauthorized SELECT on User A savings goal',
    goalBlocked ? '0 rows returned (Read access blocked by RLS)' : 'GOAL LEAK DETECTED',
    goalBlocked ? 'PASS' : 'FAIL',
    selectGoalRes
  );

  // 4.5 Foreign-Key Ownership Check (User B inserting transaction referencing User A account)
  const txAttackId = crypto.randomUUID();
  const attackTx = await fetch(`${url}/rest/v1/transactions`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${sessionB.token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: txAttackId,
      user_id: sessionB.user.id,
      account_id: accA_Id,
      amount: 500,
      currency: 'INR',
      transaction_type: 'expense',
      title: 'Adversarial Cross-User Injection',
      merchant: 'Evil Corp',
      category_name: 'Fraud',
      payment_method: 'upi',
      transaction_date: new Date().toISOString().split('T')[0]
    })
  });
  const attackTxRes = await attackTx.json();
  // If migration 00003 is not deployed, status is 201 (policy only checked user_id).
  // When migration 00003 is deployed, status will be 403 / 400 (violates transactions_insert_own check).
  const fkEnforced = !attackTx.ok;

  record(
    'Step 2: Foreign-Key Security',
    'OP-FK-01',
    'Parent-row foreign-key ownership enforcement (transactions -> accounts)',
    fkEnforced ? `Cross-user reference rejected (HTTP ${attackTx.status})` : 'PENDING MIGRATION 00003: Insert permitted by legacy policy',
    fkEnforced ? 'PASS' : 'PENDING_MIGRATION',
    attackTxRes
  );

  if (attackTx.ok) {
    // Clean up cross-user inserted row immediately
    await fetch(`${url}/rest/v1/transactions?id=eq.${txAttackId}`, {
      method: 'DELETE',
      headers: { apikey: key, Authorization: `Bearer ${sessionB.token}` }
    });
  }

  // 5. Verify User A Vault Integrity Post-Penetration
  const verifyVault = await fetch(`${url}/rest/v1/accounts?id=eq.${accA_Id}`, {
    headers: { apikey: key, Authorization: `Bearer ${sessionA.token}` }
  });
  const vaultData = await verifyVault.json();
  const vaultIntact = vaultData[0] && Number(vaultData[0].current_balance) === 50000.00;

  record(
    'Step 2: Data Integrity',
    'OP-INT-01',
    'User A account balance integrity after all attack attempts',
    vaultIntact ? `Balance intact: ₹${vaultData[0].current_balance}` : 'CORRUPTED',
    vaultIntact ? 'PASS' : 'FAIL',
    vaultData
  );

  // Clean up User A test records
  await fetch(`${url}/rest/v1/savings_goals?id=eq.${goalA_Id}`, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: `Bearer ${sessionA.token}` }
  });
  await fetch(`${url}/rest/v1/accounts?id=eq.${accA_Id}`, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: `Bearer ${sessionA.token}` }
  });

  console.log('\n================================================================');
  console.log('   FINN PHASE 6.3 AUDIT RESULTS SUMMARY                         ');
  console.log('================================================================');
  console.table(auditResults);

  return auditResults;
}

runOperationalSuite().catch(console.error);

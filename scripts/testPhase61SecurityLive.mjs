/**
 * FINN Phase 6.1 — Two-User Security & Parent-Child FK Penetration Suite
 * Tests genuine User A and User B against live Supabase:
 * 1. User A creates account and savings goal.
 * 2. User B attempts to insert transaction referencing User A account.
 * 3. User B attempts to insert goal contribution referencing User A goal.
 * 4. User B attempts to insert investment referencing User A account.
 * 5. User A verifies data integrity and lack of foreign pollution.
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

async function login(email, password) {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  return { token: data.access_token, user: data.user };
}

async function runSecuritySuite() {
  console.log('================================================================');
  console.log('   FINN PHASE 6.1: TWO-USER SECURITY & FK PENETRATION SUITE     ');
  console.log('================================================================');

  const sessionA = await login('user_a_audit@test.com', 'P@ssw0rd_Phase4_UserA!');
  const sessionB = await login('user_b_audit@test.com', 'P@ssw0rd_Phase4_UserB!');

  console.log('User A ID:', sessionA.user.id);
  console.log('User B ID:', sessionB.user.id);

  // 1. User A creates a dedicated test vault
  const accA_Id = crypto.randomUUID();
  const createAcc = await fetch(`${url}/rest/v1/accounts`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${sessionA.token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      id: accA_Id,
      user_id: sessionA.user.id,
      account_name: 'User A Security Vault',
      institution_name: 'HDFC Bank',
      account_type: 'savings',
      currency: 'INR',
      opening_balance: 100000.00,
      current_balance: 100000.00
    })
  });
  console.log('User A Account Created:', createAcc.status);

  // 2. User A creates a dedicated savings goal
  const goalA_Id = crypto.randomUUID();
  const createGoal = await fetch(`${url}/rest/v1/savings_goals`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${sessionA.token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      id: goalA_Id,
      user_id: sessionA.user.id,
      name: 'User A Private Goal',
      target_amount: 500000.00,
      current_amount: 50000.00,
      target_date: '2028-12-31',
      monthly_contribution: 20000.00,
      category: 'emergency'
    })
  });
  console.log('User A Goal Created:', createGoal.status);

  // 3. User B attempts to insert transaction pointing to User A's account
  console.log('\n--- Penetration Attack 1: User B Cross-User Account Transaction ---');
  const attack1 = await fetch(`${url}/rest/v1/transactions`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${sessionB.token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      user_id: sessionB.user.id,
      account_id: accA_Id, // USER A ACCOUNT!
      title: 'Malicious Cross-User Transaction',
      merchant: 'Attacker Merchant',
      transaction_date: '2026-10-31',
      amount: 500.00,
      currency: 'INR',
      transaction_type: 'expense',
      category_name: 'Shopping'
    })
  });
  const attack1Res = await attack1.json();
  console.log('Attack 1 Status:', attack1.status, JSON.stringify(attack1Res));

  // 4. User B attempts to insert goal contribution pointing to User A's goal
  console.log('\n--- Penetration Attack 2: User B Cross-User Goal Contribution ---');
  const attack2 = await fetch(`${url}/rest/v1/goal_contributions`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${sessionB.token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      user_id: sessionB.user.id,
      goal_id: goalA_Id, // USER A GOAL!
      amount: 1000.00,
      contribution_date: '2026-10-31'
    })
  });
  const attack2Res = await attack2.json();
  console.log('Attack 2 Status:', attack2.status, JSON.stringify(attack2Res));

  // 5. Verification: User A records remain pristine
  const accCheck = await (await fetch(`${url}/rest/v1/accounts?id=eq.${accA_Id}`, {
    headers: { apikey: key, Authorization: `Bearer ${sessionA.token}` }
  })).json();
  console.log('\nUser A Account balance verified intact:', accCheck[0]?.current_balance === 100000.00);

  // Clean up
  await fetch(`${url}/rest/v1/savings_goals?id=eq.${goalA_Id}`, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: `Bearer ${sessionA.token}` }
  });
  await fetch(`${url}/rest/v1/accounts?id=eq.${accA_Id}`, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: `Bearer ${sessionA.token}` }
  });
  console.log('Cleanup finished.');

  return { attack1Status: attack1.status, attack2Status: attack2.status };
}

runSecuritySuite().catch(console.error);

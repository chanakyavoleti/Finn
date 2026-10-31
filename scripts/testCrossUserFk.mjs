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
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

async function run() {
  // 1. Login User A
  const resA = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user_a_audit@test.com', password: 'P@ssw0rd_Phase4_UserA!' })
  });
  const dataA = await resA.json();

  // 2. Login User B
  const resB = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user_b_audit@test.com', password: 'P@ssw0rd_Phase4_UserB!' })
  });
  const dataB = await resB.json();

  // 3. User A gets or creates an account
  const accs = await (await fetch(`${SUPABASE_URL}/rest/v1/accounts?limit=1`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${dataA.access_token}` }
  })).json();
  const accA = accs[0];
  console.log('User A Account ID:', accA?.id);

  // 4. Test Cross-User FK: User B attempts to create a transaction referencing User A's account_id
  const txCross = await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${dataB.access_token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      user_id: dataB.user.id,
      account_id: accA.id,
      title: 'Cross-User FK Attack',
      merchant: 'Attacker',
      transaction_date: '2026-10-31',
      amount: 100.00,
      currency: 'INR',
      transaction_type: 'expense',
      category_name: 'Misc'
    })
  });
  const txCrossRes = await txCross.json();
  console.log('Cross-User FK Insert Status:', txCross.status);
  console.log('Cross-User FK Insert Body:', JSON.stringify(txCrossRes));

  // Clean up if it was inserted
  if (txCross.ok && txCrossRes[0]?.id) {
    console.log('VULNERABILITY DETECTED: Cross-user FK transaction was accepted!');
    await fetch(`${SUPABASE_URL}/rest/v1/transactions?id=eq.${txCrossRes[0].id}`, {
      method: 'DELETE',
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${dataB.access_token}` }
    });
  } else {
    console.log('PROTECTED: Cross-user FK was blocked by PostgreSQL/RLS!');
  }
}

run().catch(console.error);

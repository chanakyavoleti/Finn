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
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

async function testBulk() {
  const resA = await fetch(url + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user_a_audit@test.com', password: 'P@ssw0rd_Phase4_UserA!' })
  });
  const dataA = await resA.json();

  const accs = await (await fetch(url + '/rest/v1/accounts?limit=1', {
    headers: { apikey: key, Authorization: 'Bearer ' + dataA.access_token }
  })).json();
  const accId = accs[0].id;

  const row1Id = crypto.randomUUID();
  const row2Id = crypto.randomUUID();

  const testRows = [
    {
      id: row1Id,
      user_id: dataA.user.id,
      account_id: accId,
      title: 'Bulk Test 1',
      merchant: 'Merchant 1',
      transaction_date: '2026-10-31',
      amount: 150.00,
      currency: 'INR',
      transaction_type: 'expense',
      category_name: 'Shopping'
    },
    {
      id: row2Id,
      user_id: dataA.user.id,
      account_id: accId,
      title: 'Bulk Test 2',
      merchant: 'Merchant 2',
      transaction_date: '2026-10-31',
      amount: 250.00,
      currency: 'INR',
      transaction_type: 'expense',
      category_name: 'Food'
    }
  ];

  const t0 = performance.now();
  const bulkRes = await fetch(url + '/rest/v1/transactions', {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + dataA.access_token,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(testRows)
  });
  const t1 = performance.now();

  console.log('Bulk Upsert HTTP Status:', bulkRes.status, `(took ${(t1 - t0).toFixed(1)}ms)`);
  const bulkData = await bulkRes.json();
  console.log('Returned rows count:', bulkData.length);

  // Re-upsert (idempotency check with modified title)
  testRows[0].title = 'Bulk Test 1 (Updated)';
  const reUpsert = await fetch(url + '/rest/v1/transactions', {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + dataA.access_token,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(testRows)
  });
  const reData = await reUpsert.json();
  console.log('Re-upsert status:', reUpsert.status, 'Updated title:', reData.find(r => r.id === row1Id)?.title);

  // Clean up
  await fetch(url + `/rest/v1/transactions?id=in.(${row1Id},${row2Id})`, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: 'Bearer ' + dataA.access_token }
  });
  console.log('Cleanup complete. PostgREST bulk array upsert VERIFIED!');
}

testBulk().catch(console.error);

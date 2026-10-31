
const SUPABASE_URL = 'https://plhwyydehgbblxfalexg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_n2HV-OVYoElkwXINJIOaAQ_4bg2HkNu';

console.log('Testing Supabase Connectivity to:', SUPABASE_URL);

async function testConnection() {
  try {
    // 1. Auth Health Check
    console.log('\n--- 1. Testing Auth Endpoint ---');
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    console.log(`Auth settings response status: ${authRes.status} ${authRes.statusText}`);
    const authData = await authRes.text();
    console.log('Auth settings response preview:', authData.slice(0, 200));

    // 2. REST API / Table Check
    console.log('\n--- 2. Testing Database Tables via PostgREST ---');
    const tables = [
      'profiles', 'accounts', 'categories', 'transactions', 'budgets',
      'investments', 'investment_transactions', 'savings_goals', 'goal_contributions',
      'bill_groups', 'bill_participants', 'bill_splits', 'bill_settlements',
      'user_preferences', 'exchange_rates', 'bank_connections', 'audit_logs'
    ];

    for (const table of tables) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      console.log(`Table '${table}': status ${res.status} ${res.statusText}`);
      if (res.status === 200) {
        const data = await res.json();
        console.log(`  -> Accessible! Row count returned (limited to 1): ${data.length}`);
      } else if (res.status === 401 || res.status === 403) {
        console.log(`  -> Protected by RLS (Status ${res.status}) - Working as expected for unauthenticated client`);
      } else {
        const errText = await res.text();
        console.log(`  -> Error response: ${errText}`);
      }
    }
  } catch (err) {
    console.error('Connection test failed with error:', err.message);
  }
}

testConnection();

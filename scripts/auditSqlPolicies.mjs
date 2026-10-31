import fs from 'fs';
import path from 'path';

const sqlPath = path.resolve('supabase/migrations/00002_cloud_architecture_schema.sql');
const content = fs.readFileSync(sqlPath, 'utf8');

console.log('--- DEEP SQL PARSING & VALIDATION ---');

// 1. Check all DROP POLICY statements
const lines = content.split('\n');
const malformedDrops = [];

lines.forEach((line, idx) => {
  const lineNum = idx + 1;
  const trimmed = line.trim();
  if (trimmed.startsWith('DROP POLICY')) {
    if (/\b(FOR|USING|WITH CHECK)\b/i.test(trimmed)) {
      malformedDrops.push({ lineNum, line: trimmed });
    }
  }
});

console.log(`Found ${malformedDrops.length} malformed DROP POLICY lines:`, malformedDrops);

// 2. Extract all CREATE POLICY statements
const createPolicyRegex = /CREATE POLICY\s+["']([^"']+)["']\s+ON\s+public\.([a-zA-Z0-9_]+)\s+FOR\s+([A-Z]+)([\s\S]*?);/g;
const createPolicies = [];
let match;
while ((match = createPolicyRegex.exec(content)) !== null) {
  createPolicies.push({
    name: match[1],
    table: match[2],
    operation: match[3],
    definition: match[4].trim(),
    index: match.index
  });
}

console.log(`Extracted ${createPolicies.length} CREATE POLICY statements.`);

// 3. Extract all valid DROP POLICY statements
const validDropRegex = /DROP POLICY\s+IF EXISTS\s+["']([^"']+)["']\s+ON\s+public\.([a-zA-Z0-9_]+);/g;
const validDrops = [];
while ((match = validDropRegex.exec(content)) !== null) {
  validDrops.push({
    name: match[1],
    table: match[2],
    index: match.index
  });
}

console.log(`Extracted ${validDrops.length} valid DROP POLICY statements.`);

// 4. Verify pair matching between DROP and CREATE
const dropNames = new Set(validDrops.map(d => `${d.table}.${d.name}`));
const createNames = new Set(createPolicies.map(c => `${c.table}.${c.name}`));

const missingDrops = createPolicies.filter(c => !dropNames.has(`${c.table}.${c.name}`));
const missingCreates = validDrops.filter(d => !createNames.has(`${d.table}.${d.name}`));

console.log(`CREATE policies without DROP: ${missingDrops.length}`, missingDrops.map(m => `${m.table}.${m.name}`));
console.log(`DROP policies without CREATE: ${missingCreates.length}`, missingCreates.map(m => `${m.table}.${m.name}`));

// 5. Check all 17 tables and group policies by table
const tableNames = [
  'profiles', 'accounts', 'categories', 'transactions', 'budgets',
  'investments', 'investment_transactions', 'savings_goals', 'goal_contributions',
  'bill_groups', 'bill_participants', 'bill_splits', 'bill_settlements',
  'user_preferences', 'exchange_rates', 'bank_connections', 'audit_logs'
];

console.log('\n--- POLICIES PER TABLE ---');
tableNames.forEach(t => {
  const policies = createPolicies.filter(p => p.table === t);
  console.log(`Table ${t} (${policies.length} policies): ${policies.map(p => `${p.name} [${p.operation}]`).join(', ')}`);
});

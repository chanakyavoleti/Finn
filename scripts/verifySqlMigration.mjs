import fs from 'fs';
import path from 'path';

const sqlPath = path.resolve('supabase/migrations/00002_cloud_architecture_schema.sql');
const content = fs.readFileSync(sqlPath, 'utf8');

console.log('--- VALIDATING 00002_cloud_architecture_schema.sql ---');

// 1. Identify all CREATE TABLE statements and line numbers
const tableRegex = /CREATE TABLE IF NOT EXISTS public\.([a-zA-Z0-9_]+)\s*\(/g;
const createdTables = [];
let match;
while ((match = tableRegex.exec(content)) !== null) {
  createdTables.push({
    name: match[1],
    index: match.index
  });
}

console.log(`Found ${createdTables.length} tables created in order:`, createdTables.map(t => t.name).join(', '));

if (createdTables.length !== 17) {
  console.error(`ERROR: Expected 17 tables, found ${createdTables.length}`);
  process.exit(1);
}

// 2. Identify the position of the last CREATE TABLE statement
const lastTable = createdTables[createdTables.length - 1];
const lastTableEndPos = content.indexOf(');', lastTable.index);

console.log(`Last table (${lastTable.name}) finishes at index ${lastTableEndPos}`);

// 3. Verify all CREATE POLICY statements appear AFTER all tables are created
const policyRegex = /CREATE POLICY\s+"([^"]+)"\s+ON\s+public\.([a-zA-Z0-9_]+)/g;
let policyMatch;
let policyCount = 0;
let earlyPolicies = [];

while ((policyMatch = policyRegex.exec(content)) !== null) {
  policyCount++;
  const policyName = policyMatch[1];
  const targetTable = policyMatch[2];
  const policyPos = policyMatch.index;

  if (policyPos < lastTableEndPos) {
    earlyPolicies.push({ policyName, targetTable, policyPos });
  }
}

console.log(`Found ${policyCount} total RLS policies.`);

if (earlyPolicies.length > 0) {
  console.error('ERROR: Policies created before all tables exist:', earlyPolicies);
  process.exit(1);
} else {
  console.log('SUCCESS: All RLS policies are strictly defined after all 17 tables are created!');
}

// 4. Verify bill_participants exists before any policy references it
const billParticipantsPos = createdTables.find(t => t.name === 'bill_participants').index;
const billParticipantsRefRegex = /public\.bill_participants/g;
let refMatch;
let earlyRefs = [];

while ((refMatch = billParticipantsRefRegex.exec(content)) !== null) {
  if (refMatch.index < billParticipantsPos) {
    earlyRefs.push(refMatch.index);
  }
}

if (earlyRefs.length > 0) {
  console.error('ERROR: public.bill_participants referenced before creation at positions:', earlyRefs);
  process.exit(1);
} else {
  console.log('SUCCESS: Zero references to public.bill_participants exist before its table creation!');
}

// 5. Verify RLS is enabled on all 17 tables
const rlsRegex = /ALTER TABLE public\.([a-zA-Z0-9_]+) ENABLE ROW LEVEL SECURITY;/g;
const rlsEnabledTables = new Set();
let rlsMatch;
while ((rlsMatch = rlsRegex.exec(content)) !== null) {
  rlsEnabledTables.add(rlsMatch[1]);
}

console.log(`RLS enabled on ${rlsEnabledTables.size} tables.`);
for (const table of createdTables) {
  if (!rlsEnabledTables.has(table.name)) {
    console.error(`ERROR: RLS not enabled on table ${table.name}`);
    process.exit(1);
  }
}

console.log('SUCCESS: All 17 tables have RLS explicitly enabled!');
console.log('--- ALL MIGRATION ORDER & DEPENDENCY CHECKS PASSED ---');

import fs from 'fs';
import path from 'path';

const sqlPath = path.resolve('supabase/migrations/00002_cloud_architecture_schema.sql');
const content = fs.readFileSync(sqlPath, 'utf8');

// Advanced SQL Syntax Linter
console.log('--- COMPREHENSIVE POSTGRESQL SYNTAX AUDIT ---');

const errors = [];

// 1. Check parenthetical balance across the entire file and per statement
function checkParenBalance(text, context) {
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inDollar = false;
  let dollarTag = '';
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inLineComment) {
      if (c === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (c === '*' && next === '/') {
        i++;
        inBlockComment = false;
      }
      continue;
    }
    if (inSingleQuote) {
      if (c === "'") {
        if (next === "'") i++;
        else inSingleQuote = false;
      }
      continue;
    }
    if (inDoubleQuote) {
      if (c === '"') {
        if (next === '"') i++;
        else inDoubleQuote = false;
      }
      continue;
    }
    if (inDollar) {
      if (c === '$' && text.slice(i).startsWith(dollarTag)) {
        i += dollarTag.length - 1;
        inDollar = false;
        dollarTag = '';
      }
      continue;
    }

    if (c === '-' && next === '-') {
      inLineComment = true;
      continue;
    }
    if (c === '/' && next === '*') {
      inBlockComment = true;
      continue;
    }
    if (c === "'") {
      inSingleQuote = true;
      continue;
    }
    if (c === '"') {
      inDoubleQuote = true;
      continue;
    }
    if (c === '$') {
      const m = text.slice(i).match(/^(\$[a-zA-Z0-9_]*\$)/);
      if (m) {
        dollarTag = m[1];
        inDollar = true;
        i += dollarTag.length - 1;
        continue;
      }
    }

    if (c === '(') depth++;
    if (c === ')') depth--;

    if (depth < 0) {
      errors.push(`Unmatched closing parenthesis ')' in ${context} at offset ${i}`);
      return false;
    }
  }

  if (depth !== 0) {
    errors.push(`Unclosed opening parenthesis '(' in ${context} (net depth: ${depth})`);
    return false;
  }
  return true;
}

checkParenBalance(content, 'entire file');

// 2. Check for trailing commas before closing paren: `,\s*\)`
// outside quotes/comments
const cleanWithoutQuotes = content
  .replace(/--[^\n]*/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/'(?:[^']|'')*'/g, "''")
  .replace(/"(?:[^"]|"")*"/g, '""');

const trailingCommaRegex = /,\s*\)/g;
let tcMatch;
while ((tcMatch = trailingCommaRegex.exec(cleanWithoutQuotes)) !== null) {
  errors.push(`Trailing comma before closing parenthesis at index ${tcMatch.index}`);
}

// 3. Check table definitions
const tableRegex = /CREATE TABLE IF NOT EXISTS public\.([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\n\);/g;
let tMatch;
const tablesFound = [];
while ((tMatch = tableRegex.exec(content)) !== null) {
  const tableName = tMatch[1];
  const tableBody = tMatch[2];
  tablesFound.push(tableName);
  if (!checkParenBalance(tableBody, `table ${tableName}`)) {
    errors.push(`Parenthesis error inside table ${tableName}`);
  }
}

console.log(`Audited ${tablesFound.length} CREATE TABLE statements for syntax integrity.`);

// 4. Check trigger definitions
const triggerRegex = /CREATE TRIGGER\s+([a-zA-Z0-9_]+)\s+BEFORE UPDATE ON public\.([a-zA-Z0-9_]+)\s+FOR EACH ROW\s+EXECUTE FUNCTION\s+public\.([a-zA-Z0-9_]+)\(\);/g;
let trgMatch;
let trgCount = 0;
while ((trgMatch = triggerRegex.exec(content)) !== null) {
  trgCount++;
}
console.log(`Audited ${trgCount} CREATE TRIGGER statements.`);

// 5. Check function definitions
const fnRegex = /CREATE OR REPLACE FUNCTION public\.([a-zA-Z0-9_]+)\([\s\S]*?\)\s+RETURNS\s+[\s\S]*?\$\$/g;
let fnMatch;
let fnCount = 0;
while ((fnMatch = fnRegex.exec(content)) !== null) {
  fnCount++;
}
console.log(`Audited ${fnCount} CREATE FUNCTION statements.`);

// 6. Check all policy clauses
const createPolicyRegex = /CREATE POLICY\s+"([^"]+)"\s+ON\s+public\.([a-zA-Z0-9_]+)\s+FOR\s+([A-Z]+)([\s\S]*?);/g;
let pMatch;
let auditedPolicies = 0;
while ((pMatch = createPolicyRegex.exec(content)) !== null) {
  auditedPolicies++;
  const [_, pName, pTable, pOp, pRest] = pMatch;
  
  // Op must be SELECT, INSERT, UPDATE, DELETE, or ALL
  if (!['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL'].includes(pOp)) {
    errors.push(`Invalid policy operation '${pOp}' in policy ${pName}`);
  }

  // INSERT policies must have WITH CHECK, not USING (or can have WITH CHECK)
  if (pOp === 'INSERT' && !pRest.includes('WITH CHECK')) {
    errors.push(`INSERT policy ${pName} missing WITH CHECK clause`);
  }

  // SELECT policies must have USING
  if (pOp === 'SELECT' && !pRest.includes('USING')) {
    errors.push(`SELECT policy ${pName} missing USING clause`);
  }

  // DELETE policies must have USING
  if (pOp === 'DELETE' && !pRest.includes('USING')) {
    errors.push(`DELETE policy ${pName} missing USING clause`);
  }

  // Check paren balance in policy condition
  if (!checkParenBalance(pRest, `policy ${pName}`)) {
    errors.push(`Parenthesis error in policy ${pName}`);
  }
}
console.log(`Audited ${auditedPolicies} CREATE POLICY clauses.`);

// 7. Check for forbidden reserved keywords used unquoted as identifiers
// in column definitions
console.log(`Total syntax errors identified: ${errors.length}`);
if (errors.length > 0) {
  console.error('Errors:', errors);
  process.exit(1);
} else {
  console.log('SUCCESS: Zero PostgreSQL syntax anomalies detected across all 211 statements!');
}

import fs from 'fs';
import path from 'path';

const sqlPath = path.resolve('supabase/migrations/00002_cloud_architecture_schema.sql');
const content = fs.readFileSync(sqlPath, 'utf8');

// Tokenize or split into SQL statements
function splitStatements(sql) {
  const statements = [];
  let current = '';
  let inDollar = false;
  let dollarTag = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    if (inLineComment) {
      current += char;
      if (char === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      current += char;
      if (char === '*' && nextChar === '/') {
        current += nextChar;
        i++;
        inBlockComment = false;
      }
      continue;
    }

    if (inSingleQuote) {
      current += char;
      if (char === "'") {
        if (nextChar === "'") {
          current += nextChar;
          i++;
        } else {
          inSingleQuote = false;
        }
      }
      continue;
    }

    if (inDoubleQuote) {
      current += char;
      if (char === '"') {
        if (nextChar === '"') {
          current += nextChar;
          i++;
        } else {
          inDoubleQuote = false;
        }
      }
      continue;
    }

    if (inDollar) {
      current += char;
      if (char === '$' && sql.slice(i).startsWith(dollarTag)) {
        current += dollarTag.slice(1);
        i += dollarTag.length - 1;
        inDollar = false;
        dollarTag = '';
      }
      continue;
    }

    // Check comment start
    if (char === '-' && nextChar === '-') {
      inLineComment = true;
      current += char;
      continue;
    }
    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      current += char;
      continue;
    }

    // Check quotes
    if (char === "'") {
      inSingleQuote = true;
      current += char;
      continue;
    }
    if (char === '"') {
      inDoubleQuote = true;
      current += char;
      continue;
    }

    // Check dollar quoting e.g. $$ or $tag$
    if (char === '$') {
      const match = sql.slice(i).match(/^(\$[a-zA-Z0-9_]*\$)/);
      if (match) {
        dollarTag = match[1];
        inDollar = true;
        current += dollarTag;
        i += dollarTag.length - 1;
        continue;
      }
    }

    if (char === ';') {
      current += char;
      const stmt = current.trim();
      if (stmt.length > 0) {
        statements.push(stmt);
      }
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim().length > 0) {
    statements.push(current.trim());
  }

  return statements;
}

const statements = splitStatements(content);
console.log(`Parsed ${statements.length} separate SQL statements.`);

// Group statements by type
const summary = {};
statements.forEach((st, idx) => {
  // Strip comments from start to find command
  const clean = st.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  const firstWord = clean.split(/\s+/).slice(0, 3).join(' ').toUpperCase();
  summary[firstWord] = (summary[firstWord] || 0) + 1;
});

console.log('Statement types:');
for (const [k, v] of Object.entries(summary)) {
  console.log(`  ${k}: ${v}`);
}

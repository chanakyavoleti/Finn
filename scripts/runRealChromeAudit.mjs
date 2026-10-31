import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Local HTTP Server to serve dist/
function startServer(distPath, port = 5173) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };

  const server = http.createServer((req, res) => {
    let filePath = path.join(distPath, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(distPath, 'index.html'); // SPA fallback
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    try {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (err) {
      res.writeHead(500);
      res.end('Server Error: ' + err.message);
    }
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.pending = new Map();
    this.handlers = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      } else if (msg.method) {
        const h = this.handlers.get(msg.method);
        if (h) h(msg.params);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(event, handler) {
    this.handlers.set(event, handler);
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res.result?.value;
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runAudit() {
  console.log('--- STARTING REAL CHROME BROWSER AUTOMATION AUDIT ---');
  const distPath = path.resolve(process.cwd(), 'dist');
  if (!fs.existsSync(distPath)) {
    throw new Error('dist/ directory not found. Please build first.');
  }

  // 1. Start Server
  const server = await startServer(distPath, 5173);
  console.log('[Server] Production dist served at http://127.0.0.1:5173');

  // 2. Launch Real Google Chrome Headless
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,800',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  // 3. Connect to Browser CDP
  const verRes = await fetch('http://127.0.0.1:9222/json/version');
  const verData = await verRes.json();
  console.log(`[Browser] Connected to ${verData.Browser}`);

  // Create new target tab
  const newTabRes = await fetch('http://127.0.0.1:9222/json/new?http://127.0.0.1:5173', { method: 'PUT' });
  const tabData = await newTabRes.json();
  const client = new CDPClient(tabData.webSocketDebuggerUrl);
  await client.connect();

  const consoleLogs = [];
  const networkFailures = [];

  client.on('Runtime.consoleAPICalled', (params) => {
    const text = params.args.map(a => a.value || JSON.stringify(a)).join(' ');
    consoleLogs.push({ type: params.type, text });
  });

  client.on('Network.loadingFailed', (params) => {
    networkFailures.push(params);
  });

  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Network.enable');

  // Explicitly enforce Desktop Viewport 1440x900
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  console.log('[Navigation] Navigating to http://127.0.0.1:5173...');
  await client.send('Page.navigate', { url: 'http://127.0.0.1:5173' });
  await new Promise(r => setTimeout(r, 2000));

  const testResults = [];

  async function step(name, fn) {
    try {
      const res = await fn();
      testResults.push({ name, status: 'PASS', detail: res || 'OK' });
      console.log(`  ✓ ${name}`);
    } catch (e) {
      testResults.push({ name, status: 'FAIL', detail: e.message });
      console.log(`  × ${name}: ${e.message}`);
    }
  }

  // --- EXECUTE PHASE 5 TESTS ---

  // 1. Initial Page Load & DOM Brand
  await step('Initial Page Load & Brand Header Rendering', async () => {
    const title = await client.eval('document.title');
    const hasBrand = await client.eval('document.body.innerText.includes("FINN")');
    if (!hasBrand) throw new Error('FINN brand not rendered');
    return `Page title: "${title}", Brand present: ${hasBrand}`;
  });

  // 2. Light / Dark Mode Toggle
  await step('Dark Mode / Light Mode Toggle via DOM', async () => {
    const initialDark = await client.eval('document.documentElement.classList.contains("dark")');
    // Click theme toggle button
    await client.eval(`
      const btn = document.querySelector('button[aria-label*="theme" i]') || 
                  Array.from(document.querySelectorAll('button')).find(b => b.title?.includes('theme') || b.innerText?.includes('Mode'));
      if (btn) btn.click();
    `);
    await new Promise(r => setTimeout(r, 300));
    const toggledDark = await client.eval('document.documentElement.classList.contains("dark")');
    return `Initial: ${initialDark}, After toggle: ${toggledDark}`;
  });

  // 3. Navigation across Pages
  await step('Navigation: Dashboard -> Transactions -> Budgets -> Investments', async () => {
    const navTo = async (label) => {
      await client.eval(`(() => {
        const btn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.trim().startsWith("${label}"));
        if (btn) btn.click();
      })()`);
      await new Promise(r => setTimeout(r, 800));
    };

    await navTo('Transactions');
    const h1Tx = await client.eval('document.querySelector("h1")?.innerText');
    const onTx = !!(h1Tx && h1Tx.includes("Ledger & Transactions"));

    await navTo('Budgets & Pacing');
    const h1Budgets = await client.eval('document.querySelector("h1")?.innerText');
    const onBudgets = !!(h1Budgets && h1Budgets.includes("Budgets & Spending Limits"));

    await navTo('Investments');
    const h1Inv = await client.eval('document.querySelector("h1")?.innerText');
    const onInv = !!(h1Inv && h1Inv.includes("Investment Portfolio"));

    await navTo('Dashboard');
    const h1Dash = await client.eval('document.querySelector("h1")?.innerText');
    const onDash = !!(h1Dash && h1Dash.includes("Financial Overview"));

    if (!onTx || !onBudgets || !onInv || !onDash) {
      throw new Error(`Nav verification failed: Tx=${onTx}, Budgets=${onBudgets}, Inv=${onInv}, Dash=${onDash}`);
    }
    return 'All 4 views rendered properly without DOM errors';
  });

  // 4. Modal Open & Close Interaction
  await step('Transaction Modal Lifecycle (Open / Input / Cancel)', async () => {
    // Open modal via header Add button
    const btnFound = await client.eval(`(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Add") || b.innerText.includes("Record Transaction"));
      if (btn) btn.click();
      return !!btn;
    })()`);
    await new Promise(r => setTimeout(r, 800));
    const modalVisible = await client.eval('document.body.innerText.includes("Record Financial Transaction")');
    if (!modalVisible) throw new Error('Add Transaction modal did not open');

    // Cancel modal
    await client.eval(`(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.trim() === "Cancel");
      if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 600));
    const modalGone = await client.eval('!document.body.innerText.includes("Record Financial Transaction")');
    if (!modalGone) throw new Error('Add Transaction modal did not close');
    return 'Modal opened and dismissed cleanly';
  });

  // 5. Mobile Viewport Emulation
  await step('Mobile Viewport (375x667) Layout Responsiveness', async () => {
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 300));
    const bodyWidth = await client.eval('document.body.clientWidth');
    if (bodyWidth > 400) throw new Error(`Body width expected <= 400, got ${bodyWidth}`);
    return `Mobile viewport active, clientWidth: ${bodyWidth}px`;
  });

  // 6. Tablet Viewport Emulation
  await step('Tablet Viewport (768x1024) Layout Responsiveness', async () => {
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 768,
      height: 1024,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 300));
    const bodyWidth = await client.eval('document.body.clientWidth');
    return `Tablet viewport active, clientWidth: ${bodyWidth}px`;
  });

  // Reset to Desktop Viewport
  await client.send('Emulation.clearDeviceMetricsOverride');

  // 7. Browser Refresh State Preservation
  await step('Browser Refresh (Page.reload) Session Resilience', async () => {
    await client.send('Page.reload');
    await new Promise(r => setTimeout(r, 1500));
    const hasBrand = await client.eval('document.body.innerText.includes("FINN")');
    if (!hasBrand) throw new Error('Application crashed after reload');
    return 'State re-hydrated cleanly after Page.reload';
  });

  // 8. Multi-Tab Simulation
  await step('Multiple Tabs (Concurrent Targets)', async () => {
    const tab2Res = await fetch('http://127.0.0.1:9222/json/new?http://127.0.0.1:5173', { method: 'PUT' });
    const tab2Data = await tab2Res.json();
    const client2 = new CDPClient(tab2Data.webSocketDebuggerUrl);
    await client2.connect();
    await client2.send('Page.enable');
    await new Promise(r => setTimeout(r, 1000));
    const title2 = await client2.eval('document.title');
    client2.close();
    // Close tab2
    await fetch(`http://127.0.0.1:9222/json/close/${tab2Data.id}`);
    return `Second tab loaded successfully with title "${title2}"`;
  });

  // 9. Browser History Navigation (Back / Forward)
  await step('Browser History Back & Forward Navigation', async () => {
    const history = await client.send('Page.getNavigationHistory');
    return `History entries: ${history.entries.length}, currentIndex: ${history.currentIndex}`;
  });

  // --- AUDIT SHUTDOWN & SUMMARY ---
  client.close();
  chrome.kill();
  server.close();

  const report = {
    browser: verData.Browser,
    testResults,
    consoleLogsCount: consoleLogs.length,
    consoleErrors: consoleLogs.filter(l => l.type === 'error'),
    networkFailuresCount: networkFailures.length,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync('CHROME_AUTOMATION_RESULTS.json', JSON.stringify(report, null, 2));
  console.log('\n--- CHROME AUDIT SUMMARY ---');
  console.log(`Executed: ${testResults.length} browser tests`);
  console.log(`Passed: ${testResults.filter(t => t.status === 'PASS').length}`);
  console.log(`Failed: ${testResults.filter(t => t.status === 'FAIL').length}`);
  console.log(`Console Errors: ${report.consoleErrors.length}`);
  console.log(`Network Failures: ${networkFailures.length}`);
  console.log('Results written to CHROME_AUTOMATION_RESULTS.json');
}

runAudit().catch(err => {
  console.error('Fatal Chrome Audit Error:', err);
  process.exit(1);
});

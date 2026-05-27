import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const chromePath = findChrome();
const appPort = 8500 + Math.floor(Math.random() * 200);
const debugPort = 8700 + Math.floor(Math.random() * 200);
const base = `http://127.0.0.1:${appPort}`;
const profileDir = path.join(process.cwd(), `.tmp-chrome-smoke-${Date.now()}`);

async function main() {
  const server = spawn(process.execPath, ['tools/static-server.mjs', String(appPort)], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let chrome;
  try {
  await waitForServer(server);
  chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    `${base}/index.html`
  ], { stdio: ['ignore', 'ignore', 'ignore'] });

    const browser = await connectPage(debugPort, `${base}/index.html`);
    await browser.send('Page.enable');
    await browser.send('Runtime.enable');
    await waitForReady(browser);
    await waitForCondition(browser, `location.pathname.endsWith('/login.html')`);

    const result = await evalValue(browser, `(() => ({
      title: document.title,
      loginForm: !!document.querySelector('#login-form'),
      setupVisible: !document.querySelector('#login-setup')?.classList.contains('hidden')
    }))()`);
    assert(result.loginForm, 'login form is missing');
    assert(result.setupVisible, 'missing Supabase setup warning');
    console.log(`auth guard: redirected to login (${result.title})`);

    browser.close();
  } finally {
    if (chrome && !chrome.killed) {
      chrome.kill();
      await delay(500);
    }
    server.kill();
    try {
      fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {}
  }
}

function findChrome() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  const found = candidates.find(file => fs.existsSync(file));
  if (!found) throw new Error('Chrome or Edge was not found');
  return found;
}

function waitForServer(child) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('server did not start')), 5000);
    child.stdout.on('data', chunk => {
      if (String(chunk).includes('Serving')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.stderr.on('data', chunk => reject(new Error(String(chunk))));
    child.on('exit', code => reject(new Error(`server exited with ${code}`)));
  });
}

async function connectPage(port, url) {
  let wsUrl = null;
  for (let i = 0; i < 50; i++) {
    try {
      const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then(res => res.json());
      const page = pages.find(item => item.type === 'page' && item.url === url) || pages.find(item => item.type === 'page');
      if (page?.webSocketDebuggerUrl) {
        wsUrl = page.webSocketDebuggerUrl;
        break;
      }
    } catch {
      await delay(100);
    }
  }
  if (!wsUrl) throw new Error('Chrome debug endpoint did not start');
  return new Cdp(wsUrl);
}

class Cdp {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.ws = new WebSocket(url);
    this.ws.addEventListener('message', event => {
      const msg = JSON.parse(event.data);
      if (!msg.id) return;
      const pending = this.pending.get(msg.id);
      if (!pending) return;
      this.pending.delete(msg.id);
      if (msg.error) pending.reject(new Error(msg.error.message));
      else pending.resolve(msg.result);
    });
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
  }

  async send(method, params = {}) {
    await this.ready;
    const id = this.nextId++;
    const payload = { id, method, params };
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, 5000);
      this.pending.set(id, {
        resolve: value => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: error => {
          clearTimeout(timer);
          reject(error);
        }
      });
    });
  }

  close() {
    this.ws.close();
  }
}

async function waitForReady(browser) {
  for (let i = 0; i < 80; i++) {
    const state = await evalValue(browser, 'document.readyState');
    if (state === 'complete') {
      await delay(500);
      return;
    }
    await delay(100);
  }
  throw new Error('page did not finish loading');
}

async function waitForCondition(browser, expression) {
  for (let i = 0; i < 80; i++) {
    if (await evalValue(browser, expression)) return;
    await delay(100);
  }
  throw new Error(`condition timed out: ${expression}`);
}

async function evalValue(browser, expression) {
  const res = await browser.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.text);
  return res.result.value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

await main();

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';

const chromePath = findChrome();
const appPort = 8900 + Math.floor(Math.random() * 200);
const debugPort = 9100 + Math.floor(Math.random() * 200);
const base = `http://127.0.0.1:${appPort}`;
const profileDir = path.join(process.cwd(), `.tmp-discovery-smoke-${Date.now()}`);

async function main() {
  const server = createServer();
  await new Promise(resolve => server.listen(appPort, '127.0.0.1', resolve));

  let chrome;
  try {
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
      `${base}/obrazec.html`
    ], { stdio: ['ignore', 'ignore', 'ignore'] });

    const browser = await connectPage(debugPort, `${base}/obrazec.html`);
    await browser.send('Page.enable');
    await browser.send('Runtime.enable');
    await browser.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await waitForReady(browser);
    await waitForCondition(browser, `document.querySelectorAll('.answer-field').length > 5`);
    await waitForCondition(browser, `document.querySelectorAll('#section-jumps a').length > 5`);
    await waitForCondition(browser, `document.querySelectorAll('.back-to-top').length > 5`);
    await waitForCondition(browser, `document.querySelector('.floating-top-button')?.textContent.includes('Na vrh')`);
    await waitForCondition(browser, `document.getElementById('form-status').textContent.includes('Nov obrazec')`);

    await evalValue(browser, `
      field('customer').value = 'Test stranka';
      field('contact').value = 'Ana Test';
      document.querySelector('.answer-field').value = 'Testni zapis';
      document.getElementById('save-draft').click();
    `);
    await waitForCondition(browser, `JSON.stringify(Storage.get('discovery-forms', [])).includes('Test stranka')`);

    const desktopResult = await evalValue(browser, `(() => ({
      savedCount: Storage.get('discovery-forms', []).length,
      status: document.getElementById('form-status').textContent,
      savedVisible: document.getElementById('saved-forms').textContent.includes('Test stranka'),
      answerFields: document.querySelectorAll('.answer-field').length
    }))()`);

    assert(desktopResult.savedCount === 1, 'draft was not saved');
    assert(desktopResult.savedVisible, 'saved form is not visible');
    assert(desktopResult.answerFields > 5, 'questions were not rendered');

    await evalValue(browser, `document.getElementById('complete-form').click()`);
    await waitForCondition(browser, `document.getElementById('crm-summary')?.value.includes('Test stranka')`);
    const crmResult = await evalValue(browser, `(() => ({
      visible: !document.getElementById('crm-summary-panel').classList.contains('hidden'),
      includesAnswer: document.getElementById('crm-summary').value.includes('Testni zapis'),
      includesHeading: document.getElementById('crm-summary').value.includes('CRM ZAPISNIK'),
      repeatsSectionInBullet: document.getElementById('crm-summary').value.includes('- ' + discoveryData.sklopi[0].naslov + ':'),
      scrolledToSummary: window.scrollY > 100
    }))()`);
    assert(crmResult.visible, 'CRM summary is not visible after completion');
    assert(crmResult.includesAnswer, 'CRM summary does not include answers');
    assert(crmResult.includesHeading, 'CRM summary heading is missing');
    assert(!crmResult.repeatsSectionInBullet, 'CRM summary repeats section names in every answer');
    assert(crmResult.scrolledToSummary, 'page did not scroll to CRM summary');

    await evalValue(browser, `document.querySelector('#section-jumps a[href="#discovery-section-0"]').click()`);
    await waitForCondition(browser, `location.hash === '#discovery-section-0'`);
    await evalValue(browser, `document.querySelector('#discovery-section-0 .back-to-top').click()`);
    await waitForCondition(browser, `location.hash === '#form-top'`);

    const menuResult = await evalValue(browser, `(() => {
      const menu = document.querySelector('.app-nav-menu');
      menu.open = true;
      const links = document.querySelector('.app-nav-links');
      return {
        overflowY: getComputedStyle(links).overflowY,
        linkCount: links.querySelectorAll('a').length
      };
    })()`);
    assert(menuResult.overflowY !== 'auto' && menuResult.overflowY !== 'scroll', 'dropdown menu still has internal scrolling');
    assert(menuResult.linkCount > 5, 'dropdown menu did not render links');

    await browser.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true
    });
    await browser.send('Page.reload');
    await waitForReady(browser);
    await waitForCondition(browser, `document.querySelectorAll('.answer-field').length > 5`);

    const mobileColumns = await evalValue(browser, `getComputedStyle(document.querySelector('.discovery-shell')).gridTemplateColumns`);
    assert(!mobileColumns.includes('280px'), 'mobile layout still uses desktop sidebar columns');

    console.log(`discovery smoke: saved draft, rendered ${desktopResult.answerFields} answers, mobile columns ${mobileColumns}`);
    browser.close();
  } finally {
    if (chrome && !chrome.killed) {
      chrome.kill();
      await delay(500);
    }
    server.close();
    try {
      fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {}
  }
}

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, base);
    if (url.pathname === '/data/auth-config.json') {
      send(res, 200, 'application/json', JSON.stringify({ enabled: false, supabaseUrl: '', anonKey: '' }));
      return;
    }

    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^\/+/, '');
    const file = path.resolve(process.cwd(), relative);
    if (!file.startsWith(process.cwd()) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      send(res, 404, 'text/plain', 'not found');
      return;
    }
    send(res, 200, contentType(file), fs.readFileSync(file));
  });
}

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
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

async function connectPage(port, url) {
  for (let i = 0; i < 50; i++) {
    try {
      const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then(res => res.json());
      const page = pages.find(item => item.type === 'page' && item.url === url) || pages.find(item => item.type === 'page');
      if (page?.webSocketDebuggerUrl) return new Cdp(page.webSocketDebuggerUrl);
    } catch {
      await delay(100);
    }
  }
  throw new Error('Chrome debug endpoint did not start');
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
    this.ws.send(JSON.stringify({ id, method, params }));
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

import { spawn } from 'node:child_process';

const port = 8020 + Math.floor(Math.random() * 400);
const base = `http://127.0.0.1:${port}`;
const pages = ['index.html', 'login.html', 'settings.html', 'zakonodaja.html', 'govori.html', 'ugovori.html', 'stranke.html'];
const assets = ['js/app.js', 'js/auth.js', 'js/i18n.js', 'js/admin.js', 'css/style.css', 'data/auth-config.json', 'data/i18n.json', 'translations-review.tsv'];

const server = spawn(process.execPath, ['tools/static-server.mjs', String(port)], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe']
});

try {
  await waitForServer(server);
  for (const target of [...pages, ...assets]) {
    const started = performance.now();
    const res = await fetch(`${base}/${target}`);
    const text = await res.text();
    const ms = Math.round(performance.now() - started);
    if (!res.ok) throw new Error(`${target} returned ${res.status}`);
    if (!text.length) throw new Error(`${target} returned an empty response`);
    console.log(`${target}: ${res.status} ${text.length} bytes ${ms}ms`);
  }
} finally {
  server.kill();
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

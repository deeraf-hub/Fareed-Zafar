/* Runs the inventory system on your own computer at http://localhost:3000
   Needs Node.js (nodejs.org). Nothing else — no npm install, no internet.

   Start it with:  node serve.mjs
   Stop it with:   Ctrl + C
*/

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const START_PORT = Number(process.env.PORT || process.argv[2] || 3000);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon'
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/' || rel === '') rel = '/index.html';

    /* Keep every request inside this folder. */
    const path = join(HERE, normalize(rel).replace(/^(\.\.[/\\])+/, ''));
    if (!path.startsWith(HERE)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    const info = await stat(path);
    if (!info.isFile()) {
      res.writeHead(404).end('Not found');
      return;
    }

    const body = await readFile(path);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(path).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
       .end('Not found. Open http://localhost:' + server.address().port + '/');
  }
});

/* If the port is taken, quietly try the next one. */
let port = START_PORT;
server.on('error', err => {
  if (err.code === 'EADDRINUSE' && port < START_PORT + 20) {
    server.listen(++port, listening);
  } else {
    console.error('\nCould not start the server:', err.message, '\n');
    process.exit(1);
  }
});

function lanAddress() {
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open'
            : process.platform === 'win32'  ? 'cmd'
            : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try { spawn(cmd, args, { stdio: 'ignore', detached: true }).unref(); } catch {}
}

function listening() {
  const local = `http://localhost:${port}/`;
  const lan   = lanAddress();

  console.log('');
  console.log('  Brands Loop — Inventory Manager is running.');
  console.log('');
  console.log('  On this computer:   ' + local);
  if (lan) console.log('  On your phone:      http://' + lan + ':' + port + '/   (same Wi-Fi)');
  console.log('');
  console.log('  Note: each device keeps its own separate stock data.');
  console.log('  Leave this window open. Press Ctrl + C to stop.');
  console.log('');

  if (!process.env.NO_OPEN) openBrowser(local);
}

server.listen(port, listening);

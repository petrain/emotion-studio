// Zero-dependency static server + Azure Speech proxy.
//   SPEECH_KEY=xxxx SPEECH_REGION=eastus node server.js
// With SPEECH_KEY set, the page synthesizes through /api/tts and the key never reaches the browser.
// Without it, the page still works — users paste their key into Settings.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = +process.env.PORT || 5173;
const KEY = process.env.SPEECH_KEY || '';
const REGION = process.env.SPEECH_REGION || 'eastus';
const ROOT = __dirname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.md': 'text/plain' };

async function proxy(req, res, url, init) {
  try {
    const r = await fetch(url, { ...init, headers: { ...init.headers, 'Ocp-Apim-Subscription-Key': KEY, 'User-Agent': 'emotion-studio' } });
    res.writeHead(r.status, { 'Content-Type': r.headers.get('content-type') || 'application/octet-stream' });
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.writeHead(502, { 'Content-Type': 'text/plain' }); res.end(String(e));
  }
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');

  if (u.pathname === '/api/config') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ proxy: !!KEY, region: REGION }));
  }
  if (u.pathname === '/api/tts' && req.method === 'POST') {
    if (!KEY) { res.writeHead(503); return res.end('SPEECH_KEY not set on server'); }
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => proxy(req, res, `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      body: Buffer.concat(chunks),
      headers: { 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': req.headers['x-microsoft-outputformat'] || 'audio-24khz-96kbitrate-mono-mp3' },
    }));
    return;
  }
  if (u.pathname === '/api/voices') {
    if (!KEY) { res.writeHead(503); return res.end('SPEECH_KEY not set on server'); }
    return proxy(req, res, `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/voices/list`, { headers: {} });
  }

  const file = path.join(ROOT, path.normalize(u.pathname === '/' ? '/index.html' : u.pathname));
  if (!file.startsWith(ROOT) || /server\.js$/.test(file)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
});

// If the port is taken (e.g. another dev server), try the next few.
let port = PORT;
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE' && port < PORT + 10) { console.log(`Port ${port} in use, trying ${port + 1}…`); server.listen(++port); }
  else throw e;
});
server.on('listening', () => {
  console.log(`Emotion Studio → http://localhost:${port}  (${KEY ? `proxying to ${REGION}` : 'no SPEECH_KEY: enter key in the page'})`);
});
server.listen(port);

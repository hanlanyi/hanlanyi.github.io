// Minimal static server for previewing dist/ locally: npm run dev
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.env.PORT) || 4000;
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.xml': 'application/xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  let p = path.normalize(decodeURIComponent(req.url.split('?')[0]));
  let file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { file = path.join(root, '404.html'); res.statusCode = 404; }
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  // Read the whole file at once: no open handle is left behind to block a rebuild on Windows.
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 503; res.end(); return; }
    res.end(data);
  });
}).on('error', (err) => console.error(err.message)).listen(port, () => console.log(`http://localhost:${port}`));

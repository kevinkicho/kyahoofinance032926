import http from 'http';
import fs from 'fs';
import path from 'path';

const DIST = '/mnt/c/Users/kevin/Workspace/kyahoofinance032926/dist';
const PORT = 5175;

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(DIST, req.url.replace('/kyahoofinance032926/', '/'));
  if (filePath.endsWith('/')) filePath += 'index.html';
  if (!fs.existsSync(filePath)) filePath = path.join(DIST, 'index.html');
  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Serving on http://127.0.0.1:${PORT}/`);
});

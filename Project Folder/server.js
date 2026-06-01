const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname);
const port = process.env.PORT || 8000;
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

function normalizeUrl(url) {
  let pathname = decodeURIComponent(url.split('?')[0]);
  if (pathname === '/' || pathname === '') {
    return '/PatientFile/index.html';
  }
  if (pathname.endsWith('/')) {
    pathname += 'index.html';
  }
  return pathname.replace(/^\/+/, '/');
}

function findFile(requestPath) {
  const candidates = [
    path.join(root, requestPath),
    path.join(root, 'PatientFile', requestPath),
    path.join(root, 'DentistFile', requestPath),
  ];

  for (const candidate of candidates) {
    if (!candidate.startsWith(root)) continue;
    try {
      const stats = fs.statSync(candidate);
      if (stats.isFile()) {
        return candidate;
      }
    } catch (error) {
      continue;
    }
  }
  return null;
}

const server = http.createServer((req, res) => {
  const requestPath = normalizeUrl(req.url);
  const filePath = findFile(requestPath);

  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Server Error');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`Static server running at http://localhost:${port}`);
});

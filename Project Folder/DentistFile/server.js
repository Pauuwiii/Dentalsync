const http = require('http');
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..');
const port = 8000;
const mime = {
  html: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  json: 'application/json',
};
http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  let filePath = url === '/' ? path.join(dir, 'PatientFile', 'index.html') : path.join(dir, url.replace(/^\//, ''));
  if (url.endsWith('/')) {
    filePath = path.join(filePath, 'index.html');
  }

  fs.stat(filePath, (err) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).slice(1);
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
}).listen(port, () => console.log(`Server running on http://localhost:${port}`));

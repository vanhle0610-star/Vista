import http from 'http';

const server = http.createServer((req, res) => {
  req.on('error', () => {});
  res.on('error', () => {});

  const options = {
    hostname: '127.0.0.1',
    port: 3000,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: 'localhost:3000' },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    proxyRes.on('error', () => {});
    if (!res.headersSent) {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    }
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Proxy to 3000 error: ' + err.message);
    }
  });

  req.pipe(proxyReq, { end: true });
});

server.on('upgrade', (req, socket, head) => {
  socket.on('error', () => {});

  const proxySocket = http.request({
    hostname: '127.0.0.1',
    port: 3000,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: 'localhost:3000' },
  });

  proxySocket.on('upgrade', (proxyRes, remoteSocket, proxyHead) => {
    remoteSocket.on('error', () => {});
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n`);
    remoteSocket.pipe(socket);
    socket.pipe(remoteSocket);
  });

  proxySocket.on('error', () => {
    try {
      socket.destroy();
    } catch (_) {}
  });

  proxySocket.end();
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

server.listen(3001, () => {
  console.log('Forwarding http://localhost:3001 -> http://localhost:3000');
});

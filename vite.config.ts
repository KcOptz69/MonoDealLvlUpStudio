import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Rooms } = require('./rooms.js');

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'monopoly-deal-api',
      configureServer(server) {
        const rooms = new Rooms();
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url || '', 'http://localhost');
          if (url.pathname === '/api/health') {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify({ ok: true, online: true, capacity: 5, botSlots: true, version: '2.7.0' }));
            return;
          }
          if (url.pathname === '/api/events') {
            const code = url.searchParams.get('code');
            const token = url.searchParams.get('token');
            try {
              rooms.get(code, token);
              res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
              });
              rooms.subscribe(code, token, res);
            } catch (err: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }
          if (url.pathname === '/api/room' && req.method === 'POST') {
            let body = '';
            for await (const chunk of req) {
              body += chunk;
            }
            try {
              const d = JSON.parse(body || '{}');
              let v;
              if (d.cmd === 'create') v = rooms.create(d.name,d.tokenIndex);
              else if (d.cmd === 'join') v = rooms.join(d.code, d.name, d.tokenIndex);
              else if (d.cmd === 'state') {
                const { r, seat } = rooms.get(d.code, d.token);
                v = rooms.view(r, seat);
              } else {
                v = rooms.command(d.code, d.token, d.cmd, d.data);
              }
              res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
              res.end(JSON.stringify(v));
            } catch (err: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }
          next();
        });
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
});

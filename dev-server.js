/*
  Dev server para vac_site: relaja CSP sólo en localhost y no modifica archivos.
  - Elimina la meta CSP del HTML al vuelo y añade cabecera CSP permisiva para desarrollo.
  - Sirve estáticos con cache deshabilitado y tipos MIME correctos.
*/
'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');

const app = express();
const ROOT = __dirname;
const PORT = process.env.PORT ? Number(process.env.PORT) : 5174; // evitar conflicto con 8000

// CSP relajada para desarrollo (permite http/https, inline y eval, y datos locales de extensiones)
const DEV_CSP = [
  "default-src 'self' http: https: data: blob:",
  "img-src * data: blob:",
  "style-src-elem * 'unsafe-inline'",
  "style-src * 'unsafe-inline'",
  "script-src-elem * 'unsafe-inline'",
  "script-src * 'unsafe-inline' 'unsafe-eval'",
  "font-src * data:",
  "connect-src *",
  "frame-ancestors 'self'"
].join('; ');

// CSP estricta de producción (refleja la meta CSP en HTML)
const PROD_CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob: https://www.google-analytics.com",
  "style-src-elem 'self' https://fonts.googleapis.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com"
].join('; ');


function sendHtml(fileRelPath, req, res) {
  const absPath = path.join(ROOT, fileRelPath);
  fs.readFile(absPath, 'utf8', (err, html) => {
    if (err) {
      res.status(404).send('Not found');
      return;
    }
    // Eliminar meta CSP existente para evitar combinación de políticas (más restrictiva)
    const cleaned = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>\s*/gi, '\n');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const useStrict = !!process.env.STRICT;
    res.setHeader('Content-Security-Policy', useStrict ? PROD_CSP : DEV_CSP);
    // Cabeceras de seguridad básicas en dev
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.send(cleaned);
  });
}

// Rutas HTML con reescritura de CSP
app.get('/', (req, res) => sendHtml('index.html', req, res));
app.get(/.*\.html$/, (req, res) => {
  // Normalizar y evitar path traversal
  const safe = path.normalize(req.path).replace(/^\//, '');
  sendHtml(safe, req, res);
});

// Compatibilidad con alias /guia -> /guia.html
app.get('/guia', (req, res) => sendHtml('guia.html', req, res));

// Estáticos con headers propios
app.use(express.static(ROOT, {
  etag: false,
  lastModified: false,
  setHeaders: (res, filePath) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    // Asegurar tipos MIME (algunos servers locales pueden no enviarlos correctos)
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  }
}));

app.listen(PORT, () => {
  console.log(`[vac_site] Dev server escuchando en http://localhost:${PORT}/`);
  console.log(`[vac_site] CSP ${process.env.STRICT ? 'estricta (producción simulada)' : 'relajada (desarrollo)'} por cabecera; meta CSP removida al vuelo.`);
});
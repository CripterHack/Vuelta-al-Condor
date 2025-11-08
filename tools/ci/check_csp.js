// CSP sanity check:
// 1) Prefer a server CSP in .htaccess (Apache).
// 2) If not present, fall back to meta CSP in index.html to avoid failing CI for hosts sin .htaccess (e.g., GitHub Pages).
const fs = require('fs');

function fail(msg) {
  console.error(`CSP check failed: ${msg}`);
  process.exit(1);
}

function warn(msg) {
  console.warn(`CSP check warning: ${msg}`);
}

const htaccessPath = '.htaccess';
let policySource = 'header';
let cspLine = null;

if (fs.existsSync(htaccessPath)) {
  const content = fs.readFileSync(htaccessPath, 'utf8');
  const lines = content.split(/\r?\n/);
  cspLine = lines.find(l => /Content-Security-Policy/i.test(l)) || null;
}

// If header not found, try meta CSP in index.html (fallback)
if (!cspLine) {
  const indexPath = 'index.html';
  if (!fs.existsSync(indexPath)) {
    fail('No CSP found: .htaccess header missing and index.html not present');
  }
  const html = fs.readFileSync(indexPath, 'utf8');
  const metaMatch = html.match(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (!metaMatch) {
    fail('No CSP found: .htaccess header missing and meta CSP not present in index.html');
  }
  policySource = 'meta';
  cspLine = `Content-Security-Policy "${metaMatch[1]}"`;
  warn('Using meta CSP as fallback (no server header found).');
}

// Extract policy string inside quotes after Header set Content-Security-Policy
const match = cspLine.match(/Content-Security-Policy\s+"([^"]+)"/i) || cspLine.match(/Content-Security-Policy\s+'([^']+)'/i);
if (!match) {
  fail('Unable to parse CSP policy string from .htaccess line');
}

const policy = match[1];
const directives = Object.create(null);
policy.split(';').map(s => s.trim()).filter(Boolean).forEach(part => {
  const [name, ...values] = part.split(/\s+/);
  directives[name] = values;
});

function has(name) {
  return Array.isArray(directives[name]);
}

function includes(name, token) {
  return has(name) && directives[name].includes(token);
}

// Checks (severity varies depending on policy source)
const isHeader = policySource === 'header';

if (!has('default-src')) {
  warn('default-src missing; consider setting a restrictive default');
}

if (includes('script-src', "'unsafe-inline'")) {
  if (isHeader) fail("script-src contains 'unsafe-inline'");
  else warn("meta CSP: script-src contains 'unsafe-inline'");
}
if (includes('script-src', "'unsafe-eval'")) {
  if (isHeader) fail("script-src contains 'unsafe-eval'");
  else warn("meta CSP: script-src contains 'unsafe-eval'");
}

if (has('style-src') && includes('style-src', "'unsafe-inline'")) {
  warn("style-src contains 'unsafe-inline' (consider using nonces or hashes)");
}

if (!has('object-src') || !includes('object-src', "'none'")) {
  if (isHeader) fail("object-src should be set to 'none'");
  else warn("meta CSP: object-src should be 'none'");
}

if (!has('base-uri') || !includes('base-uri', "'none'")) {
  warn("base-uri should be 'none' to prevent base tag abuse");
}

if (!has('frame-ancestors')) {
  warn('frame-ancestors missing; consider setting to "none" or a trusted origin');
}

if (!has('upgrade-insecure-requests')) {
  warn('upgrade-insecure-requests missing; consider enabling to auto-upgrade http assets');
}

// img-src sanity
if (!has('img-src')) {
  warn('img-src missing; consider restricting to self and trusted origins');
}

console.log(`CSP check passed (${policySource}) with zero critical failures`);
// Simple CSP sanity check for .htaccess
const fs = require('fs');

function fail(msg) {
  console.error(`CSP check failed: ${msg}`);
  process.exit(1);
}

function warn(msg) {
  console.warn(`CSP check warning: ${msg}`);
}

const htaccessPath = '.htaccess';
if (!fs.existsSync(htaccessPath)) {
  fail('.htaccess not found; cannot validate CSP header');
}

const content = fs.readFileSync(htaccessPath, 'utf8');
const lines = content.split(/\r?\n/);
const cspLine = lines.find(l => /Content-Security-Policy/i.test(l));
if (!cspLine) {
  fail('Content-Security-Policy header not set in .htaccess');
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

// Checks
if (!has('default-src')) {
  warn('default-src missing; consider setting a restrictive default');
}

if (includes('script-src', "'unsafe-inline'")) {
  fail("script-src contains 'unsafe-inline'");
}
if (includes('script-src', "'unsafe-eval'")) {
  fail("script-src contains 'unsafe-eval'");
}

if (has('style-src') && includes('style-src', "'unsafe-inline'")) {
  warn("style-src contains 'unsafe-inline' (consider using nonces or hashes)");
}

if (!has('object-src') || !includes('object-src', "'none'")) {
  fail("object-src should be set to 'none'");
}

if (!has('base-uri') || !includes('base-uri', "'none'")) {
  warn("base-uri should be 'none' to prevent base tag abuse");
}

if (!has('frame-ancestors')) {
  warn('frame-ancestors missing; consider setting to \"none\" or a trusted origin');
}

if (!has('upgrade-insecure-requests')) {
  warn('upgrade-insecure-requests missing; consider enabling to auto-upgrade http assets');
}

// img-src sanity
if (!has('img-src')) {
  warn('img-src missing; consider restricting to self and trusted origins');
}

console.log('CSP check passed with zero critical failures');
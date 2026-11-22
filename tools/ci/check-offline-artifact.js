const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const checkout = path.resolve(__dirname, '../..');
const artifact = process.env.CONDOR_STATIC_ARTIFACT_DIR
  ? path.resolve(process.env.CONDOR_STATIC_ARTIFACT_DIR)
  : checkout;
const mounts = [
  'https://condor.example/',
  'https://pages.example/Vuelta-al-Condor/',
];
const requiredOffline = new Map([
  ['./', 'document'],
  ['index.html', 'document'],
  ['guia.html', 'document'],
  ['corredores.html', 'document'],
  ['route/vac.gpx', ''],
  ['VAC_Checklist_Autosuficiente.pdf', ''],
  ['VAC_Plantilla_Top_Tube.png', 'image'],
]);

function relativeArtifactPath(url, mount) {
  assert.equal(url.origin, mount.origin);
  assert(url.pathname.startsWith(mount.pathname), `${url} escapes ${mount}`);
  const target = decodeURIComponent(url.pathname.slice(mount.pathname.length)) || 'index.html';
  const local = path.resolve(artifact, target);
  assert(local.startsWith(`${artifact}${path.sep}`), `${url} escapes the artifact directory`);
  return local;
}

function htmlScriptUrl(mount, page) {
  const pageUrl = new URL(page, mount);
  const html = readFileSync(relativeArtifactPath(pageUrl, mount), 'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]*\/sw-register\.min\.js)"[^>]*>/g)];
  assert.equal(scripts.length, 1, `${pageUrl} must load one registration script`);
  assert(!/\btype="module"/.test(scripts[0][0]), 'registration requires a classic script for currentScript');
  return new URL(scripts[0][1], pageUrl);
}

async function captureRegistration(script, scriptUrl, pageUrl) {
  let onLoad;
  const attempts = [];
  const document = { currentScript: { src: scriptUrl.href } };
  vm.runInNewContext(script, {
    document,
    URL,
    window: { addEventListener(type, callback) { assert.equal(type, 'load'); onLoad = callback; } },
    navigator: {
      serviceWorker: { register(url) { attempts.push(new URL(url, pageUrl).href); return Promise.resolve(null); } },
    },
  });
  document.currentScript = null; // The browser only exposes it during script execution.
  assert.equal(typeof onLoad, 'function');
  onLoad();
  await Promise.resolve();
  assert.equal(attempts.length, 1);
  return attempts[0];
}

function offlineProbe(mount) {
  const workerUrl = new URL('sw.js', mount);
  const workerFile = relativeArtifactPath(workerUrl, mount);
  const handlers = new Map();
  const cached = new Map();
  let precache = [];
  let installed = false;
  const match = async (request) => cached.get(request.url);
  const cache = {
    async addAll(entries) {
      precache = Array.from(entries);
      for (const entry of precache) {
        const url = new URL(entry, workerUrl);
        const file = relativeArtifactPath(url, mount);
        const bytes = readFileSync(file);
        assert(bytes.length > 0, `${url} is an empty pre-cache entry`);
        cached.set(url.href, bytes);
      }
    },
  };
  vm.runInNewContext(readFileSync(workerFile, 'utf8'), {
    self: {
      addEventListener(type, handler) { handlers.set(type, handler); },
      skipWaiting() { installed = true; },
    },
    URL,
    location: workerUrl,
    caches: { open: async () => cache, match },
    fetch: async () => { throw new Error('simulated offline'); },
    Response,
  });
  return {
    async install() {
      let pending;
      handlers.get('install')({ waitUntil(promise) { pending = promise; } });
      await pending;
      assert(installed, 'install must complete only after pre-cache succeeds');
      return precache;
    },
    async read(entry, destination) {
      const request = { method: 'GET', destination, url: new URL(entry, mount).href };
      let result;
      handlers.get('fetch')({ request, respondWith(promise) { result = promise; } });
      return result;
    },
  };
}

for (const base of mounts) {
  const mount = new URL(base);
  test(`${base}: registration source and deployed script target project worker`, async () => {
    for (const page of ['./', 'index.html', 'guia.html', 'corredores.html']) {
      const scriptUrl = htmlScriptUrl(mount, page);
      const built = readFileSync(relativeArtifactPath(scriptUrl, mount), 'utf8');
      const source = readFileSync(path.join(checkout, 'scripts/sw-register.js'), 'utf8');
      for (const code of [source, built]) {
        assert.equal(await captureRegistration(code, scriptUrl, new URL(page, mount)), new URL('sw.js', mount).href, page);
      }
    }
  });

  test(`${base}: worker resolves all pre-cache assets and critical offline routes`, async () => {
    const probe = offlineProbe(mount);
    const entries = await probe.install();
    assert.equal(new Set(entries).size, entries.length, 'pre-cache entries must not repeat');
    for (const [entry, destination] of requiredOffline) {
      assert(entries.includes(entry), `${entry} is missing from the worker pre-cache`);
      if (destination === 'image') continue; // Image fetch follows a separate dynamic cache policy.
      assert.deepEqual(await probe.read(entry, destination), readFileSync(relativeArtifactPath(new URL(entry, mount), mount)));
    }
  });
}

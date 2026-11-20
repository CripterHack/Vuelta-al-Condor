const { once } = require('node:events');
const path = require('node:path');
const express = require('express');

async function main() {
  const { check, LinkState } = await import('linkinator');
  const root = path.resolve(__dirname, '../..');
  const pages = ['/index.html', '/guia.html', '/corredores.html'];
  const app = express();
  app.use(express.static(root));
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const page of pages) {
      const url = origin + page;
      const { links, passed } = await check({
        path: url,
        timeout: 5000,
        linksToSkip: async (link) => new URL(link, origin).origin !== origin,
      });
      const internal = links.filter(({ state }) => state !== LinkState.SKIPPED);
      if (!passed || !internal.some(({ parent }) => parent === url)) {
        for (const item of internal.filter(({ state }) => state === LinkState.BROKEN)) {
          console.error(`${item.status ?? 'error'} ${item.url} (from ${item.parent ?? page})`);
        }
        throw new Error(`Internal link check failed or saw no links on ${page}`);
      }
      console.log(`${page}: ${internal.length - 1} internal links/assets passed`);
    }
  } finally {
    server.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

#!/usr/bin/env node
/* Minifica/optimiza scripts en ./scripts, excluyendo feedback.js */
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const terser = require('terser');

async function main(){
  const baseDir = path.resolve(__dirname, '..');
  const scriptsDir = path.join(baseDir, 'scripts');
  let files;
  try {
    files = await fsp.readdir(scriptsDir);
  } catch (e) {
    console.error('[js:minify] No se pudo leer el directorio scripts:', e.message);
    process.exitCode = 1; return;
  }

  const exclude = new Set(['feedback.js']);
  const targets = files.filter(f => f.endsWith('.js') && !f.endsWith('.min.js') && !exclude.has(f));
  if (targets.length === 0){
    console.log('[js:minify] No hay archivos a minificar.');
    return;
  }
  console.log(`[js:minify] Minificando ${targets.length} archivos...`);

  for (const file of targets){
    const full = path.join(scriptsDir, file);
    try {
      const src = await fsp.readFile(full, 'utf8');
      const result = await terser.minify(src, {
        ecma: 2019,
        compress: {
          passes: 2,
          hoist_funs: true,
          hoist_vars: false,
          drop_console: false,
          drop_debugger: true
        },
        mangle: { toplevel: false },
        format: { comments: false }
      });
      if (!result || !result.code){
        throw new Error('Resultado de minificación vacío');
      }
      const minName = file.replace(/\.js$/, '.min.js');
      const out = path.join(scriptsDir, minName);
      await fsp.writeFile(out, result.code, 'utf8');
      console.log(`✔ ${file} → ${minName}`);
    } catch (e) {
      console.error(`✖ Error minificando ${file}:`, e.message);
      // No abortar todo el proceso por un error puntual
    }
  }
}

main();
/*
  Reemplaza referencias a scripts no minificados por sus versiones .min.js
  en todos los archivos .html del directorio actual (no recursivo en subcarpetas ocultas).
  Solo realiza el reemplazo si el archivo .min.js existe en scripts/.
*/
const fs = require('fs');
const path = require('path');

function getHtmlFiles(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.html'))
    .map((e) => path.join(rootDir, e.name));
}

function replaceToMin(content, scriptsDir) {
  // Busca src="scripts/<name>.js" y reemplaza por .min.js si existe
  return content.replace(/src\s*=\s*"scripts\/(.+?)\.js"/g, (match, name) => {
    const minPath = path.join(scriptsDir, `${name}.min.js`);
    if (fs.existsSync(minPath)) {
      return match.replace(`${name}.js`, `${name}.min.js`);
    }
    return match; // Mantener referencia si no existe .min.js
  });
}

function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  const scriptsDir = path.join(path.dirname(filePath), 'scripts');
  const updated = replaceToMin(original, scriptsDir);
  if (updated !== original) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`Actualizado: ${path.basename(filePath)}`);
  } else {
    console.log(`Sin cambios: ${path.basename(filePath)}`);
  }
}

function main() {
  const root = process.cwd();
  const htmlFiles = getHtmlFiles(root);
  if (!htmlFiles.length) {
    console.log('No se encontraron archivos HTML en el directorio raíz.');
    return;
  }
  htmlFiles.forEach(processFile);
}

main();
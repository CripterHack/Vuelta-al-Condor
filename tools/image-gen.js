// Generate AVIF/WebP variants for hero and logo images using Sharp
const fs = require('fs');
let sharp;
try { sharp = require('sharp'); } catch (e) {
  console.error('Sharp is not installed. Run `pnpm add -D sharp` and retry.');
  process.exit(1);
}

const root = __dirname.replace(/\\tools$/, '');
const imagesDir = root + '/images';

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function generateVariants(inputPath, baseName, sizes, opts = {}) {
  const out = [];
  for (const w of sizes) {
    const avifPath = `${imagesDir}/${baseName}-${w}.avif`;
    const webpPath = `${imagesDir}/${baseName}-${w}.webp`;
    await sharp(inputPath)
      .resize({ width: w, withoutEnlargement: true })
      .avif({ quality: opts.avifQuality ?? 60 })
      .toFile(avifPath);
    await sharp(inputPath)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: opts.webpQuality ?? 70 })
      .toFile(webpPath);
    out.push({ w, avifPath, webpPath });
    console.log(`✓ ${baseName} ${w}px -> avif/webp`);
  }
  return out;
}

async function main() {
  await ensureDir(imagesDir);
  // Hero emblem
  const heroInput = imagesDir + '/VAC-red.png';
  if (!fs.existsSync(heroInput)) {
    console.error('Missing images/VAC-red.png');
  } else {
    await generateVariants(heroInput, 'VAC-red', [320, 480, 640, 960], { avifQuality: 62, webpQuality: 74 });
  }
  // Header logo (tiny render ~44px) with 1x/2x/3x
  const logoInput = imagesDir + '/VAC.png';
  if (!fs.existsSync(logoInput)) {
    console.error('Missing images/VAC.png');
  } else {
    await generateVariants(logoInput, 'VAC', [44, 88, 132], { avifQuality: 70, webpQuality: 78 });
  }

  // Valley hero background (large, cover). Provide 1x/2x densities.
  const valleyInput = imagesDir + '/valley.jpg';
  if (!fs.existsSync(valleyInput)) {
    console.error('Missing images/valley.jpg');
  } else {
    await generateVariants(valleyInput, 'valley', [1600, 2400, 3200], { avifQuality: 58, webpQuality: 72 });
  }

  // Promo image (social/hero card). Useful for on-site renders.
  const promoInput = imagesDir + '/promo.jpg';
  if (!fs.existsSync(promoInput)) {
    console.error('Missing images/promo.jpg');
  } else {
    await generateVariants(promoInput, 'promo', [800, 1200], { avifQuality: 60, webpQuality: 75 });
  }
}

main().catch(err => { console.error(err); process.exit(1); });
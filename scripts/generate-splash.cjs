/**
 * Builds assets/splash.png for Expo: min 1242×2436, opaque background.
 * Source artwork: assets/splash-logo.png (export from Figma; centered here).
 */
const path = require('path');
const sharp = require('sharp');

const WIDTH = 1242;
const HEIGHT = 2436;
const LOGO_MAX_WIDTH = 560;

async function main() {
  const root = path.join(__dirname, '..');
  const logoPath = path.join(root, 'assets', 'splash-logo.png');
  const outPath = path.join(root, 'assets', 'splash.png');

  const logo = await sharp(logoPath)
    .ensureAlpha()
    .resize({ width: LOGO_MAX_WIDTH })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  const meta = await sharp(outPath).metadata();
  console.log(`Wrote ${outPath} (${meta.width}×${meta.height}, alpha: ${meta.hasAlpha})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

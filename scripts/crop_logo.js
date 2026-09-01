const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function cropLogo() {
  const inputPath = path.join(__dirname, '..', 'HD Logo.png');
  const publicDir = path.join(__dirname, '..', 'public');
  const imagesDir = path.join(publicDir, 'images');

  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const image = sharp(inputPath);
  const metadata = await image.metadata();
  console.log('Original dimensions:', metadata.width, 'x', metadata.height);

  // Auto-trim white background border with high threshold
  const trimmed = await sharp(inputPath)
    .trim({
      background: '#ffffff',
      threshold: 15
    })
    .toBuffer({ resolveWithObject: true });

  console.log('Trimmed dimensions:', trimmed.info.width, 'x', trimmed.info.height);

  // Also create a tightly cropped version with clean 1% padding for aesthetics
  const croppedLogo = await sharp(trimmed.data)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'logo.png'));

  // Copy to aliases
  fs.copyFileSync(path.join(publicDir, 'logo.png'), path.join(publicDir, 'HD Logo.png'));
  fs.copyFileSync(path.join(publicDir, 'logo.png'), path.join(imagesDir, 'logo.png'));

  console.log('Cropped logo successfully written to public/logo.png, public/HD Logo.png, public/images/logo.png');
}

cropLogo().catch(err => {
  console.error('Error cropping logo:', err);
  process.exit(1);
});

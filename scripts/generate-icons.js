// Generates PWA icons (192, 512, maskable-512) by compositing the PAN IIT
// logo on a brand-navy square background. The source logo lives in
// public/logo/paniit.png and is referenced as-is by the in-app UI.
// Run: npm run generate-icons
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const OUT_DIR = path.join(__dirname, "..", "public", "icons");
const LOGO = path.join(__dirname, "..", "public", "logo", "paniit.png");
const BRAND = { r: 27, g: 20, b: 100 }; // #1B1464

fs.mkdirSync(OUT_DIR, { recursive: true });

async function emit(size, name, maskable = false) {
  // Maskable icons need a generous safe zone; non-maskable can fill more.
  const padRatio = maskable ? 0.32 : 0.18;
  const inner = Math.round(size * (1 - padRatio * 2));

  // Resize the logo to fit inside `inner` while preserving aspect ratio.
  const logo = await sharp(LOGO)
    .resize(inner, inner, { fit: "inside", withoutEnlargement: false })
    .toBuffer();

  const radius = maskable ? 0 : Math.round(size * 0.18);
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
       <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white"/>
     </svg>`
  );

  const out = path.join(OUT_DIR, name);
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: BRAND.r, g: BRAND.g, b: BRAND.b, alpha: 1 },
    },
  })
    .composite([
      { input: logo, gravity: "center" },
      { input: mask, blend: "dest-in" },
    ])
    .png()
    .toFile(out);
  console.log(`  wrote ${name}`);
}

(async () => {
  console.log("Generating PWA icons →", OUT_DIR);
  await emit(192, "icon-192.png");
  await emit(512, "icon-512.png");
  await emit(512, "icon-maskable-512.png", true);
  console.log("Done.");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

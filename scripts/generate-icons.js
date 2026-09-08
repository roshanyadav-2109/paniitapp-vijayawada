// Generates PWA icons (192, 512, maskable-512) from the AP summit mark.
// Run: npm run generate-icons
//
// Two deliberate changes from the Bangalore version of this script:
//
//   1. Source is public/logo/paniit-ap-mark.png (the square hexagon mark),
//      not the wide lockup. The lockup is ~2.3:1, so squeezing it into a
//      square left it a thin illegible strip.
//   2. Background is white, not brand navy. The mark is dark navy line art —
//      on a navy tile it all but disappeared.
//
// A hairline navy border keeps the icon from vanishing against a light
// home screen. The maskable variant skips the border and corner radius (the
// launcher applies its own mask) and uses a wider safe zone.
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const OUT_DIR = path.join(__dirname, "..", "public", "icons");
const MARK = path.join(__dirname, "..", "public", "logo", "paniit-ap-mark.png");
const BRAND = "#1B1464";

fs.mkdirSync(OUT_DIR, { recursive: true });

async function emit(size, name, maskable = false) {
  // Maskable icons get a generous safe zone; standard icons can fill more.
  const padRatio = maskable ? 0.26 : 0.13;
  const inner = Math.round(size * (1 - padRatio * 2));

  const mark = await sharp(MARK)
    .resize(inner, inner, { fit: "inside", withoutEnlargement: false })
    .toBuffer();

  const radius = maskable ? 0 : Math.round(size * 0.18);
  const stroke = Math.max(1, Math.round(size * 0.012));
  const inset = stroke / 2;

  // Rounded white tile + hairline border, drawn as one layer.
  const plate = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
       <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#ffffff"/>
       ${
         maskable
           ? ""
           : `<rect x="${inset}" y="${inset}" width="${size - stroke}" height="${size - stroke}"
                    rx="${radius - inset}" ry="${radius - inset}"
                    fill="none" stroke="${BRAND}" stroke-opacity="0.16" stroke-width="${stroke}"/>`
       }
     </svg>`
  );

  // Clip everything to the rounded square so corners stay transparent.
  const clip = Buffer.from(
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
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite([
      { input: plate },
      { input: mark, gravity: "center" },
      { input: clip, blend: "dest-in" },
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

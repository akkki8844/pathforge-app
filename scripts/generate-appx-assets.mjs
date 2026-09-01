/**
 * Generates the MSIX/AppX visual assets Windows and the Microsoft Store expect,
 * from the single source mark in build/icon.png.
 *
 * electron-builder copies every file in `build/appx` into `assets\` inside the
 * package and runs makepri over it. makepri's indexer is configured with
 * `filenameAsQualifier` and `.` as the delimiter (see app-builder-lib's
 * templates/appx/priconfig.xml), so `Square150x150Logo.scale-200.png` is
 * indexed as the 200% variant of `Square150x150Logo.png` automatically — the
 * manifest only ever references the unqualified name.
 *
 * The source mark is transparent, including the negative space inside the
 * glyph, so tiles are composited onto a light plate. Only the `_altform-
 * unplated` icons stay transparent, because Windows draws those directly on
 * the taskbar and the Start list where it supplies its own background.
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(root, "build", "icon.png");
const OUT = path.join(root, "build", "appx");
const LISTING = path.join(root, "store", "listing");

/** Tile plate. Must match `build.appx.backgroundColor` in package.json. */
const PLATE = { r: 255, g: 255, b: 255, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/** The scale factors Windows asks for. 100% is the unqualified filename. */
const SCALES = [100, 125, 150, 200, 400];

/**
 * width/height at 100%, and how much of the shorter side the mark should
 * occupy. Square tiles keep a wide margin (Windows crops and animates them);
 * the 44px app icon and the store logo are small enough that padding just
 * makes them illegible.
 */
const TILES = [
  { name: "Square44x44Logo", w: 44, h: 44, fill: 0.9 },
  { name: "Square71x71Logo", w: 71, h: 71, fill: 0.66, alias: "SmallTile" },
  { name: "Square150x150Logo", w: 150, h: 150, fill: 0.66 },
  { name: "Square310x310Logo", w: 310, h: 310, fill: 0.62, alias: "LargeTile" },
  { name: "Wide310x150Logo", w: 310, h: 150, fill: 0.62 },
  { name: "StoreLogo", w: 50, h: 50, fill: 0.9 },
  { name: "SplashScreen", w: 620, h: 300, fill: 0.6 },
];

/**
 * Windows picks these by physical pixel size rather than by scale factor —
 * they are what the taskbar, the Start list, Alt+Tab and the jump list use.
 * Each one is generated twice: plated (on the tile plate) and unplated
 * (transparent), because Windows chooses between them by context.
 */
const TARGET_SIZES = [16, 24, 32, 48, 256];

/** electron-builder keys the asset off the filename prefix, not the manifest. */
function fileName(tile, suffix) {
  const base = tile.alias ?? tile.name;
  return `${base}${suffix}.png`;
}

async function render({ width, height, fill, background }) {
  const box = Math.round(Math.min(width, height) * fill);
  const mark = await sharp(SOURCE)
    .resize(box, box, { fit: "contain", background: TRANSPARENT, kernel: "lanczos3" })
    .toBuffer();

  return sharp({
    create: { width, height, channels: 4, background },
  })
    .composite([{ input: mark, gravity: "centre" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  // Regenerate from scratch: a stale asset left behind from an earlier run
  // still gets indexed into the package and can silently win over the new one.
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  await mkdir(LISTING, { recursive: true });

  const written = [];

  for (const tile of TILES) {
    for (const scale of SCALES) {
      const width = Math.round((tile.w * scale) / 100);
      const height = Math.round((tile.h * scale) / 100);
      const buffer = await render({ width, height, fill: tile.fill, background: PLATE });
      // 100% is written unqualified as well, because that is the name the
      // manifest references and the name electron-builder looks for when it
      // decides whether to fall back to its own sample assets.
      const names = scale === 100 ? ["", ".scale-100"] : [`.scale-${scale}`];
      for (const suffix of names) {
        const file = path.join(OUT, fileName(tile, suffix));
        await writeFile(file, buffer);
        written.push(path.basename(file));
      }
    }
  }

  for (const size of TARGET_SIZES) {
    const plated = await render({ width: size, height: size, fill: 0.9, background: PLATE });
    const unplated = await render({ width: size, height: size, fill: 1, background: TRANSPARENT });
    await writeFile(path.join(OUT, `Square44x44Logo.targetsize-${size}.png`), plated);
    await writeFile(
      path.join(OUT, `Square44x44Logo.targetsize-${size}_altform-unplated.png`),
      unplated,
    );
    written.push(`Square44x44Logo.targetsize-${size}.png`, `…_altform-unplated.png`);
  }

  // Not part of the package: the 1:1 app tile icon uploaded on the Store
  // listing page. Partner Center prefers it over the one in the package, and
  // it is a straight derivative of the same mark, so it is generated here
  // rather than hand-exported. Screenshots and hero art are not — those have
  // to be real pictures of the running app.
  await writeFile(
    path.join(LISTING, "store-app-tile-300x300.png"),
    await render({ width: 300, height: 300, fill: 0.7, background: PLATE }),
  );

  const meta = await sharp(SOURCE).metadata();
  console.log(`Wrote ${written.length} package assets to build/appx`);
  console.log("Wrote store/listing/store-app-tile-300x300.png");
  if (meta.width < 1240) {
    console.warn(
      `Note: build/icon.png is ${meta.width}px. The 400% large tile is 1240px, so ` +
        `that one scale is upscaled. Replace build/icon.png with a 1240px (or larger) ` +
        `master to remove the softness.`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

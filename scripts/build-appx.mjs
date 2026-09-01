/**
 * Builds the Microsoft Store packages (.appx, x64 + arm64).
 *
 * Three values in the package manifest have to match the reserved product in
 * Partner Center exactly — character for character, case included — or the
 * upload is rejected with a generic identity error. They are account-specific,
 * so they are not committed: they come from the environment, and this script
 * refuses to build without them rather than let electron-builder fall back to
 * its defaults (`CN=ms` and the npm package name), which produce a package
 * that looks fine locally and can never be ingested.
 *
 * Find them in Partner Center → your app → Product management → Product
 * identity.
 *
 * The Store re-signs MSIX/AppX packages with a Microsoft certificate during
 * certification, so no code-signing certificate is involved here. That is also
 * why these packages cannot be installed locally as-is — see STORE.md for how
 * to test one.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const REQUIRED = [
  {
    env: "APPX_IDENTITY_NAME",
    option: "identityName",
    label: "Package/Identity/Name",
    example: "12345Pathforge.Pathforge",
  },
  {
    env: "APPX_PUBLISHER",
    option: "publisher",
    label: "Package/Identity/Publisher",
    example: "CN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
  },
  {
    env: "APPX_PUBLISHER_DISPLAY_NAME",
    option: "publisherDisplayName",
    label: "Package/Properties/PublisherDisplayName",
    example: "Pathforge",
  },
];

const missing = REQUIRED.filter((it) => !process.env[it.env]);
if (missing.length > 0) {
  console.error(
    "Cannot build Store packages: the Partner Center identity is not set.\n\n" +
      "Open Partner Center → Pathforge → Product management → Product identity\n" +
      "and copy these values into the environment:\n\n" +
      REQUIRED.map(
        (it) =>
          `  ${it.env.padEnd(28)} ${it.label}\n  ${"".padEnd(28)} e.g. ${it.example}` +
          (process.env[it.env] ? "  [set]" : "  [MISSING]"),
      ).join("\n\n") +
      "\n\nThey must match Partner Center exactly, including case.\n",
  );
  process.exit(1);
}

if (!existsSync(path.join(root, "build", "appx", "Square150x150Logo.png"))) {
  console.error("build/appx is missing. Run `npm run appx:assets` first.");
  process.exit(1);
}

const args = [
  "electron-builder",
  "--win",
  "appx",
  "--x64",
  "--arm64",
  // The Store distributes these; publishing them to GitHub Releases alongside
  // the NSIS installer would put a package nobody can install on the download
  // page. electron-builder publishes on every build unless told not to.
  "--publish",
  "never",
  ...REQUIRED.map((it) => `-c.appx.${it.option}=${process.env[it.env]}`),
];

console.log(`electron-builder --win appx --x64 --arm64 (identity: ${process.env.APPX_IDENTITY_NAME})`);

const child = spawn("npx", args, {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});
child.on("exit", (code) => process.exit(code ?? 1));

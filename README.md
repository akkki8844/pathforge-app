# PathForge — Desktop App

Native Windows build of PathForge. The renderer is the same React/Vite app as
the website (`pathforge-tech`), wrapped in an Electron shell and pointed at the
same Supabase project, edge functions, Paddle account, and ElevenLabs voice
setup.

- **Just want to run it?** → [Installing PathForge](#installing-pathforge)
- **Need to produce the installer?** → [Building the installer](#building-the-installer)

---

## Installing PathForge

PathForge ships as a normal Windows setup program. Running it installs the app
and puts PathForge in your Start menu and on your desktop.

### 1. Get the installer

You need this file:

```
PathForge-Setup-1.0.0.exe
```

It is roughly 140 MB — Electron bundles its own browser runtime, so the size is
expected. If you built it yourself it is in the `release/` folder of this repo.

### 2. Run it

Double-click `PathForge-Setup-1.0.0.exe`.

**Windows will show a blue "Windows protected your PC" screen.** This is
expected: the installer is not code-signed, and SmartScreen warns about every
unsigned program regardless of what it does. To continue:

1. Click **More info**
2. Click **Run anyway**

Signing this away permanently requires buying an EV code-signing certificate;
until then the warning appears on every fresh download.

### 3. Work through the setup

The installer asks two things and then does the rest:

| Step | What happens |
| --- | --- |
| Install for | Only you, or anyone using this PC |
| Install location | Defaults to `%LOCALAPPDATA%\Programs\PathForge`; change it if you want |
| Installing | Files are extracted, shortcuts created |
| Finish | Optionally launch PathForge immediately |

**No administrator rights are needed.** The build is configured per-user
(`perMachine: false`), so there is no UAC prompt and nothing is written outside
your own profile.

When it finishes you will have:

- A **PathForge** shortcut on your desktop
- A **PathForge** entry in the Start menu
- An entry under **Settings → Apps → Installed apps**

### 4. First launch

Open PathForge from the desktop or Start menu. The window opens on the sign-in
screen.

Sign in with **email and password**. Google sign-in may be refused on desktop —
see [Sign-in and redirect URLs](#sign-in-and-redirect-urls) for why.

The app needs an internet connection. All data lives in the same Supabase
project as the website, so your account, journey, and essays are identical in
both places.

### Updating

There is no auto-updater. To move to a newer version, run the new
`PathForge-Setup-<version>.exe`. It installs over the existing copy and keeps
your local settings. You do not need to uninstall first.

### Uninstalling

Either:

- **Settings → Apps → Installed apps → PathForge → Uninstall**, or
- run `Uninstall PathForge.exe` from the install folder

Your account and all your work live in Supabase, not on the PC, so uninstalling
removes the app only. Signing in again anywhere restores everything.

### Portable version (no installation)

If you would rather not install anything — a school PC, a USB stick, a locked-down
machine — use the portable build instead:

```
PathForge-1.0.0-portable.exe
```

Double-click it and the app runs. It creates no shortcuts, no Start-menu entry,
and no uninstaller. The same SmartScreen warning applies on first run.

Use the installer if you want PathForge to behave like a normal installed app;
use the portable exe if you want to leave no trace.

### If something goes wrong

**The window is blank, or sign-in bounces back to the login screen.**
PathForge serves itself on `http://127.0.0.1:43110` (see
[Why there is an HTTP server inside the app](#why-there-is-an-http-server-inside-the-app)).
If another program already holds port 43110, the app falls back to loading from
disk, and auth redirects break in exactly this way. Find the other program:

```powershell
Get-NetTCPConnection -LocalPort 43110 -State Listen |
  Select-Object OwningProcess |
  ForEach-Object { Get-Process -Id $_.OwningProcess }
```

Close it and restart PathForge. The port is not configurable — it is baked into
the redirect URLs registered with Supabase and Paddle.

**Nothing happens when I double-click.**
A copy may already be running: the app takes a single-instance lock and focuses
the existing window instead of opening a second one. Check the taskbar.

**Antivirus quarantined it.**
Unsigned installers are a common false positive. Restore the file and allow it,
or use the portable build.

---

## Building the installer

### Prerequisites

- **Node.js 20 or newer** (developed on 24.x) and npm 10+
- **Windows x64** — the build targets `win` / `x64` only
- About 2 GB free disk space for `node_modules`, `dist/`, and `release/`

### Steps

```sh
npm install       # .npmrc forces legacy-peer-deps — do not drop it, see below
npm run dist      # builds the web bundle, then packages both installers
```

`npm run dist` runs `vite build` into `dist/`, then hands that to
electron-builder, which produces:

| File | What it is |
| --- | --- |
| `release/PathForge-Setup-1.0.0.exe` | NSIS installer — the setup program described above |
| `release/PathForge-1.0.0-portable.exe` | Single self-extracting exe, no install needed |

`release/` is gitignored — the artifacts are ~140 MB each and are not committed.
Distribute them from a release page or file host, not from the repo.

Neither artifact is code-signed, so SmartScreen warns on first run. Signing
requires a real code-signing certificate configured in electron-builder.

### Other scripts

```sh
npm run build:web   # Vite bundle into dist/ only
npm run start       # build, then run the app exactly as packaged
npm run dist:dir    # unpacked app into release/win-unpacked, skips installers
                    # (fast — use this to test a packaging change)
npm run typecheck   # tsc -p tsconfig.app.json --noEmit
npm run lint
```

> **`npm run typecheck` must pass `-p tsconfig.app.json`.** The root
> `tsconfig.json` has `"files": []` with project references, so a bare
> `tsc --noEmit` type-checks *nothing* and exits 0 no matter how broken the
> code is. `vite build` will not catch it either — esbuild strips types without
> checking them. The script is already wired correctly; don't "simplify" it.

### Why `.npmrc` is required

`react-day-picker@8` peer-depends on `date-fns ^2||^3` while this app pins
`date-fns 4`. Without `legacy-peer-deps=true` a clean `npm install` fails
outright with ERESOLVE.

The flag has a sharp edge worth knowing: **it also skips peer auto-install.**
A package whose peer dependency is not separately listed in `package.json` will
silently go missing and break the Rollup build with an unresolved import. If
that happens, add the missing peer to `dependencies` explicitly rather than
removing the flag.

---

## Development

```sh
npm install
npm run dev          # browser only, Vite on :8080
npm run dev:desktop  # Vite + Electron pointed at it, with HMR
```

`dev:desktop` sets `PATHFORGE_DEV_URL`, which makes `electron/main.cjs` load the
Vite dev server instead of starting its own static server.

---

## Why there is an HTTP server inside the app

The web app uses `BrowserRouter`, and both Supabase auth and Paddle checkout
build their callback URLs from `window.location.origin`. Under `file://` that
origin is `null`, which breaks routing and every redirect.

So `electron/main.cjs` serves `dist/` over loopback HTTP on a **fixed** port:

```
http://127.0.0.1:43110
```

The port is fixed on purpose — it is part of the origin, so it is also part of
the redirect URL registered with the providers. Changing it means re-registering
everywhere.

The server binds `127.0.0.1`, so it is reachable only from this machine, and it
resolves every request inside `dist/` and rejects anything that escapes, so a
crafted `..` path cannot read the rest of the disk.

### Sign-in and redirect URLs

**This origin must be allow-listed for auth redirects to work:**

- Supabase → Authentication → URL Configuration → Redirect URLs → add
  `http://127.0.0.1:43110/**`
- Paddle → Checkout settings → approved domains → add `127.0.0.1:43110`

Email/password sign-in works without this. Google OAuth additionally depends on
Google's policy for non-standard browsers; if it is refused, email/password is
the supported desktop path.

---

## Relationship to `pathforge-tech`

`src/`, `public/`, and `supabase/` are vendored from the website repo. Two
deliberate differences:

- **No Lovable MCP Vite plugin.** In the website repo it regenerates
  `supabase/functions/mcp/index.ts` on every build, and on Windows it emits an
  unresolvable `npm:C:\...` specifier that corrupts the bundle. The desktop app
  only *calls* the deployed edge functions, so it has no business rewriting
  them. `supabase/` is here for reference only — deploy from `pathforge-tech`.
- **`.npmrc` with `legacy-peer-deps`.** See
  [Why `.npmrc` is required](#why-npmrc-is-required).

Backend changes still belong in `pathforge-tech`. Pull `src/` forward from there
when the web app changes.

### Keep the chunking rules in sync

`vite.config.ts` splits vendor code by hand, and the rules are load-bearing
rather than cosmetic. Radix is grouped with its own runtime dependencies
(`@floating-ui`, `aria-hidden`, `react-remove-scroll`, …) because `cmdk` and
`vaul` pull Radix packages out of `vendor` while Radix pulls those helpers back
in — a mutual import that Rollup reports as
`Circular chunk: radix -> vendor -> radix`. When that cycle exists the browser
can evaluate Radix before React has initialised, Radix calls `React.forwardRef`
at module scope against an undefined `React`, and the app renders a blank page.

It is worse here than on the web: this ships inside an installed executable, so
a blank first paint cannot be fixed by redeploying — it needs a new installer
pushed to every user.

**Treat any circular-chunk warning from `npm run build:web` as a release
blocker**, and do not ship an installer built from a warning-emitting build.

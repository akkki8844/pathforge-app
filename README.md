# PathForge — Desktop App

Native Windows build of PathForge. The renderer is the same React/Vite app as
the website (`pathforge-tech`), wrapped in an Electron shell and pointed at the
same Supabase project, edge functions, Paddle account, and ElevenLabs voice
setup.

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

**This origin must be allow-listed for auth redirects to work:**

- Supabase → Authentication → URL Configuration → Redirect URLs → add
  `http://127.0.0.1:43110/**`
- Paddle → Checkout settings → approved domains → add `127.0.0.1:43110`

Email/password sign-in works without this. Google OAuth additionally depends on
Google's policy for non-standard browsers; if it is refused, email/password is
the supported desktop path.

## Development

```sh
npm install          # .npmrc forces legacy-peer-deps; see the note in it
npm run dev          # browser only, Vite on :8080
npm run dev:desktop  # Vite + Electron pointed at it, with HMR
```

## Building

```sh
npm run build:web    # Vite bundle into dist/
npm run start        # build, then run the packaged-style Electron app
npm run dist         # build + produce installers into release/
```

`npm run dist` produces both:

| File                                | What it is                                        |
| ----------------------------------- | ------------------------------------------------- |
| `release/PathForge-Setup-1.0.0.exe` | NSIS installer — choose install dir, shortcuts     |
| `release/PathForge-1.0.0-portable.exe` | Single self-extracting exe, no install needed   |

Neither is code-signed, so Windows SmartScreen will warn on first run
("More info" → "Run anyway"). Signing needs a real code-signing certificate.

## Relationship to `pathforge-tech`

`src/`, `public/`, and `supabase/` are vendored from the website repo. Two
deliberate differences:

- **No Lovable MCP Vite plugin.** In the website repo it regenerates
  `supabase/functions/mcp/index.ts` on every build, and on Windows it emits an
  unresolvable `npm:C:\...` specifier that corrupts the bundle. The desktop app
  only *calls* the deployed edge functions, so it has no business rewriting
  them. `supabase/` is here for reference only — deploy from `pathforge-tech`.
- **`.npmrc` with `legacy-peer-deps`.** `react-day-picker@8` peer-depends on
  `date-fns ^2||^3` while the app pins `date-fns 4`. Without this a clean
  `npm install` fails with ERESOLVE.

Backend changes still belong in `pathforge-tech`. Pull `src/` forward from there
when the web app changes.

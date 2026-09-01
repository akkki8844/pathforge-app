# Publishing Pathforge to the Microsoft Store

Everything in this repo that the Store submission needs is already wired up.
What is left is the account work, the identity values only Partner Center can
give you, and the listing assets that have to be pictures of the real app.

---

## Why MSIX and not the EXE

The Store accepts two kinds of desktop submission, and the choice is not
reversible later — Microsoft has no supported path to convert an EXE/MSI
listing into an MSIX one, so it is worth being deliberate now.

| | **MSIX / AppX** (what this repo builds) | **EXE / MSI** |
|---|---|---|
| Code signing | Microsoft re-signs the package during certification. No certificate to buy. | You must Authenticode-sign the installer yourself, with a certificate chaining to the Microsoft Trusted Root Program. Self-signed is rejected. |
| Hosting | Microsoft's CDN | Your own infrastructure — you supply a package URL |
| Updates | The Store updates it | Your own updater |
| Install | Containerized, clean uninstall | Whatever your installer does |

Pathforge's Windows installer is currently **unsigned** (`build.win` has no
`certificateFile`, and CI explicitly takes the unsigned path). An EXE
submission would therefore mean buying an OV or EV code-signing certificate
first. MSIX costs nothing extra and Microsoft does the signing, so that is the
route configured here.

The NSIS installer and the portable build are unaffected — they still go to
GitHub Releases exactly as before, and `pathforge.tech` still links to them.
The Store package is a third, separate artifact.

---

## One-time account setup

1. Register a **Microsoft Partner Center developer account** at
   <https://developer.microsoft.com/store/register>. One-time fee; individual
   accounts are cheaper than company accounts, but a company account is
   required if you want the "Contact details" field and some enterprise
   features. Note that a company account needs verifiable business identity and
   takes days to clear.
2. **Reserve the name** "Pathforge" in Partner Center. The name must be free
   and it is held for you once reserved. Do this before anything else — the
   package identity depends on it.
3. Open **Product management → Product identity** and copy the three values
   below. They are the only account-specific inputs the build needs.

---

## Building the packages

```powershell
$env:APPX_IDENTITY_NAME         = "12345Pathforge.Pathforge"   # Package/Identity/Name
$env:APPX_PUBLISHER             = "CN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"  # Package/Identity/Publisher
$env:APPX_PUBLISHER_DISPLAY_NAME = "Pathforge"                 # Package/Properties/PublisherDisplayName

npm run appx:assets   # regenerate build/appx from build/icon.png (already committed)
npm run dist:store    # builds release/Pathforge-<version>-x64.appx and -arm64.appx
```

These three values are **not committed** — they are account identifiers, and a
wrong one produces a package that builds cleanly and is then rejected at upload
with a generic identity error. `scripts/build-appx.mjs` refuses to run without
them rather than letting electron-builder fall back to its defaults (`CN=ms`
and the npm package name), which fail the same way but silently.

Values in the manifest are **case-sensitive**, and spaces and punctuation must
match Partner Center exactly.

`--publish never` is passed deliberately: without it electron-builder would
upload the `.appx` to the GitHub Release next to the NSIS installer, where it
is useless — an unsigned MSIX cannot be installed by a normal user.

### Testing a package locally

An unsigned `.appx` will not install by double-clicking. To try one:

1. Enable **Developer Mode** in Windows Settings → System → For developers.
2. `Add-AppxPackage -Path .\release\Pathforge-1.0.5-x64.appx -AllowUnsigned`

Then run the **Windows App Certification Kit** against the installed app
(`Get-AppxPackage`, or launch WACK from the Windows SDK). It catches most
manifest and asset problems before certification does.

---

## What the build already produces

Configured in `package.json` under `build.appx`:

| Setting | Value | Why |
|---|---|---|
| `applicationId` | `Pathforge` | Manifest `Application/@Id`. Alphanumeric + periods only, each field starting with a letter. |
| `displayName` | `Pathforge` | Shown on the tile and in the Store |
| `backgroundColor` | `#ffffff` | The mark is a transparent gradient glyph, so tiles need a light plate for it to read |
| `languages` | `["en-US"]` | The Store requires at least one supported language |
| `minVersion` | `10.0.17763.0` | Windows 10 1809 — the oldest build Electron 33 supports. electron-builder's default (`10.0.14316.0`) would claim support for builds the app cannot run on |
| `maxVersionTested` | `10.0.26100.0` | Windows 11 24H2 |
| `electronUpdaterAware` | `false` | Store packages do not self-update; see below |

Architectures: **x64 and arm64**, built as two separate `.appx` files. Partner
Center accepts multiple packages in one submission and serves each device the
right one. (electron-builder cannot emit an `.msixbundle`; uploading the two
packages separately is equivalent for distribution.)

`runFullTrust` is declared automatically — it is what makes a packaged Win32
app possible, and it is a **restricted capability**, so the submission's
*Submission options* page will ask you to justify it. The answer is that
Pathforge is a full-trust desktop application packaged for the Store, not a
UWP app.

The `pathforge://` deep link used for auth callbacks is carried into the
manifest as a `windows.protocol` extension automatically, from
`build.protocols`. It keeps working inside the package.

### Auto-update is off inside the Store package

`electron/main.cjs` checks `process.windowsStore`, which Electron sets when it
is running from an MSIX package. In that case `setupAutoUpdater()` never runs
and `pathforge:install-update` is a no-op. A Store package is immutable and
signed by Microsoft — electron-updater would download an NSIS installer the
container cannot apply and then surface an error the user can do nothing
about. The Store does the updating instead: ship a new version by submitting a
package with a higher version number.

### Version numbers

`package.json` `version` (currently `1.0.5`) becomes `1.0.5.0` in the manifest.
**The fourth part must stay 0** — it is reserved for Store use. The first part
cannot be 0; every part must be 0–65535. The Store always serves the
highest-versioned package applicable to a device, so a submission with a lower
version than one already published will not reach existing installs.

### Package assets

`build/appx` holds 52 generated files: `Square44x44Logo`, `Square150x150Logo`,
`Wide310x150Logo`, `SmallTile` (71×71), `LargeTile` (310×310), `StoreLogo`
(50×50) and `SplashScreen` (620×300), each at 100/125/150/200/400% scale, plus
`Square44x44Logo.targetsize-{16,24,32,48,256}` in plated and
`_altform-unplated` variants for the taskbar and Start list.

They are regenerated from `build/icon.png` by `npm run appx:assets`. That
source is **512px**, so the 400% large tile (1240px) is upscaled. Dropping a
1240px-or-larger master in as `build/icon.png` and re-running the script is the
only thing needed to fix that.

### Package size

The x64 package is ~130 MB and the arm64 one ~135 MB, nearly all of it the
Electron runtime.

Getting there needed a fix that also shrinks the NSIS installer: `build.files`
now excludes `node_modules` and re-includes only electron-updater's runtime
tree (16 packages, resolved from its own `dependencies`). Everything else in
`dependencies` is renderer code that Vite has already bundled into `dist/`, so
shipping the raw tree as well was pure duplication — 453 packages and 361 MB
of `app.asar`, down to 18 MB. `electron/main.cjs` requires only `electron`,
`electron-updater` and Node builtins, so nothing else was ever loaded at
runtime.

If you ever add a `require()` to the main process for a package outside that
list, add it to the whitelist in `build.files` too — the app will package
cleanly and then fail to start.

---

## Continuous integration

`.github/workflows/store.yml` builds both packages on a Windows runner and
uploads them as a workflow artifact. It is `workflow_dispatch` only, and reads
the same three identity values from repository secrets
(`APPX_IDENTITY_NAME`, `APPX_PUBLISHER`, `APPX_PUBLISHER_DISPLAY_NAME`). The
tagged release workflow is untouched — it still builds and publishes only the
NSIS installer, the portable exe and the macOS builds.

---

## The Partner Center submission

Required unless noted. Source: Microsoft's MSIX submission checklist.

**Pricing and availability** — markets (default: all), audience (public),
discoverability, schedule, base price. Pathforge is free to download; the
subscription is billed in-app through Paddle, outside the Store.

> Worth checking before you submit: the Store's policy on selling digital
> goods. Microsoft requires its own commerce for in-app purchases of digital
> content in some categories and exempts others. This is the single most
> likely reason a Pathforge submission gets rejected, and it is a policy
> question, not a packaging one — read [Microsoft Store
> Policies](https://learn.microsoft.com/en-us/windows/apps/publish/store-policies)
> §10.8 before submitting, or ask certification in the notes.

**Properties** — category (Education is the natural fit — the mac build already
declares `public.app-category.education`), **privacy policy URL** (required,
because the app collects personal information: <https://pathforge.tech/privacy>),
website, support contact info.

**Age ratings** — an IARC questionnaire. Required, and you cannot submit
without completing it.

**Packages** — upload both `.appx` files.

**Store listing** — description, at least one screenshot, a Store logo.

**Submission options** — the restricted-capability justification for
`runFullTrust`, and **notes for certification**. Pathforge is behind a login,
so certification *will* fail unless you give the testers working credentials
here. Create a throwaway account with realistic data and put the email and
password in the notes.

### Listing images

| Asset | Size | Required | Notes |
|---|---|---|---|
| Screenshot | ≥1366×768 (4K supported), `.png`, ≤50 MB | **Yes**, at least 1 | Up to 10. Four or more recommended. Keep key content in the top two-thirds — the Store overlays text on the bottom third. No added logos or marketing copy. |
| 1:1 app tile icon | 300×300 | Strongly recommended | Generated for you at `store/listing/store-app-tile-300x300.png`. Partner Center prefers it over the package icon. |
| 16:9 super hero art | 1920×1080 or 3840×2160 | Optional | Needed if you ever add a trailer. No text allowed on it. |
| 2:3 poster art / 1:1 box art | 720×1080 / 1080×1080 | Games only | Not applicable |
| Trailer | MP4 or MOV, 1920×1080, ≤2 GB | Optional | Needs a 1920×1080 PNG thumbnail |

The screenshots have to be real captures of Pathforge running — they are the
one asset that cannot be generated from the logo, and fabricated ones would
misrepresent the product. Four good candidates: the dashboard, the Routine
calendar, the essay workspace, and the college list.

Certification typically takes a few days.

---

## Sources

- [App package requirements for MSIX apps](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-package-requirements)
- [Create an app submission for your MSIX app](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/create-app-submission)
- [App screenshots, images, and trailers for MSIX apps](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/screenshots-and-images)
- [electron-builder AppX options](https://www.electron.build/appx)

const { app, BrowserWindow, shell, Menu, ipcMain } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

// The renderer is the unmodified PathForge web app, so it still assumes a real
// http origin: react-router uses BrowserRouter, and Supabase auth / Paddle
// checkout both build callback URLs from `window.location.origin`. Loading the
// bundle over file:// would make that origin "null" and break all three.
//
// So we serve dist/ from a loopback http server on a FIXED port instead. The
// port is part of the origin, which means it is also part of the redirect URL
// registered with Supabase and Paddle — it must not drift between launches.
const PORT = 43110;
const HOST = "127.0.0.1";
const DIST = path.join(__dirname, "..", "dist");

// Sign-in happens in the user's real browser, not in this window.
//
// Doing OAuth inside an Electron BrowserWindow is the thing Google explicitly
// disallows (an embedded webview can read what the user types into the
// provider's own form, so providers block it), and it also means the user
// cannot reuse the Google session they are already signed into. So Continue
// launches the default browser, the web app authenticates there, and the
// result comes back to this process over the pathforge:// protocol.
const WEB_ORIGIN = "https://pathforge.co.in";
const SIGN_IN_URL = `${WEB_ORIGIN}/app-login`;
const DOWNLOADS_URL = `${WEB_ORIGIN}/#download`;
const PROTOCOL = "pathforge";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
};

function send(res, status, body, type) {
  res.writeHead(status, {
    "Content-Type": type || "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let pathname;
      try {
        pathname = decodeURIComponent(new URL(req.url, `http://${HOST}`).pathname);
      } catch {
        return send(res, 400, "Bad request");
      }

      // Resolve inside DIST and verify it stayed there, so a crafted
      // "/../../.." can never read outside the bundle.
      const target = path.resolve(DIST, "." + pathname);
      const inside = target === DIST || target.startsWith(DIST + path.sep);

      if (inside && fs.existsSync(target) && fs.statSync(target).isFile()) {
        const ext = path.extname(target).toLowerCase();
        const stream = fs.createReadStream(target);
        res.writeHead(200, {
          "Content-Type": MIME[ext] || "application/octet-stream",
          // Hashed asset filenames are immutable; index.html must not be cached
          // or an upgraded install would keep booting the old bundle.
          "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=31536000, immutable",
        });
        return stream.pipe(res);
      }

      // SPA fallback: every non-file path is a client-side route.
      const index = path.join(DIST, "index.html");
      if (!fs.existsSync(index)) {
        return send(res, 500, "dist/index.html is missing — run `npm run build:web` first.");
      }
      const html = fs.readFileSync(index);
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Length": html.length,
        "Cache-Control": "no-store",
      });
      res.end(html);
    });

    server.on("error", reject);
    server.listen(PORT, HOST, () => resolve(server));
  });
}

function createWindow(startUrl) {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#ffffff",
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "..", "build", "icon.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  win.once("ready-to-show", () => win.show());

  // target="_blank" and window.open() go to the real browser. In-window
  // navigation is deliberately NOT intercepted: OAuth needs to walk out to the
  // provider and back to our loopback origin inside this same window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  win.loadURL(startUrl);
  return win;
}

/**
 * Pulls the session out of a `pathforge://auth?...` URL.
 *
 * Returns null for anything that isn't that — a malformed link, a different
 * host, or a link missing either token. The renderer only ever sees a payload
 * that already has both halves of a session in it.
 */
function parseAuthDeepLink(url) {
  if (typeof url !== "string" || !url.startsWith(`${PROTOCOL}://`)) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  // Windows hands back `pathforge://auth?...`, where "auth" parses as the host.
  if (parsed.hostname !== "auth") return null;

  const accessToken = parsed.searchParams.get("access_token");
  const refreshToken = parsed.searchParams.get("refresh_token");
  if (!accessToken || !refreshToken) return null;

  return { accessToken, refreshToken, state: parsed.searchParams.get("state") };
}

/** The last deep link that arrived, held until a renderer asks for it. */
let pendingAuth = null;

function deliverAuth(payload, win) {
  if (!payload) return;
  // A protocol launch can beat the window into existence, and even with a
  // window the renderer may not have mounted its listener yet. Holding the
  // payload and letting the renderer drain it on subscribe covers both.
  pendingAuth = payload;
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore();
    win.focus();
    win.webContents.send("pathforge:auth-callback", payload);
  }
}

/** Finds a pathforge:// URL in a process argv — how Windows delivers deep links. */
function authFromArgv(argv) {
  const link = (argv || []).find((arg) => typeof arg === "string" && arg.startsWith(`${PROTOCOL}://`));
  return link ? parseAuthDeepLink(link) : null;
}

const menu = Menu.buildFromTemplate([
  {
    label: "File",
    submenu: [{ role: "quit" }],
  },
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "selectAll" },
    ],
  },
  {
    label: "View",
    submenu: [
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" },
    ],
  },
]);

// A second launch focuses the running window instead of racing it for the port.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let mainWindow = null;

  // Claim pathforge:// so the browser can hand a session back to this process.
  // In dev the running binary is electron.exe, so the registration has to name
  // electron.exe plus this project path or Windows would launch a bare Electron.
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }

  // Windows: a deep link while the app is already running arrives as a second
  // launch, and the URL is in that launch's argv rather than in an event.
  app.on("second-instance", (_event, argv) => {
    const payload = authFromArgv(argv);
    if (payload) {
      deliverAuth(payload, mainWindow);
      return;
    }
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // macOS delivers deep links through this event instead. Harmless on Windows.
  app.on("open-url", (event, url) => {
    event.preventDefault();
    deliverAuth(parseAuthDeepLink(url), mainWindow);
  });

  // Main owns the destination, so the renderer cannot turn this into a
  // launcher for arbitrary URLs. `state` is echoed back by the web page and
  // checked in the renderer, which is what makes a deep link from some other
  // process on the machine fail rather than sign someone in.
  ipcMain.handle("pathforge:open-sign-in", (_event, state) => {
    const url = new URL(SIGN_IN_URL);
    if (typeof state === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(state)) {
      url.searchParams.set("state", state);
    }
    return shell.openExternal(url.toString());
  });

  ipcMain.handle("pathforge:open-downloads", () => shell.openExternal(DOWNLOADS_URL));

  ipcMain.handle("pathforge:drain-auth-callback", (event) => {
    if (!pendingAuth) return null;
    const payload = pendingAuth;
    pendingAuth = null;
    event.sender.send("pathforge:auth-callback", payload);
    return null;
  });

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(menu);

    // A cold start *caused by* the deep link: the URL is in our own argv.
    pendingAuth = authFromArgv(process.argv) || pendingAuth;

    // PATHFORGE_DEV_URL points at the Vite dev server for `npm run dev`.
    const devUrl = process.env.PATHFORGE_DEV_URL;
    let startUrl = devUrl;

    if (!devUrl) {
      try {
        await startServer();
        startUrl = `http://${HOST}:${PORT}/`;
      } catch (err) {
        // Port taken by something else: fall back to file:// so the user sees
        // the app rather than a blank window, and tell them why auth may fail.
        console.error(`Could not bind ${HOST}:${PORT} — ${err.message}`);
        startUrl = pathToFileURL(path.join(DIST, "index.html")).toString();
      }
    }

    mainWindow = createWindow(startUrl);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow(startUrl);
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

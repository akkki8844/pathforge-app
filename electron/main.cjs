const { app, BrowserWindow, shell, Menu } = require("electron");
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

  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(menu);

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

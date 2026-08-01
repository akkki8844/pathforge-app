const { contextBridge } = require("electron");

// The renderer is the plain web app and needs no privileged APIs. This only
// exposes a marker so app code can branch on "am I in the desktop shell?"
// without reaching for node — contextIsolation stays on and nothing else leaks.
contextBridge.exposeInMainWorld("pathforgeDesktop", {
  isDesktop: true,
  platform: process.platform,
  version: process.versions.electron,
});

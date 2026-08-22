const { contextBridge, ipcRenderer } = require("electron");

// The renderer is the plain web app and needs no privileged APIs. This exposes
// a marker so app code can branch on "am I in the desktop shell?" without
// reaching for node, plus the two calls the browser-based sign-in needs:
// push the user out to their real browser, and hear about it when the browser
// hands a session back through the pathforge:// deep link.
//
// contextIsolation stays on and nothing else leaks. `openSignIn` deliberately
// takes no URL from the renderer — main owns the destination, so a compromised
// renderer cannot use this to launch an arbitrary link.
contextBridge.exposeInMainWorld("pathforgeDesktop", {
  isDesktop: true,
  platform: process.platform,
  version: process.versions.electron,

  /** Opens the sign-in page in the user's default browser. */
  openSignIn: (state) => ipcRenderer.invoke("pathforge:open-sign-in", state),

  /** Opens the public download page in the user's default browser. */
  openDownloads: () => ipcRenderer.invoke("pathforge:open-downloads"),

  /**
   * Fires when the browser hands back a session over pathforge://auth.
   * Returns an unsubscribe function. Any deep link that arrived before the
   * renderer was listening is replayed on subscribe, so a cold start — where
   * the protocol launch *is* what opened the app — is not a lost callback.
   */
  onAuthCallback: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on("pathforge:auth-callback", listener);
    ipcRenderer.invoke("pathforge:drain-auth-callback");
    return () => ipcRenderer.removeListener("pathforge:auth-callback", listener);
  },

  /**
   * Fires as the silent background updater progresses: 'available',
   * 'not-available', 'downloading' (with `percent`), 'downloaded', or
   * 'error'. Returns an unsubscribe function.
   */
  onUpdateStatus: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on("pathforge:update-status", listener);
    return () => ipcRenderer.removeListener("pathforge:update-status", listener);
  },

  /** Quits and installs an already-downloaded update. */
  installUpdate: () => ipcRenderer.invoke("pathforge:install-update"),
});

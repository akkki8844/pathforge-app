/**
 * Which desktop build to offer the person looking at the page.
 *
 * There is one installer per platform and both are published to the same
 * GitHub Release under a fixed filename, so `releases/latest/download/<name>`
 * always resolves to the current version without the site knowing what that
 * version is.
 *
 * The macOS build is a universal binary. That is deliberate: Safari and Chrome
 * both report "Intel Mac OS X" in the user agent on Apple Silicon, so there is
 * no honest way to pick between an arm64 and an x64 download from the browser
 * — one link that works everywhere beats a guess that is wrong for some.
 */
const BASE = "https://github.com/akkki8844/pathforge-app/releases/latest/download";

export const WINDOWS_DOWNLOAD_URL = `${BASE}/Pathforge-Setup.exe`;
export const MAC_DOWNLOAD_URL = `${BASE}/Pathforge.dmg`;

export type DesktopPlatform = "mac" | "windows";

/** Best guess at the visitor's OS. Anything that is not clearly a Mac gets the
 *  Windows build, which is also the right default for SSR and for crawlers. */
export function detectDesktopPlatform(): DesktopPlatform {
  if (typeof navigator === "undefined") return "windows";
  const ua = navigator.userAgent;
  // iPadOS reports as a Mac; it cannot run either build, but it also cannot
  // install anything, so which link it gets does not matter. Exclude touch
  // Macs only to keep the label honest on iPad.
  const isMac = /Mac/i.test(ua) && !/iPhone|iPod/i.test(ua);
  return isMac ? "mac" : "windows";
}

export function desktopDownload(): { platform: DesktopPlatform; url: string; label: string } {
  const platform = detectDesktopPlatform();
  return platform === "mac"
    ? { platform, url: MAC_DOWNLOAD_URL, label: "Download on Mac" }
    : { platform, url: WINDOWS_DOWNLOAD_URL, label: "Download on Windows" };
}

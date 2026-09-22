/**
 * The signal that opens the counsellor command palette.
 *
 * The palette itself is mounted in `CounsellorShell` and the button that opens
 * it lives in `CounsellorNavbar`, which is a sibling, not a child. A context
 * provider for one boolean would be three files; a DOM event is one line at
 * each end and cannot leak state.
 *
 * It lives here rather than beside the component because a module that exports
 * both a component and a plain value breaks React Fast Refresh for that file.
 */
export const OPEN_COMMAND_PALETTE = "counsellor:open-command-palette";

/** Fire from anywhere in the counsellor workspace to open the palette. */
export function openCounsellorCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE));
}

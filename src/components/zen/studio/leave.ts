import { createContext } from "react";
import type { StationId } from "./stage";

/** Leaves Zen, optionally for a route. Provided by the studio, used by panel links. */
export const LeaveContext = createContext<(path?: string) => void>(() => undefined);

/** Flies the camera to a station. Provided by the studio, used by the directory. */
export const GoContext = createContext<(id: StationId) => void>(() => undefined);

/**
 * Set when the directory is opened from the keyboard (Ctrl + K or /), so its
 * search field takes the focus; opened by clicking the door, it does not.
 */
export const directoryIntent = { focus: false };

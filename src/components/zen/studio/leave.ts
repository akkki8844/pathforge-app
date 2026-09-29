import { createContext } from "react";

/** Leaves Zen, optionally for a route. Provided by the studio, used by panel links. */
export const LeaveContext = createContext<(path?: string) => void>(() => undefined);

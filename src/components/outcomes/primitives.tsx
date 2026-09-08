/**
 * These primitives now live in `src/components/cluely/primitives.tsx` so
 * Resume, Activities, and any future Cluely-scoped page can share them
 * instead of importing from Outcomes' own folder. Re-exported here so
 * existing `@/components/outcomes/primitives` imports keep working.
 */
export * from "@/components/cluely/primitives";

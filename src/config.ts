/**
 * Compile-time runtime mode configuration.
 *
 * - Default (production & formal development): `IS_DEMO_MODE === false`
 *   All pages strictly use live `noopy-core` APIs, never silently fall back
 *   to fake data, and Vite tree-shakes `src/data/demoOntology.ts` out of the bundle.
 * - Demo sandbox (`VITE_DEMO_MODE=true`, e.g. `npm run dev:demo` / `npm run build:demo`):
 *   Dynamically loads demo datasets for offline showcase / UI review.
 */
export const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

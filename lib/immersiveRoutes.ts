// Routes that render as a full-viewport, app-like shell (the live simulation experience, plus the
// dark "Command Console" catalog screen) rather than a normal scrolling content page - they hide
// the footer and skip main's padding/max-width so their own dark background can go edge-to-edge.
const IMMERSIVE_ROUTE_PREFIXES = ["/demo", "/simulations", "/catalog"];

export function isImmersiveRoute(pathname: string): boolean {
  return IMMERSIVE_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

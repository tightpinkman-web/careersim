// Routes that render as a full-viewport, app-like shell (the live simulation experience) rather
// than a normal scrolling content page - they hide the footer and skip main's padding/max-width.
const IMMERSIVE_ROUTE_PREFIXES = ["/demo", "/simulations"];

export function isImmersiveRoute(pathname: string): boolean {
  return IMMERSIVE_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

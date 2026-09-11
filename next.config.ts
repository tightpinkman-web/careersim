import type { NextConfig } from "next";

// Not using nonce-based CSP: this app has statically-prerendered routes (/, /simulations/preview),
// and per Next.js's own docs, nonces only work on dynamically-rendered pages - a nonce can't be
// injected into a page that was rendered once at build time. Forcing every route dynamic just to
// keep nonces wasn't worth the static-optimization/caching tradeoff, so this follows Next's
// documented "Without Nonces" CSP pattern instead: https://nextjs.org/docs/app/guides/content-security-policy
const isDev = process.env.NODE_ENV === "development";

const cspHeader = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' blob: data:`,
  `font-src 'self' data:`,
  `connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspHeader },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

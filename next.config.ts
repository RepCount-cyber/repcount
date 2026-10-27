import type { NextConfig } from "next";

// Applied to every response. Media comes from the Pexels, Unsplash and Mixkit CDNs listed below.
const securityHeaders = [
  {key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains"},
  {key: "X-Content-Type-Options", value: "nosniff"},
  {key: "X-Frame-Options", value: "DENY"},
  {key: "Referrer-Policy", value: "strict-origin-when-cross-origin"},
  {key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()"},
  {key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com; object-src 'none'"},
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{source: "/:path*", headers: securityHeaders}];
  },
  images: {
    // Stock photography is served through Next's image optimiser (resized, modern formats).
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "assets.mixkit.co" },
    ],
  },
};

export default nextConfig;

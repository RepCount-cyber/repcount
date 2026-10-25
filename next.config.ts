import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

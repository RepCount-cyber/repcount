import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: "RepCount — Stronger, in your own space.",
  description: "Personal home training, weekly trainer support and everyday progress with RepCount’s India pilot.",
  robots: { index: false, follow: false },
  applicationName: "RepCount",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/repcount-mark.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: { title: "RepCount" },
  openGraph: {
    title: "RepCount — Stronger, in your own space.",
    description: "Personal training. Thoughtful support. A plan for the life you actually live.",
    type: "website",
    images: [{ url: "/repcount-share.png", width: 1200, height: 630, alt: "RepCount. Stronger, in your own space." }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#faf7f1" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

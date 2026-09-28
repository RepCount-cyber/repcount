import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "RepCount — Stronger, in your own space.",
  description: "Personal home training, thoughtful wellbeing support and everyday progress. An interactive preview of RepCount’s proposed India pilot.",
  robots: { index: false, follow: false },
  applicationName: "RepCount",
  manifest: "./manifest.webmanifest",
  icons: {icon: "./repcount-mark.svg", apple: "./apple-touch-icon.png"},
  openGraph: {
    title: "RepCount — Stronger, in your own space.",
    description: "Personal training. Thoughtful support. Explore the interactive RepCount preview.",
    type: "website",
    url: "https://repcount-cyber.github.io/repcount/",
    images: [{url: "https://repcount-cyber.github.io/repcount/repcount-share.png", width: 1200, height: 630, alt: "RepCount. Stronger, in your own space."}],
  },
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}

import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "RepCount — Your space to move forward",
  description: "A private design preview for personal online coaching: movement, psychologist onboarding and weekly trainer support.",
  robots: { index: false, follow: false },
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}

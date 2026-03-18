// layout.tsx — Root layout, sets up fonts and global styles

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DiscoveryOS",
  description: "Post-discovery-call automation for agencies",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

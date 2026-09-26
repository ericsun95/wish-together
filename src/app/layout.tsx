import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./space.css";
import "./wish-details.css";
import "./theme.css";
import "./life.css";
import "./pet-play.css";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#c7505d" };
export const metadata: Metadata = {
  manifest: `${base}/manifest.webmanifest`,
  appleWebApp: { capable: true, title: "Wish Together", statusBarStyle: "default" },
  icons: { apple: `${base}/app-icon-192.png` },
  title: "Wish Together",
  description: "A shared wishlist for two people",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

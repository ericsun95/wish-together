import type { Metadata } from "next";
import "./globals.css";
import "./space.css";
import "./wish-details.css";
import "./theme.css";
import "./life.css";

export const metadata: Metadata = {
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

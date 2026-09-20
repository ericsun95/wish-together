import type { Metadata } from "next";
import "./globals.css";

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

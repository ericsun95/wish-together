import type { MetadataRoute } from "next";
export const dynamic = "force-static";
export default function manifest(): MetadataRoute.Manifest {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return { id: `${base}/`, name: "Wish Together · 两个人的心愿单", short_name: "Wish Together", description: "Our wishes, places and memories", start_url: `${base}/`, scope: `${base}/`, display: "standalone", background_color: "#fafbf9", theme_color: "#c7505d", icons: [{ src: `${base}/app-icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" }, { src: `${base}/app-icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" }] };
}

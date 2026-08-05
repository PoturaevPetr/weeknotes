import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Weeknotes",
    short_name: "Weeknotes",
    description: "Совместные идеи и планы: куда сходим, что посмотрим, что попробуем",
    start_url: "/",
    display: "standalone",
    background_color: "#faf5ef",
    theme_color: "#faf5ef",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

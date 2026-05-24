import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Life OS",
    short_name: "Life OS",
    description: "Your personal operating system for habits, finance, goals, projects, and daily notes.",
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "browser"],
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    orientation: "portrait-primary",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Dashboard",
        url: "/dashboard",
        icons: [{ src: "/icon-192", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Habits",
        short_name: "Habits",
        url: "/habits",
        icons: [{ src: "/icon-192", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Notes",
        short_name: "Notes",
        url: "/notes",
        icons: [{ src: "/icon-192", sizes: "192x192", type: "image/png" }],
      },
    ],
  }
}

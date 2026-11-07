import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/siteUrl";

// Only public, content-stable routes. Per-user pages stay out.
const PUBLIC_PATHS = ["/", "/technical", "/privacy", "/settings"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  return PUBLIC_PATHS.map((path) => ({ url: `${base}${path}` }));
}

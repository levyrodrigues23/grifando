import { describe, expect, it } from "vitest";

import { getSiteUrl } from "@/lib/siteUrl";

import sitemap from "./sitemap";

describe("sitemap", () => {
  it("lists the four public routes and nothing under /api", () => {
    const urls = sitemap().map((entry) => entry.url);
    const base = getSiteUrl();
    expect(urls).toEqual([`${base}/`, `${base}/technical`, `${base}/privacy`, `${base}/settings`]);
    expect(urls.some((url) => url.includes("/api"))).toBe(false);
  });
});

describe("getSiteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL, then the Vercel production host, then localhost", () => {
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://a.example/", VERCEL_PROJECT_PRODUCTION_URL: "b.vercel.app" } as never)).toBe("https://a.example");
    expect(getSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "b.vercel.app" } as never)).toBe("https://b.vercel.app");
    expect(getSiteUrl({} as never)).toBe("http://localhost:3000");
  });
});

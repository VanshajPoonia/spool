import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Only the landing page: the board's pages show what is saved in each visitor's browser.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE, changeFrequency: "weekly", priority: 1 }];
}

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Required by `output: "export"`: metadata routes must opt in to being emitted
// as a build-time file. This one reads nothing from the request, so it is.
export const dynamic = "force-static";

/**
 * Bump when the page content meaningfully changes. A fixed date is deliberate:
 * `new Date()` would claim a fresh edit on every deploy and crawlers learn to
 * ignore a lastmod that always moves.
 */
const LAST_MODIFIED = "2026-08-18";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 1,
      images: [
        `${SITE_URL}/og.jpg`,
        `${SITE_URL}/hero-desktop.webp`,
        `${SITE_URL}/hero-mobile.webp`,
      ],
    },
  ];
}

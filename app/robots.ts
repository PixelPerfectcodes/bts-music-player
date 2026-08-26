import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Required by `output: "export"`: metadata routes must opt in to being emitted
// as a build-time file. This one reads nothing from the request, so it is.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

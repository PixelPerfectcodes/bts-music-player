import { YT_MUSIC_PLAYLIST_URL } from "@/lib/playlist";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site";

/**
 * Structured data for the landing page.
 *
 * Deliberately omits `track` and `numTracks`: the tracklist is resolved from
 * YouTube in the browser, so there is nothing to back those claims up at build
 * time and marking up content the page cannot show is a guidelines violation.
 */
const graph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      alternateName: ["BTS Music Player", "Bangtan Playlist"],
      description: SITE_DESCRIPTION,
      inLanguage: ["en-US", "ko-KR"],
    },
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: `${SITE_URL}/`,
      name: SITE_TITLE,
      description: SITE_DESCRIPTION,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#playlist` },
      primaryImageOfPage: `${SITE_URL}/bg.png`,
      inLanguage: "en-US",
    },
    {
      "@type": "MusicPlaylist",
      "@id": `${SITE_URL}/#playlist`,
      name: "BTS Songs & Playlist",
      description: SITE_DESCRIPTION,
      url: `${SITE_URL}/`,
      sameAs: YT_MUSIC_PLAYLIST_URL,
      image: `${SITE_URL}/bg.png`,
      genre: ["K-pop", "Pop", "Hip-hop", "R&B"],
      inLanguage: ["ko-KR", "en-US"],
      isAccessibleForFree: true,
    },
  ],
};

export function JsonLd() {
  return (
    <script
      type="application/ld+json"
      // Values are build-time constants; the escape follows the documented
      // Next.js pattern so a future dynamic value cannot break out of the tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(graph).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/**
 * Canonical site details, shared by metadata, robots and sitemap.
 *
 * Override the origin per-environment with:
 *   NEXT_PUBLIC_SITE_URL=https://preview.example.com
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.truckdrivermusic.in"
).replace(/\/$/, "");

export const SITE_NAME = "BTS Music";

export const SITE_TAGLINE = "Dynamite & Bangtan Hits";

export const SITE_TITLE = "BTS Music Player — Bangtan Songs & Playlist";

export const SITE_DESCRIPTION =
  "Stream your favorite BTS songs, Dynamite, and Bangtan Boys playlist non-stop in the browser.";

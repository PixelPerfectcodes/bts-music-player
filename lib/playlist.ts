/**
 * YouTube-backed highway playlist.
 *
 * Playback uses the official YouTube IFrame Player API with a playlist ID only.
 * The top-bar link opens the same list on music.youtube.com.
 *
 * Override with env:
 *   NEXT_PUBLIC_YT_PLAYLIST_ID=PLxxxxxxxx
 */

/** Truck driver music playlist */
export const YT_PLAYLIST_ID =
  process.env.NEXT_PUBLIC_YT_PLAYLIST_ID ??
  "PL48f4dAFmmhjO0fwcNlC-hSMqNVZXeVgP";

export const YT_MUSIC_PLAYLIST_URL = `https://music.youtube.com/playlist?list=${YT_PLAYLIST_ID}`;

/** Prefer higher-res still; cover CSS scales past letterbox bars. */
export function youtubeThumb(videoId: string) {
  // hq720 is usually cleaner than hqdefault for album-style frames
  return `https://i.ytimg.com/vi/${videoId}/hq720.jpg`;
}

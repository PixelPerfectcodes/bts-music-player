/** Minimal typings for the YouTube IFrame Player API */

export type YTPlayerState = -1 | 0 | 1 | 2 | 3 | 5;

export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  nextVideo(): void;
  previousVideo(): void;
  cueVideoById(videoId: string, startSeconds?: number): void;
  loadVideoById(videoId: string, startSeconds?: number): void;
  getPlayerState(): YTPlayerState;
  getCurrentTime(): number;
  getDuration(): number;
  getVideoData(): { video_id?: string; title?: string; author?: string };
  getVolume(): number;
  setVolume(volume: number): void;
  isMuted(): boolean;
  mute(): void;
  unMute(): void;
  setShuffle(shufflePlaylist: boolean): void;
  setLoop(loopPlaylists: boolean): void;
  cuePlaylist(
    playlist: string | string[] | YTPlaylistOptions,
    index?: number,
    startSeconds?: number,
  ): void;
  loadPlaylist(
    playlist: string | string[] | YTPlaylistOptions,
    index?: number,
    startSeconds?: number,
  ): void;
  destroy(): void;
}

export interface YTPlaylistOptions {
  listType?: "playlist" | "search" | "user_uploads";
  list?: string;
  playlist?: string[];
  index?: number;
  startSeconds?: number;
}

export interface YTPlayerEvent {
  target: YTPlayer;
  data: number;
}

export interface YTPlayerOptions {
  height?: string | number;
  width?: string | number;
  videoId?: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (e: YTPlayerEvent) => void;
    onStateChange?: (e: YTPlayerEvent) => void;
    onError?: (e: YTPlayerEvent) => void;
  };
}

export interface YTNamespace {
  Player: new (
    elementId: string | HTMLElement,
    options: YTPlayerOptions,
  ) => YTPlayer;
  PlayerState: {
    UNSTARTED: -1;
    ENDED: 0;
    PLAYING: 1;
    PAUSED: 2;
    BUFFERING: 3;
    CUED: 5;
  };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

/** Load https://www.youtube.com/iframe_api once */
export function loadYouTubeAPI(): Promise<YTNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API is browser-only"));
  }
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const done = () => {
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YT namespace missing after load"));
    };

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      done();
    };

    // Already fully loaded
    if (window.YT?.Player) {
      done();
      return;
    }

    if (
      document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]',
      )
    ) {
      // Script present; poll briefly in case callback already fired
      const start = Date.now();
      const tick = window.setInterval(() => {
        if (window.YT?.Player) {
          window.clearInterval(tick);
          done();
        } else if (Date.now() - start > 10_000) {
          window.clearInterval(tick);
          reject(new Error("YouTube IFrame API timed out"));
        }
      }, 50);
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    tag.onerror = () => reject(new Error("Failed to load YouTube IFrame API"));
    document.head.appendChild(tag);
  });

  return apiPromise;
}

export const YT_STATE = {
  UNSTARTED: -1 as const,
  ENDED: 0 as const,
  PLAYING: 1 as const,
  PAUSED: 2 as const,
  BUFFERING: 3 as const,
  CUED: 5 as const,
};

"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  YT_MUSIC_PLAYLIST_URL,
  YT_PLAYLIST_ID,
  youtubeThumb,
} from "@/lib/playlist";
import {
  loadYouTubeAPI,
  YT_STATE,
  type YTPlayer,
  type YTPlayerEvent,
} from "@/lib/youtube";

const MIN_SKELETON_MS = 800;

// Curated high-res BTS track directory for instantaneous 0-delay song switching
const BTS_TRACK_MAP: Record<string, { id: string; title: string; artist: string }> = {
  "dynamite": { id: "gdZLi9oWNZg", title: "Dynamite", artist: "BTS" },
  "butter": { id: "WMweEpGeo_k", title: "Butter", artist: "BTS" },
  "boy with luv": { id: "XsX3ATc3FbA", title: "Boy With Luv (feat. Halsey)", artist: "BTS" },
  "spring day": { id: "xEeFrLSkMm8", title: "Spring Day (봄날)", artist: "BTS" },
  "blood sweat & tears": { id: "hmE9f-TEutc", title: "Blood Sweat & Tears", artist: "BTS" },
  "fake love": { id: "7C2z4GqqS5E", title: "FAKE LOVE", artist: "BTS" },
  "run bts": { id: "y94i6J_j_7Q", title: "Run BTS (달려라 방탄)", artist: "BTS" },
  "dna": { id: "MBdVXkSdhwU", title: "DNA", artist: "BTS" },
  "idol": { id: "pBuZEGYXA6E", title: "IDOL", artist: "BTS" },
  "mic drop": { id: "kTlv5_Bs8aw", title: "MIC Drop", artist: "BTS" },
  "seven": { id: "QU9c0053UAU", title: "Seven (feat. Latto)", artist: "Jung Kook" },
  "seven jungkook": { id: "QU9c0053UAU", title: "Seven (feat. Latto)", artist: "Jung Kook" },
  "like crazy": { id: "mH0_XpSHuvg", title: "Like Crazy", artist: "Jimin" },
  "like crazy jimin": { id: "mH0_XpSHuvg", title: "Like Crazy", artist: "Jimin" },
  "standing next to you": { id: "UNo0tVC304g", title: "Standing Next to You", artist: "Jung Kook" },
  "love me again": { id: "HYzyRHAHJl8", title: "Love Me Again", artist: "V" },
};

const BTS_QUICK_TAGS = [
  "Dynamite",
  "Butter",
  "Boy With Luv",
  "Spring Day",
  "Blood Sweat & Tears",
  "Fake Love",
  "Run BTS",
  "Seven",
  "Like Crazy",
  "DNA",
  "MIC Drop",
];

export type MusicPillProps = {
  autoplay?: boolean;
  className?: string;
};

function formatTime(s: number) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}

function extractYouTubeId(urlOrText: string): { type: "video" | "playlist" | "query"; id: string } {
  const trimmed = urlOrText.trim();

  // YouTube Playlist URL
  const playlistMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (playlistMatch && playlistMatch[1]) {
    return { type: "playlist", id: playlistMatch[1] };
  }

  // YouTube Video URL formats
  const videoMatch =
    trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/) ||
    trimmed.match(/^([\w-]{11})$/);
  if (videoMatch && videoMatch[1]) {
    return { type: "video", id: videoMatch[1] };
  }

  return { type: "query", id: trimmed };
}

function ControlButton({
  onClick,
  ariaLabel,
  title,
  children,
  primary = false,
  active = false,
  disabled = false,
  className = "",
}: {
  onClick: () => void;
  ariaLabel: string;
  title?: string;
  children: ReactNode;
  primary?: boolean;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title || ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={`music-pill__btn ${primary ? "music-pill__btn--primary" : ""} ${
        active ? "music-pill__btn--active" : ""
      } ${className}`.trim()}
    >
      {children}
    </button>
  );
}

function PillSkeleton() {
  return (
    <div
      className="music-pill music-pill--loading"
      aria-busy="true"
      aria-label="Loading playlist"
      role="status"
    >
      <div className="music-pill__sheen" aria-hidden="true" />
      <div
        className="music-pill__cover music-pill__skel-cover"
        aria-hidden="true"
      >
        <span className="music-pill__skel-pulse" />
      </div>
      <div className="music-pill__body">
        <div className="music-pill__row">
          <div className="music-pill__meta">
            <div className="music-pill__skel-line music-pill__skel-line--title" />
            <div className="music-pill__skel-line music-pill__skel-line--artist" />
          </div>
          <div className="music-pill__controls" aria-hidden="true">
            <span className="music-pill__skel-dot" />
            <span className="music-pill__skel-dot music-pill__skel-dot--lg" />
            <span className="music-pill__skel-dot" />
          </div>
        </div>
        <div className="music-pill__progress">
          <span className="music-pill__skel-time" />
          <div className="music-pill__rail music-pill__skel-rail" />
          <span className="music-pill__skel-time" />
        </div>
      </div>
    </div>
  );
}

export function MusicPill({ autoplay = false, className = "" }: MusicPillProps) {
  const reactId = useId().replace(/:/g, "");
  const hostId = `yt-host-${reactId}`;

  const playerRef = useRef<YTPlayer | null>(null);
  const pollRef = useRef<number | null>(null);
  const metaPollRef = useRef<number | null>(null);
  const mountedAtRef = useRef<number | null>(null);
  const seekRailRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const seekingRef = useRef(false);
  const titleContainerRef = useRef<HTMLDivElement | null>(null);
  const titleTextRef = useRef<HTMLSpanElement | null>(null);

  /** Player API mounted and playlist cued */
  const [playerReady, setPlayerReady] = useState(false);
  /** First track meta filled */
  const [metaReady, setMetaReady] = useState(false);
  /** Skeleton → pill after meta + minimum delay */
  const [showPlayer, setShowPlayer] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [cover, setCover] = useState("");
  const [shouldScrollTitle, setShouldScrollTitle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Features: Volume, Shuffle, Loop
  const [volume, setVolumeState] = useState<number>(100);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isLoop, setIsLoop] = useState(true);

  // Search feature states
  const [searchQuery, setSearchQuery] = useState("");
  const [isCustomSearch, setIsCustomSearch] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  useEffect(() => {
    mountedAtRef.current = Date.now();
  }, []);

  const tryRevealMeta = useCallback((player: YTPlayer): boolean => {
    try {
      const data = player.getVideoData();
      const id = data.video_id;
      const title = data.title?.trim();
      if (!title || title === "Private video" || !id) return false;

      setSongTitle(title);
      setArtistName(data.author?.trim() || "BTS / BigHit Music");
      setCover(youtubeThumb(id));
      const d = player.getDuration();
      if (Number.isFinite(d) && d > 0) setDuration(d);
      setMetaReady(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const syncMeta = useCallback(
    (player: YTPlayer) => {
      try {
        const data = player.getVideoData();
        const id = data.video_id;
        if (data.title?.trim()) setSongTitle(data.title.trim());
        if (data.author?.trim()) setArtistName(data.author.trim());
        if (id) setCover(youtubeThumb(id));
        const d = player.getDuration();
        if (Number.isFinite(d) && d > 0) setDuration(d);
        if (!metaReady && data.title?.trim() && id) {
          setMetaReady(true);
        }
      } catch {
        /* ignore */
      }
    },
    [metaReady],
  );

  // Hold skeleton for a beat even if YouTube returns instantly
  useEffect(() => {
    if (!metaReady) return;
    const elapsed = Date.now() - (mountedAtRef.current ?? Date.now());
    const wait = Math.max(0, MIN_SKELETON_MS - elapsed);
    const id = window.setTimeout(() => setShowPlayer(true), wait);
    return () => window.clearTimeout(id);
  }, [metaReady]);

  const stopPoll = useCallback(() => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPoll = useCallback(
    (player: YTPlayer) => {
      stopPoll();
      pollRef.current = window.setInterval(() => {
        if (seekingRef.current) return;
        try {
          const cur = player.getCurrentTime();
          if (Number.isFinite(cur)) setProgress(cur);
          const d = player.getDuration();
          if (Number.isFinite(d) && d > 0) setDuration(d);
        } catch {
          /* ignore */
        }
      }, 250);
    },
    [stopPoll],
  );

  const seekToRatio = useCallback(
    (ratio: number) => {
      const p = playerRef.current;
      if (!p || !playerReady || duration <= 0) return;
      const clamped = Math.min(1, Math.max(0, ratio));
      const t = clamped * duration;
      try {
        p.seekTo(t, true);
        setProgress(t);
      } catch {
        /* ignore */
      }
    },
    [duration, playerReady],
  );

  const ratioFromPointer = useCallback((clientX: number) => {
    const rail = seekRailRef.current;
    if (!rail) return 0;
    const rect = rail.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return (clientX - rect.left) / rect.width;
  }, []);

  const onSeekPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!playerReady || duration <= 0) return;
      e.preventDefault();
      seekingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      seekToRatio(ratioFromPointer(e.clientX));
    },
    [duration, playerReady, ratioFromPointer, seekToRatio],
  );

  const onSeekPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!seekingRef.current) return;
      seekToRatio(ratioFromPointer(e.clientX));
    },
    [ratioFromPointer, seekToRatio],
  );

  const onSeekPointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!seekingRef.current) return;
      seekingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      seekToRatio(ratioFromPointer(e.clientX));
    },
    [ratioFromPointer, seekToRatio],
  );

  const onSeekKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (!playerReady || duration <= 0) return;
      const step = e.shiftKey ? 10 : 5;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        seekToRatio((progress + step) / duration);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        seekToRatio((progress - step) / duration);
      } else if (e.key === "Home") {
        e.preventDefault();
        seekToRatio(0);
      } else if (e.key === "End") {
        e.preventDefault();
        seekToRatio(1);
      }
    },
    [duration, playerReady, progress, seekToRatio],
  );

  // Volume Handlers
  const changeVolume = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newVol)));
    setVolumeState(clamped);
    const p = playerRef.current;
    if (p && typeof p.setVolume === "function") {
      try {
        p.setVolume(clamped);
        if (clamped > 0 && isMuted && typeof p.unMute === "function") {
          p.unMute();
          setIsMuted(false);
        }
      } catch {
        /* ignore */
      }
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (isMuted) {
        if (typeof p.unMute === "function") p.unMute();
        setIsMuted(false);
      } else {
        if (typeof p.mute === "function") p.mute();
        setIsMuted(true);
      }
    } catch {
      /* ignore */
    }
  }, [isMuted]);

  const toggleShuffle = useCallback(() => {
    const p = playerRef.current;
    const nextState = !isShuffle;
    setIsShuffle(nextState);
    if (p && typeof p.setShuffle === "function") {
      try {
        p.setShuffle(nextState);
      } catch {
        /* ignore */
      }
    }
  }, [isShuffle]);

  const toggleLoop = useCallback(() => {
    const p = playerRef.current;
    const nextState = !isLoop;
    setIsLoop(nextState);
    if (p && typeof p.setLoop === "function") {
      try {
        p.setLoop(nextState);
      } catch {
        /* ignore */
      }
    }
  }, [isLoop]);

  // Execute Search or Direct Track Switch
  const executeSearch = useCallback((query: string) => {
    const q = query.trim();
    if (!q || !playerRef.current) return;

    const normalizedKey = q.toLowerCase();
    const p = playerRef.current;
    setError(null);
    setIsCustomSearch(true);

    // 1. Direct match in curated BTS track directory for instant playback
    if (BTS_TRACK_MAP[normalizedKey]) {
      const track = BTS_TRACK_MAP[normalizedKey];
      setSongTitle(track.title);
      setArtistName(track.artist);
      setCover(youtubeThumb(track.id));
      setSearchMessage(`Playing: ${track.title}`);
      try {
        p.loadVideoById(track.id);
        p.playVideo();
        setIsPlaying(true);
        startPoll(p);
      } catch {
        /* ignore */
      }
      setTimeout(() => setSearchMessage(null), 3500);
      return;
    }

    // 2. Direct YouTube URL parser
    const parsed = extractYouTubeId(q);
    try {
      if (parsed.type === "video") {
        setCover(youtubeThumb(parsed.id));
        setSearchMessage("Playing video link");
        p.loadVideoById(parsed.id);
        p.playVideo();
        setIsPlaying(true);
        startPoll(p);
      } else if (parsed.type === "playlist") {
        setSearchMessage("Loaded custom playlist");
        p.loadPlaylist({
          listType: "playlist",
          list: parsed.id,
          index: 0,
        });
        p.playVideo();
      } else {
        // Query search
        setSearchMessage(`Searching: "${q}"`);
        p.loadPlaylist({
          listType: "search",
          list: normalizedKey.includes("bts") ? q : `BTS ${q}`,
          index: 0,
        });
        p.playVideo();
      }
      setTimeout(() => setSearchMessage(null), 3500);
    } catch {
      setError("Unable to load track. Try another BTS song.");
    }
  }, [startPoll]);

  const resetToDefaultPlaylist = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    setIsCustomSearch(false);
    setSearchQuery("");
    setSearchMessage("Restored BTS Playlist");
    setTimeout(() => setSearchMessage(null), 3000);
    try {
      p.loadPlaylist({
        listType: "playlist",
        list: YT_PLAYLIST_ID,
        index: 0,
      });
      p.playVideo();
    } catch {
      /* ignore */
    }
  }, []);

  const onSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      executeSearch(searchQuery);
    }
  };

  // Mount hidden YouTube player
  useEffect(() => {
    let cancelled = false;
    let player: YTPlayer | null = null;

    const clearMetaPoll = () => {
      if (metaPollRef.current != null) {
        window.clearInterval(metaPollRef.current);
        metaPollRef.current = null;
      }
    };

    const beginMetaPoll = (p: YTPlayer) => {
      clearMetaPoll();
      let attempts = 0;
      metaPollRef.current = window.setInterval(() => {
        if (cancelled) {
          clearMetaPoll();
          return;
        }
        attempts += 1;
        if (tryRevealMeta(p) || attempts > 40) {
          if (attempts > 40 && !cancelled) {
            try {
              const data = p.getVideoData();
              if (data.video_id) {
                setCover(youtubeThumb(data.video_id));
                setSongTitle(data.title?.trim() || "BTS Playlist");
                setArtistName(data.author?.trim() || "BTS");
              } else {
                setSongTitle("BTS Playlist");
                setArtistName("BTS");
              }
            } catch {
              setSongTitle("BTS Playlist");
              setArtistName("BTS");
            }
            setMetaReady(true);
          }
          clearMetaPoll();
        }
      }, 200);
    };

    loadYouTubeAPI()
      .then((YT) => {
        if (cancelled) return;

        player = new YT.Player(hostId, {
          height: 1,
          width: 1,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            listType: "playlist",
            list: YT_PLAYLIST_ID,
            origin:
              typeof window !== "undefined" ? window.location.origin : "",
          },
          events: {
            onReady: (e: YTPlayerEvent) => {
              if (cancelled) return;
              playerRef.current = e.target;

              try {
                if (typeof e.target.setLoop === "function") {
                  e.target.setLoop(true);
                }
              } catch {
                /* ignore */
              }

              e.target.cuePlaylist({
                listType: "playlist",
                list: YT_PLAYLIST_ID,
                index: 0,
              });

              setPlayerReady(true);
              beginMetaPoll(e.target);

              if (autoplay) {
                e.target.playVideo();
              }
            },
            onStateChange: (e: YTPlayerEvent) => {
              if (cancelled) return;
              const state = e.data;
              if (state === YT_STATE.PLAYING) {
                setIsPlaying(true);
                syncMeta(e.target);
                tryRevealMeta(e.target);
                startPoll(e.target);
              } else if (state === YT_STATE.PAUSED) {
                setIsPlaying(false);
                stopPoll();
                setProgress(e.target.getCurrentTime() || 0);
              } else if (state === YT_STATE.ENDED) {
                stopPoll();
                setIsPlaying(false);
                setProgress(0);
                try {
                  e.target.nextVideo();
                } catch {
                  /* ignore */
                }
              } else if (
                state === YT_STATE.CUED ||
                state === YT_STATE.BUFFERING
              ) {
                syncMeta(e.target);
                tryRevealMeta(e.target);
              }
            },
            onError: () => {
              if (!cancelled) {
                setError("Track unavailable — skipping to next.");
                setMetaReady(true);
                try {
                  playerRef.current?.nextVideo();
                } catch {
                  /* ignore */
                }
              }
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("YouTube player failed to load.");
          setMetaReady(true);
          setSongTitle("Couldn’t load player");
          setArtistName("Check connection and refresh");
        }
      });

    return () => {
      cancelled = true;
      stopPoll();
      clearMetaPoll();
      try {
        player?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [
    autoplay,
    hostId,
    startPoll,
    stopPoll,
    syncMeta,
    tryRevealMeta,
  ]);

  // Title marquee measure
  useEffect(() => {
    if (!metaReady) return;
    const container = titleContainerRef.current;
    const text = titleTextRef.current;
    if (!container || !text) return;

    const measure = () => {
      const needs =
        text.getBoundingClientRect().width >
        container.getBoundingClientRect().width + 1;
      setShouldScrollTitle(needs);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [songTitle, metaReady]);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p || !playerReady) return;
    setError(null);
    try {
      const state = p.getPlayerState();
      if (state === YT_STATE.PLAYING || state === YT_STATE.BUFFERING) {
        p.pauseVideo();
      } else {
        p.playVideo();
      }
    } catch {
      setError("Playback blocked — click play again.");
    }
  }, [playerReady]);

  // Reliable Previous Button Handler
  const prev = useCallback(() => {
    const p = playerRef.current;
    if (!p || !playerReady) return;
    setError(null);
    try {
      const curTime = p.getCurrentTime() || 0;
      if (curTime > 3) {
        p.seekTo(0, true);
        setProgress(0);
      } else {
        p.previousVideo();
        p.playVideo();
      }
      // Instant meta resync
      setTimeout(() => {
        syncMeta(p);
        tryRevealMeta(p);
      }, 300);
      setTimeout(() => {
        syncMeta(p);
        tryRevealMeta(p);
      }, 1000);
    } catch {
      /* ignore */
    }
  }, [playerReady, syncMeta, tryRevealMeta]);

  // Reliable Next Button Handler
  const next = useCallback(() => {
    const p = playerRef.current;
    if (!p || !playerReady) return;
    setError(null);
    try {
      p.nextVideo();
      p.playVideo();
      // Instant meta resync
      setTimeout(() => {
        syncMeta(p);
        tryRevealMeta(p);
      }, 300);
      setTimeout(() => {
        syncMeta(p);
        tryRevealMeta(p);
      }, 1000);
    } catch {
      /* ignore */
    }
  }, [playerReady, syncMeta, tryRevealMeta]);

  // Media Session API
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    if (songTitle) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: songTitle,
        artist: artistName || "BTS",
        album: "BTS Hits",
        artwork: cover
          ? [
              {
                src: cover,
                sizes: "512x512",
                type: "image/jpeg",
              },
            ]
          : [],
      });
    }

    navigator.mediaSession.setActionHandler("play", () => {
      togglePlay();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      togglePlay();
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      prev();
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      next();
    });
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime != null && duration > 0) {
        seekToRatio(details.seekTime / duration);
      }
    });

    if (duration > 0 && !isNaN(progress)) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: 1,
          position: Math.min(Math.max(0, progress), duration),
        });
      } catch {
        /* ignore */
      }
    }
  }, [artistName, cover, duration, next, prev, progress, seekToRatio, songTitle, togglePlay]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    if (!showPlayer || !playerReady) return;

    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (el.isContentEditable) return true;
      return Boolean(el.closest("[contenteditable='true']"));
    };

    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (isTypingTarget(e.target)) {
        if (e.key === "Escape") {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) {
        if (e.key === "k" || e.key === "K") {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.code === "Space" || e.key === " " || e.key === "k" || e.key === "K") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        seekToRatio((progress - (e.shiftKey ? 10 : 5)) / duration);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        seekToRatio((progress + (e.shiftKey ? 10 : 5)) / duration);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        changeVolume(volume + 5);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        changeVolume(volume - 5);
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        next();
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        prev();
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        toggleShuffle();
      } else if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        toggleLoop();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [changeVolume, duration, isLoop, isShuffle, next, playerReady, prev, progress, seekToRatio, showPlayer, toggleLoop, toggleMute, togglePlay, toggleShuffle, volume]);

  const progressPercent =
    duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  return (
    <div className={`music-pill-root ${className}`.trim()}>
      {/* Hidden YT iframe host */}
      <div className="music-pill__yt-host" aria-hidden="true">
        <div id={hostId} />
      </div>

      {/* Floating Search Bar */}
      <div className="search-container">
        <form className="search-form" onSubmit={onSearchSubmit}>
          <div className="search-bar">
            <span className="search-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search BTS song, video, or link... (Press /)"
              className="search-input"
              aria-label="Search BTS songs or paste YouTube link"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                title="Clear"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="search-submit-btn"
              aria-label="Play Search Result"
              title="Search and Play"
            >
              Play
            </button>
          </div>
        </form>

        {/* Quick BTS Song Switcher Tags */}
        <div className="search-quick-tags" aria-label="Suggested BTS tracks">
          {isCustomSearch && (
            <button
              type="button"
              onClick={resetToDefaultPlaylist}
              className="search-tag search-tag--active"
              title="Return to main playlist"
            >
              ★ Full BTS Playlist
            </button>
          )}
          {BTS_QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className="search-tag"
              onClick={() => {
                setSearchQuery(tag);
                executeSearch(tag);
              }}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Search Status Toast */}
        {searchMessage && (
          <div className="search-status-toast" role="status">
            {searchMessage}
          </div>
        )}
      </div>

      {!showPlayer ? (
        <PillSkeleton />
      ) : (
        <div className="music-pill" aria-label="Music player">
          <div className="music-pill__sheen" aria-hidden="true" />

          {/* Album Vinyl / Art */}
          <div
            className={
              isPlaying ? "music-pill__cover is-spinning" : "music-pill__cover"
            }
            onClick={togglePlay}
            role="button"
            tabIndex={0}
            aria-label={isPlaying ? "Pause music" : "Play music"}
            title={isPlaying ? "Pause" : "Play"}
          >
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover}
                alt=""
                draggable={false}
                onError={(e) => {
                  const el = e.currentTarget;
                  if (el.src.includes("hq720")) {
                    el.src = el.src.replace("hq720.jpg", "hqdefault.jpg");
                  }
                }}
              />
            ) : (
              <span
                className="music-pill__cover-fallback"
                aria-hidden="true"
              />
            )}
            <span className="music-pill__cover-hub" aria-hidden="true" />
          </div>

          <div className="music-pill__body">
            <div className="music-pill__row">
              <div className="music-pill__meta">
                <div className="music-pill__title-wrap" ref={titleContainerRef}>
                  <span
                    ref={titleTextRef}
                    className={
                      shouldScrollTitle
                        ? "music-pill__title music-pill__title--scroll"
                        : "music-pill__title"
                    }
                  >
                    {songTitle}
                  </span>
                </div>
                <p className="music-pill__artist">
                  {error ?? loadError ?? artistName}
                </p>
              </div>

              {/* Controls */}
              <div className="music-pill__controls">
                {/* Shuffle */}
                <ControlButton
                  ariaLabel={isShuffle ? "Shuffle On" : "Shuffle Off"}
                  onClick={toggleShuffle}
                  active={isShuffle}
                  className="music-pill__btn--secondary hide-on-tiny"
                  disabled={!playerReady}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 3 21 3 21 8" />
                    <line x1="4" y1="20" x2="21" y2="3" />
                    <polyline points="21 16 21 21 16 21" />
                    <line x1="15" y1="15" x2="21" y2="21" />
                    <line x1="4" y1="4" x2="9" y2="9" />
                  </svg>
                </ControlButton>

                {/* Previous Button (Next/Prev Check) */}
                <ControlButton
                  ariaLabel="Previous track (P)"
                  title="Previous Song"
                  onClick={prev}
                  disabled={!playerReady}
                >
                  <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                    <circle
                      cx="14"
                      cy="14"
                      r="13"
                      fill="rgba(255,255,255,0.18)"
                    />
                    <path
                      d="M17.5 19L12.5 14L17.5 9"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </ControlButton>

                {/* Play / Pause */}
                <ControlButton
                  ariaLabel={isPlaying ? "Pause (Space)" : "Play (Space)"}
                  title={isPlaying ? "Pause" : "Play"}
                  onClick={togglePlay}
                  primary
                  disabled={!playerReady}
                >
                  {isPlaying ? (
                    <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                      <circle
                        cx="16"
                        cy="16"
                        r="15"
                        fill="rgba(255,255,255,0.25)"
                      />
                      <rect
                        x="11"
                        y="10"
                        width="3.5"
                        height="12"
                        rx="1"
                        fill="currentColor"
                      />
                      <rect
                        x="17.5"
                        y="10"
                        width="3.5"
                        height="12"
                        rx="1"
                        fill="currentColor"
                      />
                    </svg>
                  ) : (
                    <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                      <circle
                        cx="16"
                        cy="16"
                        r="15"
                        fill="rgba(255,255,255,0.25)"
                      />
                      <polygon
                        points="12,10 12,22 22,16"
                        fill="currentColor"
                      />
                    </svg>
                  )}
                </ControlButton>

                {/* Next Button (Next/Prev Check) */}
                <ControlButton
                  ariaLabel="Next track (N)"
                  title="Next Song"
                  onClick={next}
                  disabled={!playerReady}
                >
                  <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                    <circle
                      cx="14"
                      cy="14"
                      r="13"
                      fill="rgba(255,255,255,0.18)"
                    />
                    <path
                      d="M10.5 9L15.5 14L10.5 19"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </ControlButton>

                {/* Volume & Mute Popover */}
                <div
                  className="music-pill__volume-wrapper"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <ControlButton
                    ariaLabel={isMuted || volume === 0 ? "Unmute (M)" : "Mute (M)"}
                    onClick={toggleMute}
                    className="music-pill__btn--secondary hide-on-tiny"
                    disabled={!playerReady}
                  >
                    {isMuted || volume === 0 ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <line x1="23" y1="9" x2="17" y2="15" />
                        <line x1="17" y1="9" x2="23" y2="15" />
                      </svg>
                    ) : volume < 50 ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                      </svg>
                    )}
                  </ControlButton>

                  {/* Volume Slider Flyout */}
                  {showVolumeSlider && (
                    <div className="music-pill__volume-flyout">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => changeVolume(Number(e.target.value))}
                        aria-label="Volume slider"
                        className="music-pill__volume-slider"
                      />
                      <span className="music-pill__volume-text">
                        {isMuted ? "0%" : `${volume}%`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Repeat / Loop */}
                <ControlButton
                  ariaLabel={isLoop ? "Loop Playlist On" : "Loop Playlist Off"}
                  onClick={toggleLoop}
                  active={isLoop}
                  className="music-pill__btn--secondary hide-on-mobile"
                  disabled={!playerReady}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="17 1 21 5 17 9" />
                    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                    <polyline points="7 23 3 19 7 15" />
                    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                  </svg>
                </ControlButton>

                {/* Open in YouTube Music link */}
                <a
                  href={YT_MUSIC_PLAYLIST_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open playlist on YouTube Music"
                  title="Open in YouTube Music"
                  className="music-pill__btn music-pill__btn--secondary hide-on-mobile"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Progress & Scrubbing Slider */}
            <div className="music-pill__progress">
              <span className="music-pill__time">{formatTime(progress)}</span>
              <div
                ref={seekRailRef}
                className="music-pill__rail music-pill__rail--seek"
                role="slider"
                tabIndex={playerReady && duration > 0 ? 0 : -1}
                aria-label="Seek"
                aria-valuemin={0}
                aria-valuemax={Math.floor(duration) || 0}
                aria-valuenow={Math.floor(progress)}
                aria-valuetext={`${formatTime(progress)} of ${formatTime(duration)}`}
                aria-disabled={!playerReady || duration <= 0}
                onPointerDown={onSeekPointerDown}
                onPointerMove={onSeekPointerMove}
                onPointerUp={onSeekPointerUp}
                onPointerCancel={onSeekPointerUp}
                onKeyDown={onSeekKeyDown}
              >
                <div
                  className="music-pill__fill"
                  style={{ width: `${progressPercent}%` }}
                />
                <span
                  className="music-pill__knob"
                  style={{ left: `${progressPercent}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className="music-pill__time">{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

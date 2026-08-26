"use client";

import posthog from "posthog-js";
import type { ComponentProps, ReactNode } from "react";

const posthogEnabled = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
    process.env.NEXT_PUBLIC_POSTHOG_HOST,
);

type TrackedLinkProps = ComponentProps<"a"> & {
  event: "support_link_opened" | "youtube_music_playlist_opened";
  children: ReactNode;
};

export function TrackedLink({ event, children, onClick, ...props }: TrackedLinkProps) {
  return (
    <a
      {...props}
      onClick={(eventClick) => {
        onClick?.(eventClick);
        if (!eventClick.defaultPrevented && posthogEnabled) {
          posthog.capture(event);
        }
      }}
    >
      {children}
    </a>
  );
}

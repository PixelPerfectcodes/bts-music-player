"use client";

import { useEffect, useState } from "react";

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function Clock() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const tick = () => setTime(formatTime(new Date()));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="clock" aria-label="Current time">
      {time || "\u00a0"}
    </div>
  );
}

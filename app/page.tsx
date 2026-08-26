import { Clock } from "./clock";
import { JsonLd } from "./json-ld";
import { Listeners } from "./listeners";
import { MusicPill } from "./music-pill";

export default function Home() {
  return (
    <>
      <JsonLd />

      <div className="bg" aria-hidden="true">
        <div className="bg__img" />
        <div className="bg__scrim" />
      </div>

      <header className="topbar">
        <div className="topbar__left">
          <Clock />
          <span className="topbar__sep" aria-hidden="true" />
          <Listeners />
        </div>
      </header>

      <main className="shell">
        <div className="center-brand" aria-label="BTS Brand Logo">
          <div className="bts-hero-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/bts-logo.png"
              alt="BTS Logo"
              className="bts-logo-img"
              draggable={false}
            />
          </div>
          <p className="bts-korean-text">방탄소년단 · BEYOND THE SCENE</p>
        </div>

        <div className="dock">
          <MusicPill />
          <p className="raksha-credit">
            <span>made with ❤️ by Mohit</span>
            <span className="raksha-credit__sep">·</span>
            <span className="raksha-wish">happy Raksha bandhan luv u sister 🌸</span>
          </p>
        </div>
      </main>
    </>
  );
}


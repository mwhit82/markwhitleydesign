"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cars, formatTime, type Mode } from "./data";
import styles from "./rally.module.css";
export function RallyGame() {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<import("./world").RallyWorld | null>(null);
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<Mode>("garage");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(true);
  const [pad, setPad] = useState("Keyboard ready");
  const [stats, setStats] = useState({
    time: 0,
    speed: 0,
    progress: 0,
    count: 3,
  });
  const [best, setBest] = useState<number | null>(null);
  useEffect(() => {
    let disposed = false;
    import("./world")
      .then(({ RallyWorld }) => {
        if (disposed || !host.current) return;
        api.current = new RallyWorld(host.current, {
          stats: setStats,
          mode: setMode,
          pad: setPad,
          select: setSelected,
          best: setBest,
        });
        setReady(true);
      })
      .catch(() =>
        setError(
          "The 3D stage could not load. Please try a browser with WebGL enabled.",
        ),
      );
    return () => {
      disposed = true;
      api.current?.dispose();
      api.current = null;
    };
  }, []);
  const car = cars[selected];
  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>
            MARK WHITLEY / PLAYABLE EXPERIMENT 01
          </p>
          <h1>
            POCKET<span>RALLY.</span>
          </h1>
        </div>
        <div className={styles.stageInfo}>
          <b>FOREST RUN</b>
          <span>SS01 · GRAVEL · CLEAR</span>
        </div>
      </div>
      <div className={styles.game}>
        <div
          ref={host}
          className={styles.canvas}
          aria-label="Isometric clay rally driving stage"
        />
        <div className={styles.topbar}>
          <span>
            <i /> {pad}
          </span>
          <div>
            <button
              onClick={() => {
                api.current?.sound(!muted);
                setMuted(!muted);
              }}
            >
              {muted ? "Sound off" : "Sound on"}
            </button>
            <button
              onClick={() => {
                const el = host.current?.parentElement;
                if (document.fullscreenElement) void document.exitFullscreen();
                else void el?.requestFullscreen?.();
              }}
            >
              Fullscreen
            </button>
          </div>
        </div>
        {!ready && (
          <div className={styles.overlay}>
            <h2>{error || "Sculpting the stage…"}</h2>
          </div>
        )}
        {ready && mode === "garage" && (
          <>
            <div className={styles.garageCopy}>
              <span className={styles.tag}>THE SERVICE PARK</span>
              <h2>
                Small car.
                <br />
                Big sideways.
              </h2>
              <p>
                A handmade forest stage.
                <br />A race against yourself.
              </p>
            </div>
            <div className={styles.garage}>
              <div className={styles.carSelect}>
                <button
                  aria-label="Previous car"
                  onClick={() => api.current?.choose(selected - 1)}
                >
                  ←
                </button>
                <div>
                  <span className={styles.eyebrow}>
                    {car.year} / {String(selected + 1).padStart(2, "0")} OF 04
                  </span>
                  <h3>{car.name}</h3>
                  <p>{car.trait}</p>
                </div>
                <button
                  aria-label="Next car"
                  onClick={() => api.current?.choose(selected + 1)}
                >
                  →
                </button>
              </div>
              <button
                className={styles.start}
                onClick={() => api.current?.start()}
              >
                START STAGE <span>↗</span>
              </button>
              <p className={styles.hint}>
                ← → choose · Enter / controller Cross to start
              </p>
            </div>
          </>
        )}
        {(mode === "race" || mode === "countdown") && (
          <>
            <div className={styles.timer}>
              <small>STAGE TIME</small>
              <strong>{formatTime(stats.time)}</strong>
              <span>BEST {best ? formatTime(best) : "—"}</span>
            </div>
            <div className={styles.speed}>
              <strong>{stats.speed}</strong>
              <small>KM/H</small>
            </div>
            <div className={styles.progress}>
              <div style={{ width: `${stats.progress * 100}%` }} />
            </div>
            <div className={styles.touchControls} aria-label="Touch driving controls">
              {([['KeyA', '←'], ['KeyD', '→'], ['Space', 'Slide'], ['KeyS', 'Brake'], ['KeyW', 'Go']] as const).map(([key, label]) => <button key={key} aria-label={label === '←' ? 'Steer left' : label === '→' ? 'Steer right' : label} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); api.current?.keys.add(key); }} onPointerUp={() => api.current?.keys.delete(key)} onPointerCancel={() => api.current?.keys.delete(key)} onLostPointerCapture={() => api.current?.keys.delete(key)}>{label}</button>)}
              <button onClick={() => api.current?.resetPosition()}>Reset</button>
            </div>
            <button
              className={styles.pause}
              onClick={() => api.current?.pause()}
            >
              Pause Ⅱ
            </button>
          </>
        )}
        {mode === "countdown" && (
          <div className={styles.count}>
            {stats.count > 0 ? stats.count : "GO!"}
          </div>
        )}
        {mode === "paused" && (
          <div className={styles.overlay}>
            <span className={styles.tag}>TAKE A BREATHER</span>
            <h2>Stage paused.</h2>
            <button
              className={styles.start}
              onClick={() => api.current?.pause()}
            >
              RESUME →
            </button>
            <button onClick={() => api.current?.start()}>Restart stage</button>
            <button onClick={() => api.current?.garage()}>
              Change car · controller Circle
            </button>
          </div>
        )}
        {mode === "finished" && (
          <div className={styles.overlay}>
            <span className={styles.tag}>
              STAGE COMPLETE /{" "}
              {stats.time < 70 ? "GOLD" : stats.time < 90 ? "SILVER" : "BRONZE"}
            </span>
            <h2>{formatTime(stats.time)}</h2>
            <p>{car.name} · Forest Run</p>
            <p>Personal best: {best ? formatTime(best) : "—"}</p>
            <button
              className={styles.start}
              onClick={() => api.current?.start()}
            >
              ONE MORE RUN ↗
            </button>
            <button onClick={() => api.current?.garage()}>
              Change car · controller Circle
            </button>
          </div>
        )}
      </div>
      <div className={styles.below}>
        <div>
          <span className={styles.tag}>HOW TO DRIVE</span>
          <p>
            <b>Keyboard</b> · WASD / arrows to drive · Space to slide · R to
            recover · Esc to pause
          </p>
          <p>
            <b>PS5 controller</b> · Left stick steers · R2 throttle · L2 brake ·
            Cross handbrake · Triangle recover · Options pause
          </p>
          <small>
            Connect by USB or Bluetooth, then press a controller button. Desktop
            recommended. Times are saved on this device.
          </small>
        </div>
        <Link href="/playground">Back to Playground ↗</Link>
      </div>
    </div>
  );
}

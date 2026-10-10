"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cars, formatTime, type Mode } from "./data";
import styles from "./rally.module.css";
import { stages, initialStage, stageDefinition, weatherNames, type StageSelection, type Weather } from "./stages";
import { Leaderboard, type RaceResult } from "./leaderboard";
export function RallyGame() {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<HTMLDivElement>(null);
  const hadNativeFullscreen = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const [installHelp, setInstallHelp] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const api = useRef<import("./world").RallyWorld | null>(null);
  const [selected, setSelected] = useState(0);
  const [selection, setSelection] = useState<StageSelection>({...initialStage});
  const [leaderboard, setLeaderboard] = useState(false);
  const [result, setResult] = useState<RaceResult|null>(null);
  const run = useRef<Promise<string|null>>(Promise.resolve(null));
  const [mode, setMode] = useState<Mode>("garage");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(true);
  const [pad, setPad] = useState("Keyboard ready");
  const [stats, setStats] = useState({
    time: 0,
    speed: 0,
    rpm: 950,
    limited: false,
    progress: 0,
    count: 3,
  });
  const [best, setBest] = useState<number | null>(null);
  useEffect(() => {
    const surface = game.current;
    if (!surface) return;
    // Native non-passive touch events cancel iOS long-press selection early.
    // Limit cancellation to held driving controls so normal menu taps still work.
    const preventHold = (event: TouchEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest("[data-driving-control]")) return;
      if (event.cancelable) event.preventDefault();
      window.getSelection()?.removeAllRanges();
    };
    const preventSelection = (event: Event) => event.preventDefault();
    surface.addEventListener("touchstart", preventHold, { passive: false });
    surface.addEventListener("touchmove", preventHold, { passive: false });
    surface.addEventListener("selectstart", preventSelection);
    return () => {
      surface.removeEventListener("touchstart", preventHold);
      surface.removeEventListener("touchmove", preventHold);
      surface.removeEventListener("selectstart", preventSelection);
    };
  }, []);
  useEffect(() => {
    let disposed = false;
    import("./world")
      .then(({ RallyWorld }) => {
        if (disposed || !host.current) return;
        api.current = new RallyWorld(host.current, {
          stats: setStats,
          start: () => {
            setLeaderboard(false);setResult(null);
            const world=api.current;
            run.current=fetch('/api/rally/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({selection:world?.selection,car:world?.selected})}).then(async response=>response.ok?(await response.json()).run:null).catch(()=>null);
          },
          finish: (time,trace) => setResult({time,trace,run:run.current}),
          mode: setMode,
          pad: setPad,
          select: setSelected,
          best: setBest,
          audio: (isMuted) => {
            setMuted(isMuted);
            if (isMuted) setNotice("Audio stopped. Tap Sound to retry.");
          },
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
  useEffect(() => {
    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setStandalone(installed);
    if (installed) setExpanded(true);
  }, []);
  useEffect(() => {
    const changed = () => {
      if (document.fullscreenElement === game.current) {
        hadNativeFullscreen.current = true;
        setExpanded(true);
      } else if (hadNativeFullscreen.current) {
        hadNativeFullscreen.current = false;
        setExpanded(false);
      }
    };
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement)
        setExpanded(false);
    };
    window.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", escape);
    };
  }, [expanded]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 6500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const toggleFullscreen = async () => {
    if (expanded) {
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          setNotice("Use your browser’s fullscreen exit control.");
          return;
        }
      }
      setExpanded(false);
      return;
    }
    // Expanded layout is also the fallback on browsers without native fullscreen.
    setExpanded(true);
    if (game.current?.requestFullscreen && document.fullscreenEnabled) {
      try {
        await game.current.requestFullscreen();
        return;
      } catch {
        /* Keep the expanded layout. */
      }
    }
    api.current?.blur();
    setInstallHelp(true);
  };
  const toggleSound = async () => {
    if (!api.current) return;
    setAudioBusy(true);
    const next = !muted;
    try {
      await api.current.sound(next);
      setMuted(next);
      setNotice(
        next
          ? "Sound muted."
          : "Audio playback started. Adjust your phone’s media volume.",
      );
    } catch {
      setMuted(true);
      setNotice("Sound could not start. Tap Sound again to retry.");
    } finally {
      setAudioBusy(false);
    }
  };
  const touchButton = (key: string, label: string, name: string) => (
    <button
      key={key}
      data-driving-control="true"
      aria-label={name}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        api.current?.keys.add(key);
      }}
      onPointerUp={() => api.current?.keys.delete(key)}
      onPointerCancel={() => api.current?.keys.delete(key)}
      onLostPointerCapture={() => api.current?.keys.delete(key)}
    >
      {label}
    </button>
  );
  const car = cars[selected];
  const stage = stageDefinition(selection);
  const changeStage = (next: StageSelection) => {
    setSelection(next);setResult(null);api.current?.configure(next);
  };
  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>MARK WHITLEY / POCKET RALLY V2.0</p>
          <h1>
            POCKET<span>RALLY.</span>
          </h1>
        </div>
        <div className={styles.stageInfo}>
          <b>{stage.name.toUpperCase()}</b>
          <span>{stage.surface} · {weatherNames[selection.weather]} · {selection.reverse?"Reverse":"Forward"}</span>
        </div>
      </div>
      <div
        ref={game}
        className={`${styles.game} ${expanded ? styles.expanded : ""}`}
        onContextMenu={(event) => event.preventDefault()}
      >
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
              disabled={!ready || audioBusy}
              aria-pressed={!muted}
              onClick={toggleSound}
            >
              {audioBusy ? "Starting sound…" : muted ? "Sound off" : "Sound on"}
            </button>
            <button aria-pressed={expanded} onClick={toggleFullscreen}>
              {expanded ? "Exit game view" : "Fullscreen"}
            </button>
          </div>
        </div>
        {installHelp && (
          <div
            className={styles.installHelp}
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-title"
          >
            <h2 id="install-title">Play without browser bars</h2>
            <p>
              On iPhone or iPad, launch Pocket Rally as a Home Screen web app.
            </p>
            <ol>
              <li>
                In Chrome or Safari, tap <b>Share</b>.
              </li>
              <li>
                Choose <b>Add to Home Screen</b>. Keep <b>Open as Web App</b> on
                if shown, then tap <b>Add</b>.
              </li>
              <li>
                Open the new <b>Pocket Rally</b> icon and turn your phone
                sideways.
              </li>
            </ol>
            <p className={styles.hint}>
              Needs an internet connection. iOS may still show its home
              indicator.
            </p>
            <button
              className={styles.start}
              onClick={() => setInstallHelp(false)}
            >
              CONTINUE IN BROWSER →
            </button>
          </div>
        )}
        {notice && (
          <div className={styles.notice} role="status">
            {notice}
          </div>
        )}
        {mode === "garage" && (
          <div className={styles.rotateHint}>
            ↻ Rotate to landscape for a wider track and bigger controls.
          </div>
        )}
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
                Four worlds. Twenty-four ways to race.
                <br />Find your place on the leaderboard.
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
              <div className={styles.stageChoices}>
                <label>Environment<select value={selection.stage} onChange={e=>changeStage({stage:e.target.value as StageSelection["stage"],weather:"clear",reverse:selection.reverse})}>{stages.map(s=><option key={s.id} value={s.id}>{s.name} · {s.surface}</option>)}</select></label>
                <label>Conditions<select value={selection.weather} onChange={e=>changeStage({...selection,weather:e.target.value as Weather})}>{stage.conditions.map(w=><option key={w} value={w}>{weatherNames[w]}</option>)}</select></label>
                <label>Direction<select value={selection.reverse?"reverse":"forward"} onChange={e=>changeStage({...selection,reverse:e.target.value==="reverse"})}><option value="forward">Forward</option><option value="reverse">Reverse</option></select></label>
              </div>
              <button className={styles.boardButton} onClick={()=>setLeaderboard(true)}>View stage leaderboard ↗</button>
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
              <div className={styles.revs} role="meter" aria-label="Engine revs" aria-valuemin={0} aria-valuemax={7400} aria-valuenow={stats.rpm}>
                <div style={{ width: `${stats.rpm / 7400 * 100}%` }} />
              </div>
              <small>{stats.limited ? "LIMIT" : `${stats.rpm.toLocaleString()} RPM`}</small>
            </div>
            <div className={styles.progress}>
              <div style={{ width: `${stats.progress * 100}%` }} />
            </div>
            <div
              className={styles.touchControls}
              aria-label="Touch driving controls"
            >
              <div className={styles.steeringPad}>
                {touchButton("KeyA", "←", "Steer left")}
                {touchButton("KeyD", "→", "Steer right")}
              </div>
              <div className={styles.pedalPad}>
                {touchButton("Space", "Slide", "Handbrake")}
                {touchButton("KeyS", "Brake", "Brake")}
                {touchButton("KeyW", "Go", "Accelerate")}
              </div>
            </div>
            <button
              className={styles.recover}
              onClick={() => api.current?.resetPosition()}
            >
              Reset car
            </button>
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
            <p>{car.name} · {stage.name} · {weatherNames[selection.weather]} · {selection.reverse?"Reverse":"Forward"}</p>
            <p>Personal best: {best ? formatTime(best) : "—"}</p>
            <button onClick={()=>setLeaderboard(true)}>Submit time & view leaderboard ↗</button>
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
        {leaderboard && <Leaderboard selection={selection} result={result} onClose={()=>setLeaderboard(false)} />}
      </div>
      <div className={styles.below}>
        <div>
          <span className={styles.tag}>HOW TO DRIVE</span>
          <p><a href="/rally/audio-credits.txt" target="_blank" rel="noreferrer">Engine audio credits ↗</a></p>
          {!standalone && (
            <p>
              <button
                className={styles.installLink}
                onClick={() => { setExpanded(true); api.current?.blur(); setInstallHelp(true); }}
              >
                Play as a Home Screen app ↗
              </button>
            </p>
          )}
          <p>
            <b>Keyboard</b> · WASD / arrows to drive · Space to slide · R to
            recover · Esc to pause
          </p>
          <p>
            <b>PS5 controller</b> · Left stick steers · R2 throttle · L2 brake ·
            Cross handbrake · Triangle recover · Options pause
          </p>
          <small>
            On phone or iPad, rotate to landscape and tap Fullscreen for the
            best view. For a controller, connect by USB or Bluetooth and press a
            button. Times are saved on this device.
          </small>
        </div>
        <Link href="/playground">Back to Playground ↗</Link>
      </div>
    </div>
  );
}

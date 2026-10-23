"use client";
import { failureMessage } from "@/lib/deader/kitchen";
import { useEffect, useRef } from "react";
import { achievements } from "@/lib/deader/achievements";
import { useGame } from "@/lib/deader/store";
import { donutMood } from "@/lib/deader/survival";
import { scareVariant } from "@/lib/deader/presentation";
import { roomAudio } from "@/lib/deader/audio/room-audio";
import { Modal } from "./modal";
import styles from "./game.module.css";

export function GameSettings() {
  const s = useGame(),
    settings = s.save.settings;
  return (
    <fieldset className={styles.settings}>
      <legend>Make the night yours</legend>
      <label>Controls
        <select value={settings.controls} onChange={e => s.settings({ controls: e.target.value as "auto" | "touch" | "keyboard" })}>
          <option value="auto">Auto</option><option value="touch">Touch</option><option value="keyboard">Keyboard and mouse</option>
        </select>
      </label>
      <p>Touch: left joystick to move, swipe the room view to look, tap the labelled button to interact. Play upright or sideways. If play feels slow, try Low graphics below.</p>
      <label>
        Sound volume{" "}
        <input
          aria-label="Sound volume"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={settings.volume}
          onChange={(e) => s.settings({ volume: Number(e.target.value) })}
        />
      </label>
      {(
        [
          ["muted", "Mute sound"],
          ["gentleScares", "Gentle scares · quieter, no lunges"],
          ["reducedMotion", "Reduce motion and camera shake"],
          ["reducedFlashes", "Disable lighting flicker"],
        ] as const
      ).map(([key, label]) => (
        <label key={key}>
          <input
            type="checkbox"
            checked={settings[key]}
            onChange={(e) => s.settings({ [key]: e.target.checked })}
          />
          {label}
        </label>
      ))}
      {(
        [
          ["ambience", "Ambient sound", 0, 1, 0.05],
          ["sensitivity", "Mouse sensitivity", 0.3, 2, 0.1],
          ["touchSensitivity", "Touch sensitivity", 0.3, 2, 0.1],
          ["resolution", "Rendering resolution", 0.75, 1.5, 0.25],
        ] as const
      ).map(([key, label, min, max, step]) => (
        <label key={key}>
          {label} · {settings[key]}
          <input
            aria-label={label}
            type="range"
            min={min}
            max={max}
            step={step}
            value={settings[key]}
            onChange={(e) => s.settings({ [key]: Number(e.target.value) })}
          />
        </label>
      ))}
      {(
        [
          ["shadows", "Shadows (Standard quality)"],
          ["effects", "Atmospheric effects · dust, grain and sway"],
        ] as const
      ).map(([key, label]) => (
        <label key={key}>
          <input
            type="checkbox"
            checked={settings[key]}
            onChange={(e) => s.settings({ [key]: e.target.checked })}
          />
          {label}
        </label>
      ))}
      <label>
        Graphics{" "}
        <select
          value={settings.quality}
          onChange={(e) =>
            s.settings({ quality: e.target.value as "low" | "standard" })
          }
        >
          <option value="standard">Standard</option>
          <option value="low">Low · lower resolution</option>
        </select>
      </label>
      <small>
        Saved on this device. System reduced-motion preferences are respected
        too.
      </small>
      <small>Scream SFX by Dan Knoflicek · <a href="https://opengameart.org/content/screaming" target="_blank" rel="noreferrer">Screaming</a> · <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a> · trimmed and normalized.</small>
    </fieldset>
  );
}

export function SurvivalUI() {
  const s = useGame(),
    r = s.room,
    seq = r.survival;
  useEffect(() => {
    if (s.panel || (!s.focused || !!s.suspension)) {
      roomAudio.silence();
      return;
    }
    if (seq.phase === "lunge") {
      const variant = scareVariant(r.encounters.active?.visitor ?? "three");
      roomAudio.play(variant === "rush" ? "scare" : variant);
    }
    if (seq.phase === "donut") roomAudio.play("rumble");
    if (seq.phase === "blackout") roomAudio.play("gulp");
    // Cues follow phase transitions; resuming does not replay a scare.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq.phase]);
  const endingCue = useRef<string | null>(null);
  useEffect(() => {
    if (
      endingCue.current !== r.encounters.runId &&
      r.night?.number === 3 &&
      r.night.status === "completed" &&
      r.night.endingSeconds >= 9 &&
      !s.panel &&
      s.focused && !s.suspension
    ) {
      endingCue.current = r.encounters.runId;
      roomAudio.play("vent", -0.4);
    }
  }, [
    r.encounters.runId,
    r.night?.endingSeconds,
    r.night?.number,
    r.night?.status,
    s.panel,
    s.focused,
    s.suspension,
  ]);
  if (s.panel || r.judgement) return null;
  if (
    r.night?.status === "completed" &&
    r.night.number === 3 &&
    r.night.endingSeconds < 14
  ) {
    const t = r.night.endingSeconds;
    return (
      <div
        className={`${styles.ending} ${t >= 11 ? styles.endingDark : ""}`}
        role="status"
      >
        {t < 6 ? (
          <>
            <p className={styles.eyebrow}>ANOMALOUS NEWS / ALL CLEAR</p>
            <h2>You survived.</h2>
            <p>The streets are quiet. Authorities say the danger has passed.</p>
          </>
        ) : t < 9 ? (
          <p>The room falls quiet.</p>
        ) : t < 11 ? (
          <p>Donut looks up. Something moves in the vent.</p>
        ) : (
          <h2>
            THE END…
            <br />
            FOR NOW.
          </h2>
        )}
        <button onClick={() => s.open("pause")}>Pause · Esc</button>
      </div>
    );
  }
  if (r.night?.status === "completed")
    return (
      <Modal label="Night complete" onClose={s.lobby}>
        <p className={styles.eyebrow}>
          5:55 AM / NIGHT {r.night.number} COMPLETE
        </p>
        <h2>You made it to morning.</h2>
        <p>The Auditor lets you clock off. For now.</p>
        <dl className={styles.results}>
          <div>
            <dt>Correct decisions</dt>
            <dd>{r.encounters.correct}</dd>
          </div>
          <div>
            <dt>Mistakes this shift</dt>
            <dd>{r.encounters.mistakes-r.mistakeBaseline} / 3</dd>
          </div>
          <div>
            <dt>
              {r.night.duration === 60 ? "Practice coins" : "Coins earned"}
            </dt>
            <dd>{r.encounters.earned + 50}</dd>
          </div>
        </dl>
        <p>
          {r.night.duration === 60
            ? "60-second development rehearsal. Coins and night completion were not saved."
            : "+50 completion coins, plus your correct-decision rewards. Night completion is saved."}
        </p>
        {r.night.cancelledVisitor && (
          <p>
            The last visitor left at dawn. No extra reward or penalty was
            applied.
          </p>
        )}
        <p className={styles.note}>
          Every face tells a story. You survived this one.
        </p>
        <div className={styles.pauseActions}>
          {r.night.number < 3 && (
            <button className={styles.primary} onClick={s.nextNight}>
              Continue to Night {r.night.number + 1}
            </button>
          )}
          <button className={styles.primary} onClick={s.start}>
            Replay night
          </button>
          {achievements.some(
            (a) =>
              s.save.achievements.includes(a.id) &&
              !s.save.claimedRewards.includes(`achievement:${a.id}`),
          ) && (
            <button onClick={() => s.open("progress")}>
              Achievement rewards ready
            </button>
          )}
          <button onClick={s.lobby}>Return to lobby</button>
        </div>
      </Modal>
    );
  if (seq.phase === "gameover")
    return (
      <Modal label="Game Over" onClose={s.lobby}>
        <p className={styles.eyebrow}>
          NIGHT {r.night?.number ?? s.session?.night ?? 1} / {r.kitchen.failure ? "SURVIVAL FAILED" : "JUDGEMENT FAILED"}
        </p>
        <h2>THE ANOMALOUS</h2>
        <p>{r.kitchen.failure ? failureMessage(r.kitchen) : "The dawn reveal counted three or more mistakes."}</p>
        {!r.kitchen.failure && <dl className={styles.results}>
          <div>
            <dt>Correct decisions</dt>
            <dd>{r.encounters.correct}</dd>
          </div>
          <div>
            <dt>Mistakes</dt>
            <dd>{r.encounters.mistakes}</dd>
          </div>
          <div>
            <dt>Coins earned</dt>
            <dd>{r.encounters.earned}</dd>
          </div>
        </dl>}
        {!r.kitchen.failure && r.night?.mode === "infinite" && (
          <p>
            Best streak this run: {r.encounters.bestStreak} · Nights survived:{" "}
            {Math.max(0,r.night.number-1)}
          </p>
        )}
        <p>{r.kitchen.failure ? "Previously saved coins and cosmetics are safe. This shift’s pending rewards were not banked." : "Your earned coins and cosmetics are safe."}</p>
        <div className={styles.pauseActions}>
          <button className={styles.primary} onClick={s.start}>
            Retry shift
          </button>
          {achievements.some(
            (a) =>
              s.save.achievements.includes(a.id) &&
              !s.save.claimedRewards.includes(`achievement:${a.id}`),
          ) && (
            <button onClick={() => s.open("progress")}>
              Achievement rewards ready
            </button>
          )}
          <button onClick={s.lobby}>Return to lobby</button>
        </div>
      </Modal>
    );
  if (seq.phase === "idle") return null;
  const text =
    seq.phase === "tension"
      ? seq.kind === "anomaly"
        ? "That is not a human."
        : r.encounters.result?.decision === "timeout"
          ? "Time expired. The door stayed closed. Donut noticed."
          : "They were human. Donut noticed."
      : seq.phase === "lunge"
        ? "Get back!"
        : seq.phase === "recovery"
          ? `+1 mistake · Donut is ${donutMood(r.encounters.trust)}.`
          : seq.phase === "donut"
            ? "Donut has had enough."
            : "GULP.";
  return (
    <div
      className={`${styles.survivalOverlay} ${seq.phase === "blackout" ? styles.blackout : ""}`}
    >
      <p role="status">{text}</p>
      <button onClick={() => s.open("pause")}>Pause · Esc</button>
    </div>
  );
}

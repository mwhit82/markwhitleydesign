"use client";
import { ActionIcon } from "./action-icon";
import { lazy, Suspense, useEffect } from "react";
import { clockLabel } from "@/lib/deader/game";

import { useGame } from "@/lib/deader/store";
import {
  FEEDS,
  type Feed,
} from "@/lib/deader/room";
import { roomAudio } from "@/lib/deader/audio/room-audio";
import { LoungeAlertUI } from "./lounge-alert";
import { KitchenUI } from "./kitchen-ui";
import { ConsoleUI } from "./console-ui";
import { EncounterUI } from "./encounter-ui";
import { DoorMenu } from "./door-menu";
import { TVCaptions } from "./room-tv";
import { Modal } from "./modal";
import styles from "./game.module.css";

const ArcadeUI = lazy(() => import("./arcade-ui"));

export function RoomUI() {
  const s = useGame(),
    r = s.room;
  const muted = s.save.settings.muted;
  useEffect(() => {
    if (s.panel || (!s.focused || !!s.suspension)) roomAudio.silence();
  }, [s.panel, s.focused, s.suspension]);
  const exit = () => s.roomView("explore");
  if (s.panel || r.survival.phase !== "idle" || (r.night?.status === "completed" || !!r.judgement))
    return null;
  if(r.kitchen.failure)return <KitchenUI />;
  return (
    <>
      <KitchenUI />
      {r.view !== "arcade" && r.view !== "console" && <EncounterUI />}
      {r.view === "console" && <ConsoleUI />}
      {r.view === "arcade" && <Suspense fallback={<p>Loading arcade…</p>}><ArcadeUI /></Suspense>}
      {r.view === "explore" && (
        <div className={styles.crosshair} aria-hidden="true">
          +
        </div>
      )}
      <TVCaptions /><LoungeAlertUI/>
      {r.view === "door" && <DoorMenu />}
      {r.view === "inspect" && (
        <div className={styles.inspection}>
          <div className={styles.inspectionActions}>
            <p>
              PEEPHOLE / {r.visitorId ? "VISITOR WAITING" : "LANDING EMPTY"}
            </p>
            <button
              autoFocus
              onClick={() => s.doorEvent({ type: "leave-inspection" })}
            >
              <ActionIcon name="admit" />Answer the door
            </button>
          </div>
        </div>
      )}
      {r.view === "cctv" && (
        <div className={styles.cctv}>
          <div>
            <b>
              ● REC · CAM {r.feed + 1} / {FEEDS[r.feed].label.toUpperCase()}
            </b>
            <p>
              NIGHT {r.night?.number ?? 1} ·{" "}
              {clockLabel(
                r.night?.mode === "infinite"
                  ? r.night.elapsed % 600
                  : (r.night?.elapsed ?? 0),
              )}
            </p>
            <small>LIVE FEED</small>
          </div>
          <button autoFocus onClick={exit}>
            <ActionIcon name="back" />Back to room
          </button>
          <div className={styles.scanlines} />
          <div
            className={styles.staticNoise}
            style={{
              opacity: !s.save.settings.effects
                ? 0
                : s.session?.difficulty === "hard"
                  ? 0.12
                  : s.session?.difficulty === "medium"
                    ? 0.07
                    : 0.03,
            }}
          />
          <nav className={styles.feedButtons} aria-label="Surveillance cameras">
            {FEEDS.map((f, i) => (
              <button
                key={f.label}
                aria-pressed={r.feed === i}
                onClick={() => {
                  if (i === 4) s.tutorialAdvance("camera");
                  roomAudio.unlock();
                  roomAudio.play("switch");
                  useGame.setState({
                    room: { ...useGame.getState().room, feed: i as Feed },
                  });
                }}
              >
                <span className={styles.feedNumber}>0{i + 1}</span><span>{f.label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
      {(r.view === "donut" || r.view === "vent") && (
        <Modal
          label={r.view === "donut" ? "Donut" : "Ventilation shaft"}
          onClose={exit}
        >
          <p className={styles.eyebrow}>NIGHT SHIFT NOTES</p>
          <h2>{r.view === "donut" ? "Meet Donut." : "Something above you."}</h2>
          <p>
            {r.view === "donut"
              ? "Donut drifts in his bowl. Watch his reactions when someone arrives; your results are revealed at dawn."
              : "The ladder leads to a sealed ventilation shaft. Check CAM 2 for a better look."}
          </p>
          {r.view === "vent" && (
            <button
              onClick={() => {
                s.roomView("cctv");
                useGame.setState({
                  room: { ...useGame.getState().room, feed: 1 },
                });
              }}
            >
              <ActionIcon name="camera" />View vent camera
            </button>
          )}
          <button onClick={exit}><ActionIcon name="back" />Step away</button>
        </Modal>
      )}
      {r.view === "explore" && (
        <button
          className={styles.soundToggle}
          aria-pressed={!muted}
          onClick={() => {
            roomAudio.unlock();
            s.settings({ muted: !muted });
          }}
        >
          Sound {muted ? "off" : "on"}
        </button>
      )}
    </>
  );
}

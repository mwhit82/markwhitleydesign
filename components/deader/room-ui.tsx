"use client";
import { useEffect, useState } from "react";
import { clockLabel } from "@/lib/deader/game";
import { donutMood } from "@/lib/deader/survival";
import { useGame } from "@/lib/deader/store";
import {
  FEEDS,
  newsForNight,
  broadcastDuration,
  broadcastSegment,
  type Feed,
} from "@/lib/deader/room";
import { roomAudio } from "@/lib/deader/audio/room-audio";
import { EncounterUI, VisitorQuestions } from "./encounter-ui";
import { Modal } from "./modal";
import styles from "./game.module.css";

export function RoomUI() {
  const s = useGame(),
    r = s.room;
  const [confirm, setConfirm] = useState(false);
  const muted = s.save.settings.muted;
  useEffect(() => {
    setConfirm(false);
  }, [r.view, s.panel]);
  useEffect(() => {
    if (s.panel || (!s.focused || !!s.suspension)) roomAudio.silence();
  }, [s.panel, s.focused, s.suspension]);
  const exit = () => s.roomView("explore");
  const ready = ["CLOSED", "VISITOR_WAITING", "INSPECTING"].includes(r.door);
  const active = r.encounters.active;
  const canOpen = ready && (!active || active.phase === "waiting");
  const report = newsForNight(r.night?.number ?? 1);
  const caption = broadcastSegment(report, r.newsSeconds);
  if (s.panel || r.survival.phase !== "idle" || r.night?.status === "completed")
    return null;
  return (
    <>
      <EncounterUI />
      {r.view === "explore" && (
        <div className={styles.crosshair} aria-hidden="true">
          +
        </div>
      )}
      {r.view === "door" && (
        <Modal label="Wooden door" onClose={exit}>
          <p className={styles.eyebrow}>
            THE FRONT DOOR / {r.door.replaceAll("_", " ")}
          </p>
          <h2>Who’s on the other side?</h2>
          <p>
            {r.visitorId
              ? "Someone is waiting. Inspect before deciding."
              : active?.phase === "approaching"
                ? "Footsteps on the stairs. Wait for the knock before opening."
                : "Nobody is waiting. Check the landing or test the door."}
          </p>
          <VisitorQuestions />
          {confirm ? (
            <>
              <p>
                Unhook the chain and open the door? Opening admits whoever is
                outside.
              </p>
              <div className={styles.pauseActions}>
                <button
                  onClick={() => {
                    roomAudio.unlock();
                    s.doorEvent({ type: "open-confirmed" });
                  }}
                >
                  Confirm open door
                </button>
                <button onClick={() => setConfirm(false)}>
                  Keep it closed
                </button>
              </div>
            </>
          ) : (
            <div className={styles.pauseActions}>
              <button
                disabled={!ready}
                onClick={() => s.doorEvent({ type: "inspect" })}
              >
                Look through peephole
              </button>
              <button disabled={!canOpen} onClick={() => setConfirm(true)}>
                {r.visitorId ? "LET IN…" : "Open door…"}
              </button>
              {r.visitorId && (
                <button
                  disabled={!ready}
                  onClick={() => s.doorEvent({ type: "reject" })}
                >
                  REJECT
                </button>
              )}
              {r.door === "OPEN" && (
                <button
                  onClick={() => {
                    roomAudio.unlock();
                    s.doorEvent({ type: "close" });
                  }}
                >
                  Close door
                </button>
              )}
              <button onClick={exit}>Step away</button>
            </div>
          )}
        </Modal>
      )}
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
              Step back · Esc
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
            Back to room
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
            <button onClick={() => s.roomView("news")} className={styles.newsFeed}>DDD News</button>
          </nav>
        </div>
      )}
      {r.view === "news" && (
        <section
          className={styles.news}
          data-still={s.save.settings.reducedMotion || !s.save.settings.effects}
          aria-label="DDD News broadcast"
        >
          <div className={styles.broadcastScan} aria-hidden="true" />
          <div className={styles.broadcastIdent}>
            CHANNEL 03 · NIGHT {r.night?.number ?? 1}{" "}
            <span>LOCAL SIGNAL / LIVE</span>
          </div>
          <div className={styles.newsBrand}>
            DDD <span>NEWS OFFICIAL</span>
            <small>THE FACTS. PROBABLY.</small>
          </div>
          <p className={styles.breaking}>
            BREAKING NEWS / NIGHT {r.night?.number ?? 1}
          </p>
          <div className={styles.newsGraphic} aria-hidden="true">
            <span>DDD</span>
            <i>AFTER HOURS BULLETIN</i>
            <b>{String(r.night?.number ?? 1).padStart(2, "0")}</b>
          </div>
          <h2>{caption.headline}</h2>
          <p className={styles.subtitle} aria-live="polite">
            {caption.subtitle}
          </p>
          <progress
            aria-label="Broadcast progress"
            max={broadcastDuration(report)}
            value={r.newsSeconds}
          />
          <div className={styles.newsActions}>
            <span>
              {Math.ceil(broadcastDuration(report) - r.newsSeconds)}s ·
              Subtitles on
            </span>
            {s.save.viewedBroadcasts.includes(report.id) && (
              <button onClick={s.finishNews}>Skip viewed report</button>
            )}
            <button onClick={() => s.open("pause")}>Pause broadcast</button>
          </div>
          <p className={styles.note}>
            Inspect visitors, protect your three hearts, and survive until 5:55
            AM.
          </p>
        </section>
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
              ? `Donut is ${donutMood(r.encounters.trust)}. ${r.encounters.trust === 3 ? "He drifts quietly in his bowl." : r.encounters.trust === 2 ? "He keeps turning to watch you." : "He circles impatiently. One more mistake will end your shift."}`
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
              View vent camera
            </button>
          )}
          <button onClick={exit}>Step away</button>
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

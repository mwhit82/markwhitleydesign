"use client";
import { useEffect, useState } from "react";
import { roomAudio } from "@/lib/deader/audio/room-audio";
import { storyArrivals } from "@/lib/deader/night";
import { useGame } from "@/lib/deader/store";
import { DECISION_SECONDS, QUESTIONS, encounterVisitor } from "@/lib/deader/visitors";
import styles from "./game.module.css";
export function DecisionCountdown() {
  const s = useGame(), e = s.room.encounters.active;
  if (s.tutorial || e?.phase !== "waiting") return null;
  const remaining = Math.max(0, Math.ceil(DECISION_SECONDS[s.session?.difficulty ?? "easy"] - e.elapsed));
  return <div className={styles.decisionClock} data-urgent={remaining <= 10}>
    <div><strong role="timer" aria-live="off">{remaining}<small> sec</small></strong><span>{remaining <= 10 ? "Choose now!" : "Time to choose"}</span></div>
    <progress aria-label="Time left to choose" max={DECISION_SECONDS[s.session?.difficulty ?? "easy"]} value={remaining} />
    <small>No choice in time adds one mistake.</small>
  </div>;
}
export function VisitorQuestions({ showCountdown = true }: { showCountdown?: boolean }) {
  const s = useGame(),
    e = s.room.encounters.active;
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => setExpanded(null), [e?.id]);
  if (!e || e.phase !== "waiting") return null;
  const v = encounterVisitor(e, s.session?.difficulty);
  return (
    <section className={styles.questions} aria-label="Visitor questions">
      <p className={styles.eyebrow}>ASK THROUGH THE CLOSED DOOR</p>
      {showCountdown && <DecisionCountdown />}
      {s.session?.difficulty === "easy" && (
        <p>
          Count the eyes, watch for unnatural stops, and check whether all three
          answers agree.
        </p>
      )}
      {QUESTIONS.map((q) => (
        <div key={q.id}>
          <button
            aria-expanded={expanded === q.id}
            onClick={() => {
              if (!e.asked.includes(q.id)) {
                roomAudio.unlock();
                roomAudio.play("voice");
              }
              s.askVisitor(e.id, q.id);
              setExpanded(expanded === q.id ? null : q.id);
            }}
          >
            {q.label}
          </button>
          {expanded === q.id && e.asked.includes(q.id) && <p>{v.dialogue[q.id]}</p>}
        </div>
      ))}
    </section>
  );
}
export function EncounterUI() {
  const s = useGame(),
    r = s.room,
    e = r.encounters.active,
    result = r.encounters.result;
  if (
    s.panel ||
    r.survival.phase !== "idle" ||
    (r.night?.status === "completed" || !!r.judgement)
  )
    return null;
  return (
    <>
      {!s.tutorial && !["door", "inspect"].includes(r.view) && (
        <div className={styles.encounterStatus} data-urgent={e?.phase === "waiting" || e?.phase === "approaching"}>
          <DecisionCountdown />
          {e?.phase === "approaching"
            ? "Footsteps on the stairs · Check CAM 3"
            : e?.phase === "waiting"
              ? "Knock, knock. A visitor is waiting at the door."
              : e?.phase === "departing"
                ? result?.correct && e.decision === "admit"
                  ? "Thank you. I'll be safe now."
                  : "The visitor is leaving."
                : r.door !== "CLOSED"
                  ? "Close the door to receive the next visitor."
                  : r.night?.mode === "normal" &&
                      r.encounters.sequence >= storyArrivals(r.night).length
                    ? "The stairs are quiet. Stay until 5:55 AM."
                    : "Listen for footsteps. Watch the stairs and check visitors carefully."}
        </div>
      )}
      {r.view === "inspect" && e?.phase === "waiting" && (
        <>
        <div className={styles.inspectionClock}><DecisionCountdown /></div>
        <div className={styles.inspectionQuestions}>
          <details className={styles.touchQuestions} open={!s.touchActive}><summary>Visitor questions</summary><VisitorQuestions showCountdown={false} /></details>
          <p className={styles.note}>
            Compare the answers, appearance and CCTV movement. Step back to
            decide.
          </p>
        </div></>
      )}
      {result && !["door", "inspect"].includes(r.view) && (
        <aside className={styles.outcome} aria-label="Encounter result">
          <b>
            {result.correct
              ? `Correct · +${result.coins} ${r.night?.duration === 60 ? "practice coins" : "coins"}`
              : result.decision === "timeout" ? "Time expired · +1 mistake" : "Incorrect · +1 mistake"}
          </b>
          <p>
            {result.name} was {result.kind === "human" ? "human" : "an Anomaly"}
            . {result.explanation}
          </p>
        </aside>
      )}
    </>
  );
}

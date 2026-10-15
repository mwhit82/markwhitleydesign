"use client";
import { roomAudio } from "@/lib/deader/audio/room-audio";
import { storyArrivals } from "@/lib/deader/night";
import { useGame } from "@/lib/deader/store";
import { DECISION_SECONDS, QUESTIONS, visitorForDifficulty } from "@/lib/deader/visitors";
import styles from "./game.module.css";
function DecisionCountdown() {
  const s = useGame(), e = s.room.encounters.active;
  if (e?.phase !== "waiting") return null;
  const remaining = Math.max(0, Math.ceil(DECISION_SECONDS[s.session?.difficulty ?? "easy"] - e.elapsed));
  return <div style={{ color: remaining <= 10 ? "#ffb29c" : "#ffe5a0", fontWeight: 700 }}>
    <p role="timer" aria-live="off">Decide in {remaining}s</p>
    <p>Time out: −1 trust, no coins. The door stays closed.</p>
    {remaining <= 10 && <p role="status">Time is running out — make your decision.</p>}
  </div>;
}
export function VisitorQuestions({ showCountdown = true }: { showCountdown?: boolean }) {
  const s = useGame(),
    e = s.room.encounters.active;
  if (!e || e.phase !== "waiting") return null;
  const v = visitorForDifficulty(e.visitor, s.session?.difficulty);
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
            aria-expanded={e.asked.includes(q.id)}
            onClick={() => {
              if (!e.asked.includes(q.id)) {
                roomAudio.unlock();
                roomAudio.play("voice");
              }
              s.askVisitor(e.id, q.id);
            }}
          >
            {q.label}
          </button>
          {e.asked.includes(q.id) && <p>{v.dialogue[q.id]}</p>}
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
    r.view === "news" ||
    r.survival.phase !== "idle" ||
    r.night?.status === "completed"
  )
    return null;
  return (
    <>
      {!["door", "inspect"].includes(r.view) && (
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
        <div className={styles.inspectionQuestions}>
          <DecisionCountdown />
          <details className={styles.touchQuestions} open={!s.touchActive}><summary>Visitor questions</summary><VisitorQuestions showCountdown={false} /></details>
          <p className={styles.note}>
            Compare the answers, appearance and CCTV movement. Step back to
            decide.
          </p>
        </div>
      )}
      {result && !["door", "inspect"].includes(r.view) && (
        <aside className={styles.outcome} aria-label="Encounter result">
          <b>
            {result.correct
              ? `Correct · +${result.coins} ${r.night?.duration === 60 ? "practice coins" : "coins"}`
              : result.decision === "timeout" ? "Time expired · −1 trust" : "Incorrect · −1 trust"}
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

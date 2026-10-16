"use client";
import { useEffect, useState } from "react";
import { canConfirmDoor } from "@/lib/deader/room";
import { useGame } from "@/lib/deader/store";
import { roomAudio } from "@/lib/deader/audio/room-audio";
import { DecisionCountdown, VisitorQuestions } from "./encounter-ui";
import { Modal } from "./modal";
import styles from "./game.module.css";

export function DoorMenu() {
  const s = useGame(), r = s.room, visitor = r.encounters.active;
  const [choice, setChoice] = useState<{id: string | null; admit: boolean} | null>(null);
  useEffect(() => setChoice(null), [visitor?.id, visitor?.phase, s.suspension, s.focused, s.panel]);
  const waiting = visitor?.phase === "waiting";
  const ready = ["CLOSED", "VISITOR_WAITING", "INSPECTING"].includes(r.door);
  const canOpen = ready && (!visitor || waiting);
  const pending = choice && choice.id === (visitor?.id ?? null) && canOpen;
  return <Modal label="Door choices" className={styles.doorModal} onClose={() => s.roomView("explore")}>
    <header className={styles.doorHeader}><p className={styles.eyebrow}>AT THE DOOR</p><h2>{waiting ? "What do you think?" : "Check the door."}</h2><DecisionCountdown /></header>
    <div className={styles.doorBody}>
      {waiting ? <VisitorQuestions showCountdown={false} /> : <p>{visitor?.phase === "approaching" ? "Someone is coming. Wait for the knock." : "Nobody is waiting right now."}</p>}
    </div>
    <footer className={styles.doorActions}>
      {pending ? <><p className={styles.confirmQuestion}>{choice.admit ? "Let them in?" : "Send them away?"}</p><div className={styles.decisionButtons}>
        <button className={styles.primary} onClick={() => {
          const current = useGame.getState();
          if (current.suspension || !current.focused || current.panel || !canConfirmDoor(current.room, choice.id)) return;
          setChoice(null); roomAudio.unlock(); current.doorEvent({type: choice.admit ? "open-confirmed" : "reject"});
        }}>Confirm</button><button onClick={() => setChoice(null)}>Go back</button>
      </div></> : <div className={styles.decisionButtons}>
        <button className={styles.primary} disabled={!canOpen} onClick={() => setChoice({id: visitor?.id ?? null, admit:true})}>{waiting ? "Let in" : "Open door"}</button>
        {waiting ? <button disabled={!ready} onClick={() => setChoice({id:visitor.id,admit:false})}>Send away</button> : <button disabled={r.door !== "OPEN"} onClick={() => s.doorEvent({type:"close"})}>Close door</button>}
      </div>}
      <div className={styles.doorSecondary}><button disabled={!ready} onClick={() => s.doorEvent({type:"inspect"})}>Look again</button><button onClick={() => s.roomView("explore")}>Step away</button></div>
    </footer>
  </Modal>;
}

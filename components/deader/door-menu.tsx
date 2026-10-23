"use client";
import { ActionIcon } from "./action-icon";
import { canConfirmDoor } from "@/lib/deader/room";
import { useGame } from "@/lib/deader/store";
import { roomAudio } from "@/lib/deader/audio/room-audio";
import { DecisionCountdown, VisitorQuestions } from "./encounter-ui";
import { Modal } from "./modal";
import styles from "./game.module.css";

export function DoorMenu() {
  const s = useGame(), r = s.room, visitor = r.encounters.active;
  const waiting = visitor?.phase === "waiting";
  const ready = ["CLOSED", "VISITOR_WAITING", "INSPECTING"].includes(r.door) || (waiting && r.door==="OPEN");
  const canOpen = ready && (!visitor || waiting);
  const decide=(admit:boolean)=>{
    const current=useGame.getState();
    if(current.suspension||!current.focused||current.panel||!canConfirmDoor(current.room,visitor?.id??null))return;
    roomAudio.unlock(); current.doorEvent({type:admit?'open-confirmed':'reject'});
  };
  return <Modal label="Door choices" className={styles.doorModal} onClose={() => s.roomView("explore")}>
    <header className={styles.doorHeader}><h2>{waiting ? "Answer the door" : "Check the door."}</h2><DecisionCountdown /></header>
    <div className={styles.doorBody}>
      {waiting ? <VisitorQuestions showCountdown={false} /> : <p>{visitor?.phase === "approaching" ? "Someone is coming. Wait for the knock." : "Nobody is waiting right now."}</p>}
    </div>
    <footer className={styles.doorActions}>
      <div className={styles.decisionButtons}>
        <button className={styles.admitButton} disabled={!canOpen} onClick={()=>decide(true)}><ActionIcon name={waiting?'admit':'door'} />{waiting?'Let in':'Open door'}</button>
        {waiting?<button className={styles.rejectButton} disabled={!ready} onClick={()=>decide(false)}><ActionIcon name="reject" />Send away</button>:<button disabled={r.door!=="OPEN"} onClick={()=>s.doorEvent({type:'close'})}><ActionIcon name="door" />Close door</button>}
      </div>
      {waiting && r.weapon.collected && !s.tutorial && <button onClick={s.aimDoor}><ActionIcon name="door" />Open doorway to aim · does not admit</button>}
      <div className={styles.doorSecondary}><button disabled={!ready} onClick={() => s.doorEvent({type:"inspect"})}><ActionIcon name="inspect" />Look again</button><button onClick={() => s.roomView("explore")}><ActionIcon name="back" />Step away</button></div>
    </footer>
  </Modal>;
}

"use client";
import { ActionIcon } from "./action-icon";
import { useGame } from "@/lib/deader/store";
import { Modal } from "./modal";
import { DecisionCountdown } from "./encounter-ui";
import styles from "./game.module.css";
export function ConsoleUI() {
    const s = useGame(), e = s.room.encounters.active;
    const unavailable = !!e && e.phase !== "approaching";
    return <Modal focusDialog label="CCTV console" onClose={() => s.roomView('explore')}>
    <DecisionCountdown /><h2>{e?.phase === 'waiting' ? 'Someone’s at the door.' : 'Keep an eye out.'}</h2>
    {e?.phase === 'waiting' && <button onClick={() => s.doorEvent({ type: 'inspect' })}><ActionIcon name="admit" />Answer the door</button>}
    <div className={styles.consoleChoices}>
      <button onClick={() => s.roomView('cctv')}><strong><ActionIcon name="camera" />View cameras</strong><span>Six live views of the building</span></button>
      <button disabled={unavailable || !!s.tutorial} onClick={() => s.roomView('arcade')}><strong><ActionIcon name="play" />{s.arcade?.status === 'running' ? 'Resume Impossible Shift' : 'Play Impossible Shift'}</strong><span>{unavailable ? 'Available after this visitor' : s.tutorial ? 'Available during a real shift' : 'Jump the spikes. Your night keeps running.'}</span></button>
    </div><button onClick={() => s.roomView('explore')}><ActionIcon name="back" />Back to room</button>
  </Modal>;
}

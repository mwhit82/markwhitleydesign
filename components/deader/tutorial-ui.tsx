"use client";
import { useGame } from '@/lib/deader/store';
import { tutorialCopy } from '@/lib/deader/tutorial';
import { Modal } from './modal';
import styles from './game.module.css';
export function TutorialUI() {
    const s = useGame();
    if (s.panel === 'tutorial')
        return <Modal label="Learn to play"><p className={styles.eyebrow}>NIGHT SHIFT TRAINING</p><h2>Let’s practise together.</h2><p>Learn to move, investigate and answer the door. No timer, lost hearts or jumpscares. Leave whenever you like.</p><button onClick={s.beginTutorial}>Start guided practice</button><button onClick={() => s.open(null)}>Back to lobby</button></Modal>;
    if (!s.tutorial || s.panel || ["fridge", "oven", "console", "door", "donut", "vent"].includes(s.room.view))
        return null;
    const copy = tutorialCopy[s.tutorial];
    return <aside className={styles.tutorialGuide} aria-label="Guided practice"><div aria-live="polite"><small>SAFE PRACTICE</small><h2>{copy.title}</h2><p>{s.tutorialMessage ?? copy.body}</p></div><button onClick={s.lobby}>{s.tutorial === 'finish' ? 'Finish · Back to lobby' : 'Exit tutorial'}</button></aside>;
}

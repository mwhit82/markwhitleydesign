"use client";
import { ActionIcon } from "./action-icon";
import { useGame } from '@/lib/deader/store';
import { kitchenMessage, needWarning, showNeeds } from '@/lib/deader/kitchen';
import { Modal } from './modal';
import styles from './game.module.css';
export function KitchenUI(){
 const s=useGame(),k=s.room.kitchen;
 if(!s.room.night&&!s.tutorial)return null;
 return <>
 {k.failure==='fire'&&<div className={styles.kitchenFire} role="alert"><h2>FIRE</h2><p>The oven was left burning.</p></div>}
 {showNeeds(s.room.view)&&!s.panel&&!s.suspension&&<div className={styles.kitchenStatus}>
  {(['hunger','thirst'] as const).map(kind=><div className={styles.needMeter} key={kind} data-low={k[kind]<=50} data-urgent={k[kind]<=25}>
   <span>{kind==='hunger'?'Hunger':'Thirst'}</span><b>{Math.ceil(k[kind])}%</b>
   <meter aria-label={kind==='hunger'?'Hunger':'Thirst'} min={0} max={100} value={k[kind]}/>
   <small role="status">{needWarning(k[kind],kind)||'\u00a0'}</small>
  </div>)}
  <strong>{k.oven!=='off'?kitchenMessage(k):'\u00a0'}</strong>
 </div>}

 {(s.room.view==='fridge'||s.room.view==='oven')&&<Modal label={s.room.view==='fridge'?'Fridge':'Oven'} onClose={()=>s.roomView('explore')}>
  <h2>{s.room.view==='fridge'?'Fridge':'Oven'}</h2>
  <p>{s.room.view==='fridge'?'Free supplies. Take a meal to cook, or drink here.':kitchenMessage(k)}</p>
  <div className={styles.pauseActions}>
   {s.room.view==='fridge'?<><button disabled={k.food} onClick={()=>s.useKitchen('food')}><ActionIcon name="food" />{k.food?'Carrying food':'Take food'}</button><button disabled={k.thirst>=100} onClick={()=>s.useKitchen('drink')}><ActionIcon name="drink" />Drink</button></>:<>
    {k.oven==='off'&&<button disabled={!k.food} onClick={()=>s.useKitchen('cook')}><ActionIcon name="cook" />{k.food?'Start cooking · 20 seconds':'Get food from the fridge first'}</button>}
    {k.oven==='ready'&&<button onClick={()=>s.useKitchen('eat')}><ActionIcon name="food" />Collect and eat</button>}
    {k.oven!=='off'&&<button onClick={()=>s.useKitchen('off')}><ActionIcon name="power" />Switch off · discard food</button>}
   </>}
   <button onClick={()=>s.roomView('explore')}><ActionIcon name="back" />Back to room</button>
  </div>
 </Modal>}
 </>;
}

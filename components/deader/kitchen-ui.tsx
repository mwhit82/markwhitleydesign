"use client";
import { useGame } from '@/lib/deader/store';
import { kitchenMessage } from '@/lib/deader/kitchen';
import { Modal } from './modal';
import styles from './game.module.css';
export function KitchenUI(){
 const s=useGame(),k=s.room.kitchen;
 if(!s.room.night&&!s.tutorial)return null;
 return <>
 {k.failure==='fire'&&<div className={styles.kitchenFire} role="alert"><h2>FIRE</h2><p>The oven was left burning.</p></div>}
 <div className={styles.kitchenStatus} role="status">
  <span data-low={k.hunger<=25}>Hunger {Math.ceil(k.hunger)}%{k.hunger<=10?' — EAT NOW':k.hunger<=25?' — eat soon':''}<meter aria-label="Hunger" min={0} max={100} value={k.hunger}/></span>
  <span data-low={k.thirst<=25}>Thirst {Math.ceil(k.thirst)}%{k.thirst<=10?' — DRINK NOW':k.thirst<=25?' — drink soon':''}<meter aria-label="Thirst" min={0} max={100} value={k.thirst}/></span>
  {k.oven!=='off'&&<strong>{kitchenMessage(k)}</strong>}
 </div>
 {(s.room.view==='fridge'||s.room.view==='oven')&&<Modal label={s.room.view==='fridge'?'Fridge':'Oven'} onClose={()=>s.roomView('explore')}>
  <h2>{s.room.view==='fridge'?'Fridge':'Oven'}</h2>
  <p>{s.room.view==='fridge'?'Free supplies. Take a meal to cook, or drink here.':kitchenMessage(k)}</p>
  <div className={styles.pauseActions}>
   {s.room.view==='fridge'?<><button disabled={k.food} onClick={()=>s.useKitchen('food')}>{k.food?'Carrying food':'Take food'}</button><button disabled={k.thirst>=100} onClick={()=>s.useKitchen('drink')}>Drink</button></>:<>
    {k.oven==='off'&&<button disabled={!k.food} onClick={()=>s.useKitchen('cook')}>{k.food?'Start cooking · 20 seconds':'Get food from the fridge first'}</button>}
    {k.oven==='ready'&&<button onClick={()=>s.useKitchen('eat')}>Collect and eat</button>}
    {k.oven!=='off'&&<button onClick={()=>s.useKitchen('off')}>Switch off · discard food</button>}
   </>}
   <button onClick={()=>s.roomView('explore')}>Back to room</button>
  </div>
 </Modal>}
 </>;
}

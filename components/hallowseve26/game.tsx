'use client';

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import World from './world';
import { ChristmasAudio } from './audio';
import { CATALOG, SAVE_KEY, buildingAt, canAfford, cheerBurst, demolish, loadGame, moveSanta, newGame, onIsland, place, placementError, restoreShrine, saveGame, startNight, tick, upgrade, upgradeCost, type Game, type Kind, type Point } from './simulation';
import styles from './game.module.css';

const buildKinds:Kind[]=['wall','gate','workshop','nutcracker','snowglobe','jackbox'];
const symbols:Record<Kind,string>={hearth:'✧',wall:'▥',gate:'⊓',workshop:'⌂',nutcracker:'♜',snowglobe:'❄',jackbox:'✦'};
const formatTime=(seconds:number)=>`${Math.floor(Math.max(0,seconds)/60)}:${String(Math.floor(Math.max(0,seconds)%60)).padStart(2,'0')}`;
const price=(cost:{wood:number;stone:number;toys:number})=>`${cost.wood} wood · ${cost.stone} stone${cost.toys?` · ${cost.toys} toys`:''}`;
class WorldBoundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false};static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div className={styles.graphicsError}><h2>The diorama could not open</h2><p>This game needs a browser with WebGL enabled. Try refreshing or opening it in another browser.</p><Link href="/">Return to the portfolio</Link></div>:this.props.children;}
}

export default function GameView(){
  const game=useRef<Game>(newGame());const [g,setGame]=useState<Game>(game.current);
  const [screen,setScreen]=useState<'title'|'playing'>('title');const [paused,setPaused]=useState(false);
  const [saved,setSaved]=useState<Game|null>(null);const [build,setBuild]=useState<Kind|null>(null);const [hover,setHover]=useState<Point|null>(null);const [rotation,setRotation]=useState(0);
  const [placementLocked,setPlacementLocked]=useState(false);
  const [selection,setSelection]=useState<number|null>(null);const [focus,setFocus]=useState(0);const [tray,setTray]=useState(false);const [expedition,setExpedition]=useState(false);
  const [confirm,setConfirm]=useState<'new'|'night'|null>(null);const [muted,setMuted]=useState(false);const [reduced,setReduced]=useState(false);const [help,setHelp]=useState(false);const [storageNote,setStorageNote]=useState('');
  const audio=useRef<ChristmasAudio|null>(null);
  const refresh=useCallback(()=>setGame({...game.current}),[]);
  const persist=useCallback(()=>{
    try{localStorage.setItem(SAVE_KEY,saveGame(game.current));setSaved(loadGame(saveGame(game.current)));setStorageNote('Progress saved on this device.');}
    catch{setStorageNote('This browser could not save. Keep this tab open to continue your run.');}
  },[]);
  useEffect(()=>{
    audio.current=new ChristmasAudio();
    try{const raw=localStorage.getItem(SAVE_KEY);if(raw){const restored=loadGame(raw);setSaved(restored);if(!restored)setStorageNote('The previous save could not be read. Start a new expedition.');}setMuted(localStorage.getItem('hallowseve26-muted')==='true');}catch{setStorageNote('Device saving is unavailable in this browser.');}
    const media=matchMedia('(prefers-reduced-motion: reduce)');setReduced(media.matches);const update=()=>setReduced(media.matches);media.addEventListener('change',update);
    return()=>{audio.current?.close();media.removeEventListener('change',update);};
  },[]);
  useEffect(()=>{if(audio.current)audio.current.muted=muted;try{localStorage.setItem('hallowseve26-muted',String(muted));}catch{}},[muted]);
  useEffect(()=>{
    if(screen!=='playing'||paused||help||confirm)return;
    let last=performance.now(),accumulator=0,ui=0,frame=0;
    const loop=(now:number)=>{
      accumulator+=Math.min(.2,(now-last)/1000);last=now;
      while(accumulator>=.05){const oldDay=game.current.day,oldPhase=game.current.phase;tick(game.current,.05);accumulator-=.05;
        if(game.current.day!==oldDay||(oldPhase!==game.current.phase&&['won','lost'].includes(game.current.phase)))persist();
      }
      if(now-ui>=100){refresh();ui=now;}
      frame=requestAnimationFrame(loop);
    };
    frame=requestAnimationFrame(loop);return()=>cancelAnimationFrame(frame);
  },[screen,paused,help,confirm,persist,refresh]);
  useEffect(()=>{
    const visibility=()=>{if(document.hidden&&screen==='playing'){setPaused(true);persist();audio.current?.suspend();}};
    document.addEventListener('visibilitychange',visibility);return()=>document.removeEventListener('visibilitychange',visibility);
  },[screen,persist]);
  useEffect(()=>{
    if(screen!=='playing'||paused||help||confirm||g.phase==='won'||g.phase==='lost')return;
    let note=0;const notes=[523.25,659.25,783.99,659.25,587.33,523.25];
    const timer=setInterval(()=>{const night=game.current.phase==='night';audio.current?.tone(night?[65.41,77.78,73.42][note%3]:notes[note%notes.length],night?2.5:1.4,night);note++;},3200);
    return()=>clearInterval(timer);
  },[screen,paused,help,confirm,g.phase]);
  const pause=useCallback(()=>{setPaused(p=>{if(!p)persist();else void audio.current?.start();return !p;});},[persist]);
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if((e.target as HTMLElement).matches('button,input,select,textarea')&&e.code==='Space')return;
      if(screen!=='playing')return;
      if(e.code==='Escape'){if(confirm)setConfirm(null);else if(help)setHelp(false);else if(build){setBuild(null);setHover(null);}else{setSelection(null);pause();}}
      if(e.code==='Space'){e.preventDefault();if(!help&&!confirm)pause();}
      if(e.code==='KeyR'&&build)setRotation(r=>(r+1)%4);
    };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[screen,build,pause,help,confirm]);
  const begin=(resume:boolean)=>{
    game.current=resume&&saved?loadGame(saveGame(saved))!:newGame();refresh();setScreen('playing');setPaused(false);setConfirm(null);setBuild(null);setHover(null);setSelection(null);setExpedition(false);setTray(false);setFocus(f=>f+1);void audio.current?.start();
    if(!resume)persist();
  };
  const onTile=(p:Point)=>{
    if(screen!=='playing'||paused||help||confirm||!onIsland(p.x,p.z)||g.phase==='won'||g.phase==='lost')return;
    if(build){setHover(p);setPlacementLocked(true);return;}
    const b=buildingAt(game.current,p.x,p.z);if(b){setSelection(b.id);setExpedition(false);return;}
    const shrine=game.current.shrines.find(s=>Math.hypot(s.x-p.x,s.z-p.z)<1.5);
    if(shrine){restoreShrine(game.current,shrine.id);setSelection(null);refresh();return;}
    setSelection(null);moveSanta(game.current,p);refresh();
  };
  const selected=g.buildings.find(b=>b.id===selection);
  const hearth=g.buildings.find(b=>b.kind==='hearth')!;
  const night=g.phase==='night';const ended=g.phase==='won'||g.phase==='lost';
  const shrineCount=g.shrines.filter(s=>s.restored).length;
  const placementIssue=build&&hover?placementError(g,build,hover.x,hover.z):'';
  const chooseBuild=(kind:Kind)=>{setPlacementLocked(false);setBuild(kind);setHover(null);setSelection(null);setExpedition(false);setTray(false);};
  const doPlace=()=>{if(build&&hover){if(place(game.current,build,hover.x,hover.z,rotation)){setHover(null);setPlacementLocked(false);}refresh();}};
  return <div className={styles.game} data-night={night||g.phase==='lost'} data-screen={screen}>
    <div className={styles.canvas}><WorldBoundary><World g={g} build={build} hover={hover} rotation={rotation} onHover={p=>{if(build&&!placementLocked)setHover(old=>old?.x===p.x&&old?.z===p.z?old:p);}} onTile={onTile} focus={focus} reduced={reduced}/></WorldBoundary></div>
    <div className={styles.vignette}/>
    {screen==='title'?<div className={styles.titleScreen}>
      <Link className={styles.back} href="/">↖ Mark Whitley / Playground</Link>
      <section className={styles.titleCard}>
        <p className={styles.eyebrow}>A winter siege in twelve nights</p>
        <h1>HALLOWS<span>EVE<span className={styles.year}>26</span></span></h1>
        <div className={styles.titleRule}/>
        <h2>Keep the Christmas flame alive.</h2>
        <p>Build with your elves. Wake the old shrines. Turn toys into an army. When the sun falls, Halloween comes for your castle.</p>
        <div className={styles.titleActions}>
          {saved&&!['won','lost'].includes(saved.phase)&&<button className={styles.primary} onClick={()=>begin(true)}>Continue · night {saved.day} <span>↗</span></button>}
          <button className={saved&&!['won','lost'].includes(saved.phase)?styles.secondary:styles.primary} onClick={()=>saved?setConfirm('new'):begin(false)}>Begin a new Christmas <span>↗</span></button>
        </div>
        <p className={styles.fine}>12 nights · 30–45 minutes · saves on this device</p>
        {storageNote&&<p className={styles.fine}>{storageNote}</p>}
      </section>
      <div className={styles.titleCaption}><span className={styles.dot}/> THE NORTHLANDS <span>Five biomes. One last light.</span></div>
    </div>:<>
      <header className={styles.hud}>
        <div className={styles.brand}><Link href="/" aria-label="Return to portfolio" onClick={persist}>H<span>26</span></Link><div><strong>HallowsEve26</strong><span>{night?'The long dark':'The Northlands'}</span></div></div>
        <div className={styles.calendar}><span>{g.phase==='won'?'December 25':`December ${12+g.day}`}</span><strong>{night?'☾ Nightfall':'☀ Daylight'} <i>{night?`${g.enemies.length+g.pending.length} attackers`:formatTime(g.time)}</i></strong><div className={styles.dayTrack}>{Array.from({length:12},(_,i)=><b key={i} data-complete={i<g.day-1} data-current={i===g.day-1}/>)}</div></div>
        <div className={styles.resources} aria-label="Materials"><div><span>WOOD</span><strong>{Math.floor(g.stock.wood)}</strong></div><div><span>STONE</span><strong>{Math.floor(g.stock.stone)}</strong></div><div><span>TOY PARTS</span><strong>{Math.floor(g.stock.toys)}</strong></div></div>
        <button className={styles.iconButton} onClick={pause} aria-label="Pause game">Ⅱ</button>
      </header>
      <div className={styles.leftRail}>
        <section className={styles.hearthPanel}><div><span>✧ CHRISTMAS HEARTH</span><strong>{Math.max(0,Math.ceil(hearth.hp/hearth.maxHp*100))}%</strong></div><div className={styles.healthTrack}><i style={{width:`${Math.max(0,hearth.hp/hearth.maxHp*100)}%`}}/></div><p>{g.elves.length} elves <span>·</span> {shrineCount}/4 shrines restored</p></section>
        <button className={styles.railButton} onClick={()=>{setExpedition(v=>!v);setSelection(null);setBuild(null);}}>✧ Grow Christmas <span>↗</span></button>
        {!night&&!ended&&<button className={styles.railButton} onClick={()=>setConfirm('night')}>☾ Ready for night {g.day} <span>→</span></button>}
        {g.day===1&&!night&&<div className={styles.firstLight}><span>YOUR FIRST DAY</span><p>{g.buildings.some(b=>b.kind==='workshop')?'✓':'1.'} Build a toy workshop</p><p>{g.buildings.filter(b=>b.kind==='nutcracker').length>=2?'✓':'2.'} Place two nutcracker towers</p><p>{shrineCount?'✓':'3.'} Send Santa to a shrine</p></div>}
      </div>
      {g.messageTime>0&&!ended&&<div className={styles.toast} role="status">{g.message}</div>}
      {expedition&&<aside className={styles.detail}>
        <button className={styles.close} onClick={()=>setExpedition(false)} aria-label="Close shrines">×</button>
        <p className={styles.eyebrow}>Spread the light</p><h2>The old shrines</h2><p>Send Santa by daylight. Each restored shrine welcomes two elves and adds 20% to toy production.</p>
        <p className={styles.readout}>{g.elves.filter(e=>e.job==='Building').length} building · {g.elves.filter(e=>e.job==='Making toys').length} making toys · {g.elves.filter(e=>e.job.startsWith('Gathering')||e.job.startsWith('Quarrying')).length} gathering</p>
        {g.shrines.map(s=><button key={s.id} className={styles.shrineButton} disabled={s.restored||night} onClick={()=>{restoreShrine(game.current,s.id);refresh();}}><span>{s.restored?'✧':'◇'} {s.name}</span><small>{s.restored?'Restored':g.santa.shrineId===s.id?`Santa is on his way${s.progress?` · ${Math.floor(s.progress/4*100)}%`:''}`:'Send Santa →'}</small></button>)}
      </aside>}
      {selected&&!build&&<aside className={styles.detail}>
        <button className={styles.close} onClick={()=>setSelection(null)} aria-label="Close building details">×</button>
        <p className={styles.eyebrow}>{selected.progress<1?'Under construction':`Level ${selected.level}`}</p><h2>{CATALOG[selected.kind].name}</h2><p>{CATALOG[selected.kind].description}</p>
        <p className={styles.readout}>{Math.ceil(selected.hp)} / {Math.ceil(selected.maxHp)} health{selected.progress<1?` · ${Math.floor(selected.progress*100)}% built`:''}</p>
        {selected.kind!=='hearth'&&<><button className={styles.primary} disabled={night||selected.level>=2||selected.progress<1||!canAfford(g,upgradeCost(selected))} onClick={()=>{upgrade(game.current,selected.id);refresh();}}>{selected.level>=2?'Fully upgraded':'Upgrade'} <span>↑</span></button>{selected.level<2&&<p className={styles.fine}>{price(upgradeCost(selected))}{selected.kind==='workshop'?' · needs clear 3×3 space':''}</p>}
        <button className={styles.textButton} disabled={night} onClick={()=>{demolish(game.current,selected.id);setSelection(null);refresh();}}>Remove · recover 50% materials</button></>}
      </aside>}
      <div className={styles.cameraTools}><button onClick={()=>setFocus(f=>f+1)} aria-label="Centre camera on Santa">◎ <span>Santa</span></button><button onClick={()=>{setHelp(true);persist();}} aria-label="How to play">?</button><button onClick={()=>{setMuted(v=>!v);void audio.current?.start();}} aria-label={muted?'Unmute sound':'Mute sound'}>{muted?'♪ Off':'♪ On'}</button></div>
      <div className={styles.santaBar}><span>Santa {g.santa.recovering>0?`· recovering ${Math.ceil(g.santa.recovering)}s`:`· ${Math.ceil(g.santa.hp)} / 160`}</span><button disabled={!night||g.santa.burst>0||g.santa.recovering>0} onClick={()=>{cheerBurst(game.current);audio.current?.tone(880,.8);refresh();}}>✧ {g.santa.burst>0?`Cheer in ${Math.ceil(g.santa.burst)}s`:'Christmas cheer'}</button></div>
      {build?<section className={styles.placement}>
        <div><span className={styles.eyebrow}>Place {CATALOG[build].name}</span><p>{hover?(placementIssue||price(CATALOG[build].cost)):'Tap an open tile. Drag to pan; pinch or scroll to zoom.'}</p></div>
        <div className={styles.placementActions}><button className={styles.secondary} onClick={()=>setRotation(r=>(r+1)%4)}>Rotate {rotation*90}°</button><button className={styles.primary} disabled={!hover||!!placementIssue||!canAfford(g,CATALOG[build].cost)} onClick={doPlace}>Build</button><button className={styles.iconButton} onClick={()=>{setBuild(null);setHover(null);}} aria-label="Cancel building">×</button></div>
      </section>:<>
        <button className={styles.mobileBuild} disabled={night||ended} onClick={()=>setTray(v=>!v)}>{tray?'Close build menu':'＋ Build your castle'}</button>
        <section className={`${styles.buildTray} ${tray?styles.trayOpen:''}`} aria-label="Build menu">
          <div className={styles.trayLabel}><span>{night?'HOLD THE LINE':'BUILD & PREPARE'}</span><small>{night?'Construction resumes at dawn':'Elves build automatically'}</small></div>
          <div className={styles.buildItems}>{buildKinds.map(kind=><button key={kind} disabled={night||ended||!canAfford(g,CATALOG[kind].cost)} onClick={()=>chooseBuild(kind)} title={`${CATALOG[kind].description} ${price(CATALOG[kind].cost)}`}><span className={styles.buildSymbol}>{symbols[kind]}</span><strong>{CATALOG[kind].name}</strong><small>{price(CATALOG[kind].cost)}</small></button>)}</div>
        </section>
      </>}
    </>}
    {paused&&!ended&&screen==='playing'&&<div className={styles.scrim}><section className={styles.modal}><p className={styles.eyebrow}>A moment by the fire</p><h2>Christmas can wait.</h2><p>{storageNote}</p><button className={styles.primary} onClick={pause}>Return to the Northlands →</button><button className={styles.secondary} onClick={()=>setConfirm('new')}>Start a new campaign</button><button className={styles.textButton} onClick={()=>{persist();setScreen('title');setPaused(false);}}>Save & return to title</button></section></div>}
    {help&&<div className={styles.scrim}><section className={styles.modal}><p className={styles.eyebrow}>Field notes</p><h2>Make it to Christmas.</h2><ol><li><strong>By day:</strong> build a workshop and two nutcracker towers near the Hearth. Elves gather, construct, repair, and make toy parts automatically.</li><li><strong>Grow:</strong> send Santa to the four shrines. Each brings two elves and more productive workshops.</li><li><strong>Fortify:</strong> add walls with gates, upgrade towers, and expand workshops to 3×3 factories.</li><li><strong>By night:</strong> towers and Santa fight automatically. Use Christmas cheer near your castle to heal structures and strike attackers.</li></ol><p>Tap ground to move Santa; tap buildings to inspect. Drag to pan. Pinch or scroll to zoom. Space pauses; Escape cancels; R rotates.</p><p>Keep the Hearth alive through twelve nights. The Pumpkin King arrives on Christmas Eve.</p><button className={styles.primary} onClick={()=>setHelp(false)}>Back to the world →</button></section></div>}
    {confirm&&<div className={styles.scrim}><section className={styles.modal}><p className={styles.eyebrow}>{confirm==='new'?'A fresh beginning':'The sun is setting'}</p><h2>{confirm==='new'?'Start a new Christmas?':`Call in night ${g.day}?`}</h2><p>{confirm==='new'?'This replaces the campaign saved on this device.':'Construction and gathering stop at night. Make sure your workshops and defences are ready.'}</p><button className={styles.primary} onClick={()=>{if(confirm==='new')begin(false);else{startNight(game.current);setBuild(null);setHover(null);setConfirm(null);refresh();}}}>{confirm==='new'?'Start new campaign':'Light the lanterns →'}</button><button className={styles.secondary} onClick={()=>setConfirm(null)}>Keep playing</button></section></div>}
    {ended&&screen==='playing'&&<div className={styles.scrim}><section className={styles.modal}><p className={styles.eyebrow}>{g.phase==='won'?'December 25 · Christmas morning':'The last lantern'}</p><h2>{g.phase==='won'?'The light endured.':'Christmas fell silent.'}</h2><p>{g.phase==='won'?'The Pumpkin King has fallen. Your elves gather around the Hearth as Christmas dawn breaks over the Northlands.':'Halloween extinguished the Hearth. A stronger castle, more followers, and a little Christmas cheer may turn the next siege.'}</p><div className={styles.results}><div><strong>{g.phase==='won'?12:g.day-1}</strong><span>Nights survived</span></div><div><strong>{g.kills}</strong><span>Raiders defeated</span></div><div><strong>{g.elves.length}</strong><span>Christmas followers</span></div></div><button className={styles.primary} onClick={()=>begin(false)}>Build a new Christmas →</button><Link className={styles.textButton} href="/">Return to portfolio</Link></section></div>}
  </div>;
}

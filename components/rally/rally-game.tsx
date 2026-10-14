/* eslint-disable @next/next/no-img-element -- Locally captured, pre-sized WebP previews need no image service. */
"use client";
import {stageVehicle,hasCodriver} from './stages';
import {useModalViewport,useModalIsolation} from "./modal-viewport";
import {PreparationBar} from './preparation-bar';
import {SelectionCard} from "./selection-card";
import {previewImage} from "./preview-manifest";
import {HudStore,HudRead} from "./hud-store";
import {FriendRaces} from "./friend-races";
import { useEffect, useRef, useState } from "react";


import {defaultControls,readControls,currentHaptics,testHaptics,type HapticCapability,type ControlSettings} from "./controls";
import {Standings} from "./standings";
import { cars, formatTime, type Mode } from "./data";
import styles from "./rally.module.css";
import { boardKey, isCircuit, lapCount, routeLength, stages, initialStage, stageDefinition, trackName, trackNames, trackNumber, weatherNames, stageTimes, timeNames, timeOfDay, type TimeOfDay, type StageSelection, type Weather } from "./stages";
import { Leaderboard, type RaceResult } from "./leaderboard";
import { HudIcon } from "./ui";
import { reasonText, type CheckpointNotice, type RunReason } from "./checkpoints";
import type { GhostSource } from "./replay";
export function RallyGame({immersive=false}:{immersive?:boolean}={}) {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<HTMLDivElement>(null);
  const hadNativeFullscreen = useRef(false);
  const [nativeFullscreen,setNativeFullscreen]=useState(false);
  useModalViewport(game);useModalIsolation(game);
  const [inRoom,setInRoom]=useState(false);
  const [preparing,setPreparing]=useState("");
  const [friendsOpen,setFriendsOpen]=useState(0);
  const [driverView,setDriverView]=useState(false);
  const toggleCamera=()=>{api.current?.toggleCamera();setDriverView(api.current?.driverCamera.enabled??false);};
  const [codriver,setCodriver]=useState(true);
  const [subtitle,setSubtitle]=useState("");
  const [hapticSupport,setHapticSupport]=useState<HapticCapability>('unavailable');
  const [hapticMessage,setHapticMessage]=useState("");
  const toggleCodriver=()=>{api.current?.toggleCodriver();setCodriver(api.current?.codriverEnabled??true);};
  useEffect(()=>{const refresh=()=>setHapticSupport(currentHaptics());refresh();const timer=window.setInterval(refresh,1000);return ()=>window.clearInterval(timer);},[]);
  const [expanded, setExpanded] = useState(immersive);
  const [installHelp, setInstallHelp] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [audioPlaying,setAudioPlaying]=useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const api = useRef<import("./world").RallyWorld | null>(null);
  const [selected, setSelected] = useState(0);
  const [selection, setSelection] = useState<StageSelection>({...initialStage});
  const [allBoards,setAllBoards]=useState(false);
  const [settingsPanel,setSettingsPanel]=useState(false);
  const [setupPanel,setSetupPanel]=useState(false);
  const [controls,setControls]=useState<ControlSettings>({...defaultControls});
  useEffect(()=>{try{setControls(readControls(JSON.parse(localStorage.getItem("rally-controls")||"null")));}catch{}},[]);
  useEffect(()=>{if(api.current)api.current.controls=controls;try{localStorage.setItem("rally-controls",JSON.stringify(controls));}catch{}},[controls]);
  const [leaderboard, setLeaderboard] = useState(false);
  const [result, setResult] = useState<RaceResult|null>(null);
  const run = useRef<Promise<string|null>>(Promise.resolve(null));
  const [mode, setMode] = useState<Mode>("garage");
  const [ghostSource,setGhostSource]=useState<GhostSource>("personal");
  const [ghostStatus,setGhostStatus]=useState("");
  const [ghostShown,setGhostShown]=useState(true);
  const [ready, setReady] = useState(false);
  useEffect(()=>{if(!ready||mode!=='garage')return;const timer=setTimeout(()=>void api.current?.prepareRace(),200);return()=>clearTimeout(timer);},[ready,selected,selection,ghostSource,mode]);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [replayEnabled,setReplayEnabled]=useState(true);
  const [graphics,setGraphics]=useState<'auto'|'high'|'low'>('high');
  const changeGraphics=()=>{const next=graphics==='auto'?'high':graphics==='high'?'low':'auto';setGraphics(next);api.current?.setGraphics(next);};
  const [screenWeather,setScreenWeather]=useState(true);
  useEffect(()=>{try{setScreenWeather(localStorage.getItem("rally-screen-weather")!=="off");}catch{}},[]);
  const toggleScreenWeather=()=>{setScreenWeather(on=>{try{localStorage.setItem("rally-screen-weather",on?"off":"on");}catch{}return !on;});};
  const [checkpointNotices,setCheckpointNotices]=useState<CheckpointNotice[]>([]);
  const [practice,setPractice]=useState<RunReason[]>([]);
  const [optionPanel,setOptionPanel]=useState<'stage'|'weather'|'direction'|'ghost'|'time'|'track'|'laps'|null>(null);
  const optionOpener=useRef<HTMLButtonElement|null>(null);
  const menuAction=useRef<(action:'next'|'previous'|'activate'|'back')=>void>(()=>{});
  const hud=useRef(new HudStore()).current;
  const stats=hud.value;
  const [best, setBest] = useState<number | null>(null);
  useEffect(() => {
    const surface = game.current;
    if (!surface) return;
    // Native non-passive touch events cancel iOS long-press selection early.
    // Limit cancellation to held driving controls so normal menu taps still work.
    const preventHold = (event: TouchEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest("[data-driving-control]")) return;
      if (event.cancelable) event.preventDefault();
      window.getSelection()?.removeAllRanges();
    };
    const preventSelection = (event: Event) => event.preventDefault();
    surface.addEventListener("touchstart", preventHold, { passive: false });
    surface.addEventListener("touchmove", preventHold, { passive: false });
    surface.addEventListener("selectstart", preventSelection);
    return () => {
      surface.removeEventListener("touchstart", preventHold);
      surface.removeEventListener("touchmove", preventHold);
      surface.removeEventListener("selectstart", preventSelection);
    };
  }, []);
  useEffect(() => {
    let disposed = false;
    import("./world")
      .then(({ RallyWorld }) => {
        if (disposed || !host.current) return;
        api.current = new RallyWorld(host.current, {
          preparation:setPreparing,
          subtitle:setSubtitle,
          stats: hud.set,
          start: () => {
            setLeaderboard(false);setResult(null);
            const world=api.current;
            run.current=fetch('/api/rally/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({selection:world?.selection,car:world?.selected})}).then(async response=>response.ok?(await response.json()).run:null).catch(()=>null);
          },
          finish: (time,trace,replay,eligibility) => setResult({time,trace,replay,...eligibility,penalty:api.current?.recoveryPenalty??0,run:run.current}),
          checkpoints:setCheckpointNotices,
          practice:setPractice,
          menu:action=>menuAction.current(action),
          ghost: setGhostStatus,
          ghostVisibility: setGhostShown,
          mode: setMode,
          pad: setNotice,
          select: setSelected,
          best: setBest,
          audioPlayback:setAudioPlaying,
          audioError: () => setNotice("Sound couldn't start. Tap again to retry."),
        });
        try{api.current.controls=readControls(JSON.parse(localStorage.getItem("rally-controls")||"null"));}catch{}
        setGhostSource(api.current.ghostSource);setSelection({...api.current.selection});
        setCodriver(api.current.codriverEnabled);setDriverView(api.current.driverCamera.enabled);
        setMuted(api.current.muted);setReplayEnabled(api.current.replayEnabled);
        setGraphics(api.current.miniature.graphics);
        setReady(true);
      })
      .catch(() =>
        setError(
          "The 3D stage could not load. Please try a browser with WebGL enabled.",
        ),
      );
    return () => {
      disposed = true;
      api.current?.dispose();
      api.current = null;
    };
  }, [hud]);
  useEffect(() => {
    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setStandalone(installed);
    if (installed) setExpanded(true);
  }, []);
  useEffect(() => {
    const changed = () => {
      setNativeFullscreen(document.fullscreenElement === game.current);
      if (document.fullscreenElement === game.current) {
        hadNativeFullscreen.current = true;
        setExpanded(true);
      } else if (hadNativeFullscreen.current) {
        hadNativeFullscreen.current = false;
        setExpanded(true);
      }
    };
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;

    };
  }, [expanded]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 6500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const toggleFullscreen = async () => {
    if (document.fullscreenElement === game.current) {
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          setNotice("Use your browser’s fullscreen exit control.");
          return;
        }
      }
      setExpanded(true);
      return;
    }
    // Expanded layout is also the fallback on browsers without native fullscreen.
    setExpanded(true);
    if (game.current?.requestFullscreen && document.fullscreenEnabled) {
      try {
        await game.current.requestFullscreen();
        return;
      } catch {
        /* Keep the expanded layout. */
      }
    }
    api.current?.blur();
    setInstallHelp(true);
  };
  const toggleSound = async () => {
    if (!api.current) return;
    setAudioBusy(true);
    const next = !muted && (audioPlaying || mode==='paused');
    setMuted(next);
    try {
      await api.current.sound(next);
      setMuted(next);
    } catch {
      setNotice("Sound couldn't start. Tap again to retry.");
    } finally {
      setAudioBusy(false);
    }
  };
  const touchButton = (key: string, label: React.ReactNode, name: string) => (
    <button
      key={key}
      data-driving-control="true"
      aria-label={name}
      onPointerDownCapture={event=>{if(!(event.target as HTMLElement).closest("[data-sound-toggle]"))api.current?.unlockAudio();}}
        onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.dataset.held="true";
        if(api.current)api.current.touchActive=event.pointerType==="touch";
        api.current?.keys.add(key);
      }}
      onPointerUp={e => {api.current?.unlockAudio();delete e.currentTarget.dataset.held;api.current?.keys.delete(key);}}
      onPointerCancel={e => {delete e.currentTarget.dataset.held;api.current?.keys.delete(key);}}
      onLostPointerCapture={e => {delete e.currentTarget.dataset.held;api.current?.keys.delete(key);}}
    >
      {label}
    </button>
  );
  // Display priority only: the notification manager retains its original expiry times.
  const mobileCheckpoint = checkpointNotices.filter(n=>n.outcome==='missed').sort((a,b)=>b.id-a.id)[0]
    ?? checkpointNotices.reduce<CheckpointNotice | undefined>((latest,n)=>!latest||n.id>latest.id?n:latest,undefined);
  const car = cars[selected];
  const stage = stageDefinition(selection);
  const selectionChange=useRef(0);
  const changeStage = (next: StageSelection) => {
    next=isCircuit(next)?{...next,laps:next.laps??3,circuitVersion:2}:{...next,laps:undefined,circuitVersion:undefined};
    const change=++selectionChange.current;setPreparing("Preparing scene…");setSelection(next);setResult(null);
    requestAnimationFrame(()=>setTimeout(()=>{if(change!==selectionChange.current||!api.current)return;api.current.configure(next);void api.current.prepareRace();},0));
    try{localStorage.setItem("rally-time-of-day",timeOfDay(next));}catch{}
  };
  const mainMenu=()=>{setSettingsPanel(false);setAllBoards(false);setLeaderboard(false);setOptionPanel(null);setResult(null);run.current=Promise.resolve(null);api.current?.garage();};
  const openOptions=(panel:NonNullable<typeof optionPanel>,button:HTMLButtonElement)=>{optionOpener.current=button;setOptionPanel(panel);};
  const closeOptions=()=>{setOptionPanel(null);requestAnimationFrame(()=>optionOpener.current?.focus());};
  const optionTitle=optionPanel==='laps'?'Race laps':optionPanel==='track'?'Choose track':optionPanel==='time'?'Time of day':optionPanel==='stage'?'Choose stage':optionPanel==='weather'?'Choose weather':optionPanel==='direction'?'Route direction':'Ghost rival';
  const options=optionPanel==='laps'?([1,3,5] as const).map(n=>({value:String(n),label:`${n} ${n===1?'lap':'laps'}`,detail:'Separate records and ghosts',selected:lapCount(selection)===n})):optionPanel==='track'?trackNames[selection.stage].map((name,i)=>({value:String(i+1),label:name,detail:isCircuit(selection)?'Closed circuit':'Point-to-point rally',selected:trackNumber(selection)===i+1})):optionPanel==='time'?stageTimes(selection.stage).map(t=>({value:t,label:timeNames[t],detail:t==='night'?'Moonlight and headlights':t==='midday'?'Bright skies':t==='sunrise'?'First light':'Golden hour',selected:timeOfDay(selection)===t})):optionPanel==='stage'?stages.map(s=>({value:s.id,label:s.name,detail:s.surface,selected:selection.stage===s.id})):
    optionPanel==='weather'?stage.conditions.map(w=>({value:w,label:weatherNames[w],detail:w==='clear'?'Open skies':w==='fog'||w==='haze'?'Reduced visibility':'Changing conditions',selected:selection.weather===w})):
    optionPanel==='direction'?[{value:'forward',label:'Forward',detail:'Original route',selected:!selection.reverse},{value:'reverse',label:'Reverse',detail:'Same stage, other direction',selected:selection.reverse}]:
    [{value:'off',label:'Off',detail:'Just you and the stage',selected:ghostSource==='off'},{value:'personal',label:'My best',detail:'Your fastest clean run on this device',selected:ghostSource==='personal'},{value:'leader',label:'Leaderboard best',detail:'Fastest submitted run · same car and conditions',selected:ghostSource==='leader'}];
  const selectOption=(value:string)=>{
    if(optionPanel==='stage')changeStage({...selection,stage:value as StageSelection['stage'],weather:'clear',timeOfDay:value==='neon'?'night':value==='mx'?'midday':timeOfDay(selection),track:1});
    if(optionPanel==='laps')changeStage({...selection,laps:Number(value) as 1|3|5,circuitVersion:2});
    if(optionPanel==='track')changeStage({...selection,track:Number(value) as 1|2|3});
    if(optionPanel==='time')changeStage({...selection,timeOfDay:value as TimeOfDay});
    if(optionPanel==='weather')changeStage({...selection,weather:value as Weather});
    if(optionPanel==='direction')changeStage({...selection,reverse:value==='reverse'});
    if(optionPanel==='ghost'){setGhostSource(value as GhostSource);setGhostShown(true);api.current?.setGhost(value as GhostSource);}
    closeOptions();
  };
  menuAction.current=action=>{
    if(action==='back'){
      const nestedBack=game.current?.querySelector<HTMLButtonElement>('[data-menu-back]');
      if(nestedBack){nestedBack.click();return;}
      if(api.current?.roomMenuOpen){api.current.onRoomBack?.();return;}
      if(allBoards)setAllBoards(false);else if(optionPanel)closeOptions();else if(setupPanel)setSetupPanel(false);else if(leaderboard)setLeaderboard(false);else if(settingsPanel)setSettingsPanel(false);else if(installHelp)setInstallHelp(false);else if(api.current?.mode==='paused')api.current.pause();else if(api.current?.mode==='finished')mainMenu();
      return;
    }
    const menus=game.current?.querySelectorAll<HTMLElement>('[data-rally-menu]');
    const menu=menus?.[menus.length-1];if(!menu)return;if(menu.dataset.carousel&&action!=='activate'){menu.querySelector<HTMLButtonElement>(action==='next'?'[data-carousel-next]':'[data-carousel-previous]')?.click();return;}
    const buttons=Array.from(menu.querySelectorAll<HTMLElement>('button:not(:disabled),summary,input,select,a[href]')).filter(el=>el.getClientRects().length>0);
    if(!buttons.length)return;
    const current=buttons.indexOf(document.activeElement as HTMLElement);
    if(action==='activate'){
      const target=current<0?menu.querySelector<HTMLElement>('[data-menu-default]')||buttons[0]:buttons[current];
      target.focus();if(target.tagName==='BUTTON'||target.tagName==='A'||target.tagName==='SUMMARY')target.click();else if(target instanceof HTMLSelectElement){target.selectedIndex=(target.selectedIndex+1)%target.options.length;target.dispatchEvent(new Event('change',{bubbles:true}));}return;
    }
    const next=current<0?(action==='next'?0:buttons.length-1):(current+(action==='next'?1:-1)+buttons.length)%buttons.length;
    buttons[next].focus();
  };
  useEffect(()=>{
    if(api.current)api.current.menuOpen=api.current.roomMenuOpen||Boolean(optionPanel||setupPanel||leaderboard||installHelp||allBoards||settingsPanel);
    const menus=game.current?.querySelectorAll<HTMLElement>('[data-rally-menu]');const menu=menus?.[menus.length-1];
    (menu?.querySelector<HTMLElement>('[data-menu-default]')||menu?.querySelector<HTMLElement>('button'))?.focus();
  },[mode,optionPanel,setupPanel,leaderboard,installHelp,ready,allBoards,settingsPanel]);
  return (
    <div className={`${styles.page} ${immersive?styles.immersivePage:""}`}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>MARK WHITLEY / POCKET RALLY V5</p>
          <h1>
            POCKET<span>RALLY.</span>
          </h1>
        </div>
        <div className={styles.stageInfo}>
          <b>{trackName(selection).toUpperCase()}</b>
          <span>{stage.surface} · {weatherNames[selection.weather]} · {(isCircuit(selection)?`${lapCount(selection)} laps · ${timeNames[timeOfDay(selection)]}`:timeNames[timeOfDay(selection)])} · {selection.reverse?"Reverse":"Forward"}</span>
        </div>
      </div>
      <div
        ref={game}
        data-stage={selection.stage}
        data-mode={mode}
        data-practice={practice.length>0}
        data-time={timeOfDay(selection)}
        data-steering={controls.steering}
        className={`${styles.game} ${expanded ? styles.expanded : ""}`}
        onPointerDownCapture={event=>{if(!(event.target as HTMLElement).closest("[data-sound-toggle]"))api.current?.unlockAudio();}}
        onContextMenu={(event) => event.preventDefault()}
        onClickCapture={event=>{if((event.target as HTMLElement).closest("[data-sound-toggle]"))return;api.current?.unlockAudio();const button=(event.target as HTMLElement).closest("button");if(button&&!button.hasAttribute("data-driving-control")&&!button.hasAttribute("data-start-cue"))api.current?.uiCue();}}
        onKeyDown={event=>{
          if(!(optionPanel||setupPanel||leaderboard||installHelp||allBoards||settingsPanel||mode==='garage'||mode==='paused'||mode==='finished'))return;
          if((event.target as HTMLElement).matches('input,select,textarea'))return;
          if(event.key==='ArrowDown'||event.key==='ArrowUp'){
            event.preventDefault();event.stopPropagation();menuAction.current(event.key==='ArrowDown'?'next':'previous');
          }
          if(event.key==='Tab' && (optionPanel||setupPanel||leaderboard||installHelp||allBoards||settingsPanel||mode==='paused')){
            event.preventDefault();const menus=game.current?.querySelectorAll<HTMLElement>('[data-rally-menu]');const menu=menus?.[menus.length-1];const items=Array.from(menu?.querySelectorAll<HTMLElement>('button:not(:disabled),summary,input,select,a[href]')??[]).filter(el=>el.getClientRects().length);if(items.length){const index=items.indexOf(document.activeElement as HTMLElement);items[(index+(event.shiftKey?-1:1)+items.length)%items.length].focus();}
          }
        }}
      >
        <div
          ref={host}
          className={styles.canvas}
          aria-label="Isometric clay rally driving stage"
        />
        {screenWeather&&(['rain','snow','fog','haze'].includes(selection.weather)) && <div aria-hidden="true" className={`${styles.screenWeather} ${selection.weather==='rain'?styles.screenRain:selection.weather==='snow'?styles.screenSnow:styles.screenMist}`} data-paused={mode==='paused'}>
          {Array.from({length:selection.weather==='rain'?8:selection.weather==='snow'?12:3},(_,i)=><i key={i} style={{left:`${i%2===0?2+(i*7)%19:78+(i*7)%19}%`,animationDelay:`${-i*1.3}s`,animationDuration:`${selection.weather==='rain'?5+i%3:8+i%4}s`}}/>)}
        </div>}
        <div className={styles.topbar} aria-label="Game controls">
          {mode!=='garage'&&<button aria-label={mode==='finished'?'Toggle background replay':'Toggle driver-seat camera'} title="Camera view" aria-pressed={mode==='finished'?replayEnabled:driverView} onClick={mode==='finished'?()=>{api.current?.toggleReplay();setReplayEnabled(Boolean(api.current?.replayEnabled));}:toggleCamera}><HudIcon name={mode==='finished'?'replay':'wheel'}/></button>}
          {(mode==='race'||mode==='countdown') && <><button data-mobile-control="true" aria-label="Control" title="Control" onClick={()=>{if(!api.current?.live)api.current?.pause();setSettingsPanel(true);}}><HudIcon name="wheel"/></button><button data-mobile-pause="true" aria-label="Pause" title="Pause" onClick={()=>api.current?.pause()}><HudIcon name="pause"/></button></>}
          {mode==='garage'&&<><button aria-label="Control" title="Control" onClick={()=>setSettingsPanel(true)}><HudIcon name="wheel"/></button><button aria-label="Leaderboards" title="Leaderboards" onClick={()=>setAllBoards(true)}><HudIcon name="list"/></button></>}
          <button data-sound-toggle disabled={!ready||audioBusy} aria-label={muted?'Enable sound':audioPlaying||mode==='paused'?'Mute sound':'Start sound'} title={muted?'Enable sound':audioPlaying||mode==='paused'?'Mute sound':'Sound'} aria-pressed={!muted&&(audioPlaying||mode==='paused')} onClick={toggleSound}><HudIcon name={muted?'muted':'sound'}/></button>
          <button aria-label={nativeFullscreen?'Exit fullscreen':'Fullscreen'} title={nativeFullscreen?'Exit fullscreen':'Fullscreen'} aria-pressed={nativeFullscreen} onClick={toggleFullscreen}><HudIcon name={nativeFullscreen?'contract':'expand'}/></button>
          {!inRoom && (mode==='race'||mode==='countdown') && ghostSource!=='off' && <button aria-label={ghostShown?'Hide ghost':'Show ghost'} title="Ghost · G" aria-pressed={ghostShown} onClick={()=>api.current?.toggleGhost()}><HudIcon name="ghost"/></button>}
        </div>
        {installHelp && (
          <div
            className={styles.installHelp}
            data-rally-menu="true"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-title"
          >
            <h2 id="install-title">Play without browser bars</h2>
            <p>
              On iPhone or iPad, launch Pocket Rally as a Home Screen web app.
            </p>
            <ol>
              <li>
                In Chrome or Safari, tap <b>Share</b>.
              </li>
              <li>
                Choose <b>Add to Home Screen</b>. Keep <b>Open as Web App</b> on
                if shown, then tap <b>Add</b>.
              </li>
              <li>
                Open the new <b>Pocket Rally</b> icon and turn your phone
                sideways.
              </li>
            </ol>
            <p className={styles.hint}>
              Needs an internet connection. iOS may still show its home
              indicator.
            </p>
            <button
              className={styles.start}
              onClick={() => setInstallHelp(false)}
            >
              CONTINUE IN BROWSER <HudIcon name="right"/>
            </button>
          </div>
        )}
        {notice && (
          <div className={styles.notice} role="status">
            {notice}
          </div>
        )}
        {mode === "garage" && (
          <div className={styles.rotateHint}>
            ↻ Rotate to landscape for a wider track and bigger controls.
          </div>
        )}
        <PreparationBar step={preparing} onCancel={()=>api.current?.cancelPreparation()}/>
        {!ready && (
          <div className={styles.overlay}>
            <h2>{error || "Sculpting the stage…"}</h2>
          </div>
        )}
        {ready && mode === "garage" && (
          <>
            <div className={styles.garageCopy}><img src="/rally/pocket-rally-logo.svg" alt="Pocket Rally"/></div>
            <div className={styles.garage} data-rally-menu="true">
              <div className={styles.garageScroll}>
              <div className={styles.carSelect}>
                <button
                  disabled={stageVehicle(selection.stage)!==null} aria-label="Previous car"
                  onClick={() => api.current?.choose(selected - 1)}
                >
                  <HudIcon name="left"/>
                </button>
                <div>
                  <span className={styles.eyebrow}>
                    {stageVehicle(selection.stage)!==null?'SPECIAL STAGE':`${car.year} / ${String(selected + 1).padStart(2,"0")} OF 08`}
                  </span>
                  <h3>{car.name}</h3>
                  <p>{car.trait}</p>
                </div>
                <button
                  disabled={stageVehicle(selection.stage)!==null} aria-label="Next car"
                  onClick={() => api.current?.choose(selected + 1)}
                >
                  <HudIcon name="right"/>
                </button>
              </div>
              <button className={styles.raceSetup} onClick={()=>setSetupPanel(true)}><HudIcon name="settings"/><span><strong>Race setup</strong><small>{trackName(selection)} · {weatherNames[selection.weather]} · {timeNames[timeOfDay(selection)]}</small></span><HudIcon name="next"/></button>
              
              </div><div className={styles.garageActions}>
              <button
                className={styles.start}
                data-menu-default="true"
                data-start-cue="true" disabled={inRoom||!!preparing} onClick={() => void api.current?.requestStart()}
              >
                {preparing?"PREPARING…":"START STAGE"} <span><HudIcon name="next"/></span>
              </button>
              <button className={styles.friendAction} onClick={()=>setFriendsOpen(n=>n+1)}><HudIcon name="people"/> Race friends</button>
              </div>
            </div>
          </>
        )}
        <HudRead store={hud}>{stats=><>{isCircuit(selection)&&['race','countdown','celebrating'].includes(mode)&&<div className={styles.lapCard} aria-label="Lap information">
          <small>{mode==='celebrating'?'FINISHED':stats.lap===lapCount(selection)?'FINAL LAP':'CIRCUIT RACE'}</small>
          <strong>LAP <b>{Math.min(stats.lap,lapCount(selection))}</b><span> / {lapCount(selection)}</span></strong>
          <div className={styles.lapProgressLabel}><span>Lap progress</span><b>{Math.round(stats.lapProgress*100)}%</b></div>
          <div className={styles.lapProgress} role="progressbar" aria-label="Current lap progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(stats.lapProgress*100)}><div style={{width:`${stats.lapProgress*100}%`}}/></div>
          <span className={styles.lastLap}>LAST LAP <b>{stats.lastLap>0?formatTime(stats.lastLap):'—'}</b></span>
        </div>}
        </>}</HudRead>
        {mode === "celebrating" && <div className={styles.arrival}><strong>{result?.eligible?"STAGE COMPLETE":"PRACTICE FINISH"} · {formatTime(result?.time ?? stats.time)}</strong><button onClick={()=>api.current?.skipCelebration()}>Skip celebration <HudIcon name="right"/></button></div>}
        {(mode === "race" || mode === "countdown") && (
          <>
            <HudRead store={hud}>{stats=><><div className={styles.timer}>
              <small>{isCircuit(selection)?'RACE TIME':'STAGE TIME'}</small>
              <strong>{formatTime(stats.time)}</strong>
              <span className={styles.bestTime}>BEST <b>{best ? formatTime(best) : "—"}</b></span>
              {isCircuit(selection)&&<span className={styles.mobileLap}>LAP {Math.min(stats.lap,lapCount(selection))} / {lapCount(selection)}</span>}
              {!isCircuit(selection)&&<div className={styles.progress} aria-label="Stage progress"><div style={{width:`${stats.progress*100}%`}}/></div>}
              {practice.length>0 && <em className={styles.practice}>! PRACTICE RUN</em>}
            <button
              className={styles.recover}
              onClick={() => api.current?.resetPosition()}
            >
              <HudIcon name="recover"/> Recover +1.5s
            </button>
            </div>
            <div className={styles.speed}>
              <strong>{stats.speed}</strong>
              <small>KM/H</small>
              <div className={styles.revs} role="meter" aria-label="Engine revs" aria-valuemin={0} aria-valuemax={7400} aria-valuenow={stats.rpm}>
                <div style={{ width: `${stats.rpm / 7400 * 100}%` }} />
              </div>
              <small>{stats.limited ? "LIMIT" : `${stats.rpm.toLocaleString()} RPM`}</small>
            </div>
            </>}</HudRead>
<div
              className={styles.touchControls}
              aria-label="Touch driving controls"
            >
              <div className={styles.steeringPad}>
                {touchButton("KeyA", <HudIcon name="left"/>, "Steer left")}{touchButton("KeyD", <HudIcon name="right"/>, "Steer right")}
              </div>
              <div className={styles.pedalPad}>

                {touchButton("KeyS", "Brake", "Brake")}
                {touchButton("KeyW", "Go", "Accelerate")}
              </div>
            </div>


          </>
        )}
        {mode === "countdown" && (
          <HudRead store={hud}>{stats=><div className={styles.count}>
            {stats.count > 3 ? <span style={{fontSize:28}}>{selection.stage==='nyc'?'TO THE GRID':'GET READY'}</span> : stats.count > 0 ? stats.count : "GO!"}
          </div>}</HudRead>
        )}
        {mode === "paused" && (
          <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Pause menu" data-rally-menu="true">
            <div className={styles.pauseCard}>
              <span className={styles.tag}>SERVICE BREAK</span>
              <h2>PAUSED<span>.</span></h2>
              <p>{trackName(selection)} · {(isCircuit(selection)?`${lapCount(selection)} laps · ${timeNames[timeOfDay(selection)]}`:timeNames[timeOfDay(selection)])} / {formatTime(stats.time)}</p>
              <button className={styles.start} data-menu-default="true" onClick={()=>api.current?.pause()}>RESUME <span><HudIcon name="right"/></span></button>
              <button className={styles.menuButton} disabled={inRoom} onClick={()=>api.current?.start()}>Restart stage <span>↻</span></button>
              <button className={styles.menuButton} onClick={mainMenu}>Main menu <small>Ends this run</small></button>
            <div className={`${styles.secondaryTiles} ${styles.menuUtilities}`}><button onClick={()=>setSettingsPanel(true)}><HudIcon name="wheel"/>Control</button><button onClick={()=>setAllBoards(true)}><HudIcon name="list"/>Leaderboards</button></div>
            </div>
          </div>
        )}
        {mode === "finished"&&replayEnabled&&<div className={styles.replayFrame} aria-hidden="true"><b>▶ REPLAY</b></div>}
        {mode === "finished" && !inRoom && <div className={`${styles.overlay} ${styles.finishResults}`} role="dialog" aria-label="Race results" data-rally-menu="true">
          <div className={styles.resultSummary}><small>{result?.eligible?'STAGE COMPLETE':'PRACTICE FINISH'}</small><h2>{formatTime(result?.time??stats.time)}</h2><p>{trackName(selection)} · {car.name}</p>
          {result&&!result.eligible?<p className={styles.practiceReason}>{result.reasons.map(r=>reasonText[r]).join(' · ')} — not ranked</p>:<p>{best?'Best '+formatTime(best):'First finish'}</p>}
          <details><summary>Details</summary><p>{weatherNames[selection.weather]} · {timeNames[timeOfDay(selection)]} · {selection.reverse?'Reverse':'Forward'}{isCircuit(selection)?` · ${lapCount(selection)} laps`:''}</p>{Boolean(result?.penalty)&&<p>Recovery +{result!.penalty!.toFixed(2)}s included</p>}<p>Last lap: {stats.lastLap?formatTime(stats.lastLap):'—'}</p></details></div>
          <div className={styles.resultActions}><button className={styles.start} data-menu-default disabled={Boolean(preparing)} onClick={()=>void api.current?.requestStart()}>Race again <HudIcon name="right"/></button><button onClick={()=>setLeaderboard(true)}><HudIcon name="list"/>Leaderboard</button><button onClick={mainMenu}><HudIcon name="left"/>Main menu</button></div>
        </div>}
        {(mode==='race'||mode==='paused'||mode==='celebrating') && <div className={styles.checkpointStack} data-paused={mode==='paused'} aria-live="polite" aria-atomic="false">
          {checkpointNotices.map(n=><div key={n.id} data-mobile-visible={n.id===mobileCheckpoint?.id} className={`${styles.checkpointToast} ${n.outcome==='missed'?styles.missedToast:''}`} style={{animationDuration:`${n.duration}s`}}>
            <span className={styles.checkpointSymbol}>{n.outcome==='missed'?'!':'✓'}</span>
            <div><strong>{n.outcome==='missed'?'MISSED CHECKPOINT':'CHECKPOINT'} {String(n.checkpoints[0]).padStart(2,'0')}{n.checkpoints.length>1?`–${String(n.checkpoints.at(-1)).padStart(2,'0')}`:n.outcome==='accepted'?'/18':''}</strong><small>{n.outcome==='missed'?'Practice run':formatTime(n.time)}</small>{n.delta!==undefined&&<small className={n.delta<=0?styles.ahead:styles.behind}>≈ {n.delta<=0?'−':'+'}{Math.abs(n.delta).toFixed(2)} {n.delta<=0?'ahead':'behind'}</small>}</div>
          </div>)}
        </div>}
        {<div className={styles.codriverSubtitle} role="status" style={{visibility:mode==='race'&&subtitle?'visible':'hidden'}}><small><HudIcon name="headset"/> CO-DRIVER</small>{subtitle}</div>}
        {setupPanel&&<div className={styles.optionScrim}><section className={styles.optionPanel} role="dialog" aria-modal="true" aria-label="Race setup" data-rally-menu="true"><header><h2>Race setup</h2><button aria-label="Close race setup" onClick={()=>setSetupPanel(false)}>×</button></header>
              <div className={styles.stageChoices}>
                <button onClick={e=>openOptions('stage',e.currentTarget)}><small>ENVIRONMENT</small><strong>{stage.name}</strong><span><HudIcon name="next"/></span></button>
                <button onClick={e=>openOptions('track',e.currentTarget)}><small>TRACK {trackNumber(selection)} / {trackNames[selection.stage].length}</small><strong>{trackName(selection)}</strong><HudIcon name="next"/></button>
                <button onClick={e=>openOptions("weather",e.currentTarget)}><small>WEATHER</small><strong>{weatherNames[selection.weather]}</strong><HudIcon name="next"/></button>
                <button onClick={e=>openOptions("time",e.currentTarget)}><small>TIME OF DAY</small><strong>{timeNames[timeOfDay(selection)]}</strong><HudIcon name="next"/></button>
                {isCircuit(selection)&&<button onClick={e=>openOptions("laps",e.currentTarget)}><small>RACE LENGTH · {Math.round(routeLength(selection)*lapCount(selection))} M</small><strong>{lapCount(selection)} laps</strong><HudIcon name="next"/></button>}
                <button onClick={e=>openOptions('direction',e.currentTarget)}><small>ROUTE</small><strong>{selection.reverse?'Reverse':'Forward'}</strong><span><HudIcon name="next"/></span></button>
                <button onClick={e=>openOptions('ghost',e.currentTarget)}><small>GHOST</small><strong>{ghostSource==='off'?'Off':ghostSource==='personal'?'My best':'Leaderboard'}</strong><span><HudIcon name="next"/></span></button>
              </div>
        </section></div>}
        {optionPanel && ["stage","track","weather","time"].includes(optionPanel) && <SelectionCard key={optionPanel} title={optionTitle} options={options.map(o=>({...o,image:previewImage(optionPanel,o.value,selection)}))} onSelect={selectOption} onClose={closeOptions}/> }
        {optionPanel && !["stage","track","weather","time"].includes(optionPanel) && <div className={styles.optionScrim}><div className={styles.optionPanel} role="dialog" aria-modal="true" aria-label={optionTitle} data-rally-menu="true">
          <header><div><span className={styles.tag}>SERVICE PARK / SELECT</span><h2>{optionTitle}</h2></div><button aria-label="Close options" onClick={closeOptions}>×</button></header>
          {(optionPanel==='weather'||optionPanel==='time')&&<small>Illustrative game screenshots</small>}
          {optionPanel==='ghost'&&ghostStatus&&<p>{ghostStatus}</p>}
          <div className={styles.optionList}>{options.map(o=><button key={o.value} aria-pressed={o.selected} data-menu-default={o.selected||undefined} onClick={()=>selectOption(o.value)}>{["stage","track","weather","time"].includes(optionPanel)&&<img className={styles.optionPreview} alt="" loading="lazy" src={`/rally/previews/${optionPanel==='stage'?`${o.value}-1`:optionPanel==='track'?`${selection.stage}-${o.value}`:optionPanel==='weather'?`weather-${o.value}`:`time-${o.value}`}.webp`}/>}<span>{o.label}<small>{o.detail}</small></span><b>{o.selected?'✓':<HudIcon name="right"/>}</b></button>)}</div>
        </div></div>}
        {settingsPanel&&<div className={styles.optionScrim}><div className={styles.optionPanel} role="dialog" aria-modal="true" aria-label="Control" data-rally-menu="true"><header><h2>Control</h2><button aria-label="Close control" onClick={()=>setSettingsPanel(false)}>×</button></header><div className={styles.stageChoices}>
                <button onClick={toggleCamera} aria-pressed={driverView}><small><HudIcon name="wheel"/> CAMERA</small><strong>{driverView?"Driver seat":"Isometric"}</strong></button><button aria-pressed={codriver} disabled={stageVehicle(selection.stage)!==null} onClick={toggleCodriver}><small><HudIcon name="headset"/> CO-DRIVER</small><strong>{!hasCodriver(selection.stage)?'Rally only':codriver?'On':'Off'}</strong></button>
                <button onClick={changeGraphics} aria-label={`Graphics: ${graphics}. Change quality`}><small><HudIcon name="screen"/> GRAPHICS</small><strong>{graphics==='auto'?'Auto':graphics==='high'?'High':'Low'}</strong></button>
                <button aria-pressed={screenWeather} onClick={toggleScreenWeather}><small><HudIcon name="screen"/> SCREEN WEATHER</small><strong>{screenWeather?"On":"Off"}</strong></button>
              </div><div className={styles.secondaryTiles}><button data-sound-toggle onClick={toggleSound}><HudIcon name={muted?'muted':'sound'}/>{muted?'Sound off':'Sound on'}</button><button onClick={()=>{api.current?.toggleReplay();setReplayEnabled(Boolean(api.current?.replayEnabled));}}><HudIcon name="replay"/>Replay {replayEnabled?'on':'off'}</button><button onClick={toggleFullscreen}><HudIcon name={nativeFullscreen?'contract':'expand'}/>{nativeFullscreen?'Exit fullscreen':'Fullscreen'}</button></div><section className={styles.controlFeedback} aria-label="Steering and feedback">
          <label className={styles.controlRange}>Steering sensitivity <strong>{controls.sensitivity.toFixed(1)}×</strong><input type="range" min="0.5" max="1.5" step="0.1" value={controls.sensitivity} onChange={e=>setControls(c=>({...c,sensitivity:Number(e.target.value)}))}/></label>
          <div className={styles.feedbackActions}>
            <button disabled={hapticSupport==='unavailable'} aria-pressed={controls.haptics} onClick={()=>setControls(c=>({...c,haptics:!c.haptics}))}>{hapticSupport==='controller'?'Controller rumble':hapticSupport==='device'?'Device vibration':'Haptics unavailable'}{hapticSupport!=='unavailable'?`: ${controls.haptics?'On':'Off'}`:''}</button>
            <button disabled={hapticSupport==='unavailable'} onClick={()=>void testHaptics().then(setHapticMessage)}>Test feedback</button>
          </div>
          {hapticMessage&&<p role="status">{hapticMessage}</p>}
          <p>Vibration needs a supported browser or controller. iPhone/iPad browsers do not support device vibration.</p>
          <div className={styles.controlReset}><button onClick={()=>setControls({...defaultControls})}>Reset controls</button><small>Normal sensitivity · Haptics off<br/>Records stay saved.</small></div>
        </section></div></div>}
        {allBoards&&<Standings onClose={()=>setAllBoards(false)}/>}
        <FriendRaces openRequest={friendsOpen} mode={mode} ready={ready} world={()=>api.current} selection={selection} car={selected} onActive={setInRoom} onSetup={(s,car)=>{const w=api.current;if(!w)return;if(w.mode!=='garage')w.garage();if(boardKey(w.selection)!==boardKey(s))w.configure(s);if(w.selected!==car)w.choose(car);setSelection({...s});setSelected(car);}}/>
        {leaderboard && <Leaderboard selection={selection} result={result} onClose={()=>setLeaderboard(false)} />}
      </div>
      <div className={styles.below}>
        <div>
          <span className={styles.tag}>HOW TO DRIVE</span>
          <p><a href="/rally/audio-credits.txt" target="_blank" rel="noreferrer">Engine audio credits <HudIcon name="next"/></a></p>
          {!standalone && (
            <p>
              <button
                className={styles.installLink}
                onClick={() => { setExpanded(true); api.current?.blur(); setInstallHelp(true); }}
              >
                Play as a Home Screen app <HudIcon name="next"/>
              </button>
            </p>
          )}
          <p>
            <b>Keyboard</b> · WASD / arrows to drive · Space to slide · R to
            recover · G ghost · Esc to pause
          </p>
          <p>
            <b>PS5 controller</b> · Left stick steers · R2 throttle · L2 brake ·
            Cross handbrake · Triangle recover · Square ghost · Options pause
          </p>
          <small>
            On phone or iPad, rotate to landscape and tap Fullscreen for the
            best view. For a controller, connect by USB or Bluetooth and press a
            button. Times are saved on this device.
          </small>
        </div>

      </div>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";

import {TouchWheel} from "./touch-wheel";
import {defaultControls,readControls,type ControlSettings} from "./controls";
import {Standings} from "./standings";
import { cars, formatTime, type Mode } from "./data";
import styles from "./rally.module.css";
import { lapCount, routeLength, stages, initialStage, stageDefinition, trackName, trackNames, trackNumber, weatherNames, stageTimes, timeNames, timeOfDay, type TimeOfDay, type StageSelection, type Weather } from "./stages";
import { Leaderboard, type RaceResult } from "./leaderboard";
import { HudIcon } from "./ui";
import { reasonText, type CheckpointNotice, type RunReason } from "./checkpoints";
import type { GhostSource } from "./replay";
export function RallyGame() {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<HTMLDivElement>(null);
  const hadNativeFullscreen = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const [installHelp, setInstallHelp] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const api = useRef<import("./world").RallyWorld | null>(null);
  const [selected, setSelected] = useState(0);
  const [selection, setSelection] = useState<StageSelection>({...initialStage});
  const [allBoards,setAllBoards]=useState(false);
  const [controlPanel,setControlPanel]=useState(false);
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
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [replayEnabled,setReplayEnabled]=useState(true);
  const [screenWeather,setScreenWeather]=useState(true);
  useEffect(()=>{try{setScreenWeather(localStorage.getItem("rally-screen-weather")!=="off");}catch{}},[]);
  const toggleScreenWeather=()=>{setScreenWeather(on=>{try{localStorage.setItem("rally-screen-weather",on?"off":"on");}catch{}return !on;});};
  const [checkpointNotices,setCheckpointNotices]=useState<CheckpointNotice[]>([]);
  const [practice,setPractice]=useState<RunReason[]>([]);
  const [optionPanel,setOptionPanel]=useState<'stage'|'weather'|'direction'|'ghost'|'time'|'track'|'laps'|null>(null);
  const optionOpener=useRef<HTMLButtonElement|null>(null);
  const menuAction=useRef<(action:'next'|'previous'|'activate'|'back')=>void>(()=>{});
  const [stats, setStats] = useState({
    time: 0,
    speed: 0,
    rpm: 950,
    limited: false,
    progress: 0,
    count: 3,lap:1,lastLap:0,
  });
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
          stats: setStats,
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
          audio: (isMuted) => {
            setMuted(isMuted);
            if (isMuted) setNotice("Audio stopped. Tap Sound to retry.");
          },
        });
        try{api.current.controls=readControls(JSON.parse(localStorage.getItem("rally-controls")||"null"));}catch{}
        setGhostSource(api.current.ghostSource);setSelection({...api.current.selection});
        setMuted(api.current.muted);setReplayEnabled(api.current.replayEnabled);
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
  }, []);
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
      if (document.fullscreenElement === game.current) {
        hadNativeFullscreen.current = true;
        setExpanded(true);
      } else if (hadNativeFullscreen.current) {
        hadNativeFullscreen.current = false;
        setExpanded(false);
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
    if (expanded) {
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          setNotice("Use your browser’s fullscreen exit control.");
          return;
        }
      }
      setExpanded(false);
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
    const next = !muted;
    try {
      await api.current.sound(next);
      setMuted(next);
      setNotice(
        next
          ? "Sound muted."
          : "Audio playback started. Adjust your phone’s media volume.",
      );
    } catch {
      setMuted(true);
      setNotice("Sound could not start. Tap Sound again to retry.");
    } finally {
      setAudioBusy(false);
    }
  };
  const touchButton = (key: string, label: React.ReactNode, name: string) => (
    <button
      key={key}
      data-driving-control="true"
      aria-label={name}
      onPointerDownCapture={()=>{const world=api.current;if(world&&!world.muted)void world.ensureAudio().catch(()=>{world.muted=true;setMuted(true);setNotice("Tap Sound to retry audio.");});}}
        onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.dataset.held="true";
        if(api.current)api.current.touchActive=event.pointerType==="touch";
        api.current?.keys.add(key);
      }}
      onPointerUp={e => {delete e.currentTarget.dataset.held;api.current?.keys.delete(key);}}
      onPointerCancel={e => {delete e.currentTarget.dataset.held;api.current?.keys.delete(key);}}
      onLostPointerCapture={e => {delete e.currentTarget.dataset.held;api.current?.keys.delete(key);}}
    >
      {label}
    </button>
  );
  const car = cars[selected];
  const stage = stageDefinition(selection);
  const changeStage = (next: StageSelection) => {
    next=next.stage==="kart"?{...next,laps:next.laps??3,circuitVersion:2}:{...next,laps:undefined,circuitVersion:undefined};
    setSelection(next);setResult(null);api.current?.configure(next);
    try{localStorage.setItem("rally-time-of-day",timeOfDay(next));}catch{}
  };
  const mainMenu=()=>{setControlPanel(false);setAllBoards(false);setLeaderboard(false);setOptionPanel(null);setResult(null);run.current=Promise.resolve(null);api.current?.garage();};
  const openOptions=(panel:NonNullable<typeof optionPanel>,button:HTMLButtonElement)=>{optionOpener.current=button;setOptionPanel(panel);};
  const closeOptions=()=>{setOptionPanel(null);requestAnimationFrame(()=>optionOpener.current?.focus());};
  const optionTitle=optionPanel==='laps'?'Race laps':optionPanel==='track'?'Choose track':optionPanel==='time'?'Time of day':optionPanel==='stage'?'Choose stage':optionPanel==='weather'?'Choose weather':optionPanel==='direction'?'Route direction':'Ghost rival';
  const options=optionPanel==='laps'?([1,3,5] as const).map(n=>({value:String(n),label:`${n} ${n===1?'lap':'laps'}`,detail:'Separate records and ghosts',selected:lapCount(selection)===n})):optionPanel==='track'?trackNames[selection.stage].map((name,i)=>({value:String(i+1),label:name,detail:i===0?'Original layout · existing records':'New route · separate records',selected:trackNumber(selection)===i+1})):optionPanel==='time'?stageTimes(selection.stage).map(t=>({value:t,label:timeNames[t],detail:t==='night'?'Moonlight and headlights':t==='midday'?'Bright skies':t==='sunrise'?'First light':'Golden hour',selected:timeOfDay(selection)===t})):optionPanel==='stage'?stages.map(s=>({value:s.id,label:s.name,detail:s.surface,selected:selection.stage===s.id})):
    optionPanel==='weather'?stage.conditions.map(w=>({value:w,label:weatherNames[w],detail:w==='clear'?'Open skies':w==='fog'||w==='haze'?'Reduced visibility':'Changing conditions',selected:selection.weather===w})):
    optionPanel==='direction'?[{value:'forward',label:'Forward',detail:'Original route',selected:!selection.reverse},{value:'reverse',label:'Reverse',detail:'Same stage, other direction',selected:selection.reverse}]:
    [{value:'off',label:'Off',detail:'Just you and the stage',selected:ghostSource==='off'},{value:'personal',label:'My best',detail:'Your fastest clean run on this device',selected:ghostSource==='personal'},{value:'leader',label:'Leaderboard best',detail:'Fastest submitted run · same car and conditions',selected:ghostSource==='leader'}];
  const selectOption=(value:string)=>{
    if(optionPanel==='stage')changeStage({...selection,stage:value as StageSelection['stage'],weather:'clear',timeOfDay:value==='kart'?'midday':timeOfDay(selection)});
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
      if(controlPanel)setControlPanel(false);else if(allBoards)setAllBoards(false);else if(optionPanel)closeOptions();else if(leaderboard)setLeaderboard(false);else if(installHelp)setInstallHelp(false);else if(api.current?.mode==='paused')api.current.pause();else if(api.current?.mode==='finished')mainMenu();
      return;
    }
    const menus=game.current?.querySelectorAll<HTMLElement>('[data-rally-menu]');
    const menu=menus?.[menus.length-1];if(!menu)return;
    const buttons=Array.from(menu.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,a[href]')).filter(el=>el.getClientRects().length>0);
    if(!buttons.length)return;
    const current=buttons.indexOf(document.activeElement as HTMLElement);
    if(action==='activate'){
      const target=current<0?menu.querySelector<HTMLElement>('[data-menu-default]')||buttons[0]:buttons[current];
      target.focus();if(target.tagName==='BUTTON'||target.tagName==='A')target.click();return;
    }
    const next=current<0?(action==='next'?0:buttons.length-1):(current+(action==='next'?1:-1)+buttons.length)%buttons.length;
    buttons[next].focus();
  };
  useEffect(()=>{
    if(api.current)api.current.menuOpen=Boolean(optionPanel||leaderboard||installHelp||controlPanel||allBoards);
    const menus=game.current?.querySelectorAll<HTMLElement>('[data-rally-menu]');const menu=menus?.[menus.length-1];
    (menu?.querySelector<HTMLElement>('[data-menu-default]')||menu?.querySelector<HTMLElement>('button'))?.focus();
  },[mode,optionPanel,leaderboard,installHelp,ready,controlPanel,allBoards]);
  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>MARK WHITLEY / POCKET RALLY V2.6</p>
          <h1>
            POCKET<span>RALLY.</span>
          </h1>
        </div>
        <div className={styles.stageInfo}>
          <b>{trackName(selection).toUpperCase()}</b>
          <span>{stage.surface} · {weatherNames[selection.weather]} · {(selection.stage==='kart'?`${lapCount(selection)} laps · Indoor`:timeNames[timeOfDay(selection)])} · {selection.reverse?"Reverse":"Forward"}</span>
        </div>
      </div>
      <div
        ref={game}
        data-time={timeOfDay(selection)}
        data-steering={controls.steering}
        className={`${styles.game} ${expanded ? styles.expanded : ""}`}
        onPointerDownCapture={()=>{const world=api.current;if(world&&!world.muted)void world.ensureAudio().catch(()=>{world.muted=true;setMuted(true);setNotice("Tap Sound to retry audio.");});}}
        onContextMenu={(event) => event.preventDefault()}
        onClickCapture={event=>{const button=(event.target as HTMLElement).closest("button");if(button&&!button.hasAttribute("data-driving-control")&&!button.hasAttribute("data-start-cue"))api.current?.uiCue();}}
        onKeyDown={event=>{
          if(!(optionPanel||leaderboard||installHelp||controlPanel||allBoards||mode==='garage'||mode==='paused'||mode==='finished'))return;
          if((event.target as HTMLElement).matches('input,select,textarea'))return;
          if(event.key==='ArrowDown'||event.key==='ArrowUp'){
            event.preventDefault();event.stopPropagation();menuAction.current(event.key==='ArrowDown'?'next':'previous');
          }
          if(event.key==='Tab' && (optionPanel||leaderboard||installHelp||controlPanel||allBoards||mode==='paused')){
            event.preventDefault();menuAction.current(event.shiftKey?'previous':'next');
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
          {(mode==='race'||mode==='countdown') && <button aria-label="Pause" title="Pause" onClick={()=>api.current?.pause()}><HudIcon name="pause"/></button>}
          <button disabled={!ready||audioBusy} aria-label={muted?'Enable sound':'Mute sound'} title={muted?'Enable sound':'Mute sound'} aria-pressed={!muted} onClick={toggleSound}><HudIcon name={muted?'muted':'sound'}/></button>
          <button aria-label={expanded?'Exit game view':'Fullscreen'} title={expanded?'Exit game view':'Fullscreen'} aria-pressed={expanded} onClick={toggleFullscreen}><HudIcon name={expanded?'contract':'expand'}/></button>
          {(mode==='race'||mode==='countdown') && ghostSource!=='off' && <button aria-label={ghostShown?'Hide ghost':'Show ghost'} title="Ghost · G" aria-pressed={ghostShown} onClick={()=>api.current?.toggleGhost()}><HudIcon name="ghost"/></button>}
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
        {!ready && (
          <div className={styles.overlay}>
            <h2>{error || "Sculpting the stage…"}</h2>
          </div>
        )}
        {ready && mode === "garage" && (
          <>
            <div className={styles.garageCopy}>
              <span className={styles.tag}>THE SERVICE PARK</span>
              <h2>
                Small car.
                <br />
                Big sideways.
              </h2>
              <p>
                Five worlds. Fifteen tracks. Eight rally cars.
                <br />Find your place on the leaderboard.
              </p>
            </div>
            <div className={styles.garage} data-rally-menu="true">
              <div className={styles.menuEyebrow}><span>SERVICE PARK</span><span>01 / SET UP</span></div>
              <div className={styles.carSelect}>
                <button
                  disabled={selection.stage==='kart'} aria-label="Previous car"
                  onClick={() => api.current?.choose(selected - 1)}
                >
                  <HudIcon name="left"/>
                </button>
                <div>
                  <span className={styles.eyebrow}>
                    {selection.stage==='kart'?'INDOOR EXCLUSIVE':`${car.year} / ${String(selected + 1).padStart(2,"0")} OF 08`}
                  </span>
                  <h3>{car.name}</h3>
                  <p>{car.trait}</p>
                </div>
                <button
                  disabled={selection.stage==='kart'} aria-label="Next car"
                  onClick={() => api.current?.choose(selected + 1)}
                >
                  <HudIcon name="right"/>
                </button>
              </div>
              <div className={styles.stageChoices}>
                <button onClick={e=>openOptions('stage',e.currentTarget)}><small>ENVIRONMENT</small><strong>{stage.name}</strong><span>{stage.surface} <HudIcon name="next"/></span></button>
                <button onClick={e=>openOptions('track',e.currentTarget)}><small>TRACK {trackNumber(selection)} / 3</small><strong>{trackName(selection)}</strong><HudIcon name="next"/></button>
                <button onClick={e=>openOptions(selection.stage==='kart'?'laps':'weather',e.currentTarget)}><small>{selection.stage==='kart'?'RACE LENGTH':'WEATHER'}</small><strong>{selection.stage==='kart'?`${lapCount(selection)} laps`:weatherNames[selection.weather]}</strong><span><HudIcon name="next"/></span></button>
                {selection.stage==='kart'?<div className={styles.circuitSummary}><small>CIRCUIT / DISTANCE</small><strong>{Math.round(routeLength(selection)*lapCount(selection))} m</strong><span>Closed loop · {lapCount(selection)} laps</span></div>:<button onClick={e=>openOptions('time',e.currentTarget)}><small>TIME OF DAY</small><strong>{timeNames[timeOfDay(selection)]}</strong><HudIcon name="next"/></button>}
                <button onClick={e=>openOptions('direction',e.currentTarget)}><small>ROUTE</small><strong>{selection.reverse?'Reverse':'Forward'}</strong><span><HudIcon name="next"/></span></button>
                <button onClick={e=>openOptions('ghost',e.currentTarget)}><small>GHOST</small><strong>{ghostSource==='off'?'Off':ghostSource==='personal'?'My best':'Leaderboard'}</strong><span><HudIcon name="next"/></span></button>
                <button aria-pressed={screenWeather} onClick={toggleScreenWeather}><small><HudIcon name="screen"/> SCREEN WEATHER</small><strong>{screenWeather?"On":"Off"}</strong></button>
              </div>
              <small className={styles.ghostStatus} role="status">{ghostStatus!=="Ghost off"&&ghostStatus!=="My best"?ghostStatus:""}</small>
              <div className={styles.garageLinks}><button className={styles.boardButton} onClick={()=>setAllBoards(true)}>Leaderboards <HudIcon name="next"/></button><button onClick={()=>setControlPanel(true)}>Controls <HudIcon name="next"/></button></div>
              <button
                className={styles.start}
                data-menu-default="true"
                data-start-cue="true" onClick={() => api.current?.start()}
              >
                START STAGE <span><HudIcon name="next"/></span>
              </button>
              <p className={styles.hint}>
                L1 / R1 car · D-pad menu · Cross select
              </p>
            </div>
          </>
        )}
        {mode === "celebrating" && <div className={styles.arrival}><strong>{result?.eligible?"STAGE COMPLETE":"PRACTICE FINISH"} · {formatTime(result?.time ?? stats.time)}</strong><button onClick={()=>api.current?.skipCelebration()}>Skip celebration <HudIcon name="right"/></button></div>}
        {(mode === "race" || mode === "countdown") && (
          <>
            <div className={styles.timer}>
              <small>{selection.stage==='kart'?`LAP ${stats.lap} / ${lapCount(selection)}`:'STAGE TIME'}</small>
              {selection.stage==='kart'&&stats.lastLap>0&&<span>LAST LAP {formatTime(stats.lastLap)}</span>}
              <strong>{formatTime(stats.time)}</strong>
              <span>BEST <b>{best ? formatTime(best) : "—"}</b></span>
              <div className={styles.progress} aria-label="Stage progress"><div style={{width:`${stats.progress*100}%`}}/></div>
              {practice.length>0 && <em className={styles.practice}>! PRACTICE RUN</em>}
            </div>
            <div className={styles.speed}>
              <strong>{stats.speed}</strong>
              <small>KM/H</small>
              <div className={styles.revs} role="meter" aria-label="Engine revs" aria-valuemin={0} aria-valuemax={7400} aria-valuenow={stats.rpm}>
                <div style={{ width: `${stats.rpm / 7400 * 100}%` }} />
              </div>
              <small>{stats.limited ? "LIMIT" : `${stats.rpm.toLocaleString()} RPM`}</small>
            </div>
            <div
              className={styles.touchControls}
              aria-label="Touch driving controls"
            >
              <div className={styles.steeringPad}>
                {controls.steering==="wheel"?<TouchWheel sensitivity={controls.sensitivity} onInput={(value,held)=>{if(api.current){if(held)api.current.touchSteer=value;api.current.touchHeld=held;api.current.touchActive=true;}}}/>:<>{touchButton("KeyA", <HudIcon name="left"/>, "Steer left")}{touchButton("KeyD", <HudIcon name="right"/>, "Steer right")}</>}
              </div>
              <div className={styles.pedalPad}>

                {touchButton("KeyS", "Brake", "Brake")}
                {touchButton("KeyW", "Go", "Accelerate")}
              </div>
            </div>
            <button
              className={styles.recover}
              onClick={() => api.current?.resetPosition()}
            >
              <HudIcon name="recover"/> Recover +1.5s
            </button>

          </>
        )}
        {mode === "countdown" && (
          <div className={styles.count}>
            {stats.count > 0 ? stats.count : "GO!"}
          </div>
        )}
        {mode === "paused" && (
          <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Pause menu" data-rally-menu="true">
            <div className={styles.pauseCard}>
              <span className={styles.tag}>SERVICE BREAK</span>
              <h2>PAUSED<span>.</span></h2>
              <p>{trackName(selection)} · {(selection.stage==='kart'?`${lapCount(selection)} laps · Indoor`:timeNames[timeOfDay(selection)])} / {formatTime(stats.time)}</p>
              <button className={styles.start} data-menu-default="true" onClick={()=>api.current?.pause()}>RESUME <span><HudIcon name="right"/></span></button>
              <button className={styles.menuButton} onClick={()=>api.current?.start()}>Restart stage <span>↻</span></button>
              <button className={styles.menuButton} onClick={mainMenu}>Main menu <small>Ends this run</small></button>
              <button className={styles.menuButton} onClick={()=>setControlPanel(true)}>Controls & feedback <HudIcon name="right"/></button>
            <div className={styles.pauseSettings}>
                <button disabled={audioBusy} aria-pressed={!muted} onClick={toggleSound}><HudIcon name={muted?'muted':'sound'}/>{muted?'Sound off':'Sound on'}</button>
                <button disabled={ghostSource==='off'} aria-pressed={ghostShown&&ghostSource!=='off'} onClick={()=>api.current?.toggleGhost()}><HudIcon name="ghost"/>Ghost {ghostShown&&ghostSource!=='off'?'on':'off'}</button>
                <button aria-pressed={screenWeather} onClick={toggleScreenWeather}><HudIcon name="screen"/>Screen weather {screenWeather?"on":"off"}</button>
                <button onClick={toggleFullscreen}><HudIcon name={expanded?'contract':'expand'}/>{expanded?'Exit view':'Fullscreen'}</button>
              </div>
            </div>
          </div>
        )}
        {mode === "finished"&&replayEnabled&&<div className={styles.replayFrame} aria-hidden="true"><b>▶ REPLAY / POCKET SPORTS</b></div>}
        {mode === "finished" && (
          <div className={`${styles.overlay} ${styles.finishResults}`} data-rally-menu="true">
            <span className={styles.tag}>
              {result?.eligible ? 'STAGE COMPLETE' : 'PRACTICE FINISH'}
            </span>
            <h2>{formatTime(result?.time ?? stats.time)}</h2>
            <p>{car.name} · {trackName(selection)} · {weatherNames[selection.weather]} · {(selection.stage==='kart'?`${lapCount(selection)} laps · Indoor`:timeNames[timeOfDay(selection)])} · {selection.reverse?"Reverse":"Forward"}</p>
            {result && !result.eligible && <p className={styles.practiceReason}>{result.reasons.map(r=>reasonText[r]).join(" · ")} — time shown, not ranked.</p>}
            {Boolean(result?.penalty)&&<p className={styles.practiceReason}>Recovery penalties: +{result!.penalty!.toFixed(2)}s · included in stage time</p>}
            <p>Personal best: {best ? formatTime(best) : "—"}</p>
            <button onClick={()=>setLeaderboard(true)}>{result?.eligible?"Submit time & leaderboard":"View leaderboard"}</button>
            <button
              className={styles.start}
              data-start-cue="true" onClick={() => api.current?.start()}
            >
              ONE MORE RUN <HudIcon name="next"/>
            </button>
            <button aria-pressed={replayEnabled} onClick={()=>{api.current?.toggleReplay();setReplayEnabled(Boolean(api.current?.replayEnabled));}}>Background replay: {replayEnabled?"On":"Off"}</button>
            <button onClick={mainMenu}>Main menu</button>
          </div>
        )}
        {(mode==='race'||mode==='paused'||mode==='celebrating') && <div className={styles.checkpointStack} data-paused={mode==='paused'} aria-live="polite" aria-atomic="false">
          {checkpointNotices.map(n=><div key={n.id} className={`${styles.checkpointToast} ${n.outcome==='missed'?styles.missedToast:''}`} style={{animationDuration:`${n.duration}s`}}>
            <span className={styles.checkpointSymbol}>{n.outcome==='missed'?'!':'✓'}</span>
            <div><strong>{n.outcome==='missed'?'MISSED CHECKPOINT':'CHECKPOINT'} {String(n.checkpoints[0]).padStart(2,'0')}{n.checkpoints.length>1?`–${String(n.checkpoints.at(-1)).padStart(2,'0')}`:n.outcome==='accepted'?'/18':''}</strong><small>{n.outcome==='missed'?'Practice run':formatTime(n.time)}</small>{n.delta!==undefined&&<small className={n.delta<=0?styles.ahead:styles.behind}>≈ {n.delta<=0?'−':'+'}{Math.abs(n.delta).toFixed(2)} {n.delta<=0?'ahead':'behind'}</small>}</div>
          </div>)}
        </div>}
        {optionPanel && <div className={styles.optionScrim}><div className={styles.optionPanel} role="dialog" aria-modal="true" aria-label={optionTitle} data-rally-menu="true">
          <header><div><span className={styles.tag}>SERVICE PARK / SELECT</span><h2>{optionTitle}</h2></div><button aria-label="Close options" onClick={closeOptions}>×</button></header>
          <div className={styles.optionList}>{options.map(o=><button key={o.value} aria-pressed={o.selected} data-menu-default={o.selected||undefined} onClick={()=>selectOption(o.value)}><span>{o.label}<small>{o.detail}</small></span><b>{o.selected?'✓':<HudIcon name="right"/>}</b></button>)}</div>
        </div></div>}
        {controlPanel&&<div className={styles.optionScrim}><div className={styles.optionPanel} role="dialog" aria-modal="true" aria-label="Driving controls" data-rally-menu="true">
          <header><div><span className={styles.tag}>YOUR CONTROLS</span><h2>Driving controls</h2></div><button onClick={()=>setControlPanel(false)} aria-label="Close controls">×</button></header>
          <div className={styles.optionList}>{(['arrows','wheel'] as const).map(steering=><button key={steering} aria-pressed={controls.steering===steering} onClick={()=>setControls(c=>({...c,steering}))}>{steering==='arrows'?'Arrow buttons':'◉ Steering wheel'}<b>{controls.steering===steering?'✓':''}</b></button>)}</div>
          <label className={styles.controlRange}>Wheel sensitivity <strong>{controls.sensitivity.toFixed(1)}×</strong><input type="range" min="0.5" max="1.5" step="0.1" value={controls.sensitivity} onChange={e=>setControls(c=>({...c,sensitivity:Number(e.target.value)}))}/></label>
          <p>Drag around the wheel rim to turn. Release to centre. Use your other thumb for the pedals.</p>
          <button className={styles.menuButton} aria-pressed={controls.haptics} onClick={()=>setControls(c=>({...c,haptics:!c.haptics}))}>Haptic feedback: {controls.haptics?'On':'Off'}</button>
          <p className={styles.hint}>Rumble requires a supported controller/browser. Handset vibration is available only where the browser supports it; iPhone and iPad web vibration is not supported.</p>
          <button className={styles.menuButton} onClick={()=>setControls({...defaultControls})}>Reset controls to defaults</button><small>Restores arrows, normal sensitivity and haptics off. Records stay saved.</small>
        </div></div>}
        {allBoards&&<Standings onClose={()=>setAllBoards(false)}/>}
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

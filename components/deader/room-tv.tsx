"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/lib/deader/store";
import { newsForNight, broadcastSegment } from "@/lib/deader/room";
import { TV_POSITION, LOUNGE_TV_POSITION } from "@/lib/deader/tv";

import styles from "./game.module.css";

function presenter(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, t: number, suspicious = false) {
  ctx.save(); ctx.translate(x, y + Math.sin(t * 2) * 2); ctx.scale(size, size);
  const gradient = ctx.createLinearGradient(-50, 0, 50, 0); gradient.addColorStop(0, "#9b7629"); gradient.addColorStop(.5, suspicious ? "#83a852" : "#e6c15b"); gradient.addColorStop(1, "#66501f");
  ctx.fillStyle = gradient; ctx.beginPath(); ctx.moveTo(0,-100); ctx.lineTo(-55,25); ctx.quadraticCurveTo(0,42,55,25); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#17191b";
  for (const eye of [-17,17]) { ctx.beginPath(); ctx.ellipse(eye,-20,5,8,0,0,Math.PI*2); ctx.fill(); }
  if (suspicious) { ctx.beginPath(); ctx.arc(0,-45,5,0,Math.PI*2); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(0,5,13,2 + Math.abs(Math.sin(t*9))*4,0,0,Math.PI*2); ctx.fill(); ctx.restore();
}
export function RoomTV() {
  const loungeLight = useRef<THREE.PointLight>(null);
  const light = useRef<THREE.PointLight>(null), elapsed = useRef(0), systemReduced = useRef(false);
  useEffect(() => { const query = matchMedia("(prefers-reduced-motion: reduce)"); const update = () => { systemReduced.current = query.matches; }; update(); query.addEventListener("change", update); return () => query.removeEventListener("change", update); }, []);
  const screen = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = 768; canvas.height = 432;
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false; texture.minFilter = THREE.LinearFilter;
    return { canvas, texture, ctx: canvas.getContext("2d")! };
  }, []);
  useEffect(() => () => screen.texture.dispose(), [screen]);
  useFrame((_, dt) => {
    const s = useGame.getState();
    if (s.panel || !s.focused || s.suspension) return;
    const t = s.room.newsSeconds;
    if (light.current) {
      light.current.intensity = !systemReduced.current && !s.save.settings.reducedFlashes && !s.save.settings.reducedMotion ? .85 + .12*Math.sin(t*7) + .07*Math.sin(t*13) : .85;
    }
    if (loungeLight.current && light.current) loungeLight.current.intensity = light.current.intensity;
    elapsed.current += dt;
    if (elapsed.current < 1 / (s.save.settings.quality === "low" ? 6 : 12)) return;
    elapsed.current = 0;
    const {ctx:c} = screen, report = newsForNight(s.room.night?.number ?? 1), segment = broadcastSegment(report,t);
    const motion = systemReduced.current || s.save.settings.reducedMotion ? 0 : t;
    c.fillStyle = "#152332"; c.fillRect(0,0,768,432);
    for(let i=0;i<12;i++) { c.fillStyle = i%2 ? "#263a4c" : "#203044"; c.fillRect(i*64,30,54,230); }
    c.fillStyle="#dce9f1"; c.font="bold 30px Arial"; c.fillText("ANOMALOUS NEWS",24,42);
    c.fillStyle="#c34e44"; c.fillRect(664,15,80,30); c.fillStyle="#fff"; c.font="18px Arial"; c.fillText("ON AIR",672,37);
    const incident = Math.floor(t / 7) % 3 === 1;
    if (incident) {
      c.fillStyle="#111920"; c.fillRect(24,65,720,200);
      for(let i=0;i<5;i++){c.fillStyle="#26323c";c.fillRect(160+i*65,220-i*24,380,12);}
      presenter(c,360+Math.sin(motion*.8)*60,200,.85,motion,true);
      c.fillStyle="#d1dce5";c.font="16px monospace";c.fillText("CITY WATCH / RECONSTRUCTION",38,88);
    } else {
      presenter(c,384,215,1.1,motion);
      c.fillStyle="#455a6e";c.fillRect(135,234,500,35);c.fillStyle="#bacbd9";c.fillRect(135,234,500,3);
      c.font="16px Arial"; c.fillText("AFTER HOURS BULLETIN",40,92);
    }
    c.fillStyle="#e5eaf0";c.fillRect(0,280,768,42);c.fillStyle="#111820";c.font="bold 22px Arial";c.fillText(segment.headline,20,308);
    c.fillStyle="#080c12";c.fillRect(0,322,768,110);c.fillStyle="#f2f4f8";c.font="21px Arial";c.fillText("LOCAL NEWS / AFTER HOURS",20,365);
    if(s.save.settings.effects){c.fillStyle="#00000016";for(let y=0;y<432;y+=4)c.fillRect(0,y,768,1);}
    screen.texture.needsUpdate=true;
  });
  return <>{[{position:TV_POSITION,rotation:-Math.PI/2,interaction:"Watch TV",ref:light},{position:LOUNGE_TV_POSITION,rotation:Math.PI,interaction:"Watch lounge TV",ref:loungeLight}].map(tv=><group key={tv.interaction} position={[...tv.position]} rotation={[0,tv.rotation,0]} userData={{interaction:tv.interaction}}>
    <mesh><boxGeometry args={[1.95,1.16,.09]}/><meshStandardMaterial color="#08090c" roughness={.4}/></mesh>
    <mesh position={[0,0,.051]}><planeGeometry args={[1.82,1.024]}/><meshBasicMaterial map={screen.texture} toneMapped={false}/></mesh>
    <pointLight ref={tv.ref} position={[0,-.2,.35]} color="#b7cce5" intensity={.85} distance={4} decay={2} castShadow={false}/>
  </group>)}</>;
}
export function TVCaptions() {
  const s = useGame();
  if (!["tv","lounge-tv"].includes(s.room.view) || s.room.survival.phase !== "idle") return null;
  return <aside className={styles.tvCaption} aria-label="TV subtitles"><b>ANOMALOUS NEWS</b><p>{broadcastSegment(newsForNight(s.room.night?.number ?? 1),s.room.newsSeconds).subtitle}</p><button autoFocus onClick={()=>s.roomView("explore")}>Back to room</button>{s.room.visitorId && <button onClick={()=>{s.roomView("door");useGame.getState().doorEvent({type:"inspect"});}}>Answer the door</button>}</aside>;
}

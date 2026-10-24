"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/lib/deader/store";
import { useVR } from "@/lib/deader/vr-state";
import { renderVRFeed } from "@/lib/deader/vr-feed";
import { PEEPHOLE_POSITION, PEEPHOLE_LOOK_AT, PEEPHOLE_FOV, DOOR_FEED_INTERVAL } from "@/lib/deader/peephole";
import styles from "./game.module.css";
const WIDTH=480, HEIGHT=270;
type Sink = {canvas: HTMLCanvasElement; failed: boolean; status: (value: "live" | "failed")=>void};
let sink: Sink | null = null;
export function failDoorFeedForTest(){
 if(process.env.NODE_ENV === "development" && sink){sink.failed=true;sink.status("failed");sink.canvas.getContext("2d")?.clearRect(0,0,WIDTH,HEIGHT);}
}
/** A newly mounted canvas never inherits another visitor's image. */
export function DoorFeed() {
 const [status,setStatus]=useState<"loading"|"live"|"failed">("loading");
 const [retry,setRetry]=useState(0);
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const current:Sink={canvas:ref.current!,failed:false,status:setStatus};sink=current;
  return ()=>{if(sink===current)sink=null;};
 },[retry]);
 return <div className={styles.doorFeed}>
  <canvas key={retry} ref={ref} width={WIDTH} height={HEIGHT} aria-label="Live peephole view" hidden={status!=="live"}/>
  {status!=="live"&&<div role="status">{status==="failed"?<>Peephole unavailable <button onClick={()=>{setStatus("loading");setRetry(n=>n+1);}}>Retry</button></>:"Connecting peephole…"}</div>}
 </div>;
}
export function DoorFeedRenderer(){
 const camera=useMemo(()=>{
  const c=new THREE.PerspectiveCamera(PEEPHOLE_FOV,WIDTH/HEIGHT,.1,30);
  c.position.set(...PEEPHOLE_POSITION);c.lookAt(...PEEPHOLE_LOOK_AT);c.layers.enable(1);
  c.userData.loungeInset=true;c.updateMatrixWorld();return c;
 },[]);
 const target=useRef<THREE.WebGLRenderTarget|null>(null);
 const bytes=useMemo(()=>new Uint8Array(WIDTH*HEIGHT*4),[]);
 const frame=useMemo(()=>new Uint8ClampedArray(WIDTH*HEIGHT*4),[]);
 const last=useRef(-Infinity);
 const previousSink=useRef<Sink|null>(null);
 useEffect(()=>()=>{target.current?.dispose();target.current=null;},[]);
 useFrame(({gl,scene,clock})=>{
  const s=useGame.getState(),current=sink;
  if(!current || s.room.view!=="door" || s.panel || useVR.getState().active){
   target.current?.dispose();target.current=null;previousSink.current=null;return;
  }
  if(!s.focused || s.suspension || current.failed)return;
  if(previousSink.current!==current){last.current=-Infinity;previousSink.current=current;}
  if(clock.elapsedTime-last.current<DOOR_FEED_INTERVAL)return;
  last.current=clock.elapsedTime;
  const started=performance.now();
  try{
   if(!target.current){target.current=new THREE.WebGLRenderTarget(WIDTH,HEIGHT,{depthBuffer:true});target.current.texture.colorSpace=THREE.SRGBColorSpace;}
   if(!renderVRFeed(gl,scene,camera,target.current,{failed:false,rendering:false},()=>{
    gl.readRenderTargetPixels(target.current!,0,0,WIDTH,HEIGHT,bytes);
   }))throw new Error("Peephole render failed");
   for(let y=0;y<HEIGHT;y++)frame.set(bytes.subarray((HEIGHT-1-y)*WIDTH*4,(HEIGHT-y)*WIDTH*4),y*WIDTH*4);
   const context=current.canvas.getContext("2d");if(!context)throw new Error("Peephole canvas unavailable");
   context.putImageData(new ImageData(frame,WIDTH,HEIGHT),0,0);current.status("live");
   if(process.env.NODE_ENV === "development")current.canvas.dataset.feedMs=(performance.now()-started).toFixed(2);
  }catch{
   current.failed=true;current.canvas.getContext("2d")?.clearRect(0,0,WIDTH,HEIGHT);current.status("failed");
   target.current?.dispose();target.current=null;
  }
 });
 return null;
}

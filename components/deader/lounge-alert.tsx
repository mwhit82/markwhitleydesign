"use client";
import {useVR} from "@/lib/deader/vr-state";
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/lib/deader/store';
import { loungeAlert, residentPosition } from '@/lib/deader/lounge';
import styles from './game.module.css';

const WIDTH=256,HEIGHT=144;
/** Small, on-demand live feed from the existing scene. No second WebGL context. */
export function LoungeInsetRenderer(){
 const target=useMemo(()=>{const rt=new THREE.WebGLRenderTarget(WIDTH,HEIGHT,{depthBuffer:true});rt.texture.colorSpace=THREE.SRGBColorSpace;return rt;},[]);
 const camera=useMemo(()=>{const c=new THREE.PerspectiveCamera(55,WIDTH/HEIGHT,.1,30);c.userData.loungeInset=true;return c;},[]);
 const bytes=useMemo(()=>new Uint8Array(WIDTH*HEIGHT*4),[]),frame=useMemo(()=>new Uint8ClampedArray(WIDTH*HEIGHT*4),[]);
 const last=useRef(0);
 useEffect(()=>()=>target.dispose(),[target]);
 useFrame(({gl,scene,clock})=>{
  const s=useGame.getState(),r=s.room,alert=loungeAlert(r.residents);
  if(useVR.getState().active||!alert||s.panel||!s.focused||s.suspension||r.judgement||r.night?.status!=='running'||(r.view==='cctv'&&r.feed===5)||clock.elapsedTime-last.current<.1)return;
  const canvas=document.getElementById('anomalous-lounge-inset') as HTMLCanvasElement|null,ctx=canvas?.getContext('2d');if(!ctx)return;
  last.current=clock.elapsedTime;
  const resident=r.residents.find(x=>x.id===alert.id)!,p=residentPosition(resident);
  camera.position.set(Math.max(-3.1,Math.min(3.1,p.x+1.6)),2.1,Math.min(10.4,p.z+2.6));camera.lookAt(p.x,.95,p.z);camera.updateMatrixWorld();
  const previous=gl.getRenderTarget(),auto=gl.autoClear,xr=gl.xr.enabled,shadow=gl.shadowMap.autoUpdate;
  const hidden:THREE.Object3D[]=[];
  scene.traverse(o=>{if(o.visible&&o.userData.firstPersonWeapon){hidden.push(o);o.visible=false;}});
  try{
   gl.xr.enabled=false;gl.shadowMap.autoUpdate=false;gl.autoClear=true;gl.setRenderTarget(target);gl.render(scene,camera);gl.readRenderTargetPixels(target,0,0,WIDTH,HEIGHT,bytes);
   for(let y=0;y<HEIGHT;y++)frame.set(bytes.subarray((HEIGHT-1-y)*WIDTH*4,(HEIGHT-y)*WIDTH*4),y*WIDTH*4);
   ctx.putImageData(new ImageData(frame,WIDTH,HEIGHT),0,0);
  }finally{hidden.forEach(o=>o.visible=true);gl.setRenderTarget(previous);gl.autoClear=auto;gl.xr.enabled=xr;gl.shadowMap.autoUpdate=shadow;}
 });
 return null;
}
export function LoungeAlertUI(){
 const s=useGame(),r=s.room,alert=loungeAlert(r.residents);
 if(!alert||s.panel||!s.focused||s.suspension||r.judgement||r.night?.status!=='running'||(r.view==='cctv'&&r.feed===5))return null;
 return <aside className={styles.loungeAlert} aria-label="Live holding lounge alert">
  <div role="status"><strong>{alert.leaving?'It’s leaving!':'Something has transformed!'}</strong><span>HOLDING LOUNGE · {alert.seconds}s</span></div>
  <canvas id="anomalous-lounge-inset" width={WIDTH} height={HEIGHT} aria-label="Live camera of the transformed visitor"/>
  <p>Through the doorway behind you.</p>
  <button onClick={()=>{useGame.setState({room:{...useGame.getState().room,feed:5}});s.roomView('cctv');}}>View lounge camera</button>
 </aside>;
}

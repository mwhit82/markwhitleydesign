'use client';
import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {loadVehicle} from './vehicle-visual';
import {releaseVisual} from './visual-resources';
import {cars} from './data';

/** One on-demand renderer for the open selector; no animation loop or shadows. */
export function CarPreview({car}:{car:number}){
 const host=useRef<HTMLDivElement>(null),runtime=useRef<{scene:T.Scene;render:()=>void}|null>(null);
 const [status,setStatus]=useState('Loading car…');
 useEffect(()=>{
  const el=host.current;if(!el)return;
  let renderer:T.WebGLRenderer;try{renderer=new T.WebGLRenderer({antialias:true,alpha:true});}catch{setStatus('Preview unavailable');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.1,100);
  scene.add(new T.HemisphereLight(0xfff2db,0x526c63,3));const sun=new T.DirectionalLight(0xffdfb3,4);sun.position.set(3,6,5);scene.add(sun);
  camera.position.set(5,3.2,6);camera.lookAt(0,0,0);el.appendChild(renderer.domElement);
  renderer.domElement.style.cssText='width:100%;height:100%;display:block';
  const render=()=>{const {width,height}=el.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.render(scene,camera);};
  runtime.current={scene,render};const observer=new ResizeObserver(render);observer.observe(el);render();
  return()=>{runtime.current=null;observer.disconnect();renderer.dispose();renderer.domElement.remove();};
 },[]);
 useEffect(()=>{
  const view=runtime.current;if(!view)return;let cancelled=false,model:T.Group|null=null;setStatus('Loading car…');
  void loadVehicle(car).then(asset=>{if(cancelled){releaseVisual(asset);return;}model=asset;
   const bounds=new T.Box3().setFromObject(asset),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
   const scale=4/Math.max(size.x,size.y,size.z);asset.scale.multiplyScalar(scale);asset.position.sub(center.multiplyScalar(scale));
   view.scene.add(asset);setStatus('');view.render();
  }).catch(()=>{if(!cancelled)setStatus('Preview unavailable');});
  return()=>{cancelled=true;if(model){view.scene.remove(model);releaseVisual(model);}};
 },[car]);
 return <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center, #859180, #263d37)'}} role="img" aria-label={`${cars[car].name} model preview`}><div ref={host} style={{position:'absolute',inset:0}}/>{status&&<span style={{position:'absolute',inset:0,display:'grid',placeItems:'center'}}>{status}</span>}</div>;
}

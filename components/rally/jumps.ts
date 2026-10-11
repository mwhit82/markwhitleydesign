import * as T from 'three';
import type {StageSelection} from './stages';
export type Ramp={index:number;height:number;half?:number;show?:boolean};
export const legacyRamps:Ramp[]=[{index:135,height:.85},{index:325,height:2.2},{index:515,height:.85}];
/** Bidirectional straight-run clearance, measured in world units rather than sample count. */
export function selectRamps(points:T.Vector3[],selection:StageSelection):Ramp[]{
 if(selection.stage==='kart')return [];
 const step=points.slice(1).reduce((sum,p,i)=>sum+p.distanceTo(points[i]),0)/(points.length-1),half=Math.ceil(9/step),clear=Math.max(Math.ceil(28/step),half*3+1),chosen:Ramp[]=[];
 const candidates=Array.from({length:Math.max(0,points.length-clear*2)},(_,i)=>i+clear).sort((a,b)=>points[a].x-points[b].x||points[a].z-points[b].z);
 for(const i of candidates){
  if(chosen.some(r=>Math.abs(r.index-i)*step<65))continue;
  const direction=points[i+clear].clone().sub(points[i-clear]).normalize();
  let valid=true;
  for(let j=i-clear;j<i+clear;j+=2){const d=points[Math.min(j+2,points.length-1)].clone().sub(points[j]).normalize();if(d.dot(direction)<.965){valid=false;break;}}
  if(!valid)continue;
  // Avoid another section of road running through the supporting embankment.
  if(points.some((p,j)=>Math.abs(j-i)>clear&&p.distanceTo(points[i])<18))continue;
  chosen.push({index:i,height:selection.stage==='nyc'?1.35:chosen.length===0?2.8:1.6,half,show:selection.stage!=='nyc'&&chosen.length===0});if(chosen.length===3)break;
 }
 return chosen;
}
export function rampHeight(index:number,ramps:Ramp[]=legacyRamps){let y=0;for(const r of ramps){const half=r.half??12,u=(index-(r.index-half))/(2*half);if(u>0&&u<1)y=Math.max(y,r.height*Math.sin(Math.PI*u)**2);}return y;}
export function elevationPose(index:number,speed:number,reduced=false,ramps:Ramp[]=legacyRamps){
 let y=rampHeight(index,ramps),pitch=0,roll=0;
 for(const r of ramps){const half=r.half??12,u=(index-(r.index-half))/(2*half),lift=Math.max(0,Math.min(1,(speed-7)/18));
  if(u>0&&u<1)pitch=-Math.sin(2*Math.PI*u)*r.height*.12;
  if(u>.5&&u<1.3){y+=r.height*lift*Math.sin((u-.5)/.8*Math.PI);pitch*=.5;}
  if(!reduced&&u>=1.3&&u<1.55){const t=(u-1.3)/.25;roll=Math.sin(t*Math.PI*4)*(1-t)*lift*.06;}
 }return {y,pitch,roll};
}

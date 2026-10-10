import * as T from 'three';
import {timeOfDay,type StageSelection} from './stages';
export function lighting(selection:StageSelection){
 const day=timeOfDay(selection),wet=selection.weather==='rain'||selection.weather==='snow',fog=selection.weather==='fog'||selection.weather==='haze';
 const presets={
  midday:{sky:'#c6d7d5',fill:'#fff0d1',sun:'#fff0d3',ground:'#597968',ambient:2.6,power:3.2,position:[-35,75,25],lamps:0},
  sunrise:{sky:'#eab9ba',fill:'#ffe7dd',sun:'#ffbf8b',ground:'#747ba0',ambient:2,power:2.4,position:[-65,27,-40],lamps:25},
  sunset:{sky:'#d79878',fill:'#ffe7d0',sun:'#ff9a51',ground:'#6b6684',ambient:1.9,power:2.6,position:[65,24,30],lamps:30},
  night:{sky:'#101d35',fill:'#9cbbe9',sun:'#9cbbe9',ground:'#283d62',ambient:.65,power:.5,position:[-35,75,25],lamps:65},
 };
 const p=presets[day];
 return {...p,ambient:p.ambient*(wet?.85:1),power:p.power*(wet?.48:fog?.65:1),near:fog?28:wet?55:95,far:fog?100:wet?160:240};
}
export class WeatherParticles {
 object:T.Points|T.LineSegments;
 private positions:Float32Array;
 private centers:Float32Array;
 private rain:boolean;
 private snow:boolean;
 count:number;
 constructor(weather:string,reduced:boolean){
  this.rain=weather==='rain';this.snow=weather==='snow';
  this.count=(this.rain?400:this.snow?180:120)/(reduced?2:1);
  this.centers=new Float32Array(this.count*3);this.positions=new Float32Array(this.count*(this.rain?6:3));
  for(let i=0;i<this.count;i++)this.centers.set([(Math.random()-.5)*70,Math.random()*30,(Math.random()-.5)*70],i*3);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(this.positions,3).setUsage(T.DynamicDrawUsage));
  if(this.rain)this.object=new T.LineSegments(geometry,new T.LineBasicMaterial({color:'#d2e3ef',transparent:true,opacity:.46,depthWrite:false}));
  else{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const c=canvas.getContext('2d')!;
   const g=c.createRadialGradient(16,16,1,16,16,15);g.addColorStop(0,'white');g.addColorStop(.6,'#ffffffcc');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(0,0,32,32);
   this.object=new T.Points(geometry,new T.PointsMaterial({map:new T.CanvasTexture(canvas),color:this.snow?'#ffffff':'#e6c38c',size:this.snow?.48:.2,transparent:true,opacity:this.snow?.82:.45,depthWrite:false}));
  }
  this.object.frustumCulled=false;this.update(0,new T.Vector3());
 }
 update(dt:number,center:T.Vector3){
  for(let i=0;i<this.count;i++){
   const j=i*3;this.centers[j]=((this.centers[j]+dt*(this.snow?1.5:6)+35)%70)-35;
   this.centers[j+1]=(this.centers[j+1]-dt*(this.rain?25:this.snow?3:1)+30)%30;
   const x=this.centers[j]+center.x,y=this.centers[j+1],z=this.centers[j+2]+center.z,k=i*(this.rain?6:3);
   this.positions[k]=x;this.positions[k+1]=y;this.positions[k+2]=z;
   if(this.rain){this.positions[k+3]=x-.3;this.positions[k+4]=y+1.5;this.positions[k+5]=z;}
  }
  this.object.geometry.attributes.position.needsUpdate=true;
 }
}

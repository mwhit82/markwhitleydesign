import * as T from 'three';
import type {StageSelection} from './stages';
export const TRACK_CAP=512,SPLASH_CAP=64;
/** Two batched meshes, fixed allocations. Cosmetic only: never alters grip or collision. */
export class SurfaceEffects {
 group=new T.Group();
 tracks:T.InstancedMesh;splashes:T.InstancedMesh;
 puddles:{x:number;z:number;radius:number}[]=[];
 private age=new Float32Array(TRACK_CAP).fill(20);
 private alpha=new T.InstancedBufferAttribute(new Float32Array(TRACK_CAP),1);
 private life=new Float32Array(SPLASH_CAP);
 private positions=new Float32Array(SPLASH_CAP*3);
 private velocities=new Float32Array(SPLASH_CAP*3);
 private cursor=0;private splashCursor=0;private clock=0;private splashClock=0;
 private object=new T.Object3D();private previous=new T.Vector3();private hasPrevious=false;
 mud=0;snow=0;
 private selection:StageSelection;
 constructor(selection:StageSelection,points:T.Vector3[],private reduced:boolean){
  this.selection=selection;
  this.group.name="surface-effects";
  const material=new T.MeshBasicMaterial({color:selection.stage==='alpine'?'#667f85':'#51402c',transparent:true,depthWrite:false,opacity:.32,polygonOffset:true,polygonOffsetFactor:-1});
  const geometry=new T.PlaneGeometry(.32,1);
  geometry.setAttribute('trailAlpha',this.alpha);
  material.onBeforeCompile=shader=>{
   shader.vertexShader='attribute float trailAlpha; varying float vTrailAlpha;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTrailAlpha=trailAlpha;');
   shader.fragmentShader='varying float vTrailAlpha;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vTrailAlpha;');
  };
  material.customProgramCacheKey=()=> 'rally-trail-v1';
  this.tracks=new T.InstancedMesh(geometry,material,TRACK_CAP);this.tracks.frustumCulled=false;this.tracks.renderOrder=2;this.tracks.instanceMatrix.setUsage(T.DynamicDrawUsage);this.group.add(this.tracks);
  this.splashes=new T.InstancedMesh(new T.IcosahedronGeometry(.13,0),new T.MeshBasicMaterial({color:'#d2e8ea',transparent:true,opacity:.65,depthWrite:false}),SPLASH_CAP);this.splashes.frustumCulled=false;this.splashes.instanceMatrix.setUsage(T.DynamicDrawUsage);this.group.add(this.splashes);
  if(selection.weather==='rain'){
   const geo=new T.CircleGeometry(1,18),mat=new T.MeshStandardMaterial({color:'#7d9b9d',roughness:.12,metalness:.15,transparent:true,opacity:.65,depthWrite:false});
   // Five small depressions inside the existing road, safely away from gates.
   for(const index of [83,197,395,427,592]){
    const p=points[index],next=points[index+1],a=Math.atan2(next.x-p.x,next.z-p.z),side=index%2?2:-2;
    const x=p.x+Math.cos(a)*side,z=p.z-Math.sin(a)*side;
    const mesh=new T.Mesh(geo,mat);mesh.rotation.set(-Math.PI/2,0,a);mesh.scale.set(1.5,2.1,1);mesh.position.set(x,.065,z);mesh.renderOrder=1;this.group.add(mesh);this.puddles.push({x,z,radius:1.8});
   }
  }
  this.reset();
 }
 reset(){this.mud=0;this.snow=0;this.clock=0;this.splashClock=0;this.hasPrevious=false;this.age.fill(20);this.alpha.array.fill(0);this.alpha.needsUpdate=true;this.life.fill(0);this.object.scale.setScalar(0);this.object.updateMatrix();for(let i=0;i<TRACK_CAP;i++)this.tracks.setMatrixAt(i,this.object.matrix);for(let i=0;i<SPLASH_CAP;i++)this.splashes.setMatrixAt(i,this.object.matrix);this.tracks.instanceMatrix.needsUpdate=true;this.splashes.instanceMatrix.needsUpdate=true;}
 update(dt:number,car:T.Vector3,angle:number,speed:number,racing:boolean){
  if(dt<=0)return;
  this.clock+=dt;this.splashClock-=dt;
  const distance=this.hasPrevious?car.distanceTo(this.previous):0;
  if(racing&&speed>1){
   const accumulation=surfaceAccumulation(this.selection,dt,speed,this.mud,this.snow);
   this.mud=accumulation.mud;this.snow=accumulation.snow;
   if(this.clock>=.06&&distance>.28&&distance<5){
    const dx=car.x-this.previous.x,dz=car.z-this.previous.z;
    for(const side of [-1,1]){
     const i=this.cursor++%TRACK_CAP;
     this.object.position.set((car.x+this.previous.x)/2+Math.cos(angle)*side,.073,(car.z+this.previous.z)/2-Math.sin(angle)*side);
     this.object.rotation.set(-Math.PI/2,0,Math.atan2(dx,dz));this.object.scale.set(1,Math.min(2.5,distance+.1),1);this.object.updateMatrix();this.tracks.setMatrixAt(i,this.object.matrix);this.age[i]=0;
    }
    this.tracks.instanceMatrix.needsUpdate=true;this.previous.copy(car);this.clock=0;
   }
   if(this.splashClock<=0&&this.puddles.some(p=>Math.hypot(p.x-car.x,p.z-car.z)<p.radius+1)){
    this.splashClock=.16;
    for(let n=0;n<(this.reduced?4:12);n++){
     const i=this.splashCursor++%SPLASH_CAP,j=i*3,side=n%2?1:-1;
     this.life[i]=.65;this.positions.set([car.x+Math.cos(angle)*side,.2,car.z-Math.sin(angle)*side],j);
     this.velocities.set([Math.cos(angle)*side*5,2.5+Math.random()*2,-Math.sin(angle)*side*5],j);
    }
   }
  }
  if(!this.hasPrevious||!racing||distance>=5||speed<=1){this.previous.copy(car);this.hasPrevious=true;}
  for(let i=0;i<TRACK_CAP;i++){this.age[i]=Math.min(20,this.age[i]+dt);this.alpha.setX(i,Math.max(0,1-this.age[i]/20));}this.alpha.needsUpdate=true;
  for(let i=0;i<SPLASH_CAP;i++){
   if(this.life[i]<=0)continue;this.life[i]=Math.max(0,this.life[i]-dt);const j=i*3;this.velocities[j+1]-=dt*8;
   for(let k=0;k<3;k++)this.positions[j+k]+=this.velocities[j+k]*dt;
   this.object.position.set(this.positions[j],Math.max(.08,this.positions[j+1]),this.positions[j+2]);this.object.rotation.set(0,0,0);this.object.scale.setScalar(this.life[i]/.65);this.object.updateMatrix();this.splashes.setMatrixAt(i,this.object.matrix);
  }this.splashes.instanceMatrix.needsUpdate=true;
 }
}
export function createMud(color:string,length=4.1){
 const material=new T.MeshStandardMaterial({color,roughness:1,transparent:true,opacity:0,depthWrite:false});
 const mud=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),material,64);mud.name='car-mud';mud.castShadow=false;
 const o=new T.Object3D();let seed=13;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 for(let i=0;i<64;i++){
  const side=i%2?1:-1;
  if(i<48){o.position.set(side*1.08,.65+rand()*.5,(rand()-.5)*(length-.25));o.scale.set(.025,.09+rand()*.16,.12+rand()*.23);}
  else{o.position.set((rand()-.5)*2,.7+rand()*.5,-length/2-.025);o.scale.set(.13+rand()*.2,.10+rand()*.16,.025);}
  o.rotation.set(0,0,rand());o.updateMatrix();mud.setMatrixAt(i,o.matrix);
 }
 return mud;
}

export function surfaceAccumulation(s:StageSelection,dt:number,speed:number,mud:number,snow:number){
 if(dt<=0||speed<=1||s.stage==='kart')return {mud,snow};
 const snowy=s.stage==='alpine',wet=s.weather==='rain';
 return {mud:Math.min(1,mud+dt*speed*(snowy?.00012:s.stage==='mountain'?(wet?.0007:.00015):wet?.0025:.0015)),snow:Math.min(1,snow+dt*(snowy?(s.weather==='snow'?.018:.007):0))};
}
export function createSnow(){
 const mesh=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({color:'#f2f6ed',roughness:1,transparent:true,opacity:0,depthWrite:false}),48);mesh.name='car-snow';
 const o=new T.Object3D();let seed=37;const rand=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
 for(let i=0;i<48;i++){
  if(i<24){o.position.set((rand()-.5)*1.65,2.115,(rand()-.5)*1.35-.12);o.scale.set(.15+rand()*.17,.04+rand()*.09,.14+rand()*.2);}
  else if(i<36){o.position.set((rand()-.5)*1.65,1.395,1.45+(rand()-.5)*.55);o.scale.set(.15+rand()*.18,.045,.10+rand()*.14);}
  else {const side=i%2?1:-1;o.position.set(side*1.09,.88+(i%3)*.12,(i%4<2?1:-1)*1.3);o.scale.set(.035,.14,.24);}
  o.rotation.set(0,rand()*3,0);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);
 }return mesh;
}

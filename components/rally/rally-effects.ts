import * as T from 'three';
import type {Ramp} from './jumps';
export const DUST_CAP=180,FIREWORK_CAP=96;
/** Fixed-size batches: alpha is per instance, with no new allocations during emission. */
function particles(count:number,color:string){
 const geometry=new T.IcosahedronGeometry(1,0),alpha=new T.InstancedBufferAttribute(new Float32Array(count),1);geometry.setAttribute('particleAlpha',alpha);
 const material=new T.MeshBasicMaterial({color,transparent:true,depthWrite:false});
 material.onBeforeCompile=s=>{s.vertexShader='attribute float particleAlpha; varying float vAlpha;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvAlpha=particleAlpha;');s.fragmentShader='varying float vAlpha;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vAlpha;');};material.customProgramCacheKey=()=> 'rally-particles-v31';
 const mesh=new T.InstancedMesh(geometry,material,count);mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);return {mesh,alpha};
}
export class RallyPlume{
 group=new T.Group();private batch;private age=new Float32Array(DUST_CAP).fill(6);private life=new Float32Array(DUST_CAP);private pos=new Float32Array(DUST_CAP*3);private strength=new Float32Array(DUST_CAP);private cursor=0;private clock=0;private o=new T.Object3D();
 constructor(color:string,private spray:boolean,private reduced:boolean){this.batch=particles(DUST_CAP,color);this.group.add(this.batch.mesh);this.reset();}
 reset(){this.age.fill(6);this.clock=0;this.batch.alpha.array.fill(0);this.batch.alpha.needsUpdate=true;this.o.scale.setScalar(0);this.o.updateMatrix();for(let i=0;i<DUST_CAP;i++)this.batch.mesh.setMatrixAt(i,this.o.matrix);this.batch.mesh.instanceMatrix.needsUpdate=true;}
 update(dt:number,car:T.Vector3,heading:number,speed:number,emit:number,cockpit:boolean){
  if(dt<=0)return;this.clock+=dt;
  const rate=this.reduced?9:28;
  if(speed>4&&emit>0&&this.clock>=1/rate){this.clock%=1/rate;const i=this.cursor++%(this.reduced?60:DUST_CAP),j=i*3,side=(Math.random()-.5)*2.5;
   this.pos.set([car.x-Math.sin(heading)*2+Math.cos(heading)*side,car.y+.4,car.z-Math.cos(heading)*2-Math.sin(heading)*side],j);this.age[i]=0;this.life[i]=this.spray?1.4:4+Math.random()*2;this.strength[i]=emit*Math.min(1,speed/14);
  }
  for(let i=0;i<DUST_CAP;i++){this.age[i]+=dt;const age=this.age[i],life=this.life[i];if(age>=life){this.batch.alpha.setX(i,0);continue;}const j=i*3;
   this.pos[j]+=dt*.35;this.pos[j+1]+=dt*(this.spray?.3:.55);const size=this.spray?.45+age*.8:.65+age*.75;
   this.o.position.fromArray(this.pos,j);this.o.scale.set(size*1.3,size*.7,size);this.o.rotation.set(0,i,0);this.o.updateMatrix();this.batch.mesh.setMatrixAt(i,this.o.matrix);
   const near=Math.hypot(this.pos[j]-car.x,this.pos[j+2]-car.z);this.batch.alpha.setX(i,Math.min(.32,this.strength[i]*.32)*(1-age/life)*(cockpit&&near<4?.15:1));
  }this.batch.alpha.needsUpdate=true;this.batch.mesh.instanceMatrix.needsUpdate=true;
 }
}
export class JumpFountains{
 group=new T.Group();private batch=particles(FIREWORK_CAP,'#ffbc56');private o=new T.Object3D();private burst=-1;private origin=new T.Vector3();private right=new T.Vector3();private seen=new Set<number>();private previous=-1;
 constructor(private ramps:Ramp[],private points:T.Vector3[]){this.group.add(this.batch.mesh);this.group.visible=false;}
 reset(){this.burst=-1;this.previous=-1;this.seen.clear();this.group.visible=false;}
 update(dt:number,index:number,racing:boolean,reduced:boolean){
  if(dt<=0)return;
  if(racing&&!reduced){if(index<this.previous-300)this.seen.clear();for(const r of this.ramps)if(r.show&&!this.seen.has(r.index)&&this.previous>=0&&index>=r.index-5&&this.previous<r.index-5&&index-this.previous<30){this.seen.add(r.index);this.burst=0;this.origin.copy(this.points[r.index]);const d=this.points[r.index+1].clone().sub(this.points[r.index-1]).normalize();this.right.set(d.z,0,-d.x);}this.previous=index;}
  if(this.burst<0||reduced){this.group.visible=false;return;}this.burst+=dt;this.group.visible=this.burst<1.5;if(!this.group.visible)return;
  for(let i=0;i<FIREWORK_CAP;i++){const t=(this.burst+i*.008)%1,side=i%2?1:-1;this.o.position.copy(this.origin).addScaledVector(this.right,side*(10+Math.sin(i*4)*t*.9));this.o.position.y=.2+t*7-3*t*t;this.o.scale.set(.07,.16,.07);this.o.updateMatrix();this.batch.mesh.setMatrixAt(i,this.o.matrix);this.batch.alpha.setX(i,(1-t)*Math.min(1,(1.5-this.burst)*3));}this.batch.alpha.needsUpdate=true;this.batch.mesh.instanceMatrix.needsUpdate=true;
 }
}
/** One atlas and one instanced flag draw, with Nordic crosses and tricolours. */
export function internationalFlags(positions:T.Vector3[]){
 const group=new T.Group(),canvas=document.createElement('canvas');canvas.width=1024;canvas.height=64;const p=canvas.getContext('2d')!;
 const palettes=[['#1255a4','#f8ce38'],['#f5efdc','#2461a6'],['#c63c3b','#f5efdc'],['#f5efdc','#dc363a'],['#239259','#f5efdc','#db4942'],['#294a96','#f5efdc','#d74543'],['#282d32','#d33c37','#ebc13d'],['#f5efdc','#d3423e']];
 palettes.forEach((c,i)=>{const x=i*128;p.fillStyle=c[0];p.fillRect(x,0,128,64);if(i<3){p.fillStyle=c[1];p.fillRect(x+36,0,12,64);p.fillRect(x,26,128,12);}else if(i===3||i===7){p.fillStyle=c[1];p.beginPath();p.arc(x+64,32,17,0,Math.PI*2);p.fill();}else for(let k=0;k<3;k++){p.fillStyle=c[k];if(i===6)p.fillRect(x,k*64/3,128,64/3);else p.fillRect(x+k*128/3,0,128/3,64);}});
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const geo=new T.PlaneGeometry(2.6,1.3,4,1),uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,uv.getX(i)/8);const offsets=new T.InstancedBufferAttribute(new Float32Array(positions.map((_,i)=>i%8/8)),1);geo.setAttribute('flagOffset',offsets);
 const mat=new T.MeshStandardMaterial({map:texture,roughness:1,side:T.DoubleSide});mat.onBeforeCompile=s=>{s.vertexShader='attribute float flagOffset;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvMapUv.x+=flagOffset;');};mat.customProgramCacheKey=()=> 'rally-flags-v31';
 const flags=new T.InstancedMesh(geo,mat,positions.length),poles=new T.InstancedMesh(new T.CylinderGeometry(.05,.065,4,5),new T.MeshStandardMaterial({color:'#d4cdb6',roughness:1}),positions.length),o=new T.Object3D();
 positions.forEach((v,i)=>{o.position.copy(v).setY(v.y+2);o.rotation.set(0,0,0);o.updateMatrix();poles.setMatrixAt(i,o.matrix);o.position.copy(v).add(new T.Vector3(1.3,3.1,0));o.rotation.y=i*.73;o.updateMatrix();flags.setMatrixAt(i,o.matrix);});group.add(flags,poles);return group;
}
/** Small ground-level details outside the ranked driving corridor. */
export function roughShoulders(points:T.Vector3[],color:string,reserved:(x:number,z:number)=>boolean){
 const places:T.Vector3[]=[];
 for(let i=10;i<points.length-10;i+=5){const p=points[i],d=points[i+1].clone().sub(points[i-1]).normalize();for(const side of [-1,1]){const q=p.clone().add(new T.Vector3(d.z*side*(6.4+(i%7)*.2),0,-d.x*side*(6.4+(i%7)*.2)));if(!reserved(q.x,q.z)&&points.every(v=>Math.hypot(v.x-q.x,v.z-q.z)>6))places.push(q);}}
 const mesh=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshStandardMaterial({color,roughness:1}),places.length),o=new T.Object3D();places.forEach((p,i)=>{o.position.copy(p).setY(-.07);o.rotation.set(0,i,0);o.scale.set(.12+(i%4)*.04,.11,.15+(i%3)*.08);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});return mesh;
}

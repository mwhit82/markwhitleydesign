import * as T from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
export class DriverCamera{
 camera=new T.PerspectiveCamera(76,1,.04,300);cockpit=new T.Group();wheel:T.Group;enabled=false;blend=0;private hidden=new Map<T.Mesh,boolean>();
 private dash=new T.Group();private kartDash=new T.Group();private speedNeedle:T.Mesh;private rpmNeedle:T.Mesh;private bonnet:T.Mesh;private dialMaterial:T.MeshBasicMaterial;private limiter:T.Mesh;private lastAspect=0;private wheelAngle=0;
 constructor(){
  const dark=new T.MeshStandardMaterial({color:'#252e2d',roughness:.92}),trim=new T.MeshStandardMaterial({color:'#545d58',roughness:.85}),cream=new T.MeshStandardMaterial({color:'#d9d4c2',roughness:1});
  const box=(parent:T.Group,w:number,h:number,d:number,x:number,y:number,z:number,mat:T.Material)=>{const mesh=new T.Mesh(new RoundedBoxGeometry(w,h,d,1,Math.min(.035,h*.2)),mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
  this.cockpit.add(this.dash,this.kartDash);
  box(this.dash,1.65,.24,.42,0,-.60,-.76,dark);box(this.dash,.68,.25,.22,-.18,-.46,-.85,dark);
  for(const x of [-.64,.55])for(let i=0;i<4;i++)box(this.dash,.12,.012,.018,x,-.52+i*.022,-.535,trim);
  for(let i=0;i<4;i++)box(this.dash,.035,.045,.025,.22+i*.065,-.59,-.535,cream);
  box(this.kartDash,.55,.12,.12,0,-.52,-.73,dark);
  this.bonnet=box(this.cockpit,1.26,.07,.8,0,-.65,-1.35,new T.MeshStandardMaterial({color:'#3259a6',roughness:.85}));
  const wheel=this.wheel=new T.Group();wheel.position.set(-.18,-.49,-.49);this.cockpit.add(wheel);
  wheel.add(new T.Mesh(new T.TorusGeometry(.18,.023,6,24),dark));box(wheel,.075,.065,.035,0,0,0,trim);
  for(let i=0;i<3;i++){const spoke=box(wheel,.022,.15,.022,0,-.09,0,trim);spoke.rotation.z=i*Math.PI*2/3;spoke.position.set(Math.sin(i*Math.PI*2/3)*.09,-Math.cos(i*Math.PI*2/3)*.09,0);}
  for(const x of [-.17,.17])box(wheel,.065,.09,.065,x,.015,.02,cream);
  const face=new T.MeshBasicMaterial({color:'#141c1c'});for(const x of [-.34,-.06]){const dial=new T.Mesh(new T.CircleGeometry(.105,24),face);dial.position.set(x,-.435,-.726);this.dash.add(dial);}
  const needleMat=this.dialMaterial=new T.MeshBasicMaterial({color:'#efc773'});
  const needle=(x:number)=>{const geometry=new T.BoxGeometry(.007,.082,.005);geometry.translate(0,.035,0);const mesh=new T.Mesh(geometry,needleMat);mesh.position.set(x,-.435,-.715);this.cockpit.add(mesh);return mesh;};this.speedNeedle=needle(-.34);this.rpmNeedle=needle(-.06);
  this.limiter=new T.Mesh(new T.CircleGeometry(.013,8),new T.MeshBasicMaterial({color:'#593124'}));this.limiter.position.set(.08,-.43,-.716);this.cockpit.add(this.limiter);
  // Static dial ticks and markings share a single tiny texture; no canvas work during racing.
  if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');if(c){c.clearRect(0,0,512,128);c.fillStyle='#e5d8ba';c.font='bold 18px sans-serif';c.textAlign='center';for(const [cx,label] of [[128,'KM/H'],[384,'RPM']] as const){c.fillText(label,cx,108);for(let i=0;i<9;i++){const a=(-130+i*32.5)*Math.PI/180;c.save();c.translate(cx+Math.sin(a)*49,59-Math.cos(a)*49);c.rotate(a);c.fillRect(-2,-4,4,10);c.restore();}}const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;const labels=new T.Mesh(new T.PlaneGeometry(.55,.138),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));labels.position.set(-.20,-.435,-.713);this.dash.add(labels);}}
  // Merge fixed pieces per material. Keep wheel, needles and lamps independently animated.
  for(const parent of [this.dash,this.kartDash,this.wheel]){const batches=new Map<T.Material,T.Mesh[]>();for(const child of [...parent.children])if(child instanceof T.Mesh&&!Array.isArray(child.material)){const list=batches.get(child.material)??[];list.push(child);batches.set(child.material,list);}for(const [material,list] of batches){if(list.length<2)continue;const parts=list.map(m=>{m.updateMatrix();return m.geometry.clone().applyMatrix4(m.matrix);}),geometry=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());if(!geometry)continue;for(const m of list){parent.remove(m);m.geometry.dispose();}parent.add(new T.Mesh(geometry,material));}}
  this.camera.add(this.cockpit);
 }
 update(dt:number,vehicle:T.Group,angle:number,steer:number,base:T.Camera,active:boolean,reduced:boolean,w:number,h:number,kart:boolean,speed=0,rpm=950,limited=false,night=false,color='#3259a6'){
  const wanted=active&&this.enabled;this.blend=reduced?(wanted?1:0):T.MathUtils.clamp(this.blend+(wanted?1:-1)*dt/.45,0,1);
  if(!this.blend){for(const [mesh,visible] of this.hidden)mesh.visible=visible;this.hidden.clear();vehicle.visible=true;return base;}
  const anchor=vehicle.getObjectByName('cockpit_anchor');const eye=anchor?anchor.getWorldPosition(new T.Vector3()):vehicle.position.clone().add(new T.Vector3(0,kart?1.72:1.85,.15).applyAxisAngle(new T.Vector3(0,1,0),angle));
  const destination=new T.Quaternion().setFromEuler(new T.Euler(0,angle+Math.PI,0));
  const t=this.blend*this.blend*(3-2*this.blend);this.camera.position.copy(base.position).lerp(eye,t);this.camera.quaternion.copy(base.quaternion).slerp(destination,t);
  const aspect=w/Math.max(h,1);if(aspect!==this.lastAspect){this.lastAspect=aspect;this.camera.aspect=aspect;this.camera.updateProjectionMatrix();this.cockpit.scale.setScalar(aspect<1?.7:1);this.cockpit.position.set(0,.12,-.4);}this.cockpit.visible=this.blend>.96;this.dash.visible=!kart;this.kartDash.visible=kart;this.wheel.position.x=kart?0:-.18;this.wheelAngle=T.MathUtils.damp(this.wheelAngle,steer*.9,12,dt);this.wheel.rotation.z=this.wheelAngle;
  this.speedNeedle.visible=!kart;this.rpmNeedle.position.set(kart?0:-.06,kart?-.50:-.435,kart?-.66:-.715);this.speedNeedle.rotation.z=(130-Math.min(1,Math.abs(speed)/220)*260)*Math.PI/180;this.rpmNeedle.rotation.z=(130-Math.max(0,Math.min(1,(rpm-950)/6050))*260)*Math.PI/180;this.dialMaterial.color.set(night?'#aebd9a':'#efc773');(this.limiter.material as T.MeshBasicMaterial).color.set(limited?'#ff6941':'#593124');(this.bonnet.material as T.MeshStandardMaterial).color.set(color);vehicle.visible=true;if(this.blend>=.8){vehicle.traverse(o=>{if(o instanceof T.Mesh&&!this.hidden.has(o)){this.hidden.set(o,o.visible);o.visible=false;}});}else{for(const [mesh,visible] of this.hidden)mesh.visible=visible;this.hidden.clear();}
  return this.camera;
 }
 dispose(){this.camera.removeFromParent();const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();this.cockpit.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});for(const m of materials){for(const value of Object.values(m))if(value instanceof T.Texture)textures.add(value);m.dispose();}geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());}
}

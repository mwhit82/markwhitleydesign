import * as T from 'three';
export class DriverCamera{
 camera=new T.PerspectiveCamera(76,1,.04,300);cockpit=new T.Group();wheel:T.Mesh;enabled=false;blend=0;private hidden=new Map<T.Mesh,boolean>();
 constructor(){
  const mat=new T.MeshStandardMaterial({color:'#303936',roughness:.9});
  const dash=new T.Mesh(new T.BoxGeometry(1.5,.3,.5),mat);dash.position.set(0,-.55,-.65);this.cockpit.add(dash);
  const wheel=this.wheel=new T.Mesh(new T.TorusGeometry(.2,.035,6,20),mat);wheel.position.set(-.25,-.4,-.52);this.cockpit.add(wheel);
  for(const x of [-.42,-.08]){const hand=new T.Mesh(new T.SphereGeometry(.055,8,6),new T.MeshStandardMaterial({color:'#dedbc9'}));hand.position.set(x,-.4,-.5);this.cockpit.add(hand);}
  const bonnet=new T.Mesh(new T.BoxGeometry(1.3,.1,1),new T.MeshStandardMaterial({color:'#727e77'}));bonnet.position.set(0,-.64,-1.1);this.cockpit.add(bonnet);
  this.camera.add(this.cockpit);
 }
 update(dt:number,vehicle:T.Group,angle:number,steer:number,base:T.Camera,active:boolean,reduced:boolean,w:number,h:number,kart:boolean){
  const wanted=active&&this.enabled;this.blend=reduced?(wanted?1:0):T.MathUtils.clamp(this.blend+(wanted?1:-1)*dt/.45,0,1);
  if(!this.blend){for(const [mesh,visible] of this.hidden)mesh.visible=visible;this.hidden.clear();vehicle.visible=true;return base;}
  const eye=vehicle.position.clone().add(new T.Vector3(0,kart?1.72:1.85,.15).applyAxisAngle(new T.Vector3(0,1,0),angle));
  const destination=new T.Quaternion().setFromEuler(new T.Euler(0,angle+Math.PI,0));
  const t=this.blend*this.blend*(3-2*this.blend);this.camera.position.copy(base.position).lerp(eye,t);this.camera.quaternion.copy(base.quaternion).slerp(destination,t);
  this.camera.aspect=w/Math.max(h,1);this.camera.updateProjectionMatrix();this.cockpit.visible=this.blend>.96;this.cockpit.children[0].visible=!kart;this.wheel.rotation.z=steer*.6;vehicle.visible=true;if(this.blend>=.8){vehicle.traverse(o=>{if(o instanceof T.Mesh&&!this.hidden.has(o)){this.hidden.set(o,o.visible);o.visible=false;}});}else{for(const [mesh,visible] of this.hidden)mesh.visible=visible;this.hidden.clear();}
  return this.camera;
 }
 dispose(){this.camera.removeFromParent();this.cockpit.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose();}});}
}

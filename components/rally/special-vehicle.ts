import * as T from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
/** Tiny offline-safe silhouettes for optional GLB failures. */
export function specialVehicle(bike:boolean){
 const root=new T.Group(),paint=new T.MeshStandardMaterial({color:bike?'#d79a38':'#171c23',roughness:.8}),dark=new T.MeshStandardMaterial({color:'#283234',roughness:.9}),cream=new T.MeshStandardMaterial({color:'#e8d7b9',roughness:.85});
 const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:T.Material)=>{const o=new T.Mesh(new RoundedBoxGeometry(w,h,d,1,.06),m);o.position.set(x,y,z);root.add(o);return o;};
 const eye=new T.Object3D();eye.name='cockpit_anchor';eye.position.set(0,bike?1.95:1.65,.1);root.add(eye);
 if(bike){box(.48,.55,.8,0,1,0,paint);box(.42,.14,1.1,0,1.48,-.25,dark);box(.5,.1,.85,0,1.16,1,paint);box(.5,.7,.4,0,1.83,-.25,dark);const helmet=new T.Mesh(new T.SphereGeometry(.29,10,6),paint);helmet.position.set(0,2.35,0);root.add(helmet);box(1,.07,.07,0,1.65,.6,cream);for(const z of [-1.05,1.05]){const wheel=new T.Mesh(new T.CylinderGeometry(.52,.52,.24,14),dark);wheel.rotation.z=Math.PI/2;wheel.position.set(0,.53,z);root.add(wheel);}}
 else{
  const oval=(x:number,y:number,z:number,sx:number,sy:number,sz:number,m:T.Material,parent:T.Object3D=root)=>{const mesh=new T.Mesh(new T.SphereGeometry(1,20,10),m);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh;};
  oval(0,.72,0,.66,.29,2.08,paint);oval(0,1.02,-.13,.53,.32,1.14,dark);
  for(const side of [-1,1])for(const z of [-1.3,1.3]){
   oval(side*.65,.61,z*.83,.42,.1,.2,paint);
   const pod=new T.Group();pod.name=`hover_pod_${z>0?'front':'rear'}_${side<0?'left':'right'}`;pod.position.set(side*.8,.64,z);pod.rotation.z=-side*Math.PI/15;root.add(pod);
   const duct=new T.Mesh(new T.TorusGeometry(.33,.07,8,24),paint);duct.rotation.x=Math.PI/2;pod.add(duct);
   oval(0,-.04,0,.085,.105,.085,cream,pod);
   for(let i=0;i<7;i++){const blade=new T.Mesh(new T.BoxGeometry(.07,.025,.23),dark),a=i*Math.PI*2/7;blade.position.set(.14*Math.sin(a),-.04,.14*Math.cos(a));blade.rotation.y=a;pod.add(blade);}
  }
  for(const [z,color,name] of [[1.99,'#d9f5ff','headlamp_front_bar'],[-1.99,'#ef3926','taillamp_rear_bar']] as const){oval(0,.72,z*.925,.56,.10,.22,paint);const m=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:1,roughness:.65});box(1.04,.07,.06,0,.76,z,m).name=name;}
 }

 return root;
}

/** One shadow-free emitter per continuous light bar, front white and rear red. */
export function addHoverLights(root:T.Group,intensity:number){
 const front=new T.SpotLight('#d9f5ff',intensity,28,Math.PI/4,.8,1);
 const rear=new T.SpotLight('#ef3926',intensity*.16,9,Math.PI/3,.9,1);rear.userData.runningIntensity=intensity*.16;
 for(const [light,z,reach,name] of [[front,2.2,18,'hover-front-light'],[rear,-2.2,-8,'hover-rear-light']] as const){light.name=name;light.position.set(0,.78,z);light.target.position.set(0,-.65,reach);light.castShadow=false;root.add(light,light.target);}
 return rear;
}

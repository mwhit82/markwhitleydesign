import * as T from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
/** Tiny offline-safe silhouettes for optional GLB failures. */
export function specialVehicle(bike:boolean){
 const root=new T.Group(),paint=new T.MeshStandardMaterial({color:bike?'#d79a38':'#171c23',roughness:.8}),dark=new T.MeshStandardMaterial({color:'#283234',roughness:.9}),cream=new T.MeshStandardMaterial({color:'#e8d7b9',roughness:.85});
 const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:T.Material)=>{const o=new T.Mesh(new RoundedBoxGeometry(w,h,d,1,.06),m);o.position.set(x,y,z);root.add(o);return o;};
 const eye=new T.Object3D();eye.name='cockpit_anchor';eye.position.set(0,bike?1.95:1.65,.1);root.add(eye);
 if(bike){box(.48,.55,.8,0,1,0,paint);box(.42,.14,1.1,0,1.48,-.25,dark);box(.5,.1,.85,0,1.16,1,paint);box(.5,.7,.4,0,1.83,-.25,dark);const helmet=new T.Mesh(new T.SphereGeometry(.29,10,6),paint);helmet.position.set(0,2.35,0);root.add(helmet);box(1,.07,.07,0,1.65,.6,cream);for(const z of [-1.05,1.05]){const wheel=new T.Mesh(new T.CylinderGeometry(.52,.52,.24,14),dark);wheel.rotation.z=Math.PI/2;wheel.position.set(0,.53,z);root.add(wheel);}}
 else{box(2.1,.40,4.25,0,.7,0,paint);box(1.45,.45,1.8,0,1.07,-.1,dark);for(const x of [-1.01,1.01])for(const z of [-1.25,1.18])box(.26,.18,.75,x,.43,z,paint);for(const [z,color,name] of [[2.16,'#d9f5ff','headlamp_front_bar'],[-2.16,'#ef3926','taillamp_rear_bar']] as const){const m=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:1,roughness:.65});box(1.8,.095,.07,0,.75,z,m).name=name;}}
 return root;
}

/** One shadow-free emitter per continuous light bar, front white and rear red. */
export function addHoverLights(root:T.Group,intensity:number){
 const front=new T.SpotLight('#d9f5ff',intensity,28,Math.PI/4,.8,1);
 const rear=new T.SpotLight('#ef3926',intensity*.16,9,Math.PI/3,.9,1);rear.userData.runningIntensity=intensity*.16;
 for(const [light,z,reach,name] of [[front,2.2,18,'hover-front-light'],[rear,-2.2,-8,'hover-rear-light']] as const){light.name=name;light.position.set(0,.78,z);light.target.position.set(0,-.65,reach);light.castShadow=false;root.add(light,light.target);}
 return rear;
}

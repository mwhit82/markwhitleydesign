import * as T from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
/** Tiny offline-safe silhouettes for optional GLB failures. */
export function specialVehicle(bike:boolean){
 const root=new T.Group(),paint=new T.MeshStandardMaterial({color:bike?'#d79a38':'#7060bc',roughness:.8}),dark=new T.MeshStandardMaterial({color:'#283234',roughness:.9}),cream=new T.MeshStandardMaterial({color:'#e8d7b9',roughness:.85});
 const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:T.Material)=>{const o=new T.Mesh(new RoundedBoxGeometry(w,h,d,1,.06),m);o.position.set(x,y,z);root.add(o);return o;};
 const eye=new T.Object3D();eye.name='cockpit_anchor';eye.position.set(0,bike?1.95:1.65,.1);root.add(eye);
 if(bike){box(.48,.55,.8,0,1,0,paint);box(.42,.14,1.1,0,1.48,-.25,dark);box(.5,.1,.85,0,1.16,1,paint);box(.5,.7,.4,0,1.83,-.25,dark);const helmet=new T.Mesh(new T.SphereGeometry(.29,10,6),paint);helmet.position.set(0,2.35,0);root.add(helmet);box(1,.07,.07,0,1.65,.6,cream);for(const z of [-1.05,1.05]){const wheel=new T.Mesh(new T.CylinderGeometry(.52,.52,.24,14),dark);wheel.rotation.z=Math.PI/2;wheel.position.set(0,.53,z);root.add(wheel);}}
 else{box(2.2,.48,3.8,0,.7,0,paint);box(1.5,.55,1.8,0,1.16,-.1,dark);for(const x of [-1.05,1.05])for(const z of [-1.3,1.3])box(.5,.3,.8,x,.4,z,cream);}
 return root;
}

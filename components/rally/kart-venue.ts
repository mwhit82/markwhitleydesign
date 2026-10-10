import * as T from 'three';
import type {StageSelection} from './stages';
// Each route/direction exits through a clear straight beside the start, then
// crosses underneath that straight into its own service bay.
const exits=[[40,-1,40,1],[35,-1,60,1],[40,-1,35,1]] as const;
export function kartFinishLayout(points:T.Vector3[],selection:StageSelection){
 const spec=exits[(selection.track??1)-1],index=spec[selection.reverse?2:0],side=spec[selection.reverse?3:1];
 const crossing=points[index].clone(),tangent=points[index+3].clone().sub(points[index-3]).normalize();
 const normal=new T.Vector3(tangent.z,0,-tangent.x).multiplyScalar(side);
 const at=(d:number,y=0)=>crossing.clone().addScaledVector(normal,d).setY(y);
 const finish=points[650].clone(),direction=finish.clone().sub(points[642]).normalize();
 const lead=finish.clone().addScaledVector(direction,9),entry=at(22),center=at(-32);
 const approach=new T.CurvePath<T.Vector3>();
 approach.add(new T.CubicBezierCurve3(finish,lead,entry.clone().addScaledVector(normal,12),entry));
 // Linear grade segments have exact projected openings, without spline overshoot.
 const path=[entry,at(18),at(7,-4),at(-7,-4),at(-18),center];
 for(let i=1;i<path.length;i++)approach.add(new T.LineCurve3(path[i-1],path[i]));
 const angle=Math.atan2(-normal.x,-normal.z);
 return {finish,direction,center,angle,approach,crossing,normal,tangent};
}
export type KartFinish=ReturnType<typeof kartFinishLayout>;
export function kartFloor(layout:KartFinish){
 const shape=new T.Shape();shape.moveTo(-120,-120);shape.lineTo(120,-120);shape.lineTo(120,120);shape.lineTo(-120,120);shape.closePath();
 for(const sign of [-1,1]){
  const hole=new T.Path();
  for(const [i,[d,w]] of [[7,-4.7],[20,-4.7],[20,4.7],[7,4.7]].entries()){
   const p=layout.crossing.clone().addScaledVector(layout.normal,sign*d).addScaledVector(layout.tangent,w);if(i===0)hole.moveTo(p.x,-p.z);else hole.lineTo(p.x,-p.z);
  }hole.closePath();shape.holes.push(hole);
 }
 const floor=new T.Mesh(new T.ShapeGeometry(shape),new T.MeshStandardMaterial({color:'#636664',roughness:.96}));floor.rotation.x=-Math.PI/2;floor.position.y=-.3;floor.receiveShadow=true;
 const group=new T.Group();group.add(floor);
 const box=(w:number,h:number,d:number,color:string,p:T.Vector3,angle=0)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:.94}));mesh.position.copy(p);mesh.rotation.y=angle;mesh.receiveShadow=true;group.add(mesh);return mesh;};
 box(240,.4,240,'#343b3a',new T.Vector3(0,-4.7,0));
 // Solid deck preserves depth occlusion above the tunnel; racing height is unchanged.
 box(10,.35,14.2,'#4e555b',layout.crossing.clone().setY(-.14),layout.angle);
 for(const sign of [-1,1]){
  const center=layout.crossing.clone().addScaledVector(layout.tangent,sign*4.55).setY(-2.1);
  box(.35,4.2,40,'#727775',center,layout.angle);
  const portal=layout.crossing.clone().addScaledVector(layout.normal,sign*7).setY(-.15);
  box(9.5,.35,.6,'#343b3a',portal,layout.angle);
  // Warm portal fittings; emissive only, no extra lights or shadows.
  const strip=box(7,.12,.15,'#f0deb0',portal.clone().setY(-.5),layout.angle);(strip.material as T.MeshStandardMaterial).emissive.set('#d8bc82');
 }
 return group;
}
/** Ordered checkpoint cursor bounds the display; it never completes a lap. */
export function kartLapProgress(index:number,checkpoint:number,checkpoints:readonly number[]){
 const lower=checkpoint?checkpoints[Math.min(checkpoint-1,checkpoints.length-1)]:0;
 const upper=checkpoints[Math.min(checkpoint,checkpoints.length-1)]??650;
 return T.MathUtils.clamp(Math.max(lower,Math.min(upper,index))/650,0,1);
}

/** Contour the union of road corridors: simple offsets fold at tight inside bends. */
export function kartBarrierSegments(points:T.Vector3[],reserved:(x:number,z:number)=>boolean){
 const size=81,step=2,origin=-80,values=new Float32Array(size*size);
 for(let z=0;z<size;z++)for(let x=0;x<size;x++){
  const px=origin+x*step,pz=origin+z*step;let d=Infinity;
  for(const p of points)d=Math.min(d,(p.x-px)**2+(p.z-pz)**2);values[z*size+x]=Math.sqrt(d)-7;
 }
 const segments:{p:T.Vector3;angle:number;length:number;normal:T.Vector3}[]=[];
 for(let z=0;z<size-1;z++)for(let x=0;x<size-1;x++){
  const corners=[[x,z],[x+1,z],[x+1,z+1],[x,z+1]],cross:T.Vector3[]=[];
  for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4],va=values[a[1]*size+a[0]],vb=values[b[1]*size+b[0]];if((va<0)===(vb<0))continue;
   const t=va/(va-vb);cross.push(new T.Vector3(origin+(a[0]+(b[0]-a[0])*t)*step,0,origin+(a[1]+(b[1]-a[1])*t)*step));
  }
  for(let i=0;i+1<cross.length;i+=2){const a=cross[i],b=cross[i+1],p=a.clone().lerp(b,.5),length=a.distanceTo(b);if(length<.03||reserved(p.x,p.z))continue;
   let nearest=points[0],distance=Infinity;for(const q of points){const d=q.distanceToSquared(p);if(d<distance){distance=d;nearest=q;}}
   segments.push({p,angle:Math.atan2(b.x-a.x,b.z-a.z),length,normal:p.clone().sub(nearest).normalize()});
  }
 }
 return segments;
}

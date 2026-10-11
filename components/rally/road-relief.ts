import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {rampHeight,legacyRamps,type Ramp} from './jumps';
/** Localised tessellation shares the road texture's world UVs. The flat stamped
 * route remains intact beneath raised earth; only the three crests need triangles. */
export function roadRelief(points:T.Vector3[],ramps:Ramp[]=legacyRamps){
 const roadParts:T.BufferGeometry[]=[new T.PlaneGeometry(170,160)],earthParts:T.BufferGeometry[]=[];
 const sides=[-13,-8,-5.6,0,5.6,8,13];
 for(const ramp of ramps)for(const earth of [false,true]){
  const middle=ramp.index,half=ramp.half??12;
  const vertices:number[]=[],uv:number[]=[],indices:number[]=[];
  for(let index=middle-half;index<=middle+half;index++){
   const p=points[index],direction=points[index+1].clone().sub(points[index-1]).normalize();
   for(const side of sides){const x=p.x+direction.z*side,z=p.z-direction.x*side;
    const height=rampHeight(index,ramps)*T.MathUtils.clamp(((earth?13:8)-Math.abs(side))/(earth?7.4:2.4),0,1)+(earth?-.34:.015);
    vertices.push(x,-z,height);uv.push((x+85)/170,(80-z)/160);
   }
   if(index<middle+half){const n=(index-middle+half)*sides.length;for(let j=0;j<sides.length-1;j++)indices.push(n+j,n+j+7,n+j+1,n+j+1,n+j+7,n+j+8);}
  }
  for(let i=0;i<indices.length;i+=3){const [a,b,c]=indices.slice(i,i+3).map(n=>n*3);if((vertices[b]-vertices[a])*(vertices[c+1]-vertices[a+1])-(vertices[b+1]-vertices[a+1])*(vertices[c]-vertices[a])<0)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();(earth?earthParts:roadParts).push(geo);
 }
 const road=mergeGeometries(roadParts)!,earth=earthParts.length?mergeGeometries(earthParts)!:new T.BufferGeometry();[...roadParts,...earthParts].forEach(g=>g.dispose());return {road,earth};
}

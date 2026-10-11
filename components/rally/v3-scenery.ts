import * as T from 'three';
import type {StageSelection} from './stages';
export function environmentScenery(s:StageSelection,points:T.Vector3[],reserved:(x:number,z:number)=>boolean){
 const group=new T.Group(),geometries=new Map<string,T.BoxGeometry>(),materials=new Map<string,T.MeshStandardMaterial>();
 const box=(w:number,h:number,d:number,color:string,x:number,y:number,z:number)=>{const key=`${w},${h},${d}`;if(!geometries.has(key))geometries.set(key,new T.BoxGeometry(w,h,d));if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.92}));const m=new T.Mesh(geometries.get(key),materials.get(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};
 const clear=(x:number,z:number,r=10)=>!reserved(x,z)&&points.every(p=>Math.hypot(p.x-x,p.z-z)>r);
 const snow=s.weather==='snow';
 const treeGeo=new T.IcosahedronGeometry(3,1),treeMat=new T.MeshStandardMaterial({color:snow?'#dee8df':'#4d704d',roughness:1});
 if(s.stage==='kart'){
  // Hills remain beyond the unchanged, level circuits and service lane.
  const hillGeo=new T.SphereGeometry(1,12,8),hillMat=new T.MeshStandardMaterial({color:snow?'#dbe3dc':'#718957',roughness:1});
  for(let i=0;i<18;i++){const a=i/18*Math.PI*2,x=Math.cos(a)*101,z=Math.sin(a)*100;if(!clear(x,z,23))continue;const hill=new T.Mesh(hillGeo,hillMat);hill.position.set(x,-2,z);hill.scale.set(19,7+i%4*2,17);hill.receiveShadow=true;group.add(hill);}
  for(let x=-90;x<=90;x+=9)for(let z=-85;z<=85;z+=17){if(!clear(x,z,16))continue;box(.7,4,.7,'#79684c',x,1.7,z);const crown=new T.Mesh(treeGeo,treeMat);crown.position.set(x,4,z);group.add(crown);}
  for(let i=-12;i<=12;i++){box(6,1.4,1,'#899082',i*7,.4,-91);box(6,2,2,snow?'#d3ded2':'#536e46',i*7,.7,91);}
  for(let i=20;i<650;i+=42){const p=points[i],d=points[i+1].clone().sub(p).normalize(),n=new T.Vector3(d.z,0,-d.x);const q=p.clone().addScaledVector(n,11);if(!clear(q.x,q.z,8))continue;box(.3,4,.3,'#5d665c',q.x,1.7,q.z);const lamp=box(1.5,.3,.7,'#f2dda4',q.x,3.8,q.z);lamp.material.emissive.set('#f2dda4');lamp.material.emissiveIntensity=1;}
  box(12,4,8,'#b7a484',83,1.7,70);box(14,.6,10,'#4e5c52',83,4,70);
 }else{
  for(let x=-75;x<=75;x+=25)for(let z=-66;z<=66;z+=22){if(!clear(x,z,15))continue;const h=9+((x+z+160)%4)*3,color=['#a87968','#a99e87','#777f83'][Math.abs(x+z)%3];
   box(12,h,12,color,x,h/2-.3,z);box(13,.5,13,'#d5c6a5',x,h,z);
   for(let y=3;y<h-1;y+=3)for(const dx of [-3,0,3]){const win=box(1.3,1.5,.12,'#e3d39a',x+dx,y,z+6.1);win.material.emissive.set('#b99557');win.material.emissiveIntensity=.35;}
   for(let y=3;y<h-1;y+=3){box(3,.15,1.5,'#394541',x+6.2,y,z);box(.15,2.7,.15,'#394541',x+7,y-1.3,z+.6);}
   if(x>0&&z<0){const ad=box(9,4,.3,'#c85140',x,h-1,z+6.4);ad.material.emissive.set('#ab3927');ad.material.emissiveIntensity=.4;box(7,1,.4,'#f0cf6c',x,h-1,z+6.6);}
  }
  for(const index of [75,155,260,390,480,570]){const p=points[index],d=points[index+1].clone().sub(p).normalize(),n=new T.Vector3(d.z,0,-d.x);for(let j=-4;j<=4;j++){const stripe=box(.6,.025,4,'#e3dfc8',p.x+n.x*j,.12,p.z+n.z*j);stripe.rotation.y=Math.atan2(d.x,d.z);}
   const q=p.clone().addScaledVector(n,10);if(clear(q.x,q.z,8)){box(.25,6,.25,'#45504d',q.x,2.7,q.z);const lamp=box(2,.25,.8,'#f4dc9b',q.x,5.8,q.z);lamp.material.emissive.set('#f4dc9b');lamp.material.emissiveIntensity=1;}}
  for(const [x,z] of [[-74,-20],[76,25],[30,73]])if(clear(x,z,9)){box(2.5,.8,5,'#dcb941',x,.7,z);box(2,.7,2.5,'#c5a847',x,1.4,z);box(1.8,.4,2,'#465959',x,1.55,z+.1);}
 }
 return group;
}

import * as T from 'three';
import type {CheckpointEvent} from './checkpoints';
export class CheckpointEffects {
 group=new T.Group();
 private flags:{mesh:T.Mesh;original:T.Material|T.Material[]}[][]=Array.from({length:18},()=>[]);
 private states=new Set<number>();
 private materials:Record<'accepted'|'missed',T.MeshStandardMaterial>;
 private particles:T.InstancedMesh;
 private positions=Array.from({length:96},()=>new T.Vector3());
 private velocities=Array.from({length:96},()=>new T.Vector3());
 private life=new Float32Array(96);
 private cursor=0;
 private dirty=true;
 private dummy=new T.Object3D();
 constructor(private reduced:boolean){
  const material=(symbol:string,color:string)=>{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d')!;
   c.fillStyle=color;c.fillRect(0,0,64,64);c.fillStyle='#fff0d4';c.font='bold 52px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(symbol,32,35);
   const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;return new T.MeshStandardMaterial({map,roughness:1,emissive:color,emissiveIntensity:.35});
  };
  this.materials={accepted:material('✓','#247250'),missed:material('!','#a76816')};
  this.particles=new T.InstancedMesh(new T.PlaneGeometry(.16,.28),new T.MeshBasicMaterial({side:T.DoubleSide}),96);
  this.particles.frustumCulled=false;this.particles.instanceMatrix.setUsage(T.DynamicDrawUsage);
  const colors=['#f9c447','#e95c40','#73c5ac','#f8eed6'];
  for(let i=0;i<96;i++)this.particles.setColorAt(i,new T.Color(colors[i%4]));
  this.group.add(this.particles);this.update(0);
 }
 register(index:number,mesh:T.Mesh){this.flags[index].push({mesh,original:mesh.material});}
 emit(events:CheckpointEvent[]){
  for(const event of events){
   const index=event.checkpoint-1;if(this.states.has(index))continue;this.states.add(index);this.dirty=true;
   for(const flag of this.flags[index]){
    flag.mesh.material=this.materials[event.outcome];
    if(event.outcome==='accepted'&&!this.reduced)for(let j=0;j<24;j++){
     const i=this.cursor++%96;this.positions[i].copy(flag.mesh.position);this.velocities[i].set((Math.random()-.5)*4,3+Math.random()*3,(Math.random()-.5)*4);this.life[i]=1.25;
    }
   }
  }
 }
 reset(){this.dirty=true;this.states.clear();this.life.fill(0);for(const pair of this.flags)for(const f of pair)f.mesh.material=f.original;this.update(0);}
 update(dt:number){
  if(!this.dirty&&!this.particles.visible)return;
  this.dirty=false;let live=false;
  for(let i=0;i<96;i++){
   this.life[i]=Math.max(0,this.life[i]-dt);const alive=this.life[i]>0;live ||= alive;
   if(alive){this.velocities[i].y-=dt*6;this.positions[i].addScaledVector(this.velocities[i],dt);}
   this.dummy.position.copy(this.positions[i]);this.dummy.scale.setScalar(alive?Math.min(1,this.life[i]*3):0);this.dummy.rotation.set(i+this.life[i]*4,i,this.life[i]*2);this.dummy.updateMatrix();this.particles.setMatrixAt(i,this.dummy.matrix);
  }
  this.particles.visible=live;this.particles.instanceMatrix.needsUpdate=true;
 }
 dispose(){for(const m of Object.values(this.materials)){m.map?.dispose();m.dispose();}for(const pair of this.flags)for(const f of pair){const m=Array.isArray(f.original)?f.original:[f.original];m.forEach(material=>material.dispose());}}
}

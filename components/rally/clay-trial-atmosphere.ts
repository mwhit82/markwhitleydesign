import * as T from 'three';
/** Billboard plumes with bounded lifetime and approximate head/brake-light scattering. */
export class TrialDust {
 readonly mesh:T.InstancedMesh;
 readonly capacity=120;
 private particles=Array.from({length:120},()=>({x:0,y:0,z:0,vx:0,vz:0,age:9,life:5,size:1}));
 private cursor=0;private emitTime=0;
 private dummy=new T.Object3D();private colour=new T.Color();
 private alpha=new T.InstancedBufferAttribute(new Float32Array(120),1);
 constructor(){
  const geometry=new T.PlaneGeometry(1,1);geometry.setAttribute('opacity',this.alpha);
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,vertexColors:true,uniforms:{car:{value:new T.Vector3()},night:{value:0},brake:{value:0}},vertexShader:`
   attribute float opacity;varying vec2 uvDust;varying float opacityDust;varying vec3 tint;varying vec3 world;
   void main(){uvDust=uv;opacityDust=opacity;tint=instanceColor;vec4 p=modelMatrix*instanceMatrix*vec4(position,1.);world=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
  fragmentShader:`
   uniform vec3 car;uniform float night,brake;varying vec2 uvDust;varying float opacityDust;varying vec3 tint;varying vec3 world;
   void main(){vec2 p=uvDust*2.-1.;float edge=1.-smoothstep(.2,1.,length(p));float noise=.75+.25*sin(p.x*11.+sin(p.y*9.))*sin(p.y*13.+p.x*5.);float a=edge*edge*noise*opacityDust;
    if(a<.005)discard;
    vec3 d=world-car;float front=step(d.z,-1.7)*exp(-abs(d.z+4.)*.16)*exp(-d.x*d.x/max(1.,d.z*d.z*.15))*exp(-abs(d.y)*.8);
    float rear=step(1.5,d.z)*exp(-length(vec3(d.x,d.y,d.z-2.))*1.1);
    vec3 c=mix(tint,tint*.17,night)+night*front*vec3(.62,.53,.32)+rear*(.08*night+.8*brake)*vec3(1.,.055,.018);
    gl_FragColor=vec4(c,a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
  this.mesh=new T.InstancedMesh(geometry,material,this.capacity);this.mesh.frustumCulled=false;this.mesh.renderOrder=4;
  for(let i=0;i<this.capacity;i++)this.mesh.setColorAt(i,this.colour.set('#b9a080'));
  this.reset();
 }
 reset(){this.emitTime=0;this.cursor=0;this.particles.forEach(p=>p.age=9);this.alpha.array.fill(0);this.alpha.needsUpdate=true;}
 update(dt:number,position:T.Vector3,speed:number,wet:boolean,night:boolean,braking:boolean,reduced:boolean,camera:T.Camera,contacts:{x:number;z:number;y:number;water:boolean}[]){
  const uniforms=(this.mesh.material as T.ShaderMaterial).uniforms;uniforms.car.value.copy(position);uniforms.night.value=night?1:0;uniforms.brake.value=braking?1:0;
  this.emitTime+=dt;
  const interval=reduced?.18:.045;
  if(Math.abs(speed)>.35&&this.emitTime>=interval){this.emitTime=0;for(const w of contacts){if(w.water)continue;const p=this.particles[this.cursor++%this.capacity];Object.assign(p,{x:w.x,y:w.y+.22,z:w.z,vx:Math.sign(w.x)*(.15+Math.random()*.3),vz:speed*.12,age:0,life:wet?1.4:4+Math.random()*2,size:wet?.7:1.6+Math.random()*.6});}}
  for(let i=0;i<this.capacity;i++){const p=this.particles[i];p.age+=dt;const alive=p.age<p.life;if(alive){p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=dt*(wet?.08:.28);}
   this.dummy.position.set(p.x,p.y,p.z);this.dummy.quaternion.copy(camera.quaternion);this.dummy.scale.setScalar(alive?Math.min(4,p.size*(.55+p.age*.65)):0);this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);
   this.alpha.setX(i,alive?Math.min(1,p.age/.14)*Math.pow(1-p.age/p.life,1.3)*(wet?.13:reduced?.14:.32):0);
  }this.alpha.needsUpdate=true;this.mesh.instanceMatrix.needsUpdate=true;
 }
 dispose(){this.mesh.geometry.dispose();(this.mesh.material as T.Material).dispose();}
}

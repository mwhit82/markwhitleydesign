import * as T from 'three';
import type {TrialTerrain} from './clay-trial-physics';
/** One throttled planar reflection shared by the two shallow pools. */
export class TrialWater {
 readonly group=new T.Group();
 private target=new T.WebGLRenderTarget(512,512,{type:T.HalfFloatType});
 private matrix=new T.Matrix4();
 private elapsed=1;private time=0;private night=false;
 private mirror:T.Camera|null=null;
 private clip=[new T.Plane(new T.Vector3(0,1,0),.022)];
 private waveData=Array.from({length:32},()=>new T.Vector4(0,0,5,0));
 private uniforms={reflection:{value:this.target.texture},reflectionMatrix:{value:this.matrix},time:{value:0},eye:{value:new T.Vector3()},tint:{value:new T.Color('#667c80')},waves:{value:this.waveData},sun:{value:new T.Vector3(-.4,.8,-.2).normalize()}};
 constructor(puddles:TrialTerrain['puddles']){
  for(const p of puddles){const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:this.uniforms,vertexShader:`
   varying vec3 world; varying vec2 local; varying vec4 reflectionUv; uniform mat4 reflectionMatrix;
   void main(){vec4 w=modelMatrix*vec4(position,1.);world=w.xyz;local=position.xy;reflectionUv=reflectionMatrix*w;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`
   uniform sampler2D reflection;uniform float time;uniform vec3 eye,tint,sun;uniform vec4 waves[32];
   varying vec3 world;varying vec2 local;varying vec4 reflectionUv;
   void main(){
    vec2 slope=vec2(sin(world.x*17.+world.z*8.+time*1.5),cos(world.z*19.-world.x*6.+time*1.2))*.013;
    float foam=0.;
    for(int i=0;i<32;i++){vec2 delta=world.xz-waves[i].xy;float d=length(delta),age=waves[i].z;float ring=exp(-pow((d-age*.9)/.11,2.))*max(0.,1.-age/1.3)*waves[i].w;
     slope+=normalize(delta+vec2(.001))*ring*.16;foam+=ring*.09;}
    vec3 n=normalize(vec3(slope.x,1.,slope.y)),v=normalize(eye-world);
    float fresnel=.13+.64*pow(1.-max(dot(v,n),0.),3.);
    vec2 uv=reflectionUv.xy/reflectionUv.w+slope*.009;
    vec3 reflected=texture2D(reflection,clamp(uv,vec2(.002),vec2(.998))).rgb;
    float glint=pow(max(dot(reflect(-sun,n),v),0.),100.)*.18;
    vec3 colour=mix(tint*.28,reflected,fresnel)+vec3(foam)+glint;
    float alpha=1.-smoothstep(.90,1.,length(local));
    gl_FragColor=vec4(colour,alpha*.94);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});const mesh=new T.Mesh(new T.CircleGeometry(1,64),material);mesh.rotation.x=-Math.PI/2;mesh.scale.set(p.rx,p.rz,1);mesh.position.set(p.x,p.level,p.z);mesh.renderOrder=2;this.group.add(mesh);}
 }
 lighting(night:boolean,rain:boolean){this.night=night;this.uniforms.tint.value.set(night?'#243c49':rain?'#708c91':'#8ca4a2');}
 update(dt:number,rings:{x:number;z:number;age:number}[],renderer:T.WebGLRenderer,scene:T.Scene,camera:T.Camera,hidden:T.Object3D[]){
  this.time+=dt;this.elapsed+=dt;this.uniforms.time.value=this.time;camera.getWorldPosition(this.uniforms.eye.value);
  rings.forEach((r,i)=>this.waveData[i]?.set(r.x,r.z,r.age,this.night?.55:1));
  if(this.elapsed<1/15)return;this.elapsed=0;
  if(!this.mirror||this.mirror.type!==camera.type)this.mirror=camera.clone();
  const mirror:T.Camera=this.mirror;
  mirror.copy(camera,false);const target=new T.Vector3();camera.getWorldDirection(target);target.add(camera.position);mirror.position.copy(camera.position);mirror.position.y=-.07-camera.position.y;target.y=-.07-target.y;mirror.up.copy(camera.up);mirror.up.y*=-1;mirror.lookAt(target);mirror.updateMatrixWorld(true);
  this.matrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);
  const objects=[this.group,...hidden],visibility=objects.map(o=>o.visible),oldTarget=renderer.getRenderTarget(),oldClip=renderer.clippingPlanes,oldShadow=renderer.shadowMap.autoUpdate;
  objects.forEach(o=>o.visible=false);renderer.clippingPlanes=this.clip;renderer.shadowMap.autoUpdate=false;
  try{renderer.setRenderTarget(this.target);renderer.clear();renderer.render(scene,mirror);}finally{renderer.setRenderTarget(oldTarget);renderer.clippingPlanes=oldClip;renderer.shadowMap.autoUpdate=oldShadow;objects.forEach((o,i)=>o.visible=visibility[i]);}
 }
 dispose(){this.target.dispose();this.group.children.forEach(o=>{const m=o as T.Mesh;m.geometry.dispose();(m.material as T.Material).dispose();});}
}

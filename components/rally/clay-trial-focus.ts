import * as T from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
export class TrialFocus {
 private composer:EffectComposer;private horizontal:ShaderPass;private vertical:ShaderPass;private output:OutputPass;
 enabled=true;
 constructor(private renderer:T.WebGLRenderer,private scene:T.Scene,private camera:T.Camera){
  this.composer=new EffectComposer(renderer);this.composer.addPass(new RenderPass(scene,camera));
  const shader={uniforms:{tDiffuse:{value:null},direction:{value:new T.Vector2()},focus:{value:.5}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 direction;uniform float focus;varying vec2 vUv;void main(){float blur=smoothstep(.16,.48,abs(vUv.y-focus));vec2 d=direction*blur;vec4 c=texture2D(tDiffuse,vUv)*.227027;c+=(texture2D(tDiffuse,vUv+d*1.384615)+texture2D(tDiffuse,vUv-d*1.384615))*.316216;c+=(texture2D(tDiffuse,vUv+d*3.230769)+texture2D(tDiffuse,vUv-d*3.230769))*.070270;gl_FragColor=c;}`};
  this.horizontal=new ShaderPass(shader);this.vertical=new ShaderPass(shader);this.output=new OutputPass();this.composer.addPass(this.horizontal);this.composer.addPass(this.vertical);this.composer.addPass(this.output);
 }
 resize(w:number,h:number){this.composer.setSize(w,h);this.horizontal.uniforms.direction.value.set(1.6/w,0);this.vertical.uniforms.direction.value.set(0,1.6/h);}
 render(point:T.Vector3){if(!this.enabled){this.renderer.render(this.scene,this.camera);return;}const focus=T.MathUtils.clamp(point.clone().project(this.camera).y*.5+.5,.2,.8);this.horizontal.uniforms.focus.value=focus;this.vertical.uniforms.focus.value=focus;this.composer.render();}
 dispose(){this.horizontal.dispose();this.vertical.dispose();this.output.dispose();this.composer.dispose();}
}

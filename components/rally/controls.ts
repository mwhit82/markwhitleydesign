// Support references: developer.mozilla.org/en-US/docs/Web/API/GamepadHapticActuator/playEffect
// and developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate. Feature detection is authoritative.
export type ControlSettings={steering:'arrows'|'wheel';sensitivity:number;haptics:boolean};
export const defaultControls:ControlSettings={steering:'arrows',sensitivity:1,haptics:false};
export function readControls(value:unknown):ControlSettings{
 const v=value as Partial<ControlSettings>|null;
 return {steering:'arrows',sensitivity:typeof v?.sensitivity==='number'&&Number.isFinite(v.sensitivity)?Math.max(.5,Math.min(1.5,v.sensitivity)):1,haptics:v?.haptics===true};
}
export function wheelDelta(previous:number,next:number){return Math.atan2(Math.sin(next-previous),Math.cos(next-previous));}
export function wheelInput(angle:number,sensitivity:number){return Math.max(-1,Math.min(1,angle/(Math.PI*.65)*sensitivity));}
export function rumbleStrength(speed:number,steer:number){return Math.min(1,speed/8)*(.08+.24*Math.abs(steer));}
/** Short bounded pulses; optional browser support must never interrupt driving. */
export class RallyHaptics {
 private next=0;private strength=0;private actuator:GamepadHapticActuator|null=null;private failed=false;private vibrating=false;
 update(now:number,dt:number,enabled:boolean,racing:boolean,speed:number,steer:number,pad:Gamepad|undefined,touch:boolean){
  if(!enabled||!racing||speed<.8){this.stop();return;}
  this.strength+=(rumbleStrength(speed,steer)-this.strength)*(1-Math.exp(-dt*6));
  if(now<this.next)return;this.next=now+150;
  const actuator=pad?.vibrationActuator;
  if(actuator!==this.actuator){this.actuator=actuator??null;this.failed=false;}
  if(actuator?.playEffect&&!this.failed){
   try{void actuator.playEffect('dual-rumble',{duration:160,startDelay:0,strongMagnitude:this.strength*.45,weakMagnitude:this.strength}).catch(()=>{this.failed=true;});}catch{this.failed=true;}
  }else if(!pad&&touch&&typeof navigator.vibrate==='function'){
   // Handsets expose duration, not amplitude. Keep pulses brief and widely spaced.
   this.next=now+260;
   try{this.vibrating=navigator.vibrate(Math.round(6+this.strength*35));}catch{}
  }
 }
 stop(){
  if(this.actuator){try{void this.actuator.reset?.().catch(()=>{});}catch{}this.actuator=null;}
  if(this.vibrating){try{navigator.vibrate?.(0);}catch{}this.vibrating=false;}
  this.strength=0;this.next=0;
 }
}

export type HapticCapability='controller'|'device'|'unavailable';
export function hapticCapability(pads:readonly (Gamepad|null)[],vibrate:boolean):HapticCapability{
 return pads.some(p=>p?.vibrationActuator?.playEffect)?'controller':vibrate?'device':'unavailable';
}
export function currentHaptics():HapticCapability{
 if(typeof navigator==='undefined')return 'unavailable';
 try{return hapticCapability(Array.from(navigator.getGamepads?.()??[]),typeof navigator.vibrate==='function');}catch{return 'unavailable';}
}
export async function testHaptics():Promise<string>{
 try{
  const pad=Array.from(navigator.getGamepads?.()??[]).find(p=>p?.vibrationActuator?.playEffect);
  if(pad?.vibrationActuator){const result=await pad.vibrationActuator.playEffect('dual-rumble',{duration:180,strongMagnitude:.3,weakMagnitude:.4,startDelay:0});return result==='complete'?'Feedback sent to controller.':'Controller feedback was interrupted.';}
  if(typeof navigator.vibrate==='function')return navigator.vibrate(40)?'Vibration requested — did you feel it?':'This browser rejected vibration.';
 }catch{return 'Feedback unavailable on this connection.';}
 return 'Device vibration is unavailable in this browser. A supported controller may provide rumble.';
}

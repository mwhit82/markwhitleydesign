export function relativePhotoTilt(beta:number,gamma:number,origin:{beta:number;gamma:number},angle:number){
 if(![beta,gamma,origin.beta,origin.gamma,angle].every(Number.isFinite))return null;
 const delta=(a:number,b:number)=>((a-b+540)%360)-180;
 const x=delta(gamma,origin.gamma)/8,y=delta(beta,origin.beta)/8,radians=angle*Math.PI/180;
 const clamp=(value:number)=>Math.max(-1,Math.min(1,value));
 return {x:clamp(x*Math.cos(radians)+y*Math.sin(radians)),y:clamp(y*Math.cos(radians)-x*Math.sin(radians))};
}

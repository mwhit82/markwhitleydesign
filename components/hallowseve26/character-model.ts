import type {Part,Shape} from './models';
export type CharacterKind='elf'|'santa'|'infantry'|'ranger'|'artillery'|'pumpkin'|'skeleton'|'zombie'|'witch'|'king';
export type Joint='body'|'head'|'leftArm'|'rightArm'|'leftLeg'|'rightLeg'|'cargo'|'tool'|'barrel';
export type RigPart=Part & {joint:Joint;rx:number};
export const PIVOTS:Record<Joint,[number,number,number]>={body:[0,0,0],head:[0,1.08,0],leftArm:[-.29,.88,0],rightArm:[.29,.88,0],leftLeg:[-.14,.43,0],rightLeg:[.14,.43,0],cargo:[0,.73,.4],tool:[.29,.48,.15],barrel:[0,.85,0]};
/** Shared articulated toy geometry: portraits and the live instanced renderer. */
export function characterParts(kind:CharacterKind,tool=''):RigPart[]{
 const v:RigPart[]=[];const put=(joint:Joint,shape:Shape,color:string,x:number,y:number,z:number,w:number,h:number,d:number,rx=0,ry=0,rz=0)=>{const p=PIVOTS[joint];v.push({joint,shape,color,x:x+p[0],y:y+p[1],z:z+p[2],w,h,d,rx,ry,rz});};
 const santa=kind==='santa',witch=kind==='witch',zombie=kind==='zombie',skeleton=kind==='skeleton',pumpkin=kind==='pumpkin'||kind==='king';
 const coat=santa?'#b83140':witch?'#694085':zombie?'#5b6351':skeleton?'#e1d7b7':pumpkin?'#5a463c':kind==='ranger'?'#457f9c':kind==='infantry'?'#b8433e':'#35896d';const skin=zombie?'#88a77a':witch?'#b5c88a':skeleton?'#e1d7b7':pumpkin?'#db8230':'#efc597';
 if(kind==='artillery'){put('body','box','#b74342',0,.5,0,.9,.45,1.1);for(const x of [-.5,.5])for(const z of [-.4,.4]){put('body','cylinder','#354e4a',x,.3,z,.5,.17,.5,0,0,Math.PI/2);put('body','sphere','#e4bc68',x*1.12,.3,z,.15,.15,.15);}put('barrel','cylinder','#b4964f',0,0,.1,.35,1.2,.35,Math.PI/2);put('barrel','cylinder','#384d49',0,0,.73,.25,.04,.25,Math.PI/2);put('body','box','#f6d886',0,.6,.6,.1,.2,.08);return v;}
 for(const [joint,side] of [['leftLeg',-1],['rightLeg',1]] as const){put(joint,'cylinder',skeleton?skin:'#314d46',0,-.16,0,.16,.35,.17);put(joint,'box',skeleton?skin:'#273e3b',0,-.35,.08,.22,.16,.34);if(!skeleton)put(joint,'box','#e8bd67',0,-.3,.255,.11,.07,.02);}
 put('body',skeleton?'cylinder':'cone',coat,0,.68,0,skeleton?.3:.65,.66,.5);put('body','cylinder',santa?'#eee7d5':'#caa65e',0,.5,0,.55,.09,.48);put('body','box','#ffdd81',0,.52,.255,.14,.12,.045);
 for(const y of [.69,.83])put('body','sphere','#eacc79',0,y,.245,.065,.065,.04);
 if(skeleton)for(const y of [.65,.77,.89])put('body','box',skin,0,y,.13,.45,.045,.13);
 for(const joint of ['leftArm','rightArm'] as const){put(joint,'cylinder',coat,0,-.17,0,.18,.37,.18);put(joint,'cylinder',santa?'#f5ebd8':'#e5c27c',0,-.32,0,.2,.09,.2);put(joint,'sphere',skin,0,-.41,0,.18,.19,.18);}
 put('head','sphere',skin,0,.12,0,pumpkin?.65:.43,pumpkin?.57:.43,.41);put('head','sphere',skin,0,.08,.23,.12,.12,.12);
 for(const x of [-.09,.09]){put('head','sphere',pumpkin||witch?'#ffe291':'#253b3b',x,.16,.19,.065,.07,.04);put('head','box','#554134',x,.23,.19,.1,.025,.035,0,0,x>0?.1:-.1);}
 put('head','box',pumpkin?'#ffdc79':'#935c4d',0,-.02,.2,.15,.035,.03);
 if(kind==='elf'||kind==='ranger')for(const x of [-.25,.25])put('head','cone',skin,x,.1,0,.16,.23,.13,0,0,x>0?-1:1);
 if(santa){put('head','sphere','#fff1d9',0,-.02,.16,.41,.32,.22);put('head','cone','#c94646',0,.48,0,.56,.48,.5,0,0,-.15);put('head','sphere','#fff2db',.04,.73,0,.16,.16,.16);}
 else if(witch){put('head','cylinder','#352b4d',0,.36,0,.9,.09,.9);put('head','cone','#50315f',0,.69,0,.59,.66,.59,0,0,-.16);put('head','box','#ddbb68',0,.43,.29,.13,.11,.04);put('body','cylinder','#8f6746',0,.46,0,.09,1.9,.09,Math.PI/2);put('body','cone','#b89b62',0,.46,-1,.45,.65,.45,Math.PI/2);}
 else if(kind==='infantry'){put('head','cylinder','#214a43',0,.48,0,.48,.42,.46);put('head','cylinder','#e6c678',0,.31,0,.51,.06,.49);put('head','sphere','#f8d775',0,.49,.25,.1,.13,.06);}
 else if(!zombie&&!skeleton&&!pumpkin){put('head','cone',kind==='ranger'?'#c9e3da':'#377757',0,.48,0,.58,.46,.55);put('head','sphere','#f2e5bb',0,.73,0,.13,.13,.13);}
 if(zombie){put('head','box','#414d40',-.05,.3,-.02,.4,.09,.35);put('body','box','#8f524d',.15,.78,.23,.17,.12,.04);}
 if(pumpkin){put('head','cylinder','#70814b',0,.46,0,.1,.2,.1);for(const x of [-.2,0,.2])put('head','box','#b76327',x,.1,.22,.02,.34,.03);}
 if(kind==='king')for(let i=0;i<5;i++)put('head','cone','#f5c56c',Math.sin(i*1.25)*.28,.62,Math.cos(i*1.25)*.28,.13,.4,.13);
 if(santa||kind==='infantry'){put('rightArm','cylinder',santa?'#d3af5b':'#88764f',0,-.22,.2,.07,1.2,.07);put('rightArm',santa?'sphere':'cone',santa?'#ffe89b':'#cadbd6',0,.42,.2,.19,.3,.19);}
 if(kind==='ranger')put('rightArm','sphere','#ecfaff',0,-.42,.12,.25,.25,.25);
 if(tool){put('tool','cylinder','#a57848',0,0,.12,.07,.7,.07);put('tool','box',tool==='chop'?'#b9d6d4':'#849ba0',.05,.32,.12,tool==='mine'?.48:.28,.15,.13);}
 // Cargo is hidden by the live rig when the elf is empty-handed.
 if(kind==='elf'){put('cargo','box','#b6834e',0,0,0,.5,.39,.4);for(const x of [-.18,.18])put('cargo','box','#e3ba72',x,0,.21,.055,.39,.025);}
 return v;
}

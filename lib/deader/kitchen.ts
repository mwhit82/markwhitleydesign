export const HUNGER_SECONDS=420, THIRST_SECONDS=240;
export const needWarning=(value:number,kind:"hunger"|"thirst")=>value<=25?(kind==="hunger"?"Eat now":"Drink now"):value<=50?(kind==="hunger"?"Eat soon":"Drink soon"):"";
export const showNeeds=(view:string)=>!["door","inspect"].includes(view);
/** Shift-local survival; time is real active seconds, independent of story clock. */
export type KitchenAction = 'food' | 'drink' | 'cook' | 'eat' | 'off';
export type Kitchen = { hunger:number; thirst:number; food:boolean; oven:'off'|'cooking'|'ready'; seconds:number; failure:null|'hunger'|'thirst'|'fire'; fireSeconds:number };
export const freshKitchen=():Kitchen=>({hunger:100,thirst:100,food:false,oven:'off',seconds:0,failure:null,fireSeconds:0});
export function kitchenAction(k:Kitchen,a:KitchenAction):Kitchen {
 if(k.failure)return k;
 if(a==='food'&&!k.food)return {...k,food:true};
 if(a==='drink'&&k.thirst<100)return {...k,thirst:100};
 if(a==='cook'&&k.food&&k.oven==='off')return {...k,food:false,oven:'cooking',seconds:0};
 if(a==='eat'&&k.oven==='ready')return {...k,hunger:100,oven:'off',seconds:0};
 if(a==='off'&&k.oven!=='off')return {...k,oven:'off',seconds:0};
 return k;
}
export function tickKitchen(k:Kitchen,delta:number,drain=true):Kitchen {
 if(!Number.isFinite(delta)||delta<=0)return k;
 const dt=Math.min(delta,.25);
 if(k.failure)return k.failure==='fire'?{...k,fireSeconds:Math.min(3,k.fireSeconds+dt)}:k;
 const hunger=drain?Math.max(0,k.hunger-dt*100/HUNGER_SECONDS):k.hunger;
 const thirst=drain?Math.max(0,k.thirst-dt*100/THIRST_SECONDS):k.thirst;
 const seconds=k.oven==='off'?0:k.seconds+dt;
 const oven=k.oven==='cooking'&&seconds>=20?'ready':k.oven;
 const failure=seconds>=60?'fire':hunger<=1e-8?'hunger':thirst<=1e-8?'thirst':null;
 return {...k,hunger,thirst,seconds,oven,failure};
}
export const kitchenMessage=(k:Kitchen)=>k.failure?failureMessage(k):k.oven==='off'?'Oven off':k.oven==='cooking'?`Cooking · ${Math.ceil(20-k.seconds)}s`:`${k.seconds>=45?'SMOKE! Switch off or eat':'Food ready — collect and eat'} · ${Math.ceil(60-k.seconds)}s until fire`;
export const failureMessage=(k:Kitchen)=>k.failure==='fire'?'The unattended oven started a fire. The house and everyone inside were lost.':k.failure==='hunger'?'You ran out of food energy. Cook and eat a meal before hunger reaches zero.':'You ran out of water. Drink from the fridge before thirst reaches zero.';
export const KITCHEN_OBSTACLES=[{x:7.65,z:6,hx:.55,hz:.65},{x:7.65,z:8,hx:.55,hz:.6}];
export function roomFloor(p:{x:number;z:number}) {
 const main=Math.abs(p.x)<=3.4&&p.z>=-3.5&&p.z<=10.4&&(Math.abs(p.z-3.8)>.4||Math.abs(p.x)<.7);
 const kitchen=p.x>=4.2&&p.x<=8&&p.z>=4.8&&p.z<=9.8;
 const passage=p.x>=3.3&&p.x<=4.3&&p.z>=6.65&&p.z<=7.75;
 return main||kitchen||passage;
}

/** Dawn wins ties, but a failure earlier in the same frame still ends the shift. */
export function kitchenBeforeDawn(k:Kitchen,delta:number,untilDawn:number):Kitchen {
 const deadline=Math.min(k.hunger*HUNGER_SECONDS/100,k.thirst*THIRST_SECONDS/100,k.oven==='off'?Infinity:60-k.seconds);
 if(untilDawn<=Math.min(.25,delta)+1e-8 && deadline>=untilDawn-1e-8)return k;
 return tickKitchen(k,delta);
}

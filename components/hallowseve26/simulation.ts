import {CHAPTERS,BUILD_INFO,POWERS,type TipId} from './campaign';
export {CHAPTERS,BUILD_INFO,POWERS,TIPS} from './campaign';
/** HallowsEve26 v2. Fixed-step, deterministic simulation; no renderer or browser dependencies. */
export const LIMIT = 30;
export const SAVE_KEY = 'hallowseve26-save-v3';
export const LEGACY_SAVE_KEY = 'hallowseve26-save-v2';
export const DAY_SECONDS = Infinity;
export type Point = { x:number; z:number };
export type Resource = 'wood'|'planks'|'stone'|'toys';
export type Stock = Record<Resource,number>;
export type Kind = 'hearth'|'home'|'store'|'lumber'|'quarry'|'sawmill'|'workshop'|'wall'|'gate'|'road'|'nutcracker'|'snowglobe'|'jackbox';
export type Clan = 'pumpkin'|'skeleton'|'witch'|'king'|'zombie';
export type Phase = 'day'|'night'|'won'|'lost';
export type TroopKind = 'infantry'|'ranger'|'artillery';
export type Order = {type:'move'|'attack'|'guard';target:Point};
export type Actor = Point & {path:Point[];goal?:string; retry?:number;heading?:number;activity?:'idle'|'walk'|'carry'|'chop'|'mine'|'build'|'saw'|'craft'|'attack'|'cast';actionTime?:number};
export type Building = Point & {id:number;kind:Kind;level:number;rotation:number;hp:number;maxHp:number;progress:number;cooldown:number;inventory:Stock;rally?:Point;queue:TroopKind[]};
export type Assignment={type:'harvest'|'operate'|'build';buildingId:number;depositId?:number};
export type Elf = Actor & {id:number;job:string;work:number;cargo:Stock;source?:number;delivery?:number;assignment?:Assignment;recall?:boolean};
export type Enemy = Actor & {id:number;clan:Clan;hp:number;maxHp:number;cooldown:number;slow:number;campId?:number};
export type Troop = Actor & {id:number;kind:TroopKind;hp:number;maxHp:number;cooldown:number;order:Order};
export type Shrine = Point & {id:number;name:string;restored:boolean;progress:number};
export type Deposit = Point & {id:number;resource:'wood'|'stone';amount:number};
export type Camp = Point & {id:number;clan:Clan;name:string;hp:number;maxHp:number;cleared:boolean};
export type Effect = {id:number;from:Point;to:Point;color:string;life:number;total:number;kind?:'particle'|'completion'};
export type Game = {version:3;intro:number;lessons:TipId[];tip:TipId|null;tipQuiet:number;delivered:boolean;migrated:boolean;seed:number;nextId:number;day:number;phase:Phase;time:number;nightTime:number;elapsed:number;stock:Stock;buildings:Building[];elves:Elf[];troops:Troop[];enemies:Enemy[];shrines:Shrine[];deposits:Deposit[];camps:Camp[];santa:Actor & {hp:number;recovering:number;cooldown:number;burst:number;blessing:number;shield:number;shrineId?:number};pending:Clan[];spawnTimer:number;effects:Effect[];kills:number;message:string;messageTime:number;finalSiegeWon:boolean;workforce:'balanced'|'materials'|'industry'};
export const emptyStock=():Stock=>({wood:0,planks:0,stone:0,toys:0});
const cost=(wood=0,planks=0,stone=0,toys=0):Stock=>({wood,planks,stone,toys});
export const CATALOG:Record<Kind,{name:string;cost:Stock;hp:number;size:number;description:string;category:string}>= {
 hearth:{name:'Christmas Keep',cost:cost(),hp:2400,size:3,description:'The heart of Christmas. Protect it through all twelve nights.',category:'Town'},
 home:{name:'Elf cottage',cost:cost(12,18,8),hp:420,size:2,description:'Room for 6 more followers. Two elves join when construction finishes.',category:'Town'},
 store:{name:'Storehouse',cost:cost(15,15,12),hp:550,size:2,description:'A local delivery point. Elves unload here instead of walking to the keep.',category:'Town'},
 lumber:{name:'Lumber camp',cost:cost(20,0,8),hp:350,size:2,description:'Up to three assigned woodcutters harvest nearby finite forests and carry logs home.',category:'Industry'},
 quarry:{name:'Stone quarry',cost:cost(20,0,10),hp:450,size:2,description:'Up to three assigned miners gather nearby stone deposits.',category:'Industry'},
 sawmill:{name:'Sawmill',cost:cost(25,10,15),hp:420,size:2,description:'One elf converts 4 delivered logs into 3 planks. Goods must be carried to storage.',category:'Industry'},
 workshop:{name:'Toy workshop',cost:cost(15,35,25),hp:650,size:3,description:'Turns 3 planks and 1 stone into 4 toys. Recruit your army here.',category:'Industry'},
 wall:{name:'Castle wall',cost:cost(0,0,8),hp:450,size:1,description:'Blocks raiders. Leave a gate for your followers.',category:'Defence'},
 gate:{name:'Castle gate',cost:cost(0,8,12),hp:600,size:1,description:'Opens for Santa, elves and troops; blocks Halloween.',category:'Defence'},
 road:{name:'Cobblestone road',cost:cost(0,0,1),hp:1,size:1,description:'Optional paths. Followers move 50% faster; buildings work without them.',category:'Town'},
 nutcracker:{name:'Watchtower',cost:cost(0,20,20,10),hp:400,size:1,description:'Long-range nutcracker defender. Targets raiders and hostile camp guards.',category:'Defence'},
 snowglobe:{name:'Frost beacon',cost:cost(0,15,20,20),hp:350,size:1,description:'Enchanted snow slows groups of attackers.',category:'Defence'},
 jackbox:{name:'Toy mortar',cost:cost(0,25,15,30),hp:350,size:1,description:'Explosive presents damage groups of enemies.',category:'Defence'},
};
export const TROOPS:Record<TroopKind,{name:string;cost:Stock;hp:number;damage:number;range:number;speed:number;seconds:number}>= {
 infantry:{name:'Nutcracker guard',cost:cost(0,2,0,8),hp:190,damage:23,range:1.7,speed:2.7,seconds:9},
 ranger:{name:'Snowball ranger',cost:cost(0,3,0,12),hp:100,damage:18,range:6,speed:2.8,seconds:12},
 artillery:{name:'Present cannon',cost:cost(0,8,4,24),hp:160,damage:48,range:9,speed:1.6,seconds:18},
};
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
export const tileKey=(p:Point)=>`${Math.round(p.x)},${Math.round(p.z)}`;
export const onIsland=(x:number,z:number)=>Math.abs(x)<=LIMIT&&Math.abs(z)<=LIMIT&&x*x/1024+z*z/900<1;
export const riverX=(z:number)=>10+Math.sin(z*.13)*3;
export const bridge=(x:number,z:number)=>Math.abs(x-riverX(z))<2.3&&(Math.abs(z+12)<1.5||Math.abs(z-9)<1.5);
export const water=(x:number,z:number)=>Math.abs(x-riverX(z))<1.3&&!bridge(x,z);
export function heightAt(x:number,z:number){if(bridge(x,z))return .2; if(Math.abs(x-riverX(z))<1.3)return -.32;const r=Math.hypot(x,z);return .12+Math.max(0,r-9)*.035+Math.sin(x*.18)*Math.cos(z*.17)*Math.min(.7,Math.max(0,r-7)*.06);}
export function biome(x:number,z:number){if(Math.hypot(x+2,z)<10)return 'snow';if(z<-6&&x<7)return 'forest';if(x>7)return 'pumpkin';if(z>9)return 'marsh';return 'snow';}
export const sizeOf=(b:Building)=>CATALOG[b.kind].size;
export const centre=(b:Building)=>({x:b.x+(sizeOf(b)-1)/2,z:b.z+(sizeOf(b)-1)/2});
export const cells=(b:Building)=>Array.from({length:sizeOf(b)**2},(_,i)=>({x:b.x+i%sizeOf(b),z:b.z+Math.floor(i/sizeOf(b))}));
export const buildingAt=(g:Game,x:number,z:number)=>g.buildings.find(b=>x>=b.x&&x<b.x+sizeOf(b)&&z>=b.z&&z<b.z+sizeOf(b));
export function say(g:Game,message:string){g.message=message;g.messageTime=7;}
export const capacity=(g:Game)=>Math.min(120,12+g.buildings.filter(b=>b.kind==='home'&&b.progress===1).length*6);
export const population=(g:Game)=>g.elves.length+g.troops.length+g.buildings.reduce((n,b)=>n+b.queue.length,0);
function makeBuilding(g:Game,kind:Kind,x:number,z:number,complete=false):Building{return {id:g.nextId++,kind,x,z,level:1,rotation:0,hp:CATALOG[kind].hp,maxHp:CATALOG[kind].hp,progress:complete?1:0,cooldown:0,inventory:emptyStock(),queue:[]};}
function addElf(g:Game,p:Point){g.elves.push({...p,id:g.nextId++,path:[],job:'Ready',work:0,cargo:emptyStock()});}
export function newGame(seed=261225):Game{
 const g:Game={version:3,intro:0,lessons:[],tip:'welcome',tipQuiet:0,delivered:false,migrated:false,seed,nextId:10,day:1,phase:'night',time:0,nightTime:0,elapsed:0,stock:cost(100,95,160,65),buildings:[],elves:[],troops:[],enemies:[],shrines:[{id:1,x:-17,z:-14,name:'Pinewatch sanctuary',restored:false,progress:0},{id:2,x:21,z:-12,name:'Harvest lantern',restored:false,progress:0},{id:3,x:-12,z:22,name:'Moonwater shrine',restored:false,progress:0},{id:4,x:21,z:12,name:'The lost carollers',restored:false,progress:0}],deposits:[{id:1,x:-9,z:-7,resource:'wood',amount:900},{id:2,x:-19,z:-6,resource:'wood',amount:1400},{id:3,x:-12,z:-21,resource:'wood',amount:1500},{id:4,x:3,z:8,resource:'stone',amount:900},{id:5,x:-19,z:10,resource:'stone',amount:1300},{id:6,x:22,z:5,resource:'stone',amount:1400}],camps:[{id:1,x:23,z:-5,name:'Jack-o’-lantern Court',clan:'pumpkin',hp:1000,maxHp:1000,cleared:false},{id:2,x:-22,z:-15,name:'The Bone Company',clan:'skeleton',hp:1400,maxHp:1400,cleared:false},{id:3,x:-9,z:25,name:'Witchwater Coven',clan:'witch',hp:1600,maxHp:1600,cleared:false}],santa:{x:-1,z:4,hp:240,recovering:0,cooldown:0,burst:0,blessing:0,shield:0,path:[]},pending:[],spawnTimer:0,effects:[],kills:0,message:'Halloween night. Keep the first lantern burning; your kingdom begins at dawn.',messageTime:12,finalSiegeWon:false,workforce:'balanced'};
 for(const [kind,x,z] of [['hearth',-2,-2],['home',-6,1],['store',2,-3],['lumber',-7,-5],['sawmill',-5,-5],['quarry',2,5]] as [Kind,number,number][])g.buildings.push(makeBuilding(g,kind,x,z,true));
 for(let x=-7;x<7;x++)g.buildings.push(makeBuilding(g,'road',x,3,true));
 for(let z=-6;z<8;z++)if(z!==3&&!buildingAt(g,0,z))g.buildings.push(makeBuilding(g,'road',0,z,true));
 for(let i=0;i<8;i++)addElf(g,{x:-3+i%4,z:4+Math.floor(i/4)});
 for(const c of g.camps)for(let i=0;i<4;i++)makeEnemy(g,c.clan,{x:c.x-2+i%2*3,z:c.z-2+Math.floor(i/2)*3},c.id);
 g.buildings.push(makeBuilding(g,'nutcracker',-4,-1,true));
 for(let i=0;i<3;i++){const pos={x:-4+i*1.4,z:1};g.troops.push({...pos,id:g.nextId++,kind:'infantry',hp:150,maxHp:190,cooldown:0,path:[],order:{type:'guard',target:pos}});}
 g.pending=['pumpkin','pumpkin','pumpkin','pumpkin','pumpkin','pumpkin'];g.spawnTimer=3;
 return g;
}
export const canAfford=(g:Game,c:Stock)=>(Object.keys(c) as Resource[]).every(k=>g.stock[k]>=c[k]);
function spend(g:Game,c:Stock){for(const k of Object.keys(c) as Resource[])g.stock[k]-=c[k];}
export function placementError(g:Game,kind:Kind,x:number,z:number){
 if(g.phase!=='day')return 'Build during daylight.';
 if(g.buildings.length>=450)return 'Settlement building limit reached.';
 for(let dx=0;dx<CATALOG[kind].size;dx++)for(let dz=0;dz<CATALOG[kind].size;dz++){
 const p={x:x+dx,z:z+dz};if(!onIsland(p.x,p.z)||water(p.x,p.z)||bridge(p.x,p.z))return 'Choose dry land clear of the bridges.';
 if(buildingAt(g,p.x,p.z))return 'Another building or road is here.';
 if(g.deposits.some(d=>d.amount>0&&distance(d,p)<1.8)||g.shrines.some(s=>distance(s,p)<1.7))return 'Keep resources and shrines accessible.';
 if(g.camps.some(c=>!c.cleared&&distance(c,p)<7))return 'Clear this Halloween camp before settling here.';
 if(kind!=='road'&&(distance(g.santa,p)<.7||g.elves.some(e=>distance(e,p)<.5)||g.troops.some(t=>distance(t,p)<.5)))return 'A follower is standing here.';
 }
 return '';
}
export function place(g:Game,kind:Kind,x:number,z:number,rotation=0){if(kind==='hearth')return false;const err=placementError(g,kind,x,z);if(err){say(g,err);return false;}if(!canAfford(g,CATALOG[kind].cost)){say(g,'Not enough materials. Check your production chain.');return false;}spend(g,CATALOG[kind].cost);const b=makeBuilding(g,kind,x,z,kind==='road');b.rotation=rotation;g.buildings.push(b);invalidate(g);emit(g,'place',b);say(g,`${CATALOG[kind].name} ${kind==='road'?'laid':'queued for construction'}.`);return true;}
export const upgradeCost=(b:Building)=>cost(0,b.kind==='workshop'?40:18,25,15);
export function upgrade(g:Game,id:number){const b=g.buildings.find(b=>b.id===id);if(!b||b.kind==='road'||b.kind==='hearth'||b.level>=2||b.progress<1||g.phase!=='day'||!canAfford(g,upgradeCost(b)))return false;spend(g,upgradeCost(b));b.level=2;b.maxHp*=1.6;b.hp=b.maxHp;emit(g,'upgrade',b);say(g,`${CATALOG[b.kind].name} upgraded.`);return true;}
export function demolish(g:Game,id:number){const b=g.buildings.find(b=>b.id===id);if(!b||b.kind==='hearth'||g.phase!=='day')return false;if(b.queue.length){say(g,'Wait for recruitment to finish before removing this workshop.');return false;}if(b.kind==='home'&&population(g)>capacity(g)-6){say(g,'Build replacement housing first.');return false;}for(const k of Object.keys(g.stock) as Resource[])g.stock[k]+=Math.floor(CATALOG[b.kind].cost[k]*.5)+b.inventory[k];g.buildings=g.buildings.filter(b=>b.id!==id);invalidate(g);return true;}
const navCache=new WeakMap<Game,{count:number;map:Map<string,Building>}>();
function invalidate(g:Game){navCache.delete(g);for(const a of [...g.elves,...g.troops,...g.enemies]){a.path=[];a.goal=undefined;}g.santa.path=[];}
function occupancy(g:Game){let c=navCache.get(g);if(!c||c.count!==g.buildings.length){const map=new Map<string,Building>();for(const b of g.buildings)for(const p of cells(b))map.set(tileKey(p),b);c={count:g.buildings.length,map};navCache.set(g,c);}return c.map;}
function blocked(g:Game,x:number,z:number,enemy=false,breach=false){if(!onIsland(x,z)||water(x,z))return true;const b=occupancy(g).get(`${x},${z}`);return !!b&&b.kind!=='road'&&(enemy||b.kind!=='gate')&&!breach;}
export function route(g:Game,a:Point,target:Point,reach=0,enemy=false,breach=false):Point[]{
 const start={x:Math.round(a.x),z:Math.round(a.z)},q=[start],parents=new Map<string,Point|null>([[tileKey(start),null]]);let end:Point|undefined;
 for(let i=0;i<q.length;i++){const p=q[i];if(distance(p,target)<=reach+.1){end=p;break;}const dirs=[[1,0],[0,1],[-1,0],[0,-1]].sort((a,b)=>distance({x:p.x+a[0],z:p.z+a[1]},target)-distance({x:p.x+b[0],z:p.z+b[1]},target));for(const [dx,dz]of dirs){const n={x:p.x+dx,z:p.z+dz},key=tileKey(n);if(parents.has(key)||blocked(g,n.x,n.z,enemy,breach))continue;parents.set(key,p);q.push(n);}}
 if(!end)return [];const path:Point[]=[];let p:Point|null=end;while(p&&tileKey(p)!==tileKey(start)){path.push(p);p=parents.get(tileKey(p))??null;}return path.reverse();
}
function walk(g:Game,a:Actor,target:Point,speed:number,dt:number,reach=0,enemy=false,breach=false){
 if(distance(a,target)<=reach+.1)return;
 a.heading=Math.atan2(target.x-a.x,target.z-a.z);a.activity='walk';
 if('clan' in a&&a.clan==='witch'){const d=distance(a,target),step=Math.min(speed*dt,Math.max(0,d-reach));a.x+=(target.x-a.x)/d*step;a.z+=(target.z-a.z)/d*step;a.path=[];return;}
 const key=`${tileKey(target)}:${reach}:${breach}`;a.retry=Math.max(0,(a.retry??0)-dt);if(a.goal!==key||!a.path.length&&distance(a,target)>reach+.2&&a.retry===0){a.path=route(g,a,target,reach,enemy,breach);a.goal=key;a.retry=1.5;}const p=a.path[0];if(!p)return;const beforeTile=tileKey(a);if(blocked(g,p.x,p.z,enemy,breach)){a.path=[];return;}const road=occupancy(g).get(tileKey(a))?.kind==='road';const step=speed*dt*(road&&!enemy?1.5:1),d=distance(a,p);if(d<=step){a.x=p.x;a.z=p.z;a.path.shift();}else{a.x+=(p.x-a.x)/d*step;a.z+=(p.z-a.z)/d*step;}if(tileKey(a)!==beforeTile)emit(g,'step',a);}
export function moveSanta(g:Game,p:Point){if(g.santa.recovering>0||blocked(g,p.x,p.z))return;say(g,'Santa is on his way.');g.santa.shrineId=undefined;g.santa.path=route(g,g.santa,p);}
export function restoreShrine(g:Game,id:number){const s=g.shrines.find(s=>s.id===id);if(!s||s.restored||g.phase!=='day')return;if(capacity(g)-population(g)<2){say(g,'Build another cottage to welcome two rescued elves.');return;}g.santa.shrineId=id;g.santa.goal=undefined;say(g,`Santa is travelling to ${s.name}.`);}
export function recruit(g:Game,id:number,kind:TroopKind){const b=g.buildings.find(b=>b.id===id);if(!b||b.kind!=='workshop'||b.progress<1||g.phase!=='day')return false;if(population(g)>=capacity(g)){say(g,'Build cottages for more followers.');return false;}if(b.queue.length>=5||!canAfford(g,TROOPS[kind].cost)){say(g,'Recruitment queue full or not enough supplies.');return false;}spend(g,TROOPS[kind].cost);b.queue.push(kind);return true;}
export function command(g:Game,ids:number[],type:Order['type'],target:Point){if(!onIsland(target.x,target.z)||water(target.x,target.z))return;const troops=g.troops.filter(t=>ids.includes(t.id));troops.forEach((t,i)=>{const p=type==='attack'?target:{x:target.x+(i%3-1)*.8,z:target.z+Math.floor(i/3)*.8};t.order={type,target:blocked(g,Math.round(p.x),Math.round(p.z))?target:p};t.goal=undefined;t.path=[];});say(g,`${troops.length} troops: ${type==='guard'?'hold position':type==='attack'?'advance and engage':'move out'}.`);}
export function cheerBurst(g:Game){if(g.santa.burst>0||g.santa.recovering>0)return false;g.santa.burst=POWERS.cheer.cooldown;g.santa.activity='cast';g.santa.actionTime=.8;g.santa.hp=Math.min(240,g.santa.hp+POWERS.cheer.heal);for(const t of g.troops)if(distance(t,g.santa)<POWERS.cheer.radius)t.hp=Math.min(t.maxHp,t.hp+POWERS.cheer.heal);for(const e of g.enemies)if(distance(e,g.santa)<POWERS.cheer.damageRadius){e.hp-=POWERS.cheer.damage;e.slow=4;}effect(g,g.santa,g.santa,'#ffe7a0',1);say(g,'Christmas cheer restores nearby troops.');return true;}
export function blessing(g:Game){if(g.santa.blessing>0||g.santa.recovering>0)return false;g.santa.blessing=POWERS.blessing.cooldown;g.santa.shield=POWERS.blessing.duration;g.santa.activity='cast';g.santa.actionTime=.8;say(g,'Winter blessing: nearby allies and buildings take half damage for 10 seconds.');return true;}
function effect(g:Game,from:Point,to:Point,color:string,life=.4){if(g.effects.length>100)g.effects.shift();g.effects.push({id:g.nextId++,from:{x:from.x,z:from.z},to:{x:to.x,z:to.z},color,life,total:life});}
export function wave(day:number):Clan[]{const result:Clan[]=[];for(let i=0;i<9+day*3;i++)result.push(day>=5&&i%5===0?'witch':day>=4&&i%4===0?'zombie':day>=3&&i%3===0?'skeleton':'pumpkin');if(day===12)result.push('king');return result;}
export function startNight(g:Game){if(g.phase!=='day'||g.finalSiegeWon)return;g.phase='night';g.nightTime=0;const cleared=new Set(g.camps.filter(c=>c.cleared).map(c=>c.clan));g.pending=wave(g.day).filter((c,i)=>!cleared.has(c==='zombie'?'skeleton':c)||i%3===0);g.spawnTimer=1;g.santa.shrineId=undefined;say(g,`Night ${g.day}: light the lanterns. Halloween is marching.`);}
function random(g:Game){g.seed=(Math.imul(1664525,g.seed)+1013904223)>>>0;return g.seed/4294967296;}
function makeEnemy(g:Game,clan:Clan,p:Point,campId?:number){const hp=(clan==='king'?2200:clan==='zombie'?210:clan==='skeleton'?180:clan==='witch'?130:100)*(campId?1:1+(g.day-1)*.09);g.enemies.push({...p,id:g.nextId++,clan,hp,maxHp:hp,cooldown:1,slow:0,path:[],campId});}
function spawn(g:Game){const c=g.pending.shift();if(!c)return;if(g.day===1){makeEnemy(g,c,{x:-13,z:1});return;}const points=[{x:-26,z:0},{x:25,z:8},{x:-9,z:27}];makeEnemy(g,c,points[Math.floor(random(g)*3)]);}
const cargoTotal=(s:Stock)=>Object.values(s).reduce((a,b)=>a+b,0);
function elfStep(g:Game,dt:number){
 const stores=g.buildings.filter(b=>(b.kind==='hearth'||b.kind==='store')&&b.progress===1);
 const storeFor=(e:Elf)=>[...stores].sort((a,b)=>distance(e,centre(a))-distance(e,centre(b))).find(b=>distance(e,centre(b))<sizeOf(b)*.5+.9||route(g,e,centre(b),sizeOf(b)*.5+.7).length>0);
 const used=new Map<number,number>();
 for(const e of g.elves){
  e.activity='idle';
  const job=e.assignment,site=job&&g.buildings.find(b=>b.id===job.buildingId);
  if(job&&!site){e.recall=true;e.assignment=undefined;offerTip(g,'blocked');}
  if(e.recall&&cargoTotal(e.cargo)===0){e.assignment=undefined;e.source=undefined;e.delivery=undefined;e.recall=false;e.path=[];}
  if(cargoTotal(e.cargo)>0&&(e.delivery!==undefined||cargoTotal(e.cargo)>=7.99||g.phase==='night'||e.recall)){
   const destination=e.recall?undefined:g.buildings.find(b=>b.id===e.delivery&&b.progress===1);const storage=destination??storeFor(e);
   if(!storage){e.job='Route blocked';offerTip(g,'blocked');continue;}
   e.delivery=storage.id;e.job='Delivering supplies';walk(g,e,centre(storage),2.6,dt,sizeOf(storage)*.5+.7);e.activity=e.path.length?'carry':'idle';
   if(distance(e,centre(storage))<sizeOf(storage)*.5+.9){const shared=storage.kind==='hearth'||storage.kind==='store';const stock=shared?g.stock:storage.inventory;for(const k of Object.keys(g.stock) as Resource[])stock[k]+=e.cargo[k];e.cargo=emptyStock();e.delivery=undefined;e.work=0;if(shared&&!g.delivered){g.delivered=true;offerTip(g,'delivery');}if(e.recall){e.assignment=undefined;e.source=undefined;e.recall=false;}}
   else if(!e.path.length){e.job='Route blocked';e.recall=true;offerTip(g,'blocked');}continue;
  }
  if(g.phase==='night'){e.job='Sheltering';walk(g,e,{x:-3,z:3},3,dt,2);continue;}
  if(!job||!site){e.job='Awaiting orders';continue;}
  if(job.type==='build'){
   if(site.progress===1&&site.hp>=site.maxHp){e.assignment=undefined;e.job='Awaiting orders';continue;}
   const p=centre(site);e.job='Travelling to build';walk(g,e,p,2.5,dt,sizeOf(site)*.5+.7);
   if(distance(e,p)>=sizeOf(site)*.5+.9){if(!e.path.length){e.assignment=undefined;e.job='Route blocked';offerTip(g,'blocked');}continue;}
   e.activity='build';e.heading=Math.atan2(p.x-e.x,p.z-e.z);e.job=site.progress<1?'Constructing':'Repairing';const index=used.get(site.id)??0;used.set(site.id,index+1);const rate=[1,.6,.4][index]??0;
   if(site.progress<1){const previous=site.progress;site.progress=Math.min(1,previous+dt*rate/BUILD_INFO[site.kind].seconds);if(site.progress===1){emit(g,'complete',site);say(g,`${CATALOG[site.kind].name} is ready!`);if(site.kind==='home')for(let i=0;i<2&&population(g)<capacity(g);i++)addElf(g,{x:site.x-1,z:site.z+i});}else if(Math.floor(previous*20)!==Math.floor(site.progress*20))emit(g,'hammer',e);}
   else if(g.stock.wood>=dt*.4&&g.stock.stone>=dt*.2){g.stock.wood-=dt*.4;g.stock.stone-=dt*.2;site.hp=Math.min(site.maxHp,site.hp+dt*12*rate);}else {e.activity='idle';e.job='Waiting for repair wood and stone';}
   continue;
  }
  if(job.type==='harvest'){
   const deposit=g.deposits.find(d=>d.id===job.depositId);
   if(!deposit||deposit.amount<=0){e.job='Deposit exhausted';e.recall=true;offerTip(g,'exhausted');continue;}
   e.job='Travelling to resource';walk(g,e,deposit,2.5,dt,1.8);
   if(distance(e,deposit)>=2){if(!e.path.length){e.recall=true;e.job='Route blocked';offerTip(g,'blocked');}continue;}
   e.heading=Math.atan2(deposit.x-e.x,deposit.z-e.z);e.activity=deposit.resource==='wood'?'chop':'mine';e.job=deposit.resource==='wood'?'Felling timber':'Quarrying stone';
   const n=Math.min(deposit.amount,dt*1.5*site.level,8-cargoTotal(e.cargo));deposit.amount-=n;e.cargo[deposit.resource]+=n;const previous=e.work;e.work+=dt;if(Math.floor(e.work/1.1)!==Math.floor(previous/1.1))emit(g,deposit.resource==='wood'?'chop':'mine',e);if(cargoTotal(e.cargo)>=7.99)e.delivery=storeFor(e)?.id;continue;
  }
  const output:Resource=site.kind==='sawmill'?'planks':'toys',recipe=site.kind==='sawmill'?cost(4):cost(0,3,1);
  const stocked=(Object.keys(recipe) as Resource[]).every(k=>site.inventory[k]>=recipe[k]);
  if(!stocked&&site.inventory[output]===0){const storage=storeFor(e);if(!storage){e.job='Route blocked';offerTip(g,'blocked');continue;}e.job='Collecting workshop supplies';walk(g,e,centre(storage),2.6,dt,sizeOf(storage)*.5+.7);if(distance(e,centre(storage))<sizeOf(storage)*.5+.9){if(canAfford(g,recipe)){spend(g,recipe);e.cargo={...recipe};e.delivery=site.id;}else{e.job=site.kind==='sawmill'?'Waiting for logs':'Waiting for planks / stone';if(site.kind==='workshop')offerTip(g,'planks');}}continue;}
  e.job='Travelling to workplace';walk(g,e,centre(site),2.5,dt,sizeOf(site)*.5+.7);if(distance(e,centre(site))>=sizeOf(site)*.5+.9){if(!e.path.length){e.recall=true;e.job='Route blocked';offerTip(g,'blocked');}continue;}
  if(site.inventory[output]>0){const n=Math.min(8,site.inventory[output]);site.inventory[output]-=n;e.cargo[output]=n;e.delivery=storeFor(e)?.id;continue;}
  e.job=site.kind==='sawmill'?'Sawing planks':'Making toys';e.activity=site.kind==='sawmill'?'saw':'craft';const previous=e.work;e.work+=dt*site.level;if(Math.floor(e.work)!==Math.floor(previous))emit(g,site.kind==='sawmill'?'saw':'craft',e);
  if(e.work>=5){e.work=0;for(const k of Object.keys(recipe) as Resource[])site.inventory[k]-=recipe[k];site.inventory[output]+=site.kind==='sawmill'?3:4;}
 }
 for(const b of g.buildings){if(b.kind!=='workshop'||b.progress<1||!b.queue.length||g.phase!=='day')continue;b.cooldown+=dt*b.level;const kind=b.queue[0];if(b.cooldown>=TROOPS[kind].seconds){const start=cells(b).flatMap(c=>[{x:c.x-1,z:c.z},{x:c.x+1,z:c.z},{x:c.x,z:c.z-1},{x:c.x,z:c.z+1}]).find(p=>!blocked(g,p.x,p.z));if(!start){b.cooldown=TROOPS[kind].seconds;continue;}b.cooldown=0;b.queue.shift();emit(g,'recruit',b);const p=route(g,start,b.rally??{x:b.x-2,z:b.z+3},1);g.troops.push({...start,id:g.nextId++,kind,hp:TROOPS[kind].hp,maxHp:TROOPS[kind].hp,cooldown:0,path:p,order:{type:'guard',target:b.rally??{x:b.x-2,z:b.z+3}}});}}
}
function attack(g:Game,from:Point,target:{hp:number}&Point,power:number,color:string){const actor=from as Actor;actor.heading=Math.atan2(target.x-from.x,target.z-from.z);actor.activity='attack';actor.actionTime=.45;emit(g,'clan' in from&&(from as Enemy).clan==='witch'?'magic':'kind' in from&&(from as Troop).kind==='artillery'?'cannon':'clash',from);const protectedTarget=g.santa.shield>0&&distance(target,g.santa)<8&&!g.enemies.includes(target as Enemy)&&!g.camps.includes(target as Camp);target.hp-=power*(protectedTarget?.5:1);effect(g,from,target,color);}
function combat(g:Game,dt:number){
 const hearth=g.buildings.find(b=>b.kind==='hearth')!;
 for(const b of g.buildings){if(!['nutcracker','snowglobe','jackbox'].includes(b.kind)||b.progress<1)continue;b.cooldown-=dt;const p=centre(b);const e=g.enemies.find(e=>e.hp>0&&(e.clan!=='witch'||b.kind==='nutcracker')&&distance(e,p)<(b.kind==='nutcracker'?9:7));if(!e||b.cooldown>0)continue;const power=(b.kind==='nutcracker'?28:b.kind==='snowglobe'?10:48)*b.level;for(const target of g.enemies)if((target.clan!=='witch'||b.kind==='nutcracker')&&(target.id===e.id||b.kind!=='nutcracker'&&distance(target,e)<2.5)){attack(g,p,target,power,b.kind==='snowglobe'?'#a9f0ff':'#ffd577');if(b.kind==='snowglobe')target.slow=4;}b.cooldown=b.kind==='jackbox'?2.5:1;}
 for(const t of g.troops){t.cooldown-=dt;const spec=TROOPS[t.kind];const guard=t.order.type==='guard';let target:(Enemy|Camp)|undefined=g.enemies.filter(e=>e.hp>0&&(e.clan!=='witch'||t.kind==='ranger')&&distance(e,t)<(guard?spec.range+2:10)).sort((a,b)=>distance(a,t)-distance(b,t))[0];if(!target&&t.order.type==='attack')target=g.camps.find(c=>!c.cleared&&distance(c,t.order.target)<5&&distance(c,t)<12);
 if(target){if(distance(t,target)<=spec.range+(('cleared'in target)?1.3:0)){if(t.cooldown<=0){attack(g,t,target,spec.damage,'#fff0ba');if(t.kind==='artillery')for(const e of g.enemies)if(e.clan!=='witch'&&e!==target&&distance(e,target)<2.4)e.hp-=spec.damage*.7;t.cooldown=t.kind==='artillery'?2.8:1;}}else walk(g,t,target,spec.speed,dt,spec.range*.85);}
 else walk(g,t,t.order.target,spec.speed,dt,.5);
 }
 if(g.santa.recovering<=0&&g.santa.cooldown<=0){const e=g.enemies.find(e=>e.hp>0&&distance(e,g.santa)<5);if(e){attack(g,g.santa,e,32,'#ffe9a2');g.santa.cooldown=.9;}}
 for(const e of g.enemies){if(e.hp<=0)continue;e.cooldown-=dt;e.slow=Math.max(0,e.slow-dt);const camp=e.campId?g.camps.find(c=>c.id===e.campId):undefined;const speed=(e.clan==='zombie'?.8:e.clan==='king'?.75:e.clan==='skeleton'?1:1.3)*(e.slow>0?.45:1);const range=e.clan==='witch'?5:1.6;
 const actors=[...g.troops,...(g.santa.recovering<=0?[g.santa]:[])];const victim=actors.filter(t=>distance(t,e)<(camp?7:8)).sort((a,b)=>distance(a,e)-distance(b,e))[0];
 if(victim){if(distance(e,victim)<=range){if(e.cooldown<=0){attack(g,e,victim,e.clan==='king'?55:e.clan==='zombie'?24:e.clan==='skeleton'?20:14,'#c590ef');e.cooldown=1.3;}}else walk(g,e,victim,speed,dt,range*.8,true);continue;}
 if(camp&&g.phase==='day'){if(distance(e,camp)>5)walk(g,e,camp,speed,dt,3,true);continue;}
 // Camp guards stay at their camp until approached, even at night.
 if(camp)continue;
 const building=g.buildings.filter(b=>b.kind!=='road'&&distance(e,centre(b))<range+sizeOf(b)*.45).sort((a,b)=>distance(e,centre(a))-distance(e,centre(b)))[0];
 if(building){if(e.cooldown<=0){const p=centre(building);const shield=g.santa.shield>0&&distance(p,g.santa)<8;building.hp-=(e.clan==='king'?95:e.clan==='skeleton'?26:16)*(shield?.5:1);e.activity='attack';e.actionTime=.5;emit(g,e.clan==='witch'?'magic':'clash',e);effect(g,e,p,'#c590ef');e.cooldown=1.3;}continue;}
 if(e.clan==='witch'){walk(g,e,centre(hearth),speed,dt,3.5,true);continue;}
 if(!e.path.length&&(e.retry??0)<=0){e.path=route(g,e,centre(hearth),2.4,true);e.goal='siege';if(!e.path.length){e.path=route(g,e,centre(hearth),2.4,true,true);e.goal='breach';}e.retry=2;}e.retry=Math.max(0,(e.retry??0)-dt);
 const next=e.path[0];if(next){const obstacle=occupancy(g).get(tileKey(next));if(obstacle&&obstacle.kind!=='road'&&distance(e,next)<1.7){if(e.cooldown<=0){obstacle.hp-=e.clan==='king'?95:24;e.cooldown=1.3;e.activity='attack';e.actionTime=.5;emit(g,'clash',e);}}else{e.heading=Math.atan2(next.x-e.x,next.z-e.z);e.activity='walk';const d=distance(e,next);if(d<speed*dt){Object.assign(e,next);e.path.shift();}else{e.x+=(next.x-e.x)/d*speed*dt;e.z+=(next.z-e.z)/d*speed*dt;}}}
 }
 for(const c of g.camps)if(!c.cleared&&c.hp<=0){c.cleared=true;c.hp=0;g.stock.toys+=45;g.stock.planks+=25;for(const e of g.enemies)if(e.campId===c.id)e.hp=0;say(g,`${c.name} liberated. Its nightly reinforcements are weakened!`);}
 const dead=g.enemies.filter(e=>e.hp<=0);g.kills+=dead.length;g.enemies=g.enemies.filter(e=>e.hp>0);g.troops=g.troops.filter(t=>t.hp>0);
 const destroyed=g.buildings.filter(b=>b.hp<=0&&b.kind!=='hearth');if(destroyed.length){g.buildings=g.buildings.filter(b=>b.hp>0||b.kind==='hearth');invalidate(g);}
 if(g.santa.hp<=0&&g.santa.recovering<=0){g.santa.recovering=18;g.santa.path=[];g.santa.shrineId=undefined;say(g,'Santa is recovering at the keep. Hold the line.');}
}
export function tick(g:Game,dt:number){
 if(g.phase==='won'||g.phase==='lost'||g.intro<3)return;for(const a of [g.santa,...g.troops,...g.enemies]){a.actionTime=Math.max(0,(a.actionTime??0)-dt);if(!a.actionTime)a.activity='idle';}
 g.tipQuiet=Math.max(0,g.tipQuiet-dt);g.elapsed+=dt;g.time+=dt;g.messageTime=Math.max(0,g.messageTime-dt);g.effects=g.effects.filter(e=>(e.life-=dt)>0);for(const k of ['burst','blessing','shield','cooldown'] as const)g.santa[k]=Math.max(0,g.santa[k]-dt);
 const keep=g.buildings.find(b=>b.kind==='hearth');if(!keep||keep.hp<=0){g.phase='lost';return;}
 if(g.santa.recovering>0){g.santa.recovering-=dt;if(g.santa.recovering<=0){g.santa.hp=240;g.santa.x=-3;g.santa.z=3;}}
 else if(g.santa.shrineId&&g.phase==='day'){const s=g.shrines.find(s=>s.id===g.santa.shrineId)!;walk(g,g.santa,s,3.5,dt,1.6);if(distance(g.santa,s)<1.9&&!g.enemies.some(e=>distance(e,s)<6)){s.progress+=dt;if(s.progress>=6&&capacity(g)-population(g)>=2){s.restored=true;g.santa.shrineId=undefined;for(let i=0;i<2;i++)addElf(g,{x:s.x-1,z:s.z+i});say(g,`${s.name} restored. Two elves join Christmas.`);}}}
 else if(g.santa.path.length){const p=g.santa.path[0];if(blocked(g,p.x,p.z))g.santa.path=[];else{g.santa.heading=Math.atan2(p.x-g.santa.x,p.z-g.santa.z);g.santa.activity='walk';const d=distance(g.santa,p),n=dt*3.5;if(d<n){Object.assign(g.santa,p);g.santa.path.shift();}else{g.santa.x+=(p.x-g.santa.x)/d*n;g.santa.z+=(p.z-g.santa.z)/d*n;}}}
 if(g.phase==='day'&&!g.enemies.some(e=>distance(e,g.santa)<7))g.santa.hp=Math.min(240,g.santa.hp+dt*3);
 if(g.phase==='day'&&!g.finalSiegeWon){const remaining=dayRemaining(g);if(remaining<=60)offerTip(g,'sunset');if(remaining<=15&&g.time-dt<dayDuration(g)-15)say(g,'15 seconds until nightfall. Halloween is approaching!');if(remaining<=0)startNight(g);}
 elfStep(g,dt);combat(g,dt);
 if(g.phase==='day'&&g.day===2)offerTip(g,'crews');
 if(g.phase==='day'&&g.time>40&&idleElves(g).length>=3)offerTip(g,'idle');
 if(g.phase==='day'&&g.day>=3)offerTip(g,'road');
 if(g.day>=5)offerTip(g,'witches');
 if(g.day>=4&&g.phase==='day')offerTip(g,'liberate');
 if(g.phase==='night'&&g.troops.some(t=>t.hp<t.maxHp*.5))offerTip(g,'wounded');
 if(keep.hp<=0){g.phase='lost';say(g,'The Christmas light has fallen.');return;}
 if(g.phase==='night'){g.nightTime+=dt;g.spawnTimer-=dt;if(g.pending.length&&g.spawnTimer<=0){spawn(g);g.spawnTimer=Math.max(1.2,3-g.day*.1);}if(!g.pending.length&&!g.enemies.some(e=>!e.campId)){g.phase='day';g.time=0;if(g.day===12){g.finalSiegeWon=true;say(g,'The final siege is over. Liberate the remaining clan camps to secure Christmas.');}else{g.day++;say(g,`${CHAPTERS[g.day-1][0]} — ${CHAPTERS[g.day-1][1]}. Quiet days have passed; no supplies were added.`);}}}
 if(g.finalSiegeWon&&g.camps.every(c=>c.cleared)){g.phase='won';say(g,'Christmas belongs to everyone. The Northlands are free.');}
}
export function saveGame(g:Game){return JSON.stringify({...g,effects:[]});}
export function loadGame(raw:string):Game|null{
 try{if(raw.length>2000000)return null;const g=JSON.parse(raw) as Game;const finite=(v:unknown):boolean=>typeof v==='number'?Number.isFinite(v):v===null||typeof v!=='object'||Object.values(v).every(finite);const nums=(o:object,keys:string[])=>!!o&&keys.every(k=>typeof(o as Record<string,unknown>)[k]==='number');const point=(p:Point)=>!!p&&nums(p,['x','z'])&&onIsland(Math.round(p.x),Math.round(p.z));const actor=(a:Actor)=>point(a)&&Array.isArray(a.path)&&a.path.length<5000&&a.path.every(point);const stock=(s:Stock)=>s&&['wood','planks','stone','toys'].every(k=>typeof s[k as Resource]==='number'&&s[k as Resource]>=0);
 if(!g||![2,3].includes(g.version)||!finite(g)||!Number.isInteger(g.day)||g.day<1||g.day>12||!['day','night','won','lost'].includes(g.phase)||!stock(g.stock)||!nums(g,['seed','nextId','time','nightTime','elapsed','spawnTimer','kills','messageTime'])||typeof g.finalSiegeWon!=='boolean'||!['balanced','materials','industry'].includes(g.workforce))return null;
 if(!Array.isArray(g.buildings)||g.buildings.length>450||g.buildings.filter(b=>b.kind==='hearth').length!==1||!g.buildings.every(b=>point(b)&&Object.hasOwn(CATALOG,b.kind)&&nums(b,['id','level','rotation','hp','maxHp','progress','cooldown'])&&[1,2].includes(b.level)&&b.progress>=0&&b.progress<=1&&b.maxHp>0&&stock(b.inventory)&&Array.isArray(b.queue)&&b.queue.length<=5&&b.queue.every(t=>Object.hasOwn(TROOPS,t))&&(!b.rally||point(b.rally))))return null;
 if(!Array.isArray(g.elves)||g.elves.length>200||!g.elves.every(e=>actor(e)&&nums(e,['id','work'])&&stock(e.cargo)&&typeof e.job==='string'))return null;
 if(!Array.isArray(g.troops)||g.troops.length>200||!g.troops.every(t=>actor(t)&&nums(t,['id','hp','maxHp','cooldown'])&&Object.hasOwn(TROOPS,t.kind)&&t.order&&['move','attack','guard'].includes(t.order.type)&&point(t.order.target)))return null;
 if(!Array.isArray(g.enemies)||g.enemies.length>150||!g.enemies.every(e=>actor(e)&&nums(e,['id','hp','maxHp','cooldown','slow'])&&['pumpkin','skeleton','witch','king','zombie'].includes(e.clan)))return null;
 if(!actor(g.santa)||!nums(g.santa,['hp','recovering','cooldown','burst','blessing','shield']))return null;
 if(!Array.isArray(g.shrines)||g.shrines.length!==4||!g.shrines.every(s=>point(s)&&nums(s,['id','progress'])&&typeof s.restored==='boolean'))return null;
 if(g.santa.shrineId!==undefined&&!g.shrines.some(s=>s.id===g.santa.shrineId))return null;
 if(!Array.isArray(g.camps)||g.camps.length!==3||!g.camps.every(c=>point(c)&&nums(c,['id','hp','maxHp'])&&typeof c.cleared==='boolean'))return null;
 if(!Array.isArray(g.deposits)||g.deposits.length!==6||!g.deposits.every(d=>point(d)&&nums(d,['id','amount'])&&d.amount>=0&&['wood','stone'].includes(d.resource)))return null;
 if(!Array.isArray(g.pending)||g.pending.length>100||!g.pending.every(c=>['pumpkin','skeleton','witch','king','zombie'].includes(c)))return null;g.effects=[];
 if((g.version as number)===2){g.version=3;g.intro=3;g.lessons=['welcome','orders','powers'];g.tip='crews';g.tipQuiet=0;g.delivered=false;g.migrated=true;g.time=0;for(const e of g.elves){const b=g.buildings.find(b=>b.id===e.source);if(b&&['lumber','quarry'].includes(b.kind)){const d=g.deposits.find(d=>d.amount>0&&d.resource===(b.kind==='lumber'?'wood':'stone')&&distance(d,centre(b))<13);if(d)e.assignment={type:'harvest',buildingId:b.id,depositId:d.id};}else if(b&&['sawmill','workshop'].includes(b.kind))e.assignment={type:'operate',buildingId:b.id};}}
 if(!Number.isInteger(g.intro)||g.intro<0||g.intro>3||!Array.isArray(g.lessons)||g.lessons.length>40||!g.lessons.every(t=>Object.hasOwn(TIP_KEYS,t))||typeof g.tipQuiet!=='number'||typeof g.delivered!=='boolean'||typeof g.migrated!=='boolean')return null;
 if(g.tip!==null&&!Object.hasOwn(TIP_KEYS,g.tip))return null;
 for(const e of g.elves)if(e.assignment){const a=e.assignment;if(!['harvest','operate','build'].includes(a.type)||!Number.isInteger(a.buildingId)||a.type==='harvest'&&!g.deposits.some(d=>d.id===a.depositId))return null;}
 return g;
 }catch{return null;}
}

/** Transient notifications are deliberately excluded from saves and replays. */
export type GameEvent=Point & {type:'place'|'hammer'|'complete'|'upgrade'|'recruit'|'chop'|'mine'|'saw'|'craft'|'clash'|'magic'|'step'|'cannon'};
const eventQueues=new WeakMap<Game,GameEvent[]>();
function emit(g:Game,type:GameEvent['type'],position:Point){const queue=eventQueues.get(g)??[];if(queue.length<64)queue.push({type,x:position.x,z:position.z});
 if(['chop','mine','hammer','complete','clash','cannon'].includes(type)&&g.effects.length<72){const n=type==='complete'?7:type==='cannon'?4:2;for(let i=0;i<n;i++){const angle=i*2.4+g.elapsed;const radius=type==='complete'?1.8:.45;g.effects.push({id:g.nextId++,from:{...position},to:{x:position.x+Math.sin(angle)*radius,z:position.z+Math.cos(angle)*radius},color:type==='chop'?'#dab47e':type==='mine'?'#cfdfdf':type==='clash'?'#ffce80':'#fff1ae',life:.65,total:.65,kind:type==='complete'?'completion':'particle'});}}
 eventQueues.set(g,queue);}
export function drainEvents(g:Game){const queue=eventQueues.get(g)??[];eventQueues.delete(g);return queue;}

export const TIP_KEYS={welcome:1,orders:1,powers:1,crews:1,delivery:1,builders:1,planks:1,road:1,idle:1,blocked:1,exhausted:1,sunset:1,wounded:1,witches:1,liberate:1};
export function offerTip(g:Game,id:TipId){if(!g.tip&&g.tipQuiet===0&&!g.lessons.includes(id)&&!(g.phase==='night'&&!['wounded','witches'].includes(id)))g.tip=id;}
export function dismissTip(g:Game){if(g.tip&&!g.lessons.includes(g.tip))g.lessons.push(g.tip);g.tip=null;g.tipQuiet=35;}
export function advanceIntro(g:Game){dismissTip(g);g.intro=Math.min(3,g.intro+1);if(g.intro<3)g.tip=g.intro===1?'orders':'powers';}
export const dayDuration=(g:Game)=>CHAPTERS[g.day-1][2]||240;
export const dayRemaining=(g:Game)=>Math.max(0,dayDuration(g)-g.time);
export const idleElves=(g:Game)=>g.elves.filter(e=>!e.assignment&&!e.recall&&cargoTotal(e.cargo)===0);
export const crewFor=(g:Game,id:number)=>g.elves.filter(e=>e.assignment?.buildingId===id&&!e.recall);
export function assignCrew(g:Game,assignment:Assignment,count:number){
 const b=g.buildings.find(b=>b.id===assignment.buildingId);if(!b||!Number.isInteger(count)||count<0||count>3)return false;
 const harvesting=assignment.type==='harvest',operating=assignment.type==='operate';
 if(harvesting&&(!['lumber','quarry'].includes(b.kind)||b.progress<1)||operating&&(!['sawmill','workshop'].includes(b.kind)||b.progress<1||count>1)||assignment.type==='build'&&(b.kind==='road'||b.progress===1&&b.hp>=b.maxHp))return false;
 if(harvesting){const d=g.deposits.find(d=>d.id===assignment.depositId);if(!d||d.amount<=0||d.resource!==(b.kind==='lumber'?'wood':'stone')||distance(d,centre(b))>=13)return false;}
 const current=crewFor(g,b.id);if(count>current.length+idleElves(g).length){say(g,'Recall another crew or welcome more elves first.');return false;}
 for(const e of current.slice(count)){e.recall=true;e.delivery=undefined;if(!cargoTotal(e.cargo)){e.assignment=undefined;e.source=undefined;e.recall=false;e.path=[];}}
 for(const e of current.slice(0,count)){if(e.assignment?.depositId!==assignment.depositId&&cargoTotal(e.cargo)>0){e.delivery=g.buildings.find(b=>b.kind==='hearth')?.id;}e.assignment={...assignment};e.source=b.id;}
 for(const e of idleElves(g).slice(0,Math.max(0,count-current.length))){e.assignment={...assignment};e.source=b.id;e.path=[];e.goal=undefined;e.work=0;}
 say(g,`${count} ${count===1?'elf':'elves'} assigned to ${CATALOG[b.kind].name}.`);return true;
}
export function recallCrew(g:Game,id:number){for(const e of crewFor(g,id)){e.recall=true;e.delivery=undefined;if(!cargoTotal(e.cargo)){e.assignment=undefined;e.source=undefined;e.recall=false;e.path=[];}}say(g,'Crew recalled. Carriers will deliver their supplies first.');}
export function constructionStatus(g:Game,b:Building,speed=1){const crew=crewFor(g,b.id);if(g.phase==='night')return 'Sheltered until dawn';if(!crew.length)return 'Waiting for builders';const active=crew.filter(e=>e.activity==='build');if(!active.length)return crew.some(e=>e.job==='Route blocked')?'Route blocked':'Builders travelling · work has not started';const rate=active.length===1?1:active.length===2?1.6:2;return `${Math.ceil((1-b.progress)*BUILD_INFO[b.kind].seconds/rate/speed)}s work remaining at ${speed}×`;}
export function readiness(g:Game){const target={guards:Math.max(3,g.day+1),rangers:g.day<5?0:Math.ceil(g.day/2),towers:Math.max(1,Math.ceil(g.day/3)),mortars:g.day<6?0:Math.floor(g.day/6)};const count=(k:TroopKind)=>g.troops.filter(t=>t.kind===k&&t.hp>t.maxHp*.5).length;const towers=g.buildings.filter(b=>b.kind==='nutcracker'&&b.progress===1&&distance(centre(b),{x:0,z:0})<12).length;const mortars=g.buildings.filter(b=>b.kind==='jackbox'&&b.progress===1).length;const warnings:string[]=[];if(count('infantry')<target.guards)warnings.push(`${target.guards-count('infantry')} more healthy guards recommended`);if(count('ranger')<target.rangers)warnings.push(`${target.rangers-count('ranger')} more rangers for flying witches`);if(towers<target.towers)warnings.push(`${target.towers-towers} more watchtowers near the Keep`);if(mortars<target.mortars)warnings.push(`${target.mortars-mortars} more mortars for groups`);if(g.buildings.some(b=>b.progress<1))warnings.push('Some defences or workplaces are unfinished');if(g.troops.some(t=>t.hp<t.maxHp*.5))warnings.push('Wounded soldiers need Santa’s Cheer');if(g.buildings.find(b=>b.kind==='hearth')!.hp<1800)warnings.push('Assign repair elves to the Keep');if(!g.buildings.some(b=>b.kind==='wall'))warnings.push('Open approaches: ground raiders can reach your settlement');const score=(Math.min(1,count('infantry')/target.guards)+Math.min(1,towers/target.towers)+(target.rangers?Math.min(1,count('ranger')/target.rangers):1))/3;return {target,warnings,label:score>=.95&&g.buildings.find(b=>b.kind==='hearth')!.hp>=1800&&!g.troops.some(t=>t.hp<t.maxHp*.5)?'Prepared':score>=.5?'Developing':'Underprepared'};}

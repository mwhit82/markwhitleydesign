/** Deterministic, renderer-independent HallowsEve26 simulation. One unit = one grid cell. */
export const LIMIT = 16;
export const SAVE_KEY = 'hallowseve26-save-v1';
export const DAY_SECONDS = 120;
export type Point = { x: number; z: number };
export type Kind = 'hearth' | 'wall' | 'gate' | 'nutcracker' | 'snowglobe' | 'jackbox' | 'workshop';
export type Clan = 'pumpkin' | 'skeleton' | 'witch' | 'king';
export type Phase = 'day' | 'night' | 'won' | 'lost';
export type Stock = { wood: number; stone: number; toys: number };
export type Building = Point & { id: number; kind: Kind; level: number; rotation: number; hp: number; maxHp: number; progress: number; cooldown: number };
export type Actor = Point & { path: Point[]; goal?: string };
export type Elf = Actor & { id: number; job: string; work: number };
export type Enemy = Actor & { id: number; clan: Clan; hp: number; maxHp: number; cooldown: number; slow: number };
export type Shrine = Point & { id: number; name: string; restored: boolean; progress: number };
export type Deposit = Point & { id: number; resource: 'wood' | 'stone'; amount: number };
export type Effect = { id: number; from: Point; to: Point; color: string; life: number; total: number };
export type Game = {
  version: 1; seed: number; nextId: number; day: number; phase: Phase; time: number; nightTime: number;
  stock: Stock; buildings: Building[]; elves: Elf[]; enemies: Enemy[]; shrines: Shrine[]; deposits: Deposit[];
  santa: Actor & { hp: number; recovering: number; cooldown: number; burst: number; shrineId?: number };
  pending: Clan[]; spawnTimer: number; effects: Effect[]; kills: number; message: string; messageTime: number;
};
export const CATALOG: Record<Kind, { name: string; cost: Stock; hp: number; size: number; description: string }> = {
  hearth: { name: 'Christmas Hearth', cost: { wood: 0, stone: 0, toys: 0 }, hp: 1200, size: 2, description: 'Keep the Christmas flame alive. If it falls, Christmas is lost.' },
  wall: { name: 'Castle wall', cost: { wood: 4, stone: 12, toys: 0 }, hp: 320, size: 1, description: 'Stone protection. Raiders must break through.' },
  gate: { name: 'Castle gate', cost: { wood: 16, stone: 12, toys: 0 }, hp: 380, size: 1, description: 'Santa and elves pass freely. Halloween cannot.' },
  workshop: { name: 'Toy workshop', cost: { wood: 60, stone: 35, toys: 0 }, hp: 480, size: 2, description: 'One elf turns Christmas cheer into toy parts. Upgrade to a huge 3×3 factory.' },
  nutcracker: { name: 'Nutcracker tower', cost: { wood: 30, stone: 20, toys: 15 }, hp: 280, size: 1, description: 'Reliable long-range toy soldier. Range 7 · damage 23.' },
  snowglobe: { name: 'Snow-globe tower', cost: { wood: 20, stone: 30, toys: 25 }, hp: 240, size: 1, description: 'Slows groups with enchanted snow. Range 6 · damage 7.' },
  jackbox: { name: 'Jack-in-the-box', cost: { wood: 35, stone: 15, toys: 35 }, hp: 240, size: 1, description: 'Explosive toy surprises hit whole groups. Range 6 · damage 28.' },
};
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
export const tileKey = (p: Point) => `${Math.round(p.x)},${Math.round(p.z)}`;
export const onIsland = (x: number, z: number) => Math.abs(x) <= LIMIT && Math.abs(z) <= LIMIT && x*x + z*z < 355;
export function biome(x: number, z: number) {
  if (Math.hypot(x, z) < 7) return 'snow';
  if (x < 0 && z < 0) return 'forest';
  if (x >= 0 && z < 0) return 'pumpkin';
  if (x < 0) return 'marsh';
  return 'graveyard';
}
export const sizeOf = (b: Building) => b.kind === 'workshop' && b.level > 1 ? 3 : CATALOG[b.kind].size;
export function cells(b: Building): Point[] {
  const size = sizeOf(b);
  return Array.from({ length: size * size }, (_, i) => ({ x: b.x + i % size, z: b.z + Math.floor(i / size) }));
}
export const centre = (b: Building) => ({ x: b.x + (sizeOf(b)-1)/2, z: b.z + (sizeOf(b)-1)/2 });
export function buildingAt(g: Game, x: number, z: number) {
  return g.buildings.find(b => x >= b.x && x < b.x + sizeOf(b) && z >= b.z && z < b.z + sizeOf(b));
}
export function say(g: Game, message: string) { g.message = message; g.messageTime = 6; }
function makeBuilding(g: Game, kind: Kind, x: number, z: number, complete = false): Building {
  return { id: g.nextId++, kind, x, z, level: 1, rotation: 0, hp: CATALOG[kind].hp, maxHp: CATALOG[kind].hp, progress: complete ? 1 : 0, cooldown: 0 };
}
export function newGame(seed = 261225): Game {
  const g: Game = {
    version: 1, seed, nextId: 1, day: 1, phase: 'day', time: DAY_SECONDS, nightTime: 0,
    stock: { wood: 160, stone: 130, toys: 55 }, buildings: [], elves: [], enemies: [],
    shrines: [
      { id: 1, x: -11, z: -10, name: 'Whispering Pines', restored: false, progress: 0 },
      { id: 2, x: 11, z: -10, name: 'Harvest Hollow', restored: false, progress: 0 },
      { id: 3, x: -11, z: 10, name: 'Witchwater Fen', restored: false, progress: 0 },
      { id: 4, x: 11, z: 10, name: 'The Silent Barrows', restored: false, progress: 0 },
    ], deposits: [
      {id: 1, x:-5,z:-5,resource:'wood',amount:500}, {id:2,x:5,z:5,resource:'stone',amount:500},
      {id:3,x:-10,z:-5,resource:'wood',amount:500}, {id:4,x:9,z:5,resource:'stone',amount:500},
    ],
    santa: { x: 0, z: 3, hp: 160, recovering: 0, cooldown: 0, burst: 0, path: [] },
    pending: [], spawnTimer: 0, effects: [], kills: 0,
    message: 'Build a toy workshop and two nutcracker towers. Your elves will do the work.', messageTime: 14,
  };
  g.buildings.push(makeBuilding(g, 'hearth', 0, 0, true));
  for (let i=0;i<4;i++) g.elves.push({id:g.nextId++,x:-2-i%2,z:2+Math.floor(i/2),path:[],job:'Ready',work:0});
  return g;
}
export function canAfford(g: Game, cost: Stock) { return (Object.keys(cost) as (keyof Stock)[]).every(k=>g.stock[k]>=cost[k]); }
function spend(g: Game, cost: Stock) { for (const k of Object.keys(cost) as (keyof Stock)[]) g.stock[k]-=cost[k]; }
export function placementError(g: Game, kind: Kind, x: number, z: number, upgrading?: number) {
  if (g.phase !== 'day') return 'Build and upgrade during daylight.';
  const size = upgrading ? 3 : CATALOG[kind].size;
  for (let dx=0;dx<size;dx++) for(let dz=0;dz<size;dz++) {
    const p={x:x+dx,z:z+dz};
    if (!onIsland(p.x,p.z)) return 'Keep the whole building on the island.';
    const existing=buildingAt(g,p.x,p.z);
    if (existing && existing.id!==upgrading) return 'Another building is in the way.';
    if(g.shrines.some(s=>distance(s,p)<1.5)||g.deposits.some(d=>distance(d,p)<1.2)) return 'Leave shrines and resources accessible.';
    if(distance(g.santa,p)<.8||g.elves.some(e=>distance(e,p)<.7)) return 'Santa or an elf is standing here.';
  }
  return '';
}
export function place(g: Game, kind: Kind, x: number, z: number, rotation = 0) {
  if (kind === 'hearth') return false;
  const error = placementError(g,kind,x,z);
  if(error) {say(g,error);return false;}
  if(!canAfford(g,CATALOG[kind].cost)) {say(g,'Not enough materials. Let your elves gather more.');return false;}
  spend(g,CATALOG[kind].cost);
  const b=makeBuilding(g,kind,x,z);b.rotation=rotation;g.buildings.push(b);
  say(g,`${CATALOG[kind].name} queued. An elf is on the way.`); return true;
}
export function upgradeCost(b: Building): Stock { return {wood: b.kind==='workshop'?90:30,stone:b.kind==='workshop'?60:35,toys:b.kind==='workshop'?25:20}; }
export function upgrade(g: Game, id: number) {
  const b=g.buildings.find(b=>b.id===id);
  if(!b||b.kind==='hearth'||b.level>=2||b.progress<1||g.phase!=='day') return false;
  if(b.kind==='workshop') {const error=placementError(g,b.kind,b.x,b.z,b.id);if(error){say(g,error);return false;}}
  const cost=upgradeCost(b);if(!canAfford(g,cost)){say(g,'Not enough materials for this upgrade.');return false;}
  spend(g,cost);b.level=2;b.maxHp*=1.6;b.hp=b.maxHp;b.progress=0;
  say(g,`${CATALOG[b.kind].name} upgrade queued.`);return true;
}
export function demolish(g: Game,id:number) {
  const b=g.buildings.find(b=>b.id===id);if(!b||b.kind==='hearth'||g.phase!=='day')return false;
  const cost=CATALOG[b.kind].cost;
  for(const k of Object.keys(cost) as (keyof Stock)[])g.stock[k]+=Math.floor((cost[k]+(b.level>1?upgradeCost(b)[k]:0))*.5);
  g.buildings=g.buildings.filter(b=>b.id!==id);say(g,'Building removed. Half of its materials recovered.');return true;
}
function blocked(g: Game,x:number,z:number,enemy=false,ignoreBuildings=false) {
  if(!onIsland(x,z))return true;
  if(ignoreBuildings)return false;
  const b=buildingAt(g,x,z);return !!b && (enemy||b.kind!=='gate');
}
/** Breadth-first grid routing; enemies fall back to a breach route when all entrances are sealed. */
export function route(g: Game, actor: Point, target: Point, reach=0, enemy=false, breach=false): Point[] {
  const start={x:Math.round(actor.x),z:Math.round(actor.z)};
  const queue=[start], parents=new Map<string,Point|null>([[tileKey(start),null]]);
  let end:Point|undefined;
  for(let i=0;i<queue.length;i++) {
    const p=queue[i];
    if(distance(p,target)<=reach+.1){end=p;break;}
    for(const [dx,dz] of [[1,0],[0,1],[-1,0],[0,-1]]) {
      const n={x:p.x+dx,z:p.z+dz},key=tileKey(n);
      if(parents.has(key)||blocked(g,n.x,n.z,enemy,breach))continue;
      parents.set(key,p);queue.push(n);
    }
  }
  if(!end)return [];
  const path:Point[]=[];let p:Point|null=end;
  while(p && tileKey(p)!==tileKey(start)){path.unshift(p);p=parents.get(tileKey(p))??null;}
  return path;
}
function walk(g:Game,a:Actor,target:Point,speed:number,dt:number,reach=0,enemy=false,breach=false) {
  const key=`${tileKey(target)}:${reach}:${breach}`;
  if(a.goal!==key||(!a.path.length&&distance(a,target)>reach+.2)) {a.path=route(g,a,target,reach,enemy,breach);a.goal=key;}
  const p=a.path[0];if(!p)return;
  if(blocked(g,p.x,p.z,enemy,breach)){a.path=[];return;}
  const d=distance(a,p),step=speed*dt;
  if(d<=step){a.x=p.x;a.z=p.z;a.path.shift();}else{a.x+=(p.x-a.x)/d*step;a.z+=(p.z-a.z)/d*step;}
}
export function moveSanta(g:Game,target:Point) {
  if(g.santa.recovering>0||g.phase==='won'||g.phase==='lost')return;
  g.santa.shrineId=undefined;
  if(blocked(g,target.x,target.z)){say(g,'Choose open ground for Santa.');return;}
  g.santa.path=route(g,g.santa,target);g.santa.goal='manual';
  if(!g.santa.path.length&&distance(g.santa,target)>1)say(g,'No route. Add a gate or clear a path.');
}
export function restoreShrine(g:Game,id:number) {
  const s=g.shrines.find(s=>s.id===id);if(!s||s.restored)return;
  if(g.phase!=='day'){say(g,'Restore shrines in the safety of daylight.');return;}
  g.santa.shrineId=id;g.santa.path=[];g.santa.goal=undefined;say(g,`Santa is heading to ${s.name}.`);
}
function effect(g:Game,from:Point,to:Point,color:string,life=.35) {
  if(g.effects.length>=80)g.effects.shift();
  g.effects.push({id:g.nextId++,from:{...from},to:{...to},color,life,total:life});
}
export function cheerBurst(g:Game) {
  if(g.phase!=='night'||g.santa.burst>0||g.santa.recovering>0)return false;
  g.santa.burst=18;g.santa.hp=Math.min(160,g.santa.hp+55);
  for(const e of g.enemies)if(distance(e,g.santa)<5){e.hp-=65;e.slow=5;effect(g,g.santa,e,'#fce6a0',.7);}
  for(const b of g.buildings)if(distance(centre(b),g.santa)<5)b.hp=Math.min(b.maxHp,b.hp+65);
  say(g,'Christmas cheer! Nearby enemies stagger and your castle is restored.');return true;
}
export function wave(day:number):Clan[] {
  const result:Clan[]=[];
  for(let i=0;i<5+day*2;i++)result.push(day>=6&&i%6===0?'witch':day>=3&&i%4===0?'skeleton':'pumpkin');
  if(day===12)result.push('king');return result;
}
export function startNight(g:Game) {
  if(g.phase!=='day')return;
  g.phase='night';g.nightTime=0;g.pending=wave(g.day);g.spawnTimer=1;g.santa.shrineId=undefined;
  say(g,g.day===12?'Christmas Eve. The Pumpkin King has come for the Hearth.':'The lanterns are lit. Halloween is at the gates.');
  for(const e of g.elves){e.path=[];e.goal=undefined;}
}
function random(g:Game){g.seed=(Math.imul(1664525,g.seed)+1013904223)>>>0;return g.seed/4294967296;}
function spawn(g:Game) {
  const clan=g.pending.shift();if(!clan)return;
  const entrances=[{x:-15,z:-8},{x:15,z:-8},{x:-15,z:8},{x:15,z:8}];
  const p=entrances[Math.floor(random(g)*Math.min(4,1+Math.floor(g.day/3)))];
  const base=clan==='king'?1250:clan==='skeleton'?145:clan==='witch'?90:65;
  const hp=base*(1+(g.day-1)*.065);
  g.enemies.push({...p,id:g.nextId++,clan,hp,maxHp:hp,cooldown:1,slow:0,path:[]});
}
function elfStep(g:Game,dt:number) {
  const assigned=new Set<number>();
  const daytime=g.phase==='day';
  for(const e of g.elves) {
    let target=g.buildings.find(b=>b.progress<1&&!assigned.has(b.id));
    let job='Building';
    if(!daytime)target=undefined;
    if(!target&&daytime){target=g.buildings.find(b=>b.hp<b.maxHp&&b.progress===1&&!assigned.has(b.id));job='Repairing';}
    if(!target){target=g.buildings.find(b=>b.kind==='workshop'&&b.progress===1&&!assigned.has(b.id));job='Making toys';}
    if(target){
      assigned.add(target.id);e.job=job;e.work=0;walk(g,e,centre(target),2.5,dt,sizeOf(target)*.5+.7);
      if(distance(e,centre(target))<=sizeOf(target)*.5+.9){
        if(job==='Building')target.progress=Math.min(1,target.progress+dt/(target.kind==='wall'||target.kind==='gate'?3:8));
        else if(job==='Repairing')target.hp=Math.min(target.maxHp,target.hp+dt*22);
        else g.stock.toys+=dt*(target.level===2?1.4:.65)*(1+g.shrines.filter(s=>s.restored).length*.2);
      }
      continue;
    }
    if(!daytime){e.job='Sheltering';e.work=0;walk(g,e,{x:-1,z:2},2.8,dt,1);continue;}
    const currentResource=e.job==='Gathering wood'?'wood':e.job==='Quarrying stone'?'stone':null;
    const resource=currentResource&&e.work<12?currentResource:g.stock.wood<g.stock.stone*1.35?'wood':'stone';
    if(resource!==currentResource||e.work>=12)e.work=0;
    const deposit=g.deposits.filter(d=>d.resource===resource&&d.amount>0).sort((a,b)=>distance(e,a)-distance(e,b))[0];
    if(!deposit){e.job='Resting';continue;}
    e.job=resource==='wood'?'Gathering wood':'Quarrying stone';walk(g,e,deposit,2.5,dt,1.1);
    if(distance(e,deposit)<1.4){const amount=Math.min(deposit.amount,dt*1.8);g.stock[resource]+=amount;deposit.amount-=amount;e.work+=amount;}
  }
}
export function tick(g:Game,dt:number) {
  if(g.phase==='won'||g.phase==='lost')return;
  g.messageTime=Math.max(0,g.messageTime-dt);
  g.effects=g.effects.filter(e=>(e.life-=dt)>0);
  g.santa.burst=Math.max(0,g.santa.burst-dt);g.santa.cooldown=Math.max(0,g.santa.cooldown-dt);
  const hearth=g.buildings.find(b=>b.kind==='hearth');
  if(!hearth||hearth.hp<=0){g.phase='lost';say(g,'The Christmas flame has gone out.');return;}
  if(g.santa.recovering>0){g.santa.recovering-=dt;if(g.santa.recovering<=0){g.santa.hp=160;g.santa.x=-1;g.santa.z=2;}}
  else {
    if(g.santa.shrineId && g.phase==='day') {
      const s=g.shrines.find(s=>s.id===g.santa.shrineId)!;walk(g,g.santa,s,3.5,dt,1.1);
      if(distance(g.santa,s)<1.4){s.progress+=dt;if(s.progress>=4){s.restored=true;g.santa.shrineId=undefined;
        for(let i=0;i<2;i++)g.elves.push({id:g.nextId++,x:s.x,z:s.z+i,path:[],job:'Joining Christmas',work:0});
        say(g,`${s.name} restored! Two elves join you. Toy production rises.`);effect(g,s,s,'#ffeea6',1.5);
      }}
    } else if(g.santa.path.length) {
      const target=g.santa.path[0];
      if(blocked(g,target.x,target.z))g.santa.path=[];
      else {const d=distance(g.santa,target),step=3.5*dt;if(d<=step){g.santa.x=target.x;g.santa.z=target.z;g.santa.path.shift();}else{g.santa.x+=(target.x-g.santa.x)/d*step;g.santa.z+=(target.z-g.santa.z)/d*step;}}
    }
    if(g.phase==='day')g.santa.hp=Math.min(160,g.santa.hp+dt*10);
  }
  elfStep(g,dt);
  if(g.phase==='day'){g.time-=dt;if(g.time<=0)startNight(g);return;}
  g.nightTime+=dt;g.spawnTimer-=dt;
  if(g.pending.length&&g.spawnTimer<=0){spawn(g);g.spawnTimer=Math.max(.65,2.8-g.day*.12);}
  for(const b of g.buildings) {
    if(!['nutcracker','snowglobe','jackbox'].includes(b.kind)||b.progress<1)continue;
    b.cooldown-=dt;if(b.cooldown>0)continue;
    const range=(b.kind==='nutcracker'?7:6)+(b.level-1);
    const target=g.enemies.filter(e=>e.hp>0&&distance(e,centre(b))<range).sort((a,c)=>distance(a,hearth)-distance(c,hearth))[0];
    if(!target)continue;
    const power=(b.kind==='nutcracker'?23:b.kind==='snowglobe'?7:28)*(b.level===2?1.7:1);
    const radius=b.kind==='nutcracker'?0:b.kind==='snowglobe'?2.5:2;
    for(const e of g.enemies)if(e.id===target.id||distance(e,target)<radius){e.hp-=power;if(b.kind==='snowglobe')e.slow=3;}
    b.cooldown=b.kind==='jackbox'?2: b.kind==='snowglobe'?1.5:.85;
    effect(g,centre(b),target,b.kind==='snowglobe'?'#b3e8ff':b.kind==='jackbox'?'#ff9f7f':'#ffe5a5');
  }
  if(g.santa.recovering<=0&&g.santa.cooldown<=0){const e=g.enemies.find(e=>e.hp>0&&distance(e,g.santa)<4);if(e){e.hp-=25;g.santa.cooldown=.8;effect(g,g.santa,e,'#fff2bc');}}
  for(const e of g.enemies) {
    if(e.hp<=0)continue;e.cooldown-=dt;e.slow=Math.max(0,e.slow-dt);
    const ranged=e.clan==='witch',range=ranged?4.5:1.3;
    const victim=g.buildings.filter(b=>distance(e,centre(b))<range+sizeOf(b)*.35).sort((a,b)=>distance(e,centre(a))-distance(e,centre(b)))[0];
    if(g.santa.recovering<=0&&distance(e,g.santa)<1.3){
      if(e.cooldown<=0){g.santa.hp-=e.clan==='king'?35:12;e.cooldown=1.3;effect(g,e,g.santa,'#d59bf9');}
    }else if(victim){
      if(e.cooldown<=0){victim.hp-=e.clan==='king'?80:e.clan==='skeleton'?27:ranged?15:12;e.cooldown=ranged?1.8:1.2;effect(g,e,centre(victim),'#c39acb');}
    }else{
      const target=centre(hearth);const reach=1.7;
      if(!e.path.length || e.goal?.startsWith('breach')){
        const normal=route(g,e,target,reach,true);
        if(normal.length){e.path=normal;e.goal=`${tileKey(target)}:${reach}:false`;}
        else {e.path=route(g,e,target,reach,true,true);e.goal='breach';}
      }
      const next=e.path[0],obstacle=next&&buildingAt(g,next.x,next.z);
      if(obstacle&&distance(e,next)<1.5){if(e.cooldown<=0){obstacle.hp-=e.clan==='king'?80:e.clan==='skeleton'?27:12;e.cooldown=1.2;effect(g,e,centre(obstacle),'#c39acb');}}
      else if(next){const speed=(e.clan==='king'?.55:e.clan==='skeleton'?.65:1)*(e.slow>0?.4:1);const d=distance(e,next);if(d<=speed*dt){e.x=next.x;e.z=next.z;e.path.shift();}else{e.x+=(next.x-e.x)/d*speed*dt;e.z+=(next.z-e.z)/d*speed*dt;}}
    }
  }
  if(g.santa.hp<=0&&g.santa.recovering<=0){g.santa.recovering=10;g.santa.path=[];say(g,'Santa is recovering at the Hearth. Your toys must hold the line.');}
  const dead=g.enemies.filter(e=>e.hp<=0);g.kills+=dead.length;g.stock.toys+=dead.length*2;g.enemies=g.enemies.filter(e=>e.hp>0);
  g.buildings=g.buildings.filter(b=>b.hp>0||b.kind==='hearth');
  if(hearth.hp<=0){g.phase='lost';say(g,'The Christmas flame has gone out.');return;}
  if(!g.pending.length&&!g.enemies.length){
    if(g.day===12){g.phase='won';say(g,'Christmas morning. The light endured.');}
    else{g.day++;g.phase='day';g.time=DAY_SECONDS;g.santa.hp=160;g.santa.recovering=0;for(const d of g.deposits)d.amount=500;say(g,`December ${12+g.day}. A new dawn. Repair, recruit, and prepare.`);}
  }
}
export function saveGame(g:Game){return JSON.stringify({...g,effects:[],message:'Welcome back. Christmas is counting on you.',messageTime:5});}
export function loadGame(raw:string):Game|null {
  try {
    const g=JSON.parse(raw) as Game;
    const finite=(v:unknown):boolean=>typeof v==='number'?Number.isFinite(v):v===null||typeof v!=='object'||Object.values(v).every(finite);
    const point=(p:Point)=>p&&typeof p.x==='number'&&typeof p.z==='number'&&onIsland(Math.round(p.x),Math.round(p.z));
    const actor=(a:Actor)=>point(a)&&Array.isArray(a.path)&&a.path.length<1200&&a.path.every(point);
    const numbers=(o:object,keys:string[])=>!!o&&keys.every(k=>typeof (o as Record<string,unknown>)[k]==='number');
    if(!g||g.version!==1||!finite(g)||!Number.isInteger(g.day)||g.day<1||g.day>12||!['day','night','won','lost'].includes(g.phase))return null;
    if(!g.stock||!['wood','stone','toys'].every(k=>typeof g.stock[k as keyof Stock]==='number'&&g.stock[k as keyof Stock]>=0))return null;
    if(!Array.isArray(g.buildings)||g.buildings.length>1100||!g.buildings.every(b=>point(b)&&Object.hasOwn(CATALOG,b.kind)&&[1,2].includes(b.level)&&typeof b.hp==='number'&&typeof b.progress==='number'))return null;
    if(g.buildings.filter(b=>b.kind==='hearth').length!==1)return null;
    if(!Array.isArray(g.elves)||g.elves.length>12||!g.elves.every(actor)||!Array.isArray(g.enemies)||g.enemies.length>100||!g.enemies.every(e=>actor(e)&&['pumpkin','skeleton','witch','king'].includes(e.clan)))return null;
    if(!actor(g.santa)||typeof g.santa.hp!=='number'||!Array.isArray(g.shrines)||g.shrines.length!==4||!g.shrines.every(point)||!Array.isArray(g.deposits)||g.deposits.length!==4||!g.deposits.every(point))return null;
    if(!Array.isArray(g.pending)||!g.pending.every(c=>['pumpkin','skeleton','witch','king'].includes(c))||typeof g.nextId!=='number'||typeof g.time!=='number')return null;
    if(!numbers(g,['seed','nextId','time','nightTime','spawnTimer','kills','messageTime'])||typeof g.message!=='string')return null;
    if(!numbers(g.santa,['hp','recovering','cooldown','burst'])||g.santa.hp<0&&g.santa.recovering<=0)return null;
    if(!g.buildings.every(b=>numbers(b,['id','level','rotation','hp','maxHp','progress','cooldown'])&&b.maxHp>0&&b.progress>=0&&b.progress<=1&&cells(b).every(p=>onIsland(p.x,p.z))))return null;
    if(!g.elves.every(e=>numbers(e,['id','work'])&&typeof e.job==='string')||!g.enemies.every(e=>numbers(e,['id','hp','maxHp','cooldown','slow'])&&e.maxHp>0))return null;
    if(!g.shrines.every(s=>numbers(s,['id','progress'])&&typeof s.restored==='boolean'&&typeof s.name==='string')||!g.deposits.every(d=>numbers(d,['id','amount'])&&['wood','stone'].includes(d.resource)))return null;
    if(g.santa.shrineId!==undefined&&!g.shrines.some(s=>s.id===g.santa.shrineId))return null;
    g.effects=[];return g;
  }catch{return null;}
}

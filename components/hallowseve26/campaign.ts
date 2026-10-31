import type {Kind} from './simulation';
export const CHAPTERS = [
 ['October 31','The first lantern',0],['November 1','A place to call home',240],['November 5','Timber and stone',240],['November 12','The Bone Company',240],['November 19','Wings in the dark',300],['November 26','The long supply road',300],['December 1','Winter takes hold',300],['December 6','A growing following',300],['December 12','The lantern line',360],['December 18','The darkest wood',360],['December 23','One last preparation',360],['December 24','The Christmas siege',360],
] as const;
export const BUILD_INFO:Record<Kind,{seconds:number;requires:string;produces:string;goal:string}>={
 hearth:{seconds:0,requires:'Your protection',produces:'Shared storage and a safe home',goal:'Keep its lantern burning until Christmas.'},
 home:{seconds:45,requires:'A builder crew',produces:'6 housing spaces and 2 new elves',goal:'Grow your workforce and make room for soldiers.'},
 store:{seconds:60,requires:'A reachable route',produces:'A nearer delivery point',goal:'Shorter journeys mean more supplies before sunset.'},
 lumber:{seconds:45,requires:'1–3 assigned elves and a forest within 13 tiles',produces:'Logs carried to storage',goal:'Supply buildings and the sawmill.'},
 quarry:{seconds:45,requires:'1–3 assigned elves and stone within 13 tiles',produces:'Stone carried to storage',goal:'Raise walls, towers and toy defences.'},
 sawmill:{seconds:60,requires:'1 assigned operator; 4 logs per batch',produces:'3 planks per 5 seconds of work',goal:'Supply cottages, workshops and your army.'},
 workshop:{seconds:75,requires:'1 assigned operator; 3 planks + 1 stone per batch',produces:'4 toys per 5 seconds; recruitment',goal:'Turn your economy into a Christmas army.'},
 wall:{seconds:10,requires:'A builder; leave a gate',produces:'A barrier against ground raiders',goal:'Delay attackers while your defenders fight. Witches fly over.'},
 gate:{seconds:15,requires:'A builder; a clear approach',produces:'A friendly entrance through walls',goal:'Keep deliveries moving while blocking ground raiders.'},
 road:{seconds:0,requires:'1 stone per tile; no worker needed',produces:'50% faster friendly movement',goal:'Optional: connect busy delivery routes. Buildings work without roads.'},
 nutcracker:{seconds:40,requires:'A builder; enemies within 9 tiles',produces:'28 damage each second; ground + air',goal:'Cover the Keep and shoot down witches.'},
 snowglobe:{seconds:40,requires:'A builder; enemies within 7 tiles',produces:'Area slowing and light ground damage',goal:'Hold groups in range of your other defences.'},
 jackbox:{seconds:50,requires:'A builder; enemies within 7 tiles',produces:'48 area damage every 2.5 seconds; ground only',goal:'Break dense groups of zombies and pumpkins.'},
};
export const POWERS={cheer:{name:'Christmas Cheer',cooldown:25,duration:0,radius:7,heal:90,damage:50,damageRadius:5,description:'Heal Santa and nearby soldiers by 90. Damage close raiders by 50 and slow them for 4 seconds.',when:'Use when your front line is wounded and enemies are close.'},blessing:{name:'Winter Blessing',cooldown:40,duration:10,radius:8,description:'Nearby friendly troops and buildings take half damage for 10 seconds.',when:'Use just before a large group reaches your walls or Keep.'}} as const;
export type TipId='welcome'|'orders'|'powers'|'crews'|'delivery'|'builders'|'planks'|'road'|'idle'|'blocked'|'exhausted'|'sunset'|'wounded'|'witches'|'liberate';
export const TIPS:Record<TipId,{who:string;text:string;action:string}>={
 welcome:{who:'Pip · Head elf',text:'Halloween has found our lantern. Captain Holly and three guards are here. Keep Christmas safe tonight!',action:'Meet your guards'},
 orders:{who:'Captain Holly',text:'Select our guards, choose Guard, then tap near the Keep. We will hold that position and fight approaching raiders.',action:'Select the guards'},
 powers:{who:'Captain Holly',text:'Santa carries two gifts for battle. Inspect Cheer and Blessing before casting; save them for the moment they matter.',action:'Inspect Santa’s gifts'},
 crews:{who:'Pip · Head elf',text:'We made it to dawn! Tap a forest or quarry and send a crew. Nothing reaches our stores until an elf carries it home.',action:'Find a forest'},
 delivery:{who:'Pip · Head elf',text:'Our first delivery! Logs feed the sawmill; planks and stone feed the toy workshop. Toys become defenders.',action:'See the supply chain'},
 builders:{who:'Pip · Head elf',text:'A building needs hands, not just supplies. Assign a builder crew at its foundations. Gatherers keep their own jobs.',action:'Find construction'},
 planks:{who:'Pip · Head elf',text:'Short of planks? Assign a sawmill operator and woodcutters. The operator collects logs and delivers planks. Add another staffed sawmill if your army outgrows production.',action:'Find the sawmill'},
 road:{who:'Pip · Head elf',text:'Pavements are optional. Elves walk 50% faster on them, so lay a route between busy workplaces and storage.',action:'Inspect roads'},
 idle:{who:'Pip · Head elf',text:'Some elves are waiting for orders. Send a harvesting crew, staff a workshop or assign builders before the light fades.',action:'Manage crews'},
 blocked:{who:'Pip · Head elf',text:'That route is blocked. Leave a gate through your walls and a clear entrance to every workplace.',action:'Find the worker'},
 exhausted:{who:'Pip · Head elf',text:'That deposit is empty. Your crew is returning its last supplies; send idle elves to a fresh source.',action:'Find resources'},
 sunset:{who:'Captain Holly',text:'The shadows are gathering. Inspect tonight’s threat, finish your defences and bring soldiers back to the Keep.',action:'Scout tonight'},
 wounded:{who:'Captain Holly',text:'Our soldiers are hurt. Move Santa close, inspect Cheer’s circle, then cast to help the front line.',action:'Inspect Cheer'},
 witches:{who:'Captain Holly',text:'Broomsticks above the trees! Witches ignore walls and rivers. Snowball rangers and watchtowers can hit them.',action:'Scout the witches'},
 liberate:{who:'Captain Holly',text:'We must free all three clan camps as well as survive Christmas Eve. Select your army and attack a camp to weaken future raids.',action:'Find a clan camp'},
};
